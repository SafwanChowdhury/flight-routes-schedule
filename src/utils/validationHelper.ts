import { ScheduleConfiguration } from '../types/inputTypes';

/**
 * Validate the schedule configuration input
 */
export function validateConfiguration(
  config: ScheduleConfiguration
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check required fields
  if (!config.airline_id) {
    errors.push('Airline ID is required');
  }
  
  if (!config.airline_name) {
    errors.push('Airline name is required');
  }
  
  if (!config.start_airport) {
    errors.push('Start airport is required');
  }
  
  if (!config.days || config.days < 1 || config.days > 30) {
    errors.push('Days must be between 1 and 30');
  }
  
  // Check haul preferences - at least one must be true
  if (!config.haul_preferences.short && 
      !config.haul_preferences.medium && 
      !config.haul_preferences.long) {
    errors.push('At least one haul type must be allowed');
  }
  
  // Check haul weightings
  if (config.haul_weighting.short < 0 || 
      config.haul_weighting.medium < 0 || 
      config.haul_weighting.long < 0) {
    errors.push('Haul weightings cannot be negative');
  }
  
  // Check single-leg day ratio
  if (config.prefer_single_leg_day_ratio < 0 || config.prefer_single_leg_day_ratio > 1) {
    errors.push('Single leg day ratio must be between 0 and 1');
  }
  
  // Check operating hours format
  try {
    const startParts = config.operating_hours.start.split(':');
    const endParts = config.operating_hours.end.split(':');
    
    if (startParts.length !== 2 || endParts.length !== 2) {
      throw new Error('Invalid time format');
    }
    
    const startHours = parseInt(startParts[0], 10);
    const startMinutes = parseInt(startParts[1], 10);
    const endHours = parseInt(endParts[0], 10);
    const endMinutes = parseInt(endParts[1], 10);
    
    if (isNaN(startHours) || isNaN(startMinutes) || isNaN(endHours) || isNaN(endMinutes)) {
      throw new Error('Time components are not numbers');
    }
    
    if (startHours < 0 || startHours > 23 || endHours < 0 || endHours > 23) {
      throw new Error('Hours must be between 0 and 23');
    }
    
    if (startMinutes < 0 || startMinutes > 59 || endMinutes < 0 || endMinutes > 59) {
      throw new Error('Minutes must be between 0 and 59');
    }
  } catch (error) {
    errors.push(`Invalid operating hours format: ${(error as Error).message}`);
  }
  
  // Check destination repetition bias
  if (config.destination_repetition_bias < 0 || config.destination_repetition_bias > 1) {
    errors.push('Destination repetition bias must be between 0 and 1');
  }
  
  // Check turnaround time
  if (config.turnaround_time_minutes < 30 || config.turnaround_time_minutes > 180) {
    errors.push('Turnaround time must be between 30 and 180 minutes');
  }
  
  // Check minimum rest hours
  if (config.minimum_rest_hours_between_long_haul < 6 || config.minimum_rest_hours_between_long_haul > 24) {
    errors.push('Minimum rest hours between long haul flights must be between 6 and 24');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Format error message from validation errors
 */
export function formatValidationErrors(errors: string[]): string {
  if (errors.length === 0) {
    return '';
  }
  
  return `Validation errors:\n${errors.map(err => `- ${err}`).join('\n')}`;
}
