import { Route } from '../types/apiTypes';
import { FlightLeg, GeneratorState, DaySchedule } from '../types/outputTypes';
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
    routesByDeparture: Map<string, Route[]>
  ): boolean {
    // Already at base
    if (state.current_airport === config.start_airport) {
      return true;
    }
    
    return this.timingService.isReturnFeasible(
      state.current_time,
      state.current_airport,
      config.start_airport,
      routesByDeparture.get(state.current_airport) || [],
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
    dayNumber: number
  ): DaySchedule | null {
    if (state.current_airport === config.start_airport) {
      return null; // Already at base
    }
    
    const availableRoutes = routesByDeparture.get(state.current_airport) || [];
    
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
    routesByDeparture: Map<string, Route[]>
  ): FlightLeg | null {
    if (state.current_airport === config.start_airport) {
      return null; // Already at base
    }
    
    const returnFlight = this.timingService.findEarliestReturnFlight(
      state.current_time,
      state.current_airport,
      config.start_airport,
      routesByDeparture.get(state.current_airport) || [],
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