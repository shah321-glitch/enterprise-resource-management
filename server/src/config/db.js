import mongoose from 'mongoose';
import dns from 'dns';
import { env } from './env.js';
import { logger } from './logger.js';

// Configure public DNS resolvers to ensure robust SRV resolution with MongoDB Atlas
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Ignore in restricted environments
}

// Set safe buffer timeout to prevent hanging indefinitely on buffering
mongoose.set('bufferTimeoutMS', 6000);

let isConnected = false;
let memoryServerInstance = null;
let activeConnectionMode = 'DISCONNECTED';
let connectionPromise = null;

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

  if (connectionPromise) {
    return connectionPromise;
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

  connectionPromise = (async () => {
    // 1. Attempt connection to configured URI (e.g. MongoDB Atlas)
    try {
      const maskedUri = uri.replace(/\/\/.*@/, '//<credentials>@');
      logger.info(`Attempting database connection to: ${maskedUri}`);

      const isProd = env.NODE_ENV === 'production';
      const conn = await mongoose.connect(uri, {
        autoIndex: !isProd,
        serverSelectionTimeoutMS: 8000,
        maxPoolSize: isProd ? 10 : 5,
      });

      isConnected = true;
      activeConnectionMode = 'CONFIGURED_DATABASE';
      logger.info(`MongoDB connected successfully to host: ${conn.connection.host}`);
      return conn.connection;
    } catch (primaryError) {
      logger.warn({ err: primaryError.message }, 'Primary MongoDB connection failed.');

      // 1b. If SRV resolution failed, attempt direct replica-set host connection
      if (uri.includes('+srv') && uri.includes('cluster0.3g6ejrh.mongodb.net')) {
        try {
          const directUri = uri
            .replace('mongodb+srv://', 'mongodb://')
            .replace(
              'cluster0.3g6ejrh.mongodb.net',
              'ac-r6lr13p-shard-00-00.3g6ejrh.mongodb.net:27017,ac-r6lr13p-shard-00-01.3g6ejrh.mongodb.net:27017,ac-r6lr13p-shard-00-02.3g6ejrh.mongodb.net:27017'
            ) + (uri.includes('?') ? '&' : '?') + 'ssl=true&replicaSet=atlas-hgwona-shard-0&authSource=admin';

          logger.info('Attempting direct replica-set fallback connection to MongoDB Atlas...');
          const isProd = env.NODE_ENV === 'production';
          const directConn = await mongoose.connect(directUri, {
            autoIndex: !isProd,
            serverSelectionTimeoutMS: 8000,
            maxPoolSize: isProd ? 10 : 5,
          });

          isConnected = true;
          activeConnectionMode = 'DIRECT_REPLICA_SET_FALLBACK';
          logger.info(`Connected to MongoDB Atlas via direct replica-set fallback: ${directConn.connection.host}`);
          return directConn.connection;
        } catch (directErr) {
          logger.warn({ err: directErr.message }, 'Direct replica-set fallback connection also failed');
        }
      }

      // 2. In local development (NOT serverless / Vercel), auto-fallback to local in-memory MongoDB instance
      const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY);
      if (env.NODE_ENV === 'development' && !isServerless) {
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
    } finally {
      connectionPromise = null;
    }
  })();

  return connectionPromise;
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
