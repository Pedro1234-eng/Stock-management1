import express from 'express';
import dotenv from 'dotenv';
import apiRouter from '../src/routes/api.ts';

dotenv.config();

const app = express();
app.use(express.json());

// Handle routes whether Vercel preserves or strips the /api prefix
app.use('/api', apiRouter);
app.use('/', apiRouter);

export default app;
