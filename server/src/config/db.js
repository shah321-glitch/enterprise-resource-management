import mongoose from 'mongoose';
import dns from 'dns';
import { env } from './env.js';
import { logger } from './logger.js';

// Configure public DNS resolvers to prevent Windows SRV ECONNREFUSED with MongoDB Atlas
try {
  if (process.platform === 'win32') {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  }
} catch {
  // Ignore in restricted environments
}

let isConnected = false;
let memoryServerInstance = null;
let activeConnectionMode = 'DISCONNECTED';

export const getDbDetails = () => ({
  isConnected: mongoose.connection.readyState === 1,
  mode: activeConnectionMode,
  host: mongoose.connection?.host || null,
  name: mongoose.connection?.name || null,
  readyState: mongoose.connection.readyState,
});

export const connectDatabase = async (uri = env.MONGODB_URI) => {
  if (mongoose.connection.readyState === 1) {
    isConnected = true;
    return mongoose.connection;
  }

  if (mongoose.connection.readyState === 2) {
    await new Promise((resolve) => {
      mongoose.connection.once('open', resolve);
      mongoose.connection.once('error', resolve);
    });
    if (mongoose.connection.readyState === 1) {
      isConnected = true;
      return mongoose.connection;
    }
  }

  // Prevent requests from hanging indefinitely on buffering when disconnected
  mongoose.set('bufferTimeoutMS', 5000);

  // 1. Attempt connection to configured URI (e.g. MongoDB Atlas)
  try {
    const maskedUri = uri.replace(/\/\/.*@/, '//<credentials>@');
    logger.info(`Attempting database connection to: ${maskedUri}`);

    const isProd = env.NODE_ENV === 'production';
    const conn = await mongoose.connect(uri, {
      autoIndex: !isProd,
      serverSelectionTimeoutMS: isProd ? 8000 : 4000,
      maxPoolSize: isProd ? 10 : 5,
    });

    isConnected = true;
    activeConnectionMode = 'CONFIGURED_DATABASE';
    logger.info(`MongoDB connected successfully to host: ${conn.connection.host}`);
    return conn.connection;
  } catch (primaryError) {
    logger.warn({ err: primaryError.message }, 'Primary MongoDB connection failed.');

    // 2. In development, auto-fallback to local in-memory MongoDB instance
    if (env.NODE_ENV === 'development') {
      try {
        logger.info('Initializing local development in-memory MongoDB database...');
        const { MongoMemoryServer } = await import('mongodb-memory-server');

        if (!memoryServerInstance) {
          memoryServerInstance = await MongoMemoryServer.create();
        }

        const localUri = memoryServerInstance.getUri();
        const localConn = await mongoose.connect(localUri, {
          autoIndex: true,
          serverSelectionTimeoutMS: 5000,
        });

        isConnected = true;
        activeConnectionMode = 'LOCAL_DEV_FALLBACK';
        logger.info(`Connected to local development MongoDB at: ${localUri}`);

        // Seed initial enterprise users and entities
        const { runSeed } = await import('../scripts/seed.js');
        await runSeed(false);
        logger.info('Local development MongoDB seeded with initial enterprise fixtures.');

        return localConn.connection;
      } catch (fallbackError) {
        logger.error({ err: fallbackError }, 'Failed to initialize local development MongoDB fallback');
        throw primaryError;
      }
    }

    throw primaryError;
  }
};

export const disconnectDatabase = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (memoryServerInstance) {
      await memoryServerInstance.stop();
      memoryServerInstance = null;
    }
    isConnected = false;
    activeConnectionMode = 'DISCONNECTED';
    logger.info('MongoDB disconnected');
  } catch (error) {
    logger.error({ err: error }, 'Error disconnecting MongoDB');
  }
};
