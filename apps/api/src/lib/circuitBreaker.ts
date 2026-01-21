type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitBreakerOptions {
  failureThreshold: number; // Failures before opening
  resetTimeout: number; // Ms before trying half-open
  halfOpenRequests: number; // Requests to test in half-open
  timeout?: number; // Request timeout in ms
}

interface CircuitStats {
  failures: number;
  successes: number;
  lastFailure: number;
  state: CircuitState;
}

const DEFAULT_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  resetTimeout: 30000, // 30 seconds
  halfOpenRequests: 3,
  timeout: 30000, // 30 second timeout
};

export class CircuitBreaker {
  private stats: CircuitStats = {
    failures: 0,
    successes: 0,
    lastFailure: 0,
    state: 'closed',
  };

  private options: CircuitBreakerOptions;
  private halfOpenAttempts = 0;

  constructor(
    private name: string,
    options: Partial<CircuitBreakerOptions> = {}
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  async execute<T>(fn: () => Promise<T>, fallback?: () => T): Promise<T> {
    // Check if circuit should transition
    this.checkState();

    if (this.stats.state === 'open') {
      console.warn(`[CircuitBreaker:${this.name}] Circuit open, rejecting request`);

      if (fallback) {
        return fallback();
      }

      throw new CircuitOpenError(`Circuit breaker open for ${this.name}`);
    }

    try {
      // Execute with timeout
      const result = await this.executeWithTimeout(fn);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  private async executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.options.timeout) {
      return fn();
    }

    return Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout after ${this.options.timeout}ms`)), this.options.timeout)
      ),
    ]);
  }

  private checkState(): void {
    if (this.stats.state === 'open') {
      const elapsed = Date.now() - this.stats.lastFailure;

      if (elapsed >= this.options.resetTimeout) {
        console.log(`[CircuitBreaker:${this.name}] Transitioning to half-open`);
        this.stats.state = 'half-open';
        this.halfOpenAttempts = 0;
      }
    }
  }

  private onSuccess(): void {
    if (this.stats.state === 'half-open') {
      this.halfOpenAttempts++;

      if (this.halfOpenAttempts >= this.options.halfOpenRequests) {
        console.log(`[CircuitBreaker:${this.name}] Transitioning to closed`);
        this.stats.state = 'closed';
        this.stats.failures = 0;
        this.stats.successes = 0;
      }
    }

    this.stats.successes++;
  }

  private onFailure(error: unknown): void {
    this.stats.failures++;
    this.stats.lastFailure = Date.now();

    console.error(`[CircuitBreaker:${this.name}] Failure #${this.stats.failures}:`, error);

    if (this.stats.state === 'half-open') {
      console.log(`[CircuitBreaker:${this.name}] Half-open test failed, reopening`);
      this.stats.state = 'open';
      return;
    }

    if (this.stats.failures >= this.options.failureThreshold) {
      console.log(`[CircuitBreaker:${this.name}] Threshold reached, opening circuit`);
      this.stats.state = 'open';
    }
  }

  getStats(): CircuitStats {
    return { ...this.stats };
  }

  reset(): void {
    this.stats = {
      failures: 0,
      successes: 0,
      lastFailure: 0,
      state: 'closed',
    };
  }
}

export class CircuitOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitOpenError';
  }
}

// Pre-configured circuit breakers for external services
export const circuitBreakers = {
  claude: new CircuitBreaker('claude', {
    failureThreshold: 3,
    resetTimeout: 60000,
    timeout: 60000,
  }),
  openai: new CircuitBreaker('openai', {
    failureThreshold: 3,
    resetTimeout: 60000,
    timeout: 60000,
  }),
  newsApi: new CircuitBreaker('news-api', {
    failureThreshold: 5,
    resetTimeout: 30000,
    timeout: 10000,
  }),
};
