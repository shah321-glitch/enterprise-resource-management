import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from './logger.js';

let isConnected = false;

export const connectDatabase = async (uri = env.MONGODB_URI) => {
  if (isConnected) {
    return mongoose.connection;
  }

  try {
    const conn = await mongoose.connect(uri, {
      autoIndex: true,
    });
    isConnected = true;
    logger.info(`MongoDB connected successfully to host: ${conn.connection.host}`);
    return conn.connection;
  } catch (error) {
    logger.error({ err: error }, 'MongoDB connection failed');
    throw error;
  }
};

export const disconnectDatabase = async () => {
  if (!isConnected) return;
  try {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('MongoDB disconnected');
  } catch (error) {
    logger.error({ err: error }, 'Error disconnecting MongoDB');
  }
};

