import { Route } from '../types/apiTypes';
import { ScheduleConfiguration } from '../types/inputTypes';

/**
 * Service for applying biasing to route selection based on preferences
 */
export class BiasService {
  /**
   * Apply biasing to route selection based on preferences
   */
  applyBiasing(
    routes: Route[],
    config: ScheduleConfiguration,
    visitedAirports: Map<string, number>
  ): { route: Route; weight: number }[] {
    return routes.map(route => {
      let weight = 1.0;
      
      // Bias for preferred countries
      if (config.preferred_countries.includes(route.arrival_country)) {
        weight *= 1.4; // +40%
      }
      
      // Bias for preferred regions
      if (config.preferred_regions.includes(this.getContinent(route.arrival_country))) {
        weight *= 1.2; // +20%
      }
      
      // Novelty bias - reduce weight for frequently visited airports
      const visitCount = visitedAirports.get(route.arrival_iata) || 0;
      if (visitCount > 0) {
        // Reduce by 10% for each previous visit, to a minimum of 30%
        weight *= Math.max(0.3, 1 - (visitCount * 0.1));
      }
      
      return { route, weight };
    });
  }

  /**
   * Get continent code from country (simplified mapping)
   * This is a simplified implementation - in a real application, we'd use a more
   * comprehensive mapping or get this data from the API.
   */
  private getContinent(country: string): string {
    const continentMap: Record<string, string> = {
      'United States': 'NA',
      'Canada': 'NA',
      'Mexico': 'NA',
      'United Kingdom': 'EU',
      'France': 'EU',
      'Germany': 'EU',
      'Italy': 'EU',
      'Spain': 'EU',
      'Portugal': 'EU',
      'China': 'AS',
      'Japan': 'AS',
      'South Korea': 'AS',
      'Australia': 'OC',
      'New Zealand': 'OC',
      'Brazil': 'SA',
      'Argentina': 'SA',
      'South Africa': 'AF',
      'Egypt': 'AF',
      'Morocco': 'AF'
    };

    return continentMap[country] || ''; // Return empty string if not found
  }
}

// Singleton instance
export const biasService = new BiasService();
