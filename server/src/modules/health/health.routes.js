import express from 'express';
import { getDbDetails } from '../../config/db.js';

const router = express.Router();

export const healthHandler = (req, res) => {
  res.status(200).json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
};

export const readyHandler = (req, res) => {
  const db = getDbDetails();
  if (!db.isConnected) {
    return res.status(503).json({
      status: 'unready',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
    });
  }

  res.status(200).json({
    status: 'ready',
    database: 'connected',
    mode: db.mode,
    timestamp: new Date().toISOString(),
  });
};

router.get('/', healthHandler);
router.get('/ready', readyHandler);

export default router;
