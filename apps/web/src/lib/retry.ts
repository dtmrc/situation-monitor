/**
 * API Error class with status code and error code
 */
export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Options for retry behavior
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries: number;
  /** Base delay in milliseconds (default: 1000) */
  baseDelayMs: number;
  /** Maximum delay in milliseconds (default: 10000) */
  maxDelayMs: number;
  /** HTTP status codes that should trigger a retry */
  retryableStatuses: number[];
  /** Callback when a retry is attempted */
  onRetry?: (attempt: number, delay: number, error: Error) => void;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateBackoffDelay(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  // Exponential backoff: 1s, 2s, 4s, 8s...
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
  // Add random jitter (0 to baseDelayMs) to prevent thundering herd
  const jitter = Math.random() * baseDelayMs;
  // Cap at maximum delay
  return Math.min(exponentialDelay + jitter, maxDelayMs);
}

/**
 * Execute a function with automatic retry on failure
 *
 * @param fn - Async function to execute
 * @param options - Retry options (optional)
 * @returns Promise that resolves with the function result
 *
 * @example
 * ```typescript
 * const data = await withRetry(() => api.get('/users'));
 *
 * const result = await withRetry(
 *   () => api.post('/data', payload),
 *   {
 *     maxRetries: 5,
 *     onRetry: (attempt, delay) => console.log(`Retry ${attempt} in ${delay}ms`)
 *   }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const { maxRetries, baseDelayMs, maxDelayMs, retryableStatuses, onRetry } = {
    ...DEFAULT_RETRY_OPTIONS,
    ...options,
  };

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if error is retryable
      if (error instanceof ApiError) {
        if (!retryableStatuses.includes(error.status)) {
          // Non-retryable status code, throw immediately
          throw error;
        }
      }

      // Don't retry after max attempts
      if (attempt === maxRetries) {
        throw error;
      }

      // Calculate delay with exponential backoff + jitter
      const delay = calculateBackoffDelay(attempt, baseDelayMs, maxDelayMs);

      // Call retry callback if provided
      if (onRetry) {
        onRetry(attempt + 1, delay, lastError);
      } else {
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms`);
      }

      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Create a retryable version of an async function
 *
 * @param fn - Async function to wrap
 * @param options - Retry options
 * @returns Wrapped function with retry behavior
 *
 * @example
 * ```typescript
 * const fetchUser = createRetryable(
 *   (id: string) => api.get(`/users/${id}`),
 *   { maxRetries: 3 }
 * );
 *
 * const user = await fetchUser('123');
 * ```
 */
export function createRetryable<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: Partial<RetryOptions> = {}
): (...args: TArgs) => Promise<TResult> {
  return (...args: TArgs) => withRetry(() => fn(...args), options);
}

/**
 * Check if an error is retryable based on status code
 */
export function isRetryableError(
  error: unknown,
  retryableStatuses = DEFAULT_RETRY_OPTIONS.retryableStatuses
): boolean {
  if (error instanceof ApiError) {
    return retryableStatuses.includes(error.status);
  }
  // Network errors are typically retryable
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }
  return false;
}
