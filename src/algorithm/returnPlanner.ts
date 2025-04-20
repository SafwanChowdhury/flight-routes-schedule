import { Route } from '../types/apiTypes';
import { FlightLeg, GeneratorState, DaySchedule, HaulType } from '../types/outputTypes';
import { ScheduleConfiguration } from '../types/inputTypes';
import { RouteClassifier } from '../services/routeClassifier';
import { TimingService } from '../services/timingService';
import { parseTimeString, formatDate, addDays } from '../utils/dateTimeHelper';

/**
 * Component for planning returns to base
 */
export class ReturnPlanner {
  constructor(
    private routeClassifier: RouteClassifier,
    private timingService: TimingService
  ) {}
  
  /**
   * Check if return to base is feasible on the current day
   */
  isReturnFeasible(
    state: GeneratorState,
    config: ScheduleConfiguration,
    routesByDeparture: Map<string, Route[]>,
    haulType?: HaulType
  ): boolean {
    // Already at base
    if (state.current_airport === config.start_airport) {
      return true;
    }
    
    let availableRoutes = routesByDeparture.get(state.current_airport) || [];
    
    // Filter routes by haul type if specified
    if (haulType) {
      availableRoutes = availableRoutes.filter(route => 
        this.routeClassifier.classifyRoute(route.duration_min) === haulType
      );
    }
    
    return this.timingService.isReturnFeasible(
      state.current_time,
      state.current_airport,
      config.start_airport,
      availableRoutes,
      config
    );
  }
  
  /**
   * Plan a forced return to base for the next day
   */
  planForcedReturn(
    state: GeneratorState,
    config: ScheduleConfiguration,
    routesByDeparture: Map<string, Route[]>,
    dayNumber: number,
    haulType?: HaulType
  ): DaySchedule | null {
    if (state.current_airport === config.start_airport) {
      return null; // Already at base
    }
    
    let availableRoutes = routesByDeparture.get(state.current_airport) || [];
    
    // Filter routes by haul type if specified
    if (haulType && config.haul_preferences[haulType]) {
      availableRoutes = availableRoutes.filter(route => 
        this.routeClassifier.classifyRoute(route.duration_min) === haulType
      );
    } else {
      // If no specific haul type is required or allowed, filter based on preferences
      availableRoutes = availableRoutes.filter(route => {
        const routeHaulType = this.routeClassifier.classifyRoute(route.duration_min);
        return config.haul_preferences[routeHaulType];
      });
    }
    
    // Find routes that go back to base
    const routesToBase = availableRoutes.filter(
      route => route.arrival_iata === config.start_airport
    );
    
    if (routesToBase.length === 0) {
      return null; // No routes to base
    }
    
    // Create a new day
    const nextDay = addDays(state.current_date, 1);
    
    // Start in the morning within operating hours
    const { hours: startHours, minutes: startMinutes } = parseTimeString(config.operating_hours.start);
    
    const morningTime = new Date(nextDay);
    morningTime.setHours(startHours, startMinutes + 60, 0, 0); // Add 1 hour to avoid earliest slot
    
    // Find shortest route back to base
    const shortestRoute = routesToBase.reduce(
      (shortest, route) => (!shortest || route.duration_min < shortest.duration_min) ? route : shortest,
      null as Route | null
    );
    
    if (!shortestRoute) {
      return null;
    }
    
    // Create the return leg
    const returnLeg: FlightLeg = this.buildFlightLeg(
      shortestRoute,
      morningTime,
      config
    );
    
    // Create the day schedule
    const daySchedule: DaySchedule = {
      day: dayNumber,
      date: formatDate(nextDay),
      legs: [returnLeg],
      overnight_location: config.start_airport,
      notes: ['Forced return to base']
    };
    
    return daySchedule;
  }
  
  /**
   * Plan a return to base for the current day if possible
   */
  planReturnToBase(
    state: GeneratorState,
    config: ScheduleConfiguration,
    routesByDeparture: Map<string, Route[]>,
    haulType?: HaulType
  ): FlightLeg | null {
    if (state.current_airport === config.start_airport) {
      return null; // Already at base
    }
    
    let availableRoutes = routesByDeparture.get(state.current_airport) || [];
    
    // Filter routes by haul type if specified
    if (haulType && config.haul_preferences[haulType]) {
      availableRoutes = availableRoutes.filter(route => 
        this.routeClassifier.classifyRoute(route.duration_min) === haulType
      );
      
      console.log(`Filtered to ${availableRoutes.length} ${haulType} haul routes for return`);
    } else {
      // If no specific haul type is required or allowed, filter based on preferences
      availableRoutes = availableRoutes.filter(route => {
        const routeHaulType = this.routeClassifier.classifyRoute(route.duration_min);
        return config.haul_preferences[routeHaulType];
      });
      
      console.log(`Filtered to ${availableRoutes.length} routes based on haul preferences for return`);
    }
    
    // Find routes that go back to base
    const routesToBase = availableRoutes.filter(route => route.arrival_iata === config.start_airport);
    
    if (routesToBase.length === 0) {
      console.log(`No routes found to return to base from ${state.current_airport} with specified haul type`);
      return null;
    }
    
    const returnFlight = this.timingService.findEarliestReturnFlight(
      state.current_time,
      state.current_airport,
      config.start_airport,
      routesToBase,
      config
    );
    
    if (!returnFlight) {
      return null;
    }
    
    const { route, departureTime } = returnFlight;
    
    // Create the return leg with airline override
    return this.buildFlightLeg(route, departureTime, config);
  }
  
  /**
   * Build a flight leg with airline override
   */
  private buildFlightLeg(
    route: Route,
    departureTime: Date,
    config: ScheduleConfiguration
  ): FlightLeg {
    // Calculate arrival time
    const arrivalTime = this.timingService.calculateArrivalTime(
      departureTime,
      route.duration_min
    );
    
    // Override airline information to match the requested airline
    // regardless of which airline operates the actual route
    const airlineIata = config.airline_iata || route.airline_iata;
    const airlineName = config.airline_name || route.airline_name;
    
    return {
      departure_airport: route.departure_iata,
      arrival_airport: route.arrival_iata,
      departure_time: departureTime.toISOString(),
      arrival_time: arrivalTime.toISOString(),
      haul_type: this.routeClassifier.classifyRoute(route.duration_min),
      duration_min: route.duration_min,
      route_id: route.route_id,
      // Additional metadata with airline override
      departure_city: route.departure_city,
      departure_country: route.departure_country,
      arrival_city: route.arrival_city,
      arrival_country: route.arrival_country,
      airline_iata: airlineIata,
      airline_name: airlineName,
      distance_km: route.distance_km
    };
  }
}