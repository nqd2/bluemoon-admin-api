import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { notFound, errorHandler } from './middlewares/error.middleware';
import corsOptions from './config/cors.config';

import path from 'path';

const app: Application = express();

// Middleware: Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Middleware: Security
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for simple image loading
  crossOriginResourcePolicy: false,
}));

// Middleware: CORS
app.use(cors(corsOptions));

// Middleware: Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Health check endpoint with HTML for OG/Favicon
app.get('/', (req: Request, res: Response) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>BlueMoon Admin API</title>
      <link rel="icon" type="image/png" href="/Bluemoon32.png">
      
      <!-- Open Graph / Facebook -->
      <meta property="og:type" content="website">
      <meta property="og:url" content="https://bluemoon-admin-api.vercel.app/">
      <meta property="og:title" content="BlueMoon Admin API">
      <meta property="og:description" content="BlueMoon Apartment Management System - Backend API">
      <meta property="og:image" content="/Bluemoon.png">

      <!-- Twitter -->
      <meta property="twitter:card" content="summary_large_image">
      <meta property="twitter:url" content="https://bluemoon-admin-api.vercel.app/">
      <meta property="twitter:title" content="BlueMoon Admin API">
      <meta property="twitter:description" content="BlueMoon Apartment Management System - Backend API">
      <meta property="twitter:image" content="/Bluemoon.png">

      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f0f2f5; color: #333; }
        .container { text-align: center; background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 500px; }
        .logo { max-width: 150px; margin-bottom: 1rem; }
        h1 { margin: 0 0 0.5rem 0; font-size: 1.5rem; }
        p { margin: 0.5rem 0 1rem 0; color: #666; }
        .status { display: inline-block; padding: 0.25rem 0.75rem; background: #e6f4ea; color: #1e7e34; border-radius: 50px; font-weight: 500; font-size: 0.875rem; }
      </style>
    </head>
    <body>
      <div class="container">
        <img src="/Bluemoon.png" alt="BlueMoon Logo" class="logo">
        <h1>BlueMoon Admin API</h1>
        <p>Backend API for Apartment Management System</p>
        <span class="status">● System Operational</span>
        <p style="font-size: 0.8rem; margin-top: 1rem;">Version 1.0.0 | ${process.env.NODE_ENV || 'development'}</p>
      </div>
    </body>
    </html>
  `);
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
