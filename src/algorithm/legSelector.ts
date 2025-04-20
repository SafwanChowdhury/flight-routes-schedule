import { Route } from '../types/apiTypes';
import { FlightLeg, GeneratorState, HaulType } from '../types/outputTypes';
import { ScheduleConfiguration } from '../types/inputTypes';
import { RouteClassifier } from '../services/routeClassifier';
import { TimingService } from '../services/timingService';
import { BiasService } from '../services/biasService';
import { weightedRandomSelection } from '../utils/randomizationHelper';
import { DebugHelper } from '../utils/debugHelper';

/**
 * Component for selecting flight legs during schedule generation
 */
export class LegSelector {
  constructor(
    private routeClassifier: RouteClassifier,
    private timingService: TimingService,
    private biasService: BiasService
  ) {}

  /**
   * Select a leg based on current state and constraints
   */
  async selectLeg(
    state: GeneratorState,
    config: ScheduleConfiguration,
    haulType: HaulType,
    routesByDeparture: Map<string, Route[]>,
    isReturnLeg: boolean = false
  ): Promise<FlightLeg | null> {
    // Get routes from current airport
    const availableRoutes = routesByDeparture.get(state.current_airport) || [];
    
    // Filter routes by haul type
    let filteredRoutes = availableRoutes.filter(route => 
      this.routeClassifier.classifyRoute(route.duration_min) === haulType
    );
    
    // Filter routes by airline identifier - ADDED THIS FILTER
    filteredRoutes = filteredRoutes.filter(route => {
      // Primary check: Match by airline IATA code
      if (config.airline_iata && route.airline_iata === config.airline_iata) {
        return true;
      }
      
      // Secondary check: Match by airline name (case-insensitive)
      if (config.airline_name && 
          route.airline_name.toLowerCase() === config.airline_name.toLowerCase()) {
        return true;
      }
      
      return false;
    });
    
    // For return legs, filter to only those that go back to base
    if (isReturnLeg) {
      filteredRoutes = filteredRoutes.filter(route => 
        route.arrival_iata === config.start_airport
      );
    }
    
    // Filter out recently visited routes
    filteredRoutes = filteredRoutes.filter(route => 
      !state.visited_routes.has(route.route_id)
    );
    
    DebugHelper.logRouteSelection(
      `Selecting ${isReturnLeg ? 'return' : ''} leg from ${state.current_airport}`,
      availableRoutes.length,
      filteredRoutes.length,
      null
    );
    
    if (filteredRoutes.length === 0) {
      return null;
    }
    
    // Apply biasing based on preferences
    const biasedRoutes = this.biasService.applyBiasing(
      filteredRoutes,
      config,
      state.visited_airports
    );
    
    // Calculate valid departure windows
    const validRoutes = await this.calculateValidDepartureWindows(
      biasedRoutes.map(br => br.route),
      state,
      config
    );
    
    if (validRoutes.length === 0) {
      return null;
    }
    
    // Find biasing weights for valid routes
    const validBiasedRoutes = validRoutes.map(route => {
      const biasedRoute = biasedRoutes.find(br => br.route.route_id === route.route_id);
      return {
        item: route,
        weight: biasedRoute ? biasedRoute.weight : 1.0
      };
    });
    
    // Select route using weighted random selection
    const selectedRoute = weightedRandomSelection(validBiasedRoutes);
    
    DebugHelper.logRouteSelection(
      `Selected route`,
      availableRoutes.length,
      validBiasedRoutes.length,
      selectedRoute
    );
    
    // Build flight leg from selected route
    return this.buildFlightLeg(selectedRoute, state, config);
  }
  
  /**
   * Filter routes to those that can depart within operating hours
   */
  private async calculateValidDepartureWindows(
    routes: Route[],
    state: GeneratorState,
    config: ScheduleConfiguration
  ): Promise<Route[]> {
    // For each route, check if it can depart within operating hours
    return routes.filter(() => {
      // Add turnaround time to current time
      const earliestDeparture = new Date(state.current_time);
      earliestDeparture.setMinutes(
        earliestDeparture.getMinutes() + config.turnaround_time_minutes
      );
      
      // Check if within operating hours
      return this.timingService.isWithinOperatingHours(
        earliestDeparture,
        config.operating_hours
      );
    });
  }
  
  /**
   * Build a flight leg object from a route
   */
  private buildFlightLeg(
    route: Route,
    state: GeneratorState,
    config: ScheduleConfiguration
  ): FlightLeg {
    // Calculate departure time (current time + turnaround time)
    const departureTime = new Date(state.current_time);
    departureTime.setMinutes(
      departureTime.getMinutes() + config.turnaround_time_minutes
    );
    
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
      // Additional metadata
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