// tests/unit/routeClassifierTest.ts
import { RouteClassifier } from '../../src/services/routeClassifier';
import { Route } from '../../src/types/apiTypes';

describe('Route Classifier Unit Tests', () => {
  const routeClassifier = new RouteClassifier();

  test('should correctly classify routes based on duration', () => {
    // Test short haul (under 3 hours)
    expect(routeClassifier.classifyRoute(60)).toBe('short');
    expect(routeClassifier.classifyRoute(180)).toBe('short');
    
    // Test medium haul (3-6 hours)
    expect(routeClassifier.classifyRoute(181)).toBe('medium');
    expect(routeClassifier.classifyRoute(360)).toBe('medium');
    
    // Test long haul (over 6 hours)
    expect(routeClassifier.classifyRoute(361)).toBe('long');
    expect(routeClassifier.classifyRoute(600)).toBe('long');
  });

  test('should filter routes by departure airport and haul type', () => {
    const testRoutes: Route[] = [
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
        duration_min: 80 // Short haul
      },
      {
        route_id: 2,
        airline_iata: 'BA',
        airline_name: 'British Airways',
        departure_iata: 'LHR',
        departure_city: 'London',
        departure_country: 'United Kingdom',
        arrival_iata: 'JFK',
        arrival_city: 'New York',
        arrival_country: 'United States',
        distance_km: 5550,
        duration_min: 480 // Long haul
      },
      {
        route_id: 3,
        airline_iata: 'BA',
        airline_name: 'British Airways',
        departure_iata: 'CDG',
        departure_city: 'Paris',
        departure_country: 'France',
        arrival_iata: 'LHR',
        arrival_city: 'London',
        arrival_country: 'United Kingdom',
        distance_km: 350,
        duration_min: 85 // Short haul
      }
    ];
    
    // Filter for LHR short haul routes
    const lhrShortRoutes = routeClassifier.filterRoutes(testRoutes, 'LHR', 'short');
    expect(lhrShortRoutes.length).toBe(1);
    expect(lhrShortRoutes[0].arrival_iata).toBe('CDG');
    
    // Filter for LHR long haul routes
    const lhrLongRoutes = routeClassifier.filterRoutes(testRoutes, 'LHR', 'long');
    expect(lhrLongRoutes.length).toBe(1);
    expect(lhrLongRoutes[0].arrival_iata).toBe('JFK');
    
    // Filter for CDG short haul routes
    const cdgShortRoutes = routeClassifier.filterRoutes(testRoutes, 'CDG', 'short');
    expect(cdgShortRoutes.length).toBe(1);
    expect(cdgShortRoutes[0].arrival_iata).toBe('LHR');
  });

  test('should group routes by departure airport', () => {
    const testRoutes: Route[] = [
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
        route_id: 3,
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
    
    const groupedRoutes = routeClassifier.groupRoutesByDeparture(testRoutes);
    
    // Check LHR routes
    expect(groupedRoutes.has('LHR')).toBe(true);
    expect(groupedRoutes.get('LHR')?.length).toBe(2);
    
    // Check CDG routes
    expect(groupedRoutes.has('CDG')).toBe(true);
    expect(groupedRoutes.get('CDG')?.length).toBe(1);
  });
});