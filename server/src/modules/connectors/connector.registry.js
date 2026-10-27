import { MockProviderConnector } from './mock.connector.js';

export const getConnectorForProvider = (providerKey, config = {}) => {
  switch (providerKey?.toUpperCase()) {
    case 'MOCK':
    case 'MOCK_DEV_CONNECTOR':
    case 'OPENAI':
    case 'AWS':
    case 'GITHUB':
    case 'CLOUDFLARE':
      // Currently uses clearly identified mock dev connector for local dev/test
      return new MockProviderConnector(config);
    default:
      return new MockProviderConnector(config);
  }
};
