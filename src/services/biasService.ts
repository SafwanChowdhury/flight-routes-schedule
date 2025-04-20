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
    visitedAirports: Map<string, number>,
    preferredAirports?: Set<string>
  ): { route: Route; weight: number }[] {
    // Debug log preferred airports
    if (preferredAirports?.size) {
      console.log(`[BIAS DEBUG] Preferred airports: ${Array.from(preferredAirports).join(', ')}`);
      console.log(`[BIAS DEBUG] Destination repetition bias: ${config.destination_repetition_bias}`);
    }

    const weightedRoutes = routes.map(route => {
      let weight = 1.0;
      let biasApplied = '';
      
      // Handle destination repetition bias
      if (preferredAirports?.size && config.destination_repetition_bias > 0) {
        if (preferredAirports.has(route.arrival_iata)) {
          // If this is a preferred airport, boost its weight based on the bias value
          const biasBoost = 1 + config.destination_repetition_bias;
          weight *= biasBoost;
          biasApplied += `preferred airport boost (${biasBoost}x), `;
          console.log(`[BIAS DEBUG] ${route.departure_iata} → ${route.arrival_iata}: BOOSTED as preferred destination, weight: ${weight.toFixed(2)}`);
        } else if (config.destination_repetition_bias === 1) {
          // If bias is 1, we should only select preferred airports
          weight = 0;
          biasApplied += 'zero weight (non-preferred), ';
          console.log(`[BIAS DEBUG] ${route.departure_iata} → ${route.arrival_iata}: ZEROED as non-preferred destination, bias: ${config.destination_repetition_bias}`);
        }
      }
      
      // Only apply region and country bias if we're not forcing preferred airports
      if (config.destination_repetition_bias < 1) {
        // Bias for preferred countries
        if (config.preferred_countries.includes(route.arrival_country)) {
          weight *= 1.4; // +40%
          biasApplied += 'country (1.4x), ';
        }
        
        // Bias for preferred regions
        if (config.preferred_regions.includes(this.getContinent(route.arrival_country))) {
          weight *= 1.2; // +20%
          biasApplied += 'region (1.2x), ';
        }
      }
      
      // Novelty bias - reduce weight for frequently visited airports
      // Only apply if we're not using destination repetition bias
      if (!preferredAirports?.has(route.arrival_iata)) {
        const visitCount = visitedAirports.get(route.arrival_iata) || 0;
        if (visitCount > 0) {
          // Reduce by 10% for each previous visit, to a minimum of 30%
          const noveltyFactor = Math.max(0.3, 1 - (visitCount * 0.1));
          weight *= noveltyFactor;
          biasApplied += `novelty (${noveltyFactor.toFixed(2)}x), `;
        }
      }
      
      if (biasApplied) {
        console.log(`[BIAS DEBUG] ${route.departure_iata} → ${route.arrival_iata}: weight ${weight.toFixed(2)}, bias: ${biasApplied}`);
      }
      
      return { route, weight };
    });

    // Debug summary statistics
    if (preferredAirports?.size && config.destination_repetition_bias === 1) {
      const preferredRoutes = weightedRoutes.filter(r => r.weight > 0);
      console.log(`[BIAS DEBUG] Preferred routes available: ${preferredRoutes.length}`);
      
      if (preferredRoutes.length === 0) {
        console.log('[BIAS DEBUG] WARNING: No preferred routes available, falling back to normal selection');
        // Restore all weights to allow selection, but add a warning
        weightedRoutes.forEach(r => {
          r.weight = 1.0;
          // Add a log to verify each route's weight is actually being updated
          console.log(`[BIAS DEBUG] Reset weight for ${r.route.departure_iata} → ${r.route.arrival_iata} to ${r.weight}`);
        });
      } else {
        preferredRoutes.forEach(r => {
          console.log(`[BIAS DEBUG] Will consider: ${r.route.departure_iata} → ${r.route.arrival_iata}`);
        });
      }
    }
    
    return weightedRoutes;
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
