/**
 * Schedule generator configuration input types
 */

export interface OperatingHours {
  start: string; // 24h format "06:00"
  end: string;   // 24h format "23:00"
}

export interface HaulPreferences {
  short: boolean;
  medium: boolean;
  long: boolean;
}

export interface HaulWeighting {
  short: number;
  medium: number;
  long: number;
}

export interface ScheduleConfiguration {
  airline_id: number;
  airline_name: string;
  airline_iata?: string;  // Added this field
  start_airport: string;  // IATA code
  days: number;
  haul_preferences: HaulPreferences;
  haul_weighting: HaulWeighting;
  prefer_single_leg_day_ratio: number;  // 0.0 to 1.0
  operating_hours: OperatingHours;
  turnaround_time_minutes: number;
  preferred_countries: string[];
  preferred_regions: string[];
  minimum_rest_hours_between_long_haul: number;
}