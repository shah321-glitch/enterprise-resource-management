import { createApp } from '../src/app.js';
import { connectDatabase } from '../src/config/db.js';

let appInstance = null;

export default async function handler(req, res) {
  try {
    await connectDatabase();
  } catch (err) {
    console.error('Serverless DB connection error:', err.message);
  }

  try {
    if (!appInstance) {
      appInstance = createApp();
    }
    return appInstance(req, res);
  } catch (err) {
    console.error('Express handler error:', err);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: err.message || 'An unexpected server error occurred',
        },
      });
    }
  }
}
