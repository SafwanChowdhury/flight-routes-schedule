// tests/unit/scheduleGeneratorTest.ts
import { Route } from '../../src/types/apiTypes';
import { ScheduleConfiguration } from '../../src/types/inputTypes';
import { scheduleGenerator } from '../../src/algorithm/scheduleGenerator';

describe('Schedule Generator Unit Tests', () => {
  // Sample routes for British Airways (IATA: BA)
  const mockRoutes: Route[] = [
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
    },
    {
      route_id: 2,
      airline_iata: 'BA',
      airline_name: 'British Airways',
      departure_iata: 'CDG',
      departure_city: 'Paris',
      departure_country: 'France',
      arrival_iata: 'LHR',
      arrival_city: 'London',
      arrival_country: 'United Kingdom',
      distance_km: 350,
      duration_min: 85
    },
    {
      route_id: 3,
      airline_iata: 'BA',
      airline_name: 'British Airways',
      departure_iata: 'LHR',
      departure_city: 'London',
      departure_country: 'United Kingdom',
      arrival_iata: 'FCO',
      arrival_city: 'Rome',
      arrival_country: 'Italy',
      distance_km: 1450,
      duration_min: 150
    },
    {
      route_id: 4,
      airline_iata: 'BA',
      airline_name: 'British Airways',
      departure_iata: 'FCO',
      departure_city: 'Rome',
      departure_country: 'Italy',
      arrival_iata: 'LHR',
      arrival_city: 'London',
      arrival_country: 'United Kingdom',
      distance_km: 1450,
      duration_min: 155
    },
    {
      route_id: 5,
      airline_iata: 'BA',
      airline_name: 'British Airways',
      departure_iata: 'LHR',
      departure_city: 'London',
      departure_country: 'United Kingdom',
      arrival_iata: 'JFK',
      arrival_city: 'New York',
      arrival_country: 'United States',
      distance_km: 5550,
      duration_min: 480
    },
    {
      route_id: 6,
      airline_iata: 'BA',
      airline_name: 'British Airways',
      departure_iata: 'JFK',
      departure_city: 'New York',
      departure_country: 'United States',
      arrival_iata: 'LHR',
      arrival_city: 'London',
      arrival_country: 'United Kingdom',
      distance_km: 5550,
      duration_min: 420
    }
  ];

  // Basic configuration for tests
  const basicConfig: ScheduleConfiguration = {
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
    preferred_countries: ['Italy', 'France'],
    preferred_regions: ['EU'],
    minimum_rest_hours_between_long_haul: 8
  };

  test('should generate a schedule with the correct number of days', async () => {
    const schedule = await scheduleGenerator.generateSchedule(basicConfig, mockRoutes);
    
    // Verify schedule properties
    expect(schedule).toHaveProperty('id');
    expect(schedule).toHaveProperty('name');
    expect(schedule).toHaveProperty('created_at');
    expect(schedule).toHaveProperty('config');
    expect(schedule).toHaveProperty('days');
    
    // Verify days count
    expect(schedule.days.length).toBeGreaterThanOrEqual(basicConfig.days);
    
    // Verify days have flights
    for (const day of schedule.days) {
      expect(day).toHaveProperty('day');
      expect(day).toHaveProperty('date');
      expect(day).toHaveProperty('legs');
      expect(day).toHaveProperty('overnight_location');
    }
  });

  test('should respect haul preferences in generated schedule', async () => {
    // Create config with only short haul flights
    const shortHaulConfig: ScheduleConfiguration = {
      ...basicConfig,
      haul_preferences: {
        short: true,
        medium: false,
        long: false
      }
    };
    
    const schedule = await scheduleGenerator.generateSchedule(shortHaulConfig, mockRoutes);
    
    // Check that all flights are short haul
    for (const day of schedule.days) {
      for (const leg of day.legs) {
        expect(leg.haul_type).toBe('short');
      }
    }
  });
});