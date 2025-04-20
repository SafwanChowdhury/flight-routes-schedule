import { Route } from '../types/apiTypes';
import { GeneratorState, DaySchedule, FlightLeg, HaulType } from '../types/outputTypes';
import { ScheduleConfiguration } from '../types/inputTypes';
import { RouteClassifier } from '../services/routeClassifier';
import { TimingService } from '../services/timingService';
import { BiasService } from '../services/biasService';
import { LegSelector } from './legSelector';
import { ReturnPlanner } from './returnPlanner';
import { pickHaulType } from '../utils/randomizationHelper';
import { formatDate } from '../utils/dateTimeHelper';
import { DebugHelper } from '../utils/debugHelper';

/**
 * Component for generating daily schedules
 */
export class DailyScheduler {
  private legSelector: LegSelector;
  private returnPlanner: ReturnPlanner;

  constructor(
    private routeClassifier: RouteClassifier,
    private timingService: TimingService,
    private biasService: BiasService
  ) {
    this.legSelector = new LegSelector(routeClassifier, timingService, biasService);
    this.returnPlanner = new ReturnPlanner(routeClassifier, timingService);
  }

  /**
   * Generate a daily schedule
   */
  async generateDailySchedule(
    day: number,
    state: GeneratorState,
    config: ScheduleConfiguration,
    routesByDeparture: Map<string, Route[]>
  ): Promise<DaySchedule> {
    const daySchedule: DaySchedule = {
      day,
      date: formatDate(state.current_date),
      legs: [],
      overnight_location: state.current_airport,
      notes: []
    };
    
    DebugHelper.logState(`Starting day ${day}`, state);
    
    // 1. Select haul type for the day
    const haulType = this.selectHaulType(state, config);
    
    // 2. Choose day style (single destination or multi-leg)
    const dayStyle = this.selectDayStyle(config);
    
    // 3. Select first leg
    const firstLeg = await this.legSelector.selectLeg(
      state,
      config,
      haulType,
      routesByDeparture
    );
    
    if (!firstLeg) {
      // No suitable leg found
      daySchedule.notes.push('No suitable routes available today');
      return daySchedule;
    }
    
    daySchedule.legs.push(firstLeg);
    
    // Update state after first leg
    state.current_airport = firstLeg.arrival_airport;
    state.current_time = new Date(firstLeg.arrival_time);
    state.visited_routes.add(firstLeg.route_id);
    this.incrementAirportVisit(state, firstLeg.arrival_airport);
    
    // Check for long haul block
    if (haulType === 'long') {
      const blockUntil = new Date(state.current_time);
      blockUntil.setHours(
        blockUntil.getHours() + config.minimum_rest_hours_between_long_haul
      );
      state.long_haul_block_until = blockUntil;
      
      daySchedule.notes.push(`Long haul flight, rest required for ${config.minimum_rest_hours_between_long_haul} hours`);
    }
    
    DebugHelper.logState(`After first leg`, state);
    
    // 4. Build remaining legs if needed
    if (dayStyle === 'multi-leg' && haulType !== 'long') {
      // For shorter flights, we can have multiple legs
      // But for long haul, we stick to out-and-back
      
      const secondLeg = await this.legSelector.selectLeg(
        state,
        config,
        haulType,
        routesByDeparture
      );
      
      if (secondLeg) {
        daySchedule.legs.push(secondLeg);
        
        // Update state
        state.current_airport = secondLeg.arrival_airport;
        state.current_time = new Date(secondLeg.arrival_time);
        state.visited_routes.add(secondLeg.route_id);
        this.incrementAirportVisit(state, secondLeg.arrival_airport);
        
        DebugHelper.logState(`After second leg`, state);
      }
    }
    
    // 5. Try to return to base if necessary
    if (state.current_airport !== config.start_airport) {
      const returnLeg = await this.returnPlanner.planReturnToBase(
        state,
        config,
        routesByDeparture
      );
      
      if (returnLeg) {
        daySchedule.legs.push(returnLeg);
        
        // Update state
        state.current_airport = returnLeg.arrival_airport;
        state.current_time = new Date(returnLeg.arrival_time);
        state.visited_routes.add(returnLeg.route_id);
        this.incrementAirportVisit(state, returnLeg.arrival_airport);
        
        DebugHelper.logState(`After return leg`, state);
      }
    }
    
    // 6. Determine end-of-day status
    daySchedule.overnight_location = state.current_airport;
    
    if (state.current_airport !== config.start_airport) {
      daySchedule.notes.push('Overnight layover required');
      
      // Update consecutive days away counter
      state.consecutive_days_away_from_base++;
      
      // Force return next morning if at max consecutive days away
      if (state.consecutive_days_away_from_base >= 2) {  // Max 3 days away including this one
        daySchedule.notes.push('Will force return to base next morning');
      }
    } else {
      // Reset consecutive days away counter
      state.consecutive_days_away_from_base = 0;
    }
    
    return daySchedule;
  }
  
  /**
   * Select haul type for the day based on preferences, weightings, and restrictions
   */
  private selectHaulType(state: GeneratorState, config: ScheduleConfiguration): HaulType {
    // Create a copy of preferences for modification
    const currentPreferences = { ...config.haul_preferences };
    
    // Check for long haul block
    if (state.long_haul_block_until && state.current_time < state.long_haul_block_until) {
      // Cannot do long haul if blocked
      currentPreferences.long = false;
    }
    
    // Try to select a haul type
    try {
      return pickHaulType(currentPreferences, config.haul_weighting);
    } catch (error) {
      // Fallback to short haul if no valid options
      return 'short';
    }
  }
  
  /**
   * Select day style (single destination or multi-leg)
   */
  private selectDayStyle(config: ScheduleConfiguration): 'single-destination' | 'multi-leg' {
    const randomValue = Math.random();
    return randomValue < config.prefer_single_leg_day_ratio ? 'single-destination' : 'multi-leg';
  }
  
  /**
   * Update airport visit count
   */
  private incrementAirportVisit(state: GeneratorState, airport: string): void {
    const currentCount = state.visited_airports.get(airport) || 0;
    state.visited_airports.set(airport, currentCount + 1);
  }
}
