// tests/mocks/apiClientMock.ts
import { jest } from '@jest/globals';

// Mock route data
const mockRoutes = [
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
  }
];

// Mock airlines data
const mockAirlines = {
  airlines: [
    { id: 24, iata: 'BA', name: 'British Airways' },
    { id: 25, iata: 'AF', name: 'Air France' }
  ]
};

export const setupApiClientMock = () => {
  jest.mock('../../src/services/apiClient', () => ({
    apiClient: {
      getAirlines: jest.fn<() => Promise<typeof mockAirlines>>().mockResolvedValue(mockAirlines),
      getAirlineById: jest.fn<(id: number) => Promise<{ id: number; iata: string; name: string; } | null>>().mockImplementation(async (id: number) => {
        const airline = mockAirlines.airlines.find(a => a.id === id);
        return airline || null;
      }),
      getRoutesForAirline: jest.fn<() => Promise<typeof mockRoutes>>().mockResolvedValue(mockRoutes)
    }
  }));
};

export { mockRoutes, mockAirlines };    