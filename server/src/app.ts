import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import { db } from './database';
import { authRoutes, authenticate } from './auth';

export const app = express();
export const PORT = process.env.PORT || 5000;
export const CLIENT_DIST_PATH = path.join(__dirname, '../../client/dist');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Middleware
app.use(cors({ 
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://everypoll.com' 
    : 'http://localhost:5173',
  credentials: true // Allow cookies to be sent with requests
})); 
app.use(express.json()); // Parse JSON bodies
app.use(cookieParser()); // Parse cookies
app.use(authenticate); // Attach user to request or create anonymous user
app.use(express.static(CLIENT_DIST_PATH)); // Serve static files from client/dist

// API routes
app.get('/api', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to the EveryPoll API!' });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Interface for database table info
interface TableInfo {
  name: string;
}

// Database status route (for testing)
app.get('/api/status', (req: Request, res: Response) => {
  // Check if we can query the database
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
  `).all() as TableInfo[];
  
  // Return database status
  res.json({
    status: 'online',
    tables: tables.map((t) => t.name),
    message: 'Database is ready'
  });
});

// Test protected route
app.get('/api/protected', (req: Request, res: Response) => {
  // This route is just to verify that authentication is working
  // It doesn't require the requireAuth middleware, so it will work for all users,
  // but it will return different responses based on authentication status
  
  if (req.isAuthenticated) {
    return res.json({
      message: 'You are authenticated!',
      user: {
        id: req.user?.id,
        email: req.user?.email,
        name: req.user?.name
      }
    });
  }
  
  res.json({
    message: 'You are not authenticated.',
    user: {
      id: req.user?.id,
      anonymous: true
    }
  });
});

// Serve React app - must be after all API routes
app.get('*', (req: Request, res: Response): void => {
  res.sendFile(path.join(CLIENT_DIST_PATH, 'index.html'));
});

// Close database when app is terminated
process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  db.close();
  process.exit(0);
});
