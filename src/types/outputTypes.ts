/**
 * Schedule generator output types
 */
import { ScheduleConfiguration } from './inputTypes';

export type HaulType = 'short' | 'medium' | 'long';

export interface FlightLeg {
  departure_airport: string;
  arrival_airport: string;
  departure_time: string;  // ISO format
  arrival_time: string;    // ISO format
  haul_type: HaulType;
  duration_min: number;
  route_id: number;
  // Additional metadata for UI display
  departure_city?: string;
  departure_country?: string;
  arrival_city?: string;
  arrival_country?: string;
  airline_iata?: string;
  airline_name?: string;
  distance_km?: number;
}

export interface DaySchedule {
  day: number;
  date: string;  // ISO format date
  legs: FlightLeg[];
  overnight_location: string;  // IATA code
  notes: string[];
}

export interface GeneratedSchedule {
  id: string;
  name: string;
  created_at: string;
  config: ScheduleConfiguration;
  days: DaySchedule[];
}

export interface GeneratorState {
  current_airport: string;
  current_date: Date;
  current_time: Date;
  visited_routes: Set<number>;
  visited_airports: Map<string, number>; // airport -> visit count
  long_haul_block_until: Date | null;
  generated_days: DaySchedule[];
  consecutive_days_away_from_base: number;
  future_legs?: FlightLeg[]; // Added property to store legs for future days
}