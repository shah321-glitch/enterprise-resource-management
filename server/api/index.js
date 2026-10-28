import { createApp } from '../src/app.js';
import { connectDatabase } from '../src/config/db.js';

let appInstance = null;

export default async function handler(req, res) {
  try {
    await connectDatabase();
  } catch (err) {
    console.error('Database connection error in Vercel serverless function:', err.message);
  }

  if (!appInstance) {
    appInstance = createApp();
  }

  return appInstance(req, res);
}

