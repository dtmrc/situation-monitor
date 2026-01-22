/**
 * Entity Extraction Service
 *
 * Extracts named entities from text using pattern-based recognition:
 * - People (with titles)
 * - Organizations (government, military, corporate)
 * - Locations (countries, cities, regions)
 * - Events (protests, attacks, elections)
 *
 * Uses regex patterns for lightweight, dependency-free NER.
 * For production, consider integrating an ML-based NER service.
 */

/**
 * Extracted entities from text
 */
export interface ExtractedEntities {
  /** People (names, titles) */
  people: string[];
  /** Organizations (governments, companies, agencies) */
  organizations: string[];
  /** Locations with optional coordinates */
  locations: Array<{
    name: string;
    type: 'country' | 'city' | 'region' | 'landmark';
    coordinates?: { lat: number; lng: number };
  }>;
  /** Event types detected */
  events: string[];
}

// Entity extraction patterns
const PATTERNS = {
  // Major countries mentioned in geopolitical context
  countries:
    /\b(United States|USA|Russia|Russian Federation|China|PRC|Ukraine|Iran|Israel|Germany|France|United Kingdom|UK|Britain|Japan|India|Brazil|Mexico|Turkey|Saudi Arabia|Egypt|South Korea|North Korea|DPRK|Pakistan|Afghanistan|Syria|Iraq|Libya|Yemen|Taiwan|Poland|Romania|Hungary|Belarus|Georgia|Moldova|Azerbaijan|Armenia|Kazakhstan|Uzbekistan|Venezuela|Colombia|Argentina|Chile|Nigeria|South Africa|Kenya|Ethiopia|Australia|Canada|Indonesia|Philippines|Vietnam|Thailand|Myanmar|Malaysia|Singapore)\b/gi,

  // Major cities and capitals
  cities:
    /\b(Washington|Washington D\.?C\.?|Moscow|Beijing|Kyiv|Kiev|Tehran|Jerusalem|Tel Aviv|Berlin|Paris|London|Tokyo|Delhi|New Delhi|Brasilia|Riyadh|Cairo|Seoul|Pyongyang|Kabul|Damascus|Baghdad|New York|Los Angeles|Chicago|Houston|San Francisco|Miami|Boston|Seattle|Atlanta|Denver|Phoenix|Philadelphia|Detroit|Minneapolis|Tampa|Portland|Las Vegas|Austin|Nashville|Charlotte|San Diego|Dallas|Orlando|Ankara|Istanbul|Mumbai|Shanghai|Hong Kong|Shenzhen|Taipei|Bangkok|Jakarta|Manila|Hanoi|Ho Chi Minh City|Kuala Lumpur|Singapore|Sydney|Melbourne|Toronto|Montreal|Vancouver|Dubai|Abu Dhabi|Doha|Beirut|Amman|Sanaa|Tripoli|Tunis|Algiers|Rabat|Lagos|Nairobi|Addis Ababa|Johannesburg|Cape Town|Pretoria)\b/gi,

  // Government and international organizations
  organizations:
    /\b(United Nations|UN|NATO|European Union|EU|World Bank|IMF|International Monetary Fund|WHO|World Health Organization|CIA|FBI|NSA|DIA|Pentagon|Kremlin|White House|State Department|Ministry of|Department of|Foreign Ministry|Defense Ministry|Congress|Senate|Parliament|Bundestag|Duma|Supreme Court|European Commission|European Parliament|ASEAN|African Union|Arab League|OPEC|G7|G20|WTO|World Trade Organization|ICC|International Criminal Court|IAEA|Interpol|Red Cross|ICRC|Amnesty International|Human Rights Watch|Reporters Without Borders|Médecins Sans Frontières|UNHCR|UNICEF|UNESCO|World Economic Forum|Davos)\b/gi,

  // Military and security organizations
  militaryOrgs:
    /\b(Army|Navy|Air Force|Marines|Marine Corps|Coast Guard|National Guard|Special Forces|Special Operations|Delta Force|Navy SEALs|Green Berets|SAS|Spetsnaz|GRU|FSB|KGB|Mossad|Shin Bet|MI5|MI6|BND|DGSE|MSS|PLA|People's Liberation Army|IDF|Israel Defense Forces|Revolutionary Guard|IRGC|Hezbollah|Hamas|Taliban|ISIS|ISIL|Islamic State|Al-Qaeda|Al Qaeda|Boko Haram|Wagner Group|PMC)\b/gi,

  // Person titles and names pattern
  personTitles:
    /\b(President|Prime Minister|Chancellor|Secretary|Minister|General|Admiral|Colonel|Major|Captain|Lieutenant|Commander|Chief|Chairman|CEO|Director|Ambassador|Senator|Representative|Congressman|Congresswoman|Governor|Mayor|Judge|Justice|King|Queen|Prince|Princess|Emperor|Emir|Sheikh|Sultan|Pope|Cardinal|Archbishop|Bishop|Ayatollah|Grand Mufti)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/g,

  // Named person pattern (First Last or First Middle Last)
  personNames: /\b([A-Z][a-z]+\s+(?:[A-Z]\.\s+)?[A-Z][a-z]+)\b/g,

  // Event types
  eventTypes:
    /\b(protest|protests|demonstration|demonstrations|rally|rallies|march|strike|strikes|riot|riots|clash|clashes|unrest|uprising|coup|revolution|election|elections|referendum|summit|talks|negotiations|ceasefire|truce|attack|attacks|bombing|bombings|explosion|explosions|shooting|shootings|assassination|hostage|kidnapping|embargo|sanctions|blockade|invasion|offensive|withdrawal|deployment|mobilization)\b/gi,
};

// Coordinate database for major locations
const COUNTRY_COORDS: Record<string, { lat: number; lng: number }> = {
  'United States': { lat: 39.8283, lng: -98.5795 },
  USA: { lat: 39.8283, lng: -98.5795 },
  Russia: { lat: 61.524, lng: 105.3188 },
  'Russian Federation': { lat: 61.524, lng: 105.3188 },
  China: { lat: 35.8617, lng: 104.1954 },
  PRC: { lat: 35.8617, lng: 104.1954 },
  Ukraine: { lat: 48.3794, lng: 31.1656 },
  Iran: { lat: 32.4279, lng: 53.688 },
  Israel: { lat: 31.0461, lng: 34.8516 },
  Germany: { lat: 51.1657, lng: 10.4515 },
  France: { lat: 46.2276, lng: 2.2137 },
  'United Kingdom': { lat: 55.3781, lng: -3.436 },
  UK: { lat: 55.3781, lng: -3.436 },
  Britain: { lat: 55.3781, lng: -3.436 },
  Japan: { lat: 36.2048, lng: 138.2529 },
  India: { lat: 20.5937, lng: 78.9629 },
  Brazil: { lat: -14.235, lng: -51.9253 },
  Turkey: { lat: 38.9637, lng: 35.2433 },
  'Saudi Arabia': { lat: 23.8859, lng: 45.0792 },
  Egypt: { lat: 26.8206, lng: 30.8025 },
  'South Korea': { lat: 35.9078, lng: 127.7669 },
  'North Korea': { lat: 40.3399, lng: 127.5101 },
  DPRK: { lat: 40.3399, lng: 127.5101 },
  Pakistan: { lat: 30.3753, lng: 69.3451 },
  Afghanistan: { lat: 33.9391, lng: 67.71 },
  Syria: { lat: 34.8021, lng: 38.9968 },
  Iraq: { lat: 33.2232, lng: 43.6793 },
  Taiwan: { lat: 23.6978, lng: 120.9605 },
  Poland: { lat: 51.9194, lng: 19.1451 },
  Belarus: { lat: 53.7098, lng: 27.9534 },
};

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Washington: { lat: 38.9072, lng: -77.0369 },
  'Washington D.C.': { lat: 38.9072, lng: -77.0369 },
  'Washington DC': { lat: 38.9072, lng: -77.0369 },
  Moscow: { lat: 55.7558, lng: 37.6173 },
  Beijing: { lat: 39.9042, lng: 116.4074 },
  Kyiv: { lat: 50.4501, lng: 30.5234 },
  Kiev: { lat: 50.4501, lng: 30.5234 },
  Tehran: { lat: 35.6892, lng: 51.389 },
  Jerusalem: { lat: 31.7683, lng: 35.2137 },
  'Tel Aviv': { lat: 32.0853, lng: 34.7818 },
  Berlin: { lat: 52.52, lng: 13.405 },
  Paris: { lat: 48.8566, lng: 2.3522 },
  London: { lat: 51.5074, lng: -0.1278 },
  Tokyo: { lat: 35.6762, lng: 139.6503 },
  Delhi: { lat: 28.6139, lng: 77.209 },
  'New Delhi': { lat: 28.6139, lng: 77.209 },
  'New York': { lat: 40.7128, lng: -74.006 },
  'Los Angeles': { lat: 34.0522, lng: -118.2437 },
  Chicago: { lat: 41.8781, lng: -87.6298 },
  Istanbul: { lat: 41.0082, lng: 28.9784 },
  Ankara: { lat: 39.9334, lng: 32.8597 },
  Mumbai: { lat: 19.076, lng: 72.8777 },
  Shanghai: { lat: 31.2304, lng: 121.4737 },
  'Hong Kong': { lat: 22.3193, lng: 114.1694 },
  Taipei: { lat: 25.033, lng: 121.5654 },
  Bangkok: { lat: 13.7563, lng: 100.5018 },
  Jakarta: { lat: -6.2088, lng: 106.8456 },
  Singapore: { lat: 1.3521, lng: 103.8198 },
  Sydney: { lat: -33.8688, lng: 151.2093 },
  Toronto: { lat: 43.6532, lng: -79.3832 },
  Dubai: { lat: 25.2048, lng: 55.2708 },
  Riyadh: { lat: 24.7136, lng: 46.6753 },
  Cairo: { lat: 30.0444, lng: 31.2357 },
  Lagos: { lat: 6.5244, lng: 3.3792 },
  Nairobi: { lat: -1.2921, lng: 36.8219 },
};

/**
 * Extract entities from text
 *
 * @param text - Text to analyze
 * @returns Extracted entities
 */
export function extractEntities(text: string): ExtractedEntities {
  const entities: ExtractedEntities = {
    people: [],
    organizations: [],
    locations: [],
    events: [],
  };

  // Extract countries
  const countries = new Set<string>();
  let match;

  while ((match = PATTERNS.countries.exec(text)) !== null) {
    countries.add(match[0]);
  }

  for (const country of countries) {
    const normalizedCountry = normalizeLocation(country);
    const coords = COUNTRY_COORDS[normalizedCountry] || COUNTRY_COORDS[country];
    entities.locations.push({
      name: normalizedCountry,
      type: 'country',
      coordinates: coords,
    });
  }

  // Extract cities
  const cities = new Set<string>();
  PATTERNS.cities.lastIndex = 0;
  while ((match = PATTERNS.cities.exec(text)) !== null) {
    cities.add(match[0]);
  }

  for (const city of cities) {
    const normalizedCity = normalizeLocation(city);
    const coords = CITY_COORDS[normalizedCity] || CITY_COORDS[city];
    entities.locations.push({
      name: normalizedCity,
      type: 'city',
      coordinates: coords,
    });
  }

  // Extract government/international organizations
  const orgs = new Set<string>();
  PATTERNS.organizations.lastIndex = 0;
  while ((match = PATTERNS.organizations.exec(text)) !== null) {
    orgs.add(match[0]);
  }

  // Extract military organizations
  PATTERNS.militaryOrgs.lastIndex = 0;
  while ((match = PATTERNS.militaryOrgs.exec(text)) !== null) {
    orgs.add(match[0]);
  }

  entities.organizations = Array.from(orgs);

  // Extract people with titles
  const people = new Set<string>();
  PATTERNS.personTitles.lastIndex = 0;
  while ((match = PATTERNS.personTitles.exec(text)) !== null) {
    if (match[1] && match[2]) {
      people.add(`${match[1]} ${match[2]}`);
    }
  }

  entities.people = Array.from(people);

  // Extract events
  const events = new Set<string>();
  PATTERNS.eventTypes.lastIndex = 0;
  while ((match = PATTERNS.eventTypes.exec(text)) !== null) {
    events.add(match[0].toLowerCase());
  }

  entities.events = Array.from(events);

  return entities;
}

/**
 * Normalize location names to canonical form
 */
function normalizeLocation(name: string): string {
  const normalizations: Record<string, string> = {
    USA: 'United States',
    UK: 'United Kingdom',
    Britain: 'United Kingdom',
    PRC: 'China',
    DPRK: 'North Korea',
    Kiev: 'Kyiv',
    'Washington DC': 'Washington D.C.',
  };

  return normalizations[name] || name;
}

/**
 * Get the primary location from extracted entities
 * Returns the most specific location (city > country)
 */
export function getPrimaryLocation(
  entities: ExtractedEntities
): ExtractedEntities['locations'][0] | null {
  // Prefer city over country
  const city = entities.locations.find((l) => l.type === 'city' && l.coordinates);
  if (city) return city;

  // Fall back to country
  const country = entities.locations.find((l) => l.type === 'country' && l.coordinates);
  return country || null;
}

/**
 * Check if text mentions a specific region
 */
export function mentionsRegion(text: string, region: string[]): boolean {
  const lowerText = text.toLowerCase();
  return region.some((loc) => lowerText.includes(loc.toLowerCase()));
}
