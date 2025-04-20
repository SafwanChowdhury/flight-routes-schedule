import { GeneratorState, DaySchedule, GeneratedSchedule } from '../types/outputTypes';

/**
 * Helper utilities for debugging the schedule generation algorithm
 */
export class DebugHelper {
  /**
   * Logs the current state of the schedule generation process
   */
  static logState(message: string, state: GeneratorState): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${message}`);
      console.log(`  Current airport: ${state.current_airport}`);
      console.log(`  Current time: ${state.current_time.toISOString()}`);
      console.log(`  Visited airports: ${Array.from(state.visited_airports.entries()).map(([k, v]) => `${k}(${v})`).join(', ')}`);
      
      if (state.long_haul_block_until) {
        console.log(`  Long haul block until: ${state.long_haul_block_until.toISOString()}`);
      }
      
      console.log(`  Generated days: ${state.generated_days.length}`);
      console.log(`  Days away from base: ${state.consecutive_days_away_from_base}`);
      console.log('---');
    }
  }
  
  /**
   * Creates a text visualization of the schedule
   */
  static visualizeSchedule(schedule: GeneratedSchedule): string {
    let output = `Schedule: ${schedule.name}\n`;
    output += `Base: ${schedule.config.start_airport}\n`;
    output += `Airline: ${schedule.config.airline_name}\n\n`;
    
    schedule.days.forEach(day => {
      output += `Day ${day.day} (${day.date}):\n`;
      
      if (day.legs.length === 0) {
        output += `  No flights\n`;
      } else {
        day.legs.forEach(leg => {
          const departureTime = new Date(leg.departure_time).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          });
          const arrivalTime = new Date(leg.arrival_time).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          });
          
          output += `  ${departureTime} ${leg.departure_airport} → ${leg.arrival_airport} ${arrivalTime} (${leg.haul_type})\n`;
        });
      }
      
      output += `  Overnight: ${day.overnight_location}\n`;
      
      if (day.notes.length > 0) {
        output += `  Notes: ${day.notes.join(', ')}\n`;
      }
      
      output += `\n`;
    });
    
    return output;
  }

  /**
   * Logs route selection information
   */
  static logRouteSelection(
    message: string,
    routesCount: number,
    filteredCount: number,
    selectedRoute: any | null
  ): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[ROUTE SELECTION] ${message}`);
      console.log(`  Total routes: ${routesCount}`);
      console.log(`  Filtered routes: ${filteredCount}`);
      
      if (selectedRoute) {
        console.log(`  Selected: ${selectedRoute.departure_iata} → ${selectedRoute.arrival_iata} (${selectedRoute.duration_min} mins)`);
      } else {
        console.log(`  No route selected`);
      }
      
      console.log('---');
    }
  }
}
