export interface SeedConfig {
  /** Whether to include verbose sample data */
  includeExtendedData: boolean;
  /** Whether to include test-only data (e.g., for integration tests) */
  includeTestData: boolean;
  /** Number of historical readings to generate */
  historicalReadingsCount: number;
  /** Default password for demo users (will be hashed) */
  defaultPassword: string;
}

export function getSeedConfig(): SeedConfig {
  const env = process.env.NODE_ENV || 'development';

  switch (env) {
    case 'test':
      return {
        includeExtendedData: false,
        includeTestData: true,
        historicalReadingsCount: 3,
        defaultPassword: 'test123!',
      };

    case 'staging':
      return {
        includeExtendedData: true,
        includeTestData: false,
        historicalReadingsCount: 30,
        defaultPassword: 'staging123!',
      };

    case 'development':
    default:
      return {
        includeExtendedData: true,
        includeTestData: false,
        historicalReadingsCount: 10,
        defaultPassword: 'dev123!',
      };
  }
}
