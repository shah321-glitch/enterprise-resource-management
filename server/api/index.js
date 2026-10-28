import { createApp } from '../src/app.js';
import { connectDatabase } from '../src/config/db.js';

let appInstance = null;

export default async function handler(req, res) {
  // Await database connection on every invocation (warm connections resolve immediately)
  try {
    await connectDatabase();
  } catch (err) {
    console.error('Serverless database connection error:', err.message);
  }

  if (!appInstance) {
    appInstance = createApp();
  }

  return appInstance(req, res);
}
