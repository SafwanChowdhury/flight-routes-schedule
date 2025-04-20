import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import config from '../config';
import { 
  Route, 
  RoutesResponse, 
  AirlinesResponse, 
  AirportsResponse, 
  AirportRoutesResponse 
} from '../types/apiTypes';

class ApiClient {
  private client: AxiosInstance;
  private routeCache: Map<string, Route[]>;

  constructor() {
    this.client = axios.create({
      baseURL: config.api.baseUrl,
      timeout: config.api.timeout,
    });
    this.routeCache = new Map<string, Route[]>();

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      response => response,
      error => {
        console.error('API Error:', error.message);
        if (error.response) {
          console.error('Response data:', error.response.data);
          console.error('Response status:', error.response.status);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Fetch all routes for a specific airline
   */
  async getRoutesForAirline(airlineId: number): Promise<Route[]> {
    const cacheKey = `airline_${airlineId}`;
    
    // Check cache first
    if (this.routeCache.has(cacheKey)) {
      console.log(`Using cached routes for airline ${airlineId}`);
      return this.routeCache.get(cacheKey) || [];
    }

    console.log(`Fetching routes for airline ${airlineId}...`);
    
    try {
      const params = {
        airline_id: airlineId,
        all: true, // Get all routes without pagination
      };

      const response = await this.client.get<RoutesResponse>('/routes', { params });
      const routes = response.data.routes;
      
      // Cache the routes
      this.routeCache.set(cacheKey, routes);
      
      console.log(`Fetched ${routes.length} routes for airline ${airlineId}`);
      return routes;
    } catch (error) {
      console.error(`Failed to fetch routes for airline ${airlineId}:`, error);
      throw new Error(`Failed to fetch routes for airline ${airlineId}`);
    }
  }

  /**
   * Get all routes from a specific airport
   */
  async getRoutesFromAirport(
    iata: string, 
    airlineId?: number,
    airlineName?: string
  ): Promise<Route[]> {
    const cacheKey = `airport_${iata}_${airlineId || ''}_${airlineName || ''}`;
    
    // Check cache first
    if (this.routeCache.has(cacheKey)) {
      return this.routeCache.get(cacheKey) || [];
    }
    
    try {
      const params: Record<string, any> = {
        direction: 'departure',
        all: true,
      };
      
      if (airlineId) {
        params.airline_id = airlineId;
      }
      
      if (airlineName) {
        params.airline_name = airlineName;
      }

      const response = await this.client.get<AirportRoutesResponse>(
        `/airports/${iata}/routes`, 
        { params }
      );
      
      const routes = response.data.routes;
      
      // Cache the routes
      this.routeCache.set(cacheKey, routes);
      
      return routes;
    } catch (error) {
      console.error(`Failed to fetch routes from airport ${iata}:`, error);
      throw new Error(`Failed to fetch routes from airport ${iata}`);
    }
  }

  /**
   * Get all airlines
   */
  async getAirlines(): Promise<AirlinesResponse> {
    try {
      const response = await this.client.get<AirlinesResponse>('/airlines');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch airlines:', error);
      throw new Error('Failed to fetch airlines');
    }
  }

  /**
   * Get airline details by ID
   */
  async getAirlineById(id: number): Promise<AirlinesResponse['airlines'][0] | null> {
    try {
      const airlines = await this.getAirlines();
      return airlines.airlines.find(airline => airline.id === id) || null;
    } catch (error) {
      console.error(`Failed to fetch airline with ID ${id}:`, error);
      throw new Error(`Failed to fetch airline with ID ${id}`);
    }
  }

  /**
   * Get airport details
   */
  async getAirport(iata: string): Promise<AirportsResponse['airports'][0] | null> {
    try {
      const response = await this.client.get<AirportsResponse>('/airports', {
        params: { iata }
      });
      return response.data.airports.find(airport => airport.iata === iata) || null;
    } catch (error) {
      console.error(`Failed to fetch airport ${iata}:`, error);
      throw new Error(`Failed to fetch airport ${iata}`);
    }
  }

  /**
   * Clear the route cache
   */
  clearCache(): void {
    this.routeCache.clear();
  }
}

// Singleton instance
export const apiClient = new ApiClient();
