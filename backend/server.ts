import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve environment variables from .env.local or standard .env
dotenv.config({ path: '.env.local' });
dotenv.config(); // Fallback to root .env if .env.local doesn't supply all keys

import authRoutes from './routes/auth.routes.js';
import programRoutes from './routes/program.routes.js';
import budgetRoutes from './routes/budget.routes.js';
import feedbackRoutes from './routes/feedback.routes.js';
import documentRoutes from './routes/document.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import barangayRoutes from './routes/barangay.routes.js';
import adminRoutes from './routes/admin.routes.js';
import userRoutes from './routes/user.routes.js';
import pollRoutes from './routes/poll.routes.js';
import announcementRoutes from './routes/announcement.routes.js';
import socialRoutes from './routes/social.routes.js';
import publicRoutes from './routes/public.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';
import { supabase } from './services/supabase.service.js';
import { startProgramReminderScheduler } from './services/program-reminder.service.js';
import { sendError, sendSuccess } from './utils/response.js';
import http from 'node:http';
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = Number(process.env.PORT || 5000);

// Specific Allowed Origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

// CORS Configuration with Credentials and Header Allowlist
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or Postman)
      const isLocalDevelopmentOrigin = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin || '');
      if (!origin || allowedOrigins.includes(origin) || isLocalDevelopmentOrigin) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked request from origin: ${origin}`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Payload parsers
app.use(express.json({ limit: '35mb' }));
app.use(express.urlencoded({ extended: true, limit: '35mb' }));

// Root Endpoint
app.get('/', (req: Request, res: Response) => {
  sendSuccess(
    res,
    {
      service: 'KABISIG Backend API',
      status: 'active',
      endpoints: {
        health: '/api/health',
        dbCheck: '/api/db-check',
        auth: '/api/auth',
        admin: '/api/admin',
        users: '/api/users',
        barangays: '/api/barangays',
        programs: '/api/programs',
        budget: '/api/budget',
        feedback: '/api/feedback',
        documents: '/api/documents',
        analytics: '/api/analytics',
        polls: '/api/polls',
        announcements: '/api/announcements',
        socialFacebookPublish: '/api/social/facebook/publish',
      },
    },
    'KABISIG: API Server'
  );
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/barangays', barangayRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/polls', pollRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/inventory', inventoryRoutes);

// Health Check Route
app.get('/api/health', (req: Request, res: Response) => {
  sendSuccess(
    res,
    {
      service: 'KABISIG Backend API',
      status: 'healthy',
      uptime: process.uptime(),
      version: '1.0.0',
    },
    'KABISIG Backend API is operational.'
  );
});

// Database Connection Check
app.get('/api/db-check', async (req: Request, res: Response) => {
  try {
    const { error, count } = await supabase
      .from('barangay')
      .select('*', { count: 'exact', head: true });

    if (error) {
      sendError(
        res,
        'Failed to connect to Supabase PostgreSQL database',
        500,
        { error: error.message }
      );
      return;
    }

    sendSuccess(
      res,
      { total_count: count },
      'Successfully connected to Supabase PostgreSQL database!'
    );
  } catch (err: any) {
    sendError(res, 'Database check threw an exception', 500, { error: err.message });
  }
});

// 404 Fallback
app.use((req: Request, res: Response) => {
  sendError(res, `Route ${req.method} ${req.originalUrl} not found.`, 404);
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'An unexpected internal server error occurred.';
  sendError(res, message, status, err.details || null);
});

const server = http.createServer(
  { maxHeaderSize: 131072 }, // 128 KB — fixes 431 Request Header Fields Too Large
  app
);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`KABISIG Backend Server running on http://localhost:${PORT}`);
  console.log(`Also reachable on LAN at http://192.168.254.110:${PORT}`);
  console.log(`=======================================================`);
  startProgramReminderScheduler();
});

export default app;