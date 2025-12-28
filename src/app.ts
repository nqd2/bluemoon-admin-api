import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { notFound, errorHandler } from './middlewares/error.middleware';
import corsOptions from './config/cors.config';

const app: Application = express();

// Middleware: Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Middleware: Security
app.use(helmet());

// Middleware: CORS
app.use(cors(corsOptions));

// Middleware: Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'BlueMoon Admin API is running',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
import authRoutes from './routes/auth.routes';
import residentRoutes from './routes/resident.routes';
import apartmentRoutes from './routes/apartment.routes';
import feeRoutes from './routes/fee.routes';
import transactionRoutes from './routes/transaction.routes';
import statsRoutes from './routes/stats.routes';

app.use('/api/auth', authRoutes);
app.use('/api/residents', residentRoutes);
app.use('/api/apartments', apartmentRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/stats', statsRoutes);

// Error Handlers
app.use(notFound);
app.use(errorHandler);

export default app;
