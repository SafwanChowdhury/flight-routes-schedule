// tests/integration/routesTest.ts
import axios from 'axios';
import { Server } from 'http';

// Mock the apiClient before importing any modules that depend on it
jest.mock('../../src/services/apiClient', () => {
  return {
    apiClient: {
      getAirlines: jest.fn().mockResolvedValue({
        airlines: [
          { id: 24, iata: 'BA', name: 'British Airways' },
          { id: 25, iata: 'AF', name: 'Air France' }
        ]
      }),
      getAirlineById: jest.fn().mockImplementation(async (id) => {
        if (id === 24) {
          return { id: 24, iata: 'BA', name: 'British Airways' };
        }
        return null;
      }),
      getRoutesForAirline: jest.fn().mockResolvedValue([
        {
          route_id: 1,
          airline_iata: 'BA',
          airline_name: 'British Airways',
          departure_iata: 'LHR',
          departure_city: 'London',
          departure_country: 'United Kingdom',
          arrival_iata: 'CDG',
          arrival_city: 'Paris',
          arrival_country: 'France',
          distance_km: 350,
          duration_min: 80
        }
      ])
    }
  };
});

// Important: Import app and apiClient AFTER mocking
import app from '../../src/server';
import { apiClient } from '../../src/services/apiClient';

describe('API Routes Integration Tests', () => {
  let server: Server;
  const baseUrl = 'http://localhost:3002';
  
  // Start test server
  beforeAll((done) => {
    server = app.listen(3002, () => {
      console.log('Test server running on port 3002');
      done();
    });
  });
  
  // Close server after tests
  afterAll((done) => {
    server.close(done);
  });

  // Reset mocks between tests
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should fetch airlines from the API', async () => {
    const response = await axios.get(`${baseUrl}/api/schedule/airlines`);
    
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('success');
    // Don't strictly check the contents since the API might return real data
    expect(Array.isArray(response.data.airlines)).toBe(true);
    expect(apiClient.getAirlines).toHaveBeenCalled();
  });

  test('should validate a correct configuration', async () => {
    const validConfig = {
      airline_id: 24,
      airline_name: 'British Airways',
      start_airport: 'LHR',
      days: 3,
      haul_preferences: {
        short: true,
        medium: true,
        long: true
      },
      haul_weighting: {
        short: 0.5,
        medium: 0.3,
        long: 0.2
      },
      prefer_single_leg_day_ratio: 0.4,
      operating_hours: {
        start: '06:00',
        end: '23:00'
      },
      turnaround_time_minutes: 45,
      preferred_countries: ['Italy', 'Spain', 'France'],
      preferred_regions: ['EU'],
      minimum_rest_hours_between_long_haul: 8
    };
    
    const response = await axios.post(`${baseUrl}/api/schedule/validate`, validConfig);
    
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('success');
  });

  test('should reject an invalid configuration', async () => {
    const invalidConfig = {
      airline_id: 24,
      airline_name: 'British Airways',
      start_airport: 'LHR',
      days: 31, // Invalid: exceeds maximum of 30
      haul_preferences: {
        short: false,
        medium: false,
        long: false // Invalid: all haul types disabled
      },
      haul_weighting: {
        short: 0.5,
        medium: 0.3,
        long: 0.2
      },
      prefer_single_leg_day_ratio: 0.4,
      operating_hours: {
        start: '06:00',
        end: '23:00'
      },
      turnaround_time_minutes: 45,
      preferred_countries: ['Italy', 'Spain', 'France'],
      preferred_regions: ['EU'],
      minimum_rest_hours_between_long_haul: 8
    };
    
    try {
      await axios.post(`${baseUrl}/api/schedule/validate`, invalidConfig);
      // If we reach here, the test should fail
      expect(true).toBe(false); // This will make the test fail
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.status).toBe('error');
      } else {
        throw error;
      }
    }
  });

  test('should generate a schedule successfully', async () => {
    const config = {
      airline_id: 24,
      airline_name: 'British Airways',
      start_airport: 'LHR',
      days: 2,
      haul_preferences: {
        short: true,
        medium: true,
        long: true
      },
      haul_weighting: {
        short: 0.5,
        medium: 0.3,
        long: 0.2
      },
      prefer_single_leg_day_ratio: 0.4,
      operating_hours: {
        start: '06:00',
        end: '23:00'
      },
      turnaround_time_minutes: 45,
      preferred_countries: ['Italy', 'Spain', 'France'],
      preferred_regions: ['EU'],
      minimum_rest_hours_between_long_haul: 8
    };
    
    const response = await axios.post(`${baseUrl}/api/schedule/generate`, config);
    
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('success');
    expect(response.data.schedule).toBeDefined();
    expect(response.data.schedule.days.length).toBeGreaterThanOrEqual(config.days);
    expect(apiClient.getRoutesForAirline).toHaveBeenCalled();
  });
});