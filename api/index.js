import { createApp } from '../server/src/app.js';
import { connectDatabase } from '../server/src/config/db.js';

const app = createApp();

// Serverless database warm-up middleware
app.use(async (req, res, next) => {
  try {
    await connectDatabase();
  } catch (err) {
    console.error('Serverless database connection error:', err.message);
  }
  next();
});

export default app;
