/**
 * Feed Adapters Registry
 *
 * Exports all available feed adapters and provides
 * a function to register them with the normalizer service.
 */

import { registerAdapter } from '../normalizer.service';

import { aisAdapter } from './ais.adapter';
import { civilUnrestAdapter } from './civil-unrest.adapter';
import { citizenAdapter } from './crowdsourced/citizen.adapter';
import { fireAdapter } from './fire.adapter';
import { flightAdapter } from './flight.adapter';
import { firmsInfrastructureAdapter } from './infrastructure/firms.adapter';
import { nrcAdapter } from './infrastructure/nrc.adapter';
import { powerOutageAdapter } from './infrastructure/power-outage.adapter';
import { maritimeAdapter } from './maritime.adapter';
import { newsAdapter } from './news.adapter';
import { telegramAdapter } from './telegram';
import { dotCameraAdapter } from './traffic/dot-camera.adapter';

// Export all adapters
export { newsAdapter } from './news.adapter';
export { civilUnrestAdapter } from './civil-unrest.adapter';
export { flightAdapter } from './flight.adapter';
export { maritimeAdapter } from './maritime.adapter';
export { fireAdapter } from './fire.adapter';
export { telegramAdapter, TelegramAdapter } from './telegram';
export {
  aisAdapter,
  AisAdapter,
  SHIP_TYPES,
  NAV_STATUS,
  SHIP_TYPE_COLORS,
  type AISMessage,
  type BoundingBox,
} from './ais.adapter';

// Export specialized unrest adapters
export { acledAdapter, ACLEDAdapter } from './unrest/acled.adapter';
export { gdeltEventsAdapter, GDELTEventsAdapter } from './unrest/gdelt-events.adapter';

// Export infrastructure adapters
export {
  FIRMSInfrastructureAdapter,
  firmsInfrastructureAdapter,
  NRCAdapter,
  nrcAdapter,
  PowerOutageAdapter,
  powerOutageAdapter,
} from './infrastructure';
export { DOTCameraAdapter, dotCameraAdapter } from './traffic';
export { CitizenAdapter, citizenAdapter } from './crowdsourced';

// All available adapters
export const allAdapters = [
  newsAdapter,
  civilUnrestAdapter,
  flightAdapter,
  maritimeAdapter,
  aisAdapter,
  fireAdapter,
  telegramAdapter,
  // Infrastructure adapters
  firmsInfrastructureAdapter,
  nrcAdapter,
  powerOutageAdapter,
  dotCameraAdapter,
  citizenAdapter,
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
