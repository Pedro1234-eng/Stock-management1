import express from 'express';
import dotenv from 'dotenv';
import apiRouter from '../src/routes/api.ts';

dotenv.config();

const app = express();
app.use(express.json());

// Handle routes whether Vercel preserves or strips the /api prefix
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Global error handler ensuring all errors return valid JSON
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('API Serverless Error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

export default app;
