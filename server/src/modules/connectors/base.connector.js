/**
 * Abstract Base Provider Connector
 * Establishes contract for all external cloud and SaaS API connectors.
 */

export class ConnectorError extends Error {
  constructor(message, classification = 'UNKNOWN_ERROR', originalError = null) {
    super(message);
    this.name = 'ConnectorError';
    this.classification = classification; // AUTHENTICATION_ERROR, RATE_LIMIT_ERROR, QUOTA_EXCEEDED, NETWORK_ERROR, VALIDATION_ERROR
    this.originalError = originalError;
  }
}

export class BaseConnector {
  constructor(providerKey, config = {}) {
    if (this.constructor === BaseConnector) {
      throw new Error('BaseConnector cannot be instantiated directly');
    }
    this.providerKey = providerKey;
    this.config = config;
    this.timeoutMs = config.timeoutMs || 10000;
    this.maxRetries = config.maxRetries || 3;
  }

  /**
   * Tests credentials and network reachability to provider.
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  async testConnection() {
    throw new Error('testConnection() must be implemented by subclass');
  }

  /**
   * Retrieves current credit/quota balance.
   * @returns {Promise<{ balance: number, unit: string, creditModel: string }>}
   */
  async getBalance() {
    throw new Error('getBalance() must be implemented by subclass');
  }

  /**
   * Retrieves usage records for given time range.
   * @param {Date} startDate
   * @param {Date} endDate
   * @returns {Promise<Array<{ date: Date, amount: number, unit: string }>>}
   */
  async getUsage(startDate, endDate) {
    throw new Error('getUsage() must be implemented by subclass');
  }

  /**
   * Retrieves provider account metadata (e.g. organization name, tier, plan limits).
   */
  async getAccountMetadata() {
    throw new Error('getAccountMetadata() must be implemented by subclass');
  }

  /**
   * Helper to execute async call with retry backoff and timeout.
   */
  async executeWithRetry(fn, operationName = 'operation') {
    let attempt = 0;
    let delay = 500;

    while (attempt < this.maxRetries) {
      attempt++;
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new ConnectorError(`Timeout after ${this.timeoutMs}ms`, 'NETWORK_ERROR')), this.timeoutMs)
        );
        return await Promise.race([fn(), timeoutPromise]);
      } catch (err) {
        const classified = this.classifyError(err);
        if (classified.classification === 'AUTHENTICATION_ERROR' || attempt >= this.maxRetries) {
          throw classified;
        }
        // Exponential backoff with jitter
        await new Promise((res) => setTimeout(res, delay + Math.random() * 200));
        delay *= 2;
      }
    }
  }

  /**
   * Classifies unknown error into structured category.
   */
  classifyError(err) {
    if (err instanceof ConnectorError) return err;

    const message = err?.message || 'Unknown provider error';
    const status = err?.response?.status || err?.status;

    if (status === 401 || status === 403 || message.includes('API key') || message.includes('Unauthorized')) {
      return new ConnectorError(message, 'AUTHENTICATION_ERROR', err);
    }
    if (status === 429 || message.includes('Rate limit')) {
      return new ConnectorError(message, 'RATE_LIMIT_ERROR', err);
    }
    if (status === 402 || message.includes('quota') || message.includes('insufficient funds')) {
      return new ConnectorError(message, 'QUOTA_EXCEEDED', err);
    }
    if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || message.includes('network')) {
      return new ConnectorError(message, 'NETWORK_ERROR', err);
    }

    return new ConnectorError(message, 'UNKNOWN_ERROR', err);
  }
}
