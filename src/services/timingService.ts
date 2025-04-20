import { OperatingHours } from '../types/inputTypes';
import { Route } from '../types/apiTypes';
import { ScheduleConfiguration } from '../types/inputTypes';

/**
 * Service for handling time-related calculations and checks
 */
export class TimingService {
  /**
   * Check if a time is within operating hours
   */
  isWithinOperatingHours(
    time: Date, 
    operatingHours: OperatingHours
  ): boolean {
    const timeHours = time.getHours();
    const timeMinutes = time.getMinutes();
    
    const [startHours, startMinutes] = operatingHours.start
      .split(':')
      .map(n => parseInt(n, 10));
      
    const [endHours, endMinutes] = operatingHours.end
      .split(':')
      .map(n => parseInt(n, 10));
    
    const timeValue = timeHours * 60 + timeMinutes;
    const startValue = startHours * 60 + startMinutes;
    const endValue = endHours * 60 + endMinutes;
    
    return timeValue >= startValue && timeValue <= endValue;
  }
  
  /**
   * Calculate arrival time based on departure time and duration
   */
  calculateArrivalTime(departureTime: Date, durationMinutes: number): Date {
    const arrivalTime = new Date(departureTime);
    arrivalTime.setMinutes(arrivalTime.getMinutes() + durationMinutes);
    return arrivalTime;
  }
  
  /**
   * Check if return to base is feasible on the current day
   */
  isReturnFeasible(
    currentTime: Date,
    currentAirport: string,
    baseAirport: string,
    routes: Route[],
    config: ScheduleConfiguration
  ): boolean {
    if (currentAirport === baseAirport) {
      return true;
    }
    
    // Find direct routes back to base
    const routesToBase = routes.filter(route => 
      route.departure_iata === currentAirport && 
      route.arrival_iata === baseAirport
    );
    
    if (routesToBase.length === 0) {
      return false;
    }
    
    // Add turnaround time to current time
    const earliestDeparture = new Date(currentTime);
    earliestDeparture.setMinutes(
      earliestDeparture.getMinutes() + config.turnaround_time_minutes
    );
    
    // Check if any route can depart and arrive within operating hours
    for (const route of routesToBase) {
      if (this.isWithinOperatingHours(earliestDeparture, config.operating_hours)) {
        const arrivalTime = this.calculateArrivalTime(
          earliestDeparture, 
          route.duration_min
        );
        
        // Return is feasible if it arrives before midnight
        const arrivalDay = arrivalTime.getDate();
        const currentDay = currentTime.getDate();
        
        if (arrivalDay === currentDay) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * Find the earliest possible return flight to base
   */
  findEarliestReturnFlight(
    currentTime: Date, 
    currentAirport: string,
    baseAirport: string,
    routes: Route[],
    config: ScheduleConfiguration
  ): { route: Route; departureTime: Date } | null {
    if (currentAirport === baseAirport) {
      return null; // Already at base
    }
    
    // Find direct routes back to base
    const routesToBase = routes.filter(route => 
      route.departure_iata === currentAirport && 
      route.arrival_iata === baseAirport
    );
    
    if (routesToBase.length === 0) {
      return null; // No routes to base
    }
    
    // Add turnaround time to current time
    const earliestPossibleDeparture = new Date(currentTime);
    earliestPossibleDeparture.setMinutes(
      earliestPossibleDeparture.getMinutes() + config.turnaround_time_minutes
    );
    
    // If we're outside operating hours, find the next day's first operating hour
    if (!this.isWithinOperatingHours(earliestPossibleDeparture, config.operating_hours)) {
      const [startHours, startMinutes] = config.operating_hours.start
        .split(':')
        .map(n => parseInt(n, 10));
      
      const nextDay = new Date(earliestPossibleDeparture);
      nextDay.setDate(nextDay.getDate() + 1);
      nextDay.setHours(startHours, startMinutes, 0, 0);
      
      earliestPossibleDeparture.setTime(nextDay.getTime());
    }
    
    // Find the earliest route that can be taken
    let bestRoute: Route | null = null;
    let bestDepartureTime: Date | null = null;
    
    for (const route of routesToBase) {
      const departureTime = new Date(earliestPossibleDeparture);
      
      // Check if this is a valid route to take
      if (this.isWithinOperatingHours(departureTime, config.operating_hours)) {
        if (!bestRoute || route.duration_min < bestRoute.duration_min) {
          bestRoute = route;
          bestDepartureTime = departureTime;
        }
      }
    }
    
    if (bestRoute && bestDepartureTime) {
      return {
        route: bestRoute,
        departureTime: bestDepartureTime
      };
    }
    
    return null;
  }
  
  /**
   * Format a date to display time in HH:MM format
   */
  formatTimeDisplay(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }
  
  /**
   * Format a date to ISO date string (YYYY-MM-DD)
   */
  formatDateDisplay(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}