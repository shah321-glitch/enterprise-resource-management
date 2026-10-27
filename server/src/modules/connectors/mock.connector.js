import { BaseConnector, ConnectorError } from './base.connector.js';

/**
 * Mock & Test Development Connector
 * Explicitly labeled development connector for verified, predictable local testing
 * without pretending to communicate with live third-party services without credentials.
 */
export class MockProviderConnector extends BaseConnector {
  constructor(config = {}) {
    super('MOCK_DEV_CONNECTOR', config);
    this.shouldFailAuth = Boolean(config.shouldFailAuth);
    this.simulatedBalance = config.simulatedBalance !== undefined ? config.simulatedBalance : 250000; // e.g. $2,500.00 or 250k tokens
    this.simulatedUnit = config.simulatedUnit || 'USD_CENTS';
    this.simulatedModel = config.simulatedModel || 'MONETARY';
  }

  async testConnection() {
    return this.executeWithRetry(async () => {
      if (this.shouldFailAuth) {
        throw new ConnectorError('Invalid API key provided to mock connector', 'AUTHENTICATION_ERROR');
      }
      return {
        success: true,
        message: 'Mock development connector connection verified successfully',
        timestamp: new Date(),
      };
    }, 'testConnection');
  }

  async getBalance() {
    return this.executeWithRetry(async () => {
      if (this.shouldFailAuth) {
        throw new ConnectorError('Authentication failed', 'AUTHENTICATION_ERROR');
      }
      return {
        balance: this.simulatedBalance,
        unit: this.simulatedUnit,
        creditModel: this.simulatedModel,
        asOf: new Date(),
      };
    }, 'getBalance');
  }

  async getUsage(startDate, endDate) {
    return this.executeWithRetry(async () => {
      return [
        { date: new Date(), amount: 1500, unit: this.simulatedUnit },
        { date: new Date(Date.now() - 86400000), amount: 3200, unit: this.simulatedUnit },
      ];
    }, 'getUsage');
  }

  async getAccountMetadata() {
    return {
      provider: 'Mock Dev Provider',
      organizationId: 'mock-org-2026',
      environment: 'DEVELOPMENT_SANDBOX',
      isLiveIntegration: false,
    };
  }
}
