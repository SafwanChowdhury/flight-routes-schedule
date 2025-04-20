import { v4 as uuidv4 } from 'uuid';
import { Route } from '../types/apiTypes';
import { 
  GeneratorState, 
  GeneratedSchedule, 
  DaySchedule,
  FlightLeg
} from '../types/outputTypes';
import { ScheduleConfiguration } from '../types/inputTypes';
import { RouteClassifier } from '../services/routeClassifier';
import { TimingService } from '../services/timingService';
import { BiasService } from '../services/biasService';
import { DailyScheduler } from './dailyScheduler';
import { ReturnPlanner } from './returnPlanner';
import { DebugHelper } from '../utils/debugHelper';
import { parseTimeString, addDays, formatDate } from '../utils/dateTimeHelper';

/**
 * Main schedule generation algorithm
 */
export class ScheduleGenerator {
  private routeClassifier: RouteClassifier;
  private timingService: TimingService;
  private biasService: BiasService;
  private dailyScheduler: DailyScheduler;
  private returnPlanner: ReturnPlanner;

  constructor() {
    this.routeClassifier = new RouteClassifier();
    this.timingService = new TimingService();
    this.biasService = new BiasService();
    this.dailyScheduler = new DailyScheduler(
      this.routeClassifier,
      this.timingService,
      this.biasService
    );
    this.returnPlanner = new ReturnPlanner(
      this.routeClassifier,
      this.timingService
    );
  }

  /**
   * Generate a flight schedule
   */
  async generateSchedule(
    config: ScheduleConfiguration,
    routes: Route[]
  ): Promise<GeneratedSchedule> {
    console.log(`Generating schedule for ${config.airline_name} (${config.airline_id})`);
    console.log(`Base airport: ${config.start_airport}`);
    console.log(`Days: ${config.days}`);
    console.log(`Routes available: ${routes.length}`);
    
    // Initialize state
    const state = this.initializeState(config);
    
    // Group routes by departure airport for quick lookup
    const routesByDeparture = this.routeClassifier.groupRoutesByDeparture(routes);
    
    console.log(`Routes from base (${config.start_airport}): ${
      (routesByDeparture.get(config.start_airport) || []).length
    }`);
    
    // Generate schedule for each day
    for (let day = 1; day <= config.days; day++) {
      // If we ended previous day not at base, we need to handle overnight return
      if (state.current_airport !== config.start_airport) {
        await this.handleOvernightReturn(state, config, routesByDeparture);
      }
      
      // Process any future legs from previous day first
      if (state.future_legs && state.future_legs.length > 0) {
        await this.processFutureLegs(state, day);
      } else {
        // Generate schedule for current day normally
        const daySchedule = await this.dailyScheduler.generateDailySchedule(
          day,
          state,
          config,
          routesByDeparture
        );
        
        // Update state with day's results
        state.generated_days.push(daySchedule);
        state.current_airport = daySchedule.overnight_location;
      }
      
      // Advance to next day
      state.current_date = addDays(state.current_date, 1);
      
      // Reset time to start of operating hours
      const { hours, minutes } = parseTimeString(config.operating_hours.start);
      state.current_time = new Date(state.current_date);
      state.current_time.setHours(hours, minutes, 0, 0);
    }
    
    // Final return to base if needed
    if (state.current_airport !== config.start_airport) {
      const finalReturn = await this.planFinalReturnToBase(
        state,
        config,
        routesByDeparture
      );
      
      if (finalReturn) {
        state.generated_days.push(finalReturn);
      }
    }
    
    // Process any remaining future legs
    if (state.future_legs && state.future_legs.length > 0) {
      const lastDay = state.generated_days.length + 1;
      await this.processFutureLegs(state, lastDay);
    }
    
    // Assemble final schedule
    const schedule: GeneratedSchedule = {
      id: uuidv4(),
      name: `${config.airline_name} ${config.days}-Day Schedule`,
      created_at: new Date().toISOString(),
      config,
      days: state.generated_days
    };
    
    // Debug visualization
    console.log(DebugHelper.visualizeSchedule(schedule));
    
    return schedule;
  }
  
  /**
   * Process any future legs that were scheduled for later days
   */
  private async processFutureLegs(
    state: GeneratorState,
    day: number
  ): Promise<void> {
    if (!state.future_legs || state.future_legs.length === 0) {
      return;
    }
    
    // Create a new day schedule
    const daySchedule: DaySchedule = {
      day,
      date: formatDate(state.current_date),
      legs: [],
      overnight_location: "",
      notes: ["Contains legs from previous day's schedule that crossed calendar day boundary"]
    };
    
    // Group legs by calendar day
    const legsByDay = new Map<string, FlightLeg[]>();
    
    for (const leg of state.future_legs) {
      const departureDate = formatDate(new Date(leg.departure_time));
      
      if (!legsByDay.has(departureDate)) {
        legsByDay.set(departureDate, []);
      }
      
      legsByDay.get(departureDate)!.push(leg);
    }
    
    // Add only legs that belong to the current calendar day
    const currentDateString = formatDate(state.current_date);
    const currentDayLegs = legsByDay.get(currentDateString) || [];
    
    // Add legs to the day schedule
    daySchedule.legs.push(...currentDayLegs);
    
    // Remove processed legs from future_legs
    state.future_legs = state.future_legs.filter(leg => {
      const legDepartureDate = formatDate(new Date(leg.departure_time));
      return legDepartureDate !== currentDateString;
    });
    
    // Set overnight location
    if (currentDayLegs.length > 0) {
      const lastLeg = currentDayLegs[currentDayLegs.length - 1];
      daySchedule.overnight_location = lastLeg.arrival_airport;
      state.current_airport = lastLeg.arrival_airport;
      state.current_time = new Date(lastLeg.arrival_time);
    } else {
      daySchedule.overnight_location = state.current_airport;
    }
    
    // Update state with day's results
    state.generated_days.push(daySchedule);
  }
  
  /**
   * Initialize generator state
   */
  private initializeState(config: ScheduleConfiguration): GeneratorState {
    const startDate = new Date();
    
    // Set start time to beginning of operating hours
    const { hours, minutes } = parseTimeString(config.operating_hours.start);
    const startTime = new Date(startDate);
    startTime.setHours(hours, minutes, 0, 0);
    
    return {
      current_airport: config.start_airport,
      current_date: startDate,
      current_time: startTime,
      visited_routes: new Set<number>(),
      visited_airports: new Map<string, number>([
        [config.start_airport, 1]  // Count base as already visited once
      ]),
      long_haul_block_until: null,
      generated_days: [],
      consecutive_days_away_from_base: 0,
      future_legs: []
    };
  }
  
  /**
   * Handle the case where we need to return from an overnight layover
   */
  private async handleOvernightReturn(
    state: GeneratorState,
    config: ScheduleConfiguration,
    routesByDeparture: Map<string, Route[]>
  ): Promise<void> {
    // If we've been away for max consecutive days, force a return
    if (state.consecutive_days_away_from_base >= 2) {
      console.log(`Forcing return to base from ${state.current_airport} after ${state.consecutive_days_away_from_base} days away`);
      
      // Find a return route
      const returnLeg = await this.returnPlanner.planReturnToBase(
        state,
        config,
        routesByDeparture
      );
      
      if (returnLeg) {
        // Update state
        state.current_airport = returnLeg.arrival_airport; // Should be base
        state.current_time = new Date(returnLeg.arrival_time);
        state.visited_routes.add(returnLeg.route_id);
        this.incrementAirportVisit(state, returnLeg.arrival_airport);
        
        // Reset consecutive days counter
        state.consecutive_days_away_from_base = 0;
      }
    }
  }
  
  /**
   * Plan a final return to base at the end of the schedule
   */
  private async planFinalReturnToBase(
    state: GeneratorState,
    config: ScheduleConfiguration,
    routesByDeparture: Map<string, Route[]>
  ): Promise<DaySchedule | null> {
    // Return day number is one more than the last day
    const returnDay = state.generated_days.length + 1;
    
    return this.returnPlanner.planForcedReturn(
      state,
      config,
      routesByDeparture,
      returnDay
    );
  }
  
  /**
   * Update airport visit count
   */
  private incrementAirportVisit(state: GeneratorState, airport: string): void {
    const currentCount = state.visited_airports.get(airport) || 0;
    state.visited_airports.set(airport, currentCount + 1);
  }
}

// Singleton instance
export const scheduleGenerator = new ScheduleGenerator();