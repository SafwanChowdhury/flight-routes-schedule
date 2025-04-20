import axios from 'axios';
import { ScheduleConfiguration } from '../src/types/inputTypes';
import { GeneratedSchedule } from '../src/types/outputTypes';

/**
 * Test client for the schedule generator API
 */
class ScheduleGeneratorClient {
  private baseUrl: string;
  
  constructor(baseUrl = 'http://localhost:3001/api/schedule') {
    this.baseUrl = baseUrl;
  }
  
  /**
   * Generate a schedule
   */
  async generateSchedule(config: ScheduleConfiguration): Promise<GeneratedSchedule> {
    try {
      const response = await axios.post<{ status: string; schedule: GeneratedSchedule }>(
        `${this.baseUrl}/generate`, 
        config
      );
      return response.data.schedule;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(`Schedule generation failed: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }
  
  /**
   * Validate a schedule configuration
   */
  async validateConfiguration(config: ScheduleConfiguration): Promise<{ valid: boolean; errors?: string[] }> {
    try {
      await axios.post(`${this.baseUrl}/validate`, config);
      return { valid: true };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errors = error.response.data.errors;
        return { 
          valid: false, 
          errors: Array.isArray(errors) ? errors : [error.response.data.message] 
        };
      }
      return { valid: false, errors: ['Unknown error'] };
    }
  }
  
  /**
   * Get all airlines
   */
  async getAirlines(): Promise<{ id: number; iata: string; name: string }[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/airlines`);
      return response.data.airlines;
    } catch (error) {
      console.error('Error fetching airlines:', error);
      throw new Error('Failed to fetch airlines');
    }
  }
  
  /**
   * Get an airline by ID
   */
  async getAirlineById(id: number): Promise<{ id: number; iata: string; name: string } | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/airline/${id}`);
      return response.data.airline;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response && error.response.status === 404) {
        return null;
      }
      console.error(`Error fetching airline ${id}:`, error);
      throw new Error(`Failed to fetch airline ${id}`);
    }
  }
}

// Example usage
async function testScheduleGeneration() {
  const client = new ScheduleGeneratorClient();
  
  try {
    // Sample configuration for British Airways
    const config: ScheduleConfiguration = {
      airline_id: 24,
      airline_name: 'British Airways',
      start_airport: 'LHR',
      days: 3,
      haul_preferences: {
        short: true,
        medium: true,
        long: true
      },
      haul_weighting: {
        short: 0.5,
        medium: 0.3,
        long: 0.2
      },
      prefer_single_leg_day_ratio: 0.4,
      operating_hours: {
        start: '06:00',
        end: '23:00'
      },
      turnaround_time_minutes: 45,
      preferred_countries: ['Italy', 'Spain', 'France'],
      preferred_regions: ['EU'],
      minimum_rest_hours_between_long_haul: 8
    };
    
    // Validate the configuration
    const validationResult = await client.validateConfiguration(config);
    
    if (!validationResult.valid) {
      console.error('Configuration is invalid:', validationResult.errors);
      return;
    }
    
    console.log('Configuration is valid, generating schedule...');
    
    // Generate the schedule
    const schedule = await client.generateSchedule(config);
    
    console.log(`Generated schedule: ${schedule.name}`);
    console.log(`Total days: ${schedule.days.length}`);
    
    // Print a summary of the schedule
    schedule.days.forEach(day => {
      console.log(`Day ${day.day} (${day.date}):`);
      
      day.legs.forEach(leg => {
        const departureTime = new Date(leg.departure_time).toLocaleTimeString();
        const arrivalTime = new Date(leg.arrival_time).toLocaleTimeString();
        
        console.log(`  ${departureTime} ${leg.departure_airport} → ${leg.arrival_airport} ${arrivalTime} (${leg.haul_type})`);
      });
      
      console.log(`  Overnight: ${day.overnight_location}`);
      
      if (day.notes.length > 0) {
        console.log(`  Notes: ${day.notes.join(', ')}`);
      }
      
      console.log('');
    });
  } catch (error) {
    console.error('Error testing schedule generator:', error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testScheduleGeneration().catch(console.error);
}

export default ScheduleGeneratorClient;