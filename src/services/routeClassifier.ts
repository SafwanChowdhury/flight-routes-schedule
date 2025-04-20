import { Route } from '../types/apiTypes';
import { HaulType } from '../types/outputTypes';

/**
 * Service for classifying and filtering routes by haul type and other criteria
 */
export class RouteClassifier {
  /**
   * Classifies a route based on its duration in minutes
   * - Short haul: <= 180 minutes (3 hours)
   * - Medium haul: 181-360 minutes (3-6 hours)
   * - Long haul: > 360 minutes (6+ hours)
   */
  classifyRoute(durationMinutes: number): HaulType {
    if (durationMinutes <= 180) { // 3 hours
      return 'short';
    } else if (durationMinutes <= 360) { // 6 hours
      return 'medium';
    } else {
      return 'long';
    }
  }
  
  /**
   * Filters routes by departure airport and haul type
   */
  filterRoutes(
    routes: Route[], 
    departureAirport: string, 
    haulType: HaulType
  ): Route[] {
    return routes.filter(route => {
      return (
        route.departure_iata === departureAirport &&
        this.classifyRoute(route.duration_min) === haulType
      );
    });
  }
  
  /**
   * Groups routes by departure airport for quick access
   */
  groupRoutesByDeparture(routes: Route[]): Map<string, Route[]> {
    const routeMap = new Map<string, Route[]>();
    
    for (const route of routes) {
      const departure = route.departure_iata;
      if (!routeMap.has(departure)) {
        routeMap.set(departure, []);
      }
      routeMap.get(departure)!.push(route);
    }
    
    return routeMap;
  }

  /**
   * Filter to only routes that go to a specific airport
   */
  filterRoutesToAirport(
    routes: Route[],
    arrivalAirport: string
  ): Route[] {
    return routes.filter(route => route.arrival_iata === arrivalAirport);
  }

  /**
   * Filter to only routes that go to a specific country
   */
  filterRoutesToCountry(
    routes: Route[],
    countryName: string
  ): Route[] {
    return routes.filter(route => route.arrival_country === countryName);
  }

  /**
   * Get routes by haul type
   */
  getRoutesByHaulType(routes: Route[]): Record<HaulType, Route[]> {
    const result: Record<HaulType, Route[]> = {
      short: [],
      medium: [],
      long: []
    };

    for (const route of routes) {
      const haulType = this.classifyRoute(route.duration_min);
      result[haulType].push(route);
    }

    return result;
  }
}

// Singleton instance
export const routeClassifier = new RouteClassifier();
