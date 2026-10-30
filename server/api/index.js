import { createApp } from '../src/app.js';
import { connectDatabase } from '../src/config/db.js';

let appInstance = null;

export default async function handler(req, res) {
  try {
    if (!appInstance) {
      appInstance = createApp();
      connectDatabase().catch((err) => {
        console.warn('Initial serverless DB connection warning:', err.message);
      });
    }
    return appInstance(req, res);
  } catch (error) {
    console.error('Fatal serverless application error:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    return res.end(
      JSON.stringify({
        success: false,
        error: {
          code: 'SERVERLESS_FUNCTION_ERROR',
          message: error.message || 'Serverless execution error',
        },
      })
    );
  }
}

