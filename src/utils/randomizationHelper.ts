/**
 * Helper functions for randomization
 */

/**
 * Get a random integer between min and max (inclusive)
 */
export function getRandomInt(min: number, max: number): number {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Pick a random item from an array
 */
export function pickRandom<T>(array: T[]): T {
  if (array.length === 0) {
    throw new Error('Cannot pick from an empty array');
  }
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Pick multiple random items from an array without duplicates
 */
export function pickRandomMultiple<T>(array: T[], count: number): T[] {
  if (count > array.length) {
    throw new Error('Cannot pick more items than array length');
  }

  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * Perform weighted random selection
 * @param items Array of items with weights
 * @returns Selected item
 */
export function weightedRandomSelection<T>(items: { item: T; weight: number }[]): T {
  if (items.length === 0) {
    throw new Error('Cannot select from an empty array');
  }

  // Log each item's weight for debugging
  items.forEach((item, index) => {
    if (typeof item.item === 'object' && item.item !== null && 'arrival_iata' in item.item && 'departure_iata' in item.item) {
      const route = item.item as unknown as Record<string, string>;
      console.log(`[RANDOM DEBUG] Item ${index}: ${route.departure_iata} → ${route.arrival_iata}, weight: ${item.weight.toFixed(2)}`);
    }
  });

  // Calculate total weight
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  
  console.log(`[RANDOM DEBUG] Total weight: ${totalWeight.toFixed(2)}`);
  
  // If total weight is 0, select randomly
  if (totalWeight === 0) {
    console.log(`[RANDOM DEBUG] Total weight is 0, selecting randomly`);
    return items[Math.floor(Math.random() * items.length)].item;
  }
  
  // Generate a random value between 0 and total weight
  const randomValue = Math.random() * totalWeight;
  console.log(`[RANDOM DEBUG] Random value: ${randomValue.toFixed(2)}`);
  
  // Find the item based on the random value
  let cumulativeWeight = 0;
  
  for (const { item, weight } of items) {
    cumulativeWeight += weight;
    if (randomValue <= cumulativeWeight) {
      // Use type checking instead of direct property access
      if (typeof item === 'object' && item !== null && 'arrival_iata' in item && 'departure_iata' in item) {
        const route = item as unknown as Record<string, string>;
        console.log(`[RANDOM DEBUG] Selected route: ${route.departure_iata} → ${route.arrival_iata} (weight: ${weight.toFixed(2)}, cumulative: ${cumulativeWeight.toFixed(2)})`);
      } else {
        console.log(`[RANDOM DEBUG] Selected item with weight ${weight.toFixed(2)}, cumulative: ${cumulativeWeight.toFixed(2)}`);
      }
      return item;
    }
  }
  
  // Fallback (should never reach here but TypeScript wants a return)
  console.log(`[RANDOM DEBUG] Fallback selection`);
  return items[0].item;
}

/**
 * Pick a haul type based on preferences and weightings
 */
export function pickHaulType(
  preferences: { short: boolean; medium: boolean; long: boolean },
  weightings: { short: number; medium: number; long: number }
): 'short' | 'medium' | 'long' {
  // Filter to only allowed haul types
  const allowedTypes: ('short' | 'medium' | 'long')[] = [];
  if (preferences.short) allowedTypes.push('short');
  if (preferences.medium) allowedTypes.push('medium');
  if (preferences.long) allowedTypes.push('long');
  
  if (allowedTypes.length === 0) {
    throw new Error('No haul types allowed by preferences');
  }
  
  // If only one type is allowed, return it
  if (allowedTypes.length === 1) {
    return allowedTypes[0];
  }
  
  // Create weighted items
  const weightedItems = allowedTypes.map(type => ({
    item: type,
    weight: weightings[type]
  }));
  
  // Perform weighted selection
  return weightedRandomSelection(weightedItems);
}
