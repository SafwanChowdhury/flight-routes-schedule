import { Route } from '../types/apiTypes';
import { GeneratorState, DaySchedule, HaulType, FlightLeg } from '../types/outputTypes';
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
    
    // Check for long haul block and add note if active
    if (state.long_haul_block_until && state.current_time < state.long_haul_block_until) {
      daySchedule.notes.push(`Long haul block active until ${state.long_haul_block_until.toLocaleTimeString()}`);
    }
    
    // Keep planning trips until we can't add more
    let canPlanMoreTrips = true;
    let tripCounter = 0;
    
    while (canPlanMoreTrips) {
      tripCounter++;
      DebugHelper.logState(`Planning trip #${tripCounter} for day ${day}`, state);
      
      // Make sure we're at base before planning a new trip
      if (state.current_airport !== config.start_airport) {
        daySchedule.notes.push(`Cannot plan more trips - not at base (at ${state.current_airport})`);
        canPlanMoreTrips = false;
        break;
      }
      
      // Plan a trip (either A->B->A or A->B->C->A)
      const tripResult = await this.planTrip(state, config, haulType, routesByDeparture);
      
      if (!tripResult.success) {
        daySchedule.notes.push(tripResult.message);
        canPlanMoreTrips = false;
        break;
      }
      
      // Add trip legs to the day schedule
      daySchedule.legs.push(...tripResult.legs);
      
      // Check if we have time for another trip
      const nextPossibleDepartureTime = new Date(state.current_time);
      nextPossibleDepartureTime.setMinutes(
        nextPossibleDepartureTime.getMinutes() + config.turnaround_time_minutes
      );
      
      const hasTimeForMoreTrips = this.timingService.isWithinOperatingHours(
        nextPossibleDepartureTime,
        config.operating_hours
      );
      
      if (!hasTimeForMoreTrips) {
        daySchedule.notes.push(`No more time for additional trips today`);
        canPlanMoreTrips = false;
      }
      
      // Set long haul block if applicable
      if (haulType === 'long') {
        const blockUntil = new Date(state.current_time);
        blockUntil.setHours(
          blockUntil.getHours() + config.minimum_rest_hours_between_long_haul
        );
        state.long_haul_block_until = blockUntil;
        
        daySchedule.notes.push(`Long haul flight, rest required for ${config.minimum_rest_hours_between_long_haul} hours`);
      }
    }
    
    // Final determination of end-of-day status
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
   * Plan a single trip (either A->B->A or A->B->C->A)
   */
  private async planTrip(
    state: GeneratorState,
    config: ScheduleConfiguration,
    haulType: HaulType,
    routesByDeparture: Map<string, Route[]>
  ): Promise<{ success: boolean; message: string; legs: FlightLeg[] }> {
    const legs: FlightLeg[] = [];
    
    // Choose trip style (single destination or multi-leg)
    const tripStyle = this.selectDayStyle(config);
    DebugHelper.logState(`Trip style: ${tripStyle}`, state);
    
    // Select first leg
    const firstLeg = await this.legSelector.selectLeg(
      state,
      config,
      haulType,
      routesByDeparture
    );
    
    if (!firstLeg) {
      return { 
        success: false, 
        message: 'No suitable routes available for first leg', 
        legs: [] 
      };
    }
    
    legs.push(firstLeg);
    
    // Update state after first leg
    state.current_airport = firstLeg.arrival_airport;
    state.current_time = new Date(firstLeg.arrival_time);
    state.visited_routes.add(firstLeg.route_id);
    this.incrementAirportVisit(state, firstLeg.arrival_airport);
    
    DebugHelper.logState(`After first leg`, state);
    
    // Add second leg for multi-leg trips
    if (tripStyle === 'multi-leg' && haulType !== 'long') {
      // For shorter flights, we can have multiple legs
      // But for long haul, we stick to out-and-back
      
      const secondLeg = await this.legSelector.selectLeg(
        state,
        config,
        haulType,
        routesByDeparture
      );
      
      if (secondLeg) {
        legs.push(secondLeg);
        
        // Update state
        state.current_airport = secondLeg.arrival_airport;
        state.current_time = new Date(secondLeg.arrival_time);
        state.visited_routes.add(secondLeg.route_id);
        this.incrementAirportVisit(state, secondLeg.arrival_airport);
        
        DebugHelper.logState(`After second leg`, state);
      } else {
        DebugHelper.logState(`No suitable second leg found, proceeding with direct return`, state);
      }
    }
    
    // Return to base leg
    if (state.current_airport !== config.start_airport) {
      const returnLeg = await this.returnPlanner.planReturnToBase(
        state,
        config,
        routesByDeparture
      );
      
      if (returnLeg) {
        legs.push(returnLeg);
        
        // Update state
        state.current_airport = returnLeg.arrival_airport;
        state.current_time = new Date(returnLeg.arrival_time);
        state.visited_routes.add(returnLeg.route_id);
        this.incrementAirportVisit(state, returnLeg.arrival_airport);
        
        DebugHelper.logState(`After return leg`, state);
      } else {
        return { 
          success: false, 
          message: `Cannot return to base from ${state.current_airport}`, 
          legs: legs 
        };
      }
    }
    
    return {
      success: true,
      message: 'Trip planned successfully',
      legs: legs
    };
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
    } catch {
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