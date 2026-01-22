/**
 * Feed Adapters Registry
 *
 * Exports all available feed adapters and provides
 * a function to register them with the normalizer service.
 */

import { registerAdapter } from '../normalizer.service';

import { civilUnrestAdapter } from './civil-unrest.adapter';
import { fireAdapter } from './fire.adapter';
import { flightAdapter } from './flight.adapter';
import { maritimeAdapter } from './maritime.adapter';
import { newsAdapter } from './news.adapter';
import { telegramAdapter } from './telegram.adapter';

// Export all adapters
export { newsAdapter } from './news.adapter';
export { civilUnrestAdapter } from './civil-unrest.adapter';
export { flightAdapter } from './flight.adapter';
export { maritimeAdapter } from './maritime.adapter';
export { fireAdapter } from './fire.adapter';
export { telegramAdapter } from './telegram.adapter';

// Export specialized unrest adapters
export { acledAdapter, ACLEDAdapter } from './unrest/acled.adapter';
export { gdeltEventsAdapter, GDELTEventsAdapter } from './unrest/gdelt-events.adapter';

// All available adapters
export const allAdapters = [
  newsAdapter,
  civilUnrestAdapter,
  flightAdapter,
  maritimeAdapter,
  fireAdapter,
  telegramAdapter,
];

/**
 * Register all adapters with the normalizer service
 */
export function registerAllAdapters(): void {
  console.log('[Adapters] Registering all feed adapters...');

  for (const adapter of allAdapters) {
    registerAdapter(adapter);
  }

  console.log(`[Adapters] Registered ${allAdapters.length} adapters`);
}

/**
 * Get adapter information for API responses
 */
export function getAdapterInfo(): {
  type: string;
  name: string;
  description: string;
  requiredConfig: string[];
  defaultConfig: Record<string, unknown>;
}[] {
  return allAdapters.map((adapter) => ({
    type: adapter.type,
    name: adapter.name,
    description: adapter.description,
    requiredConfig: adapter.requiredConfig,
    defaultConfig: adapter.getDefaultConfig() as Record<string, unknown>,
  }));
}
