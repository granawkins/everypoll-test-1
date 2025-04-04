import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';

export const app = express();
export const PORT = process.env.PORT || 5000;
export const CLIENT_DIST_PATH = path.join(__dirname, '../../client/dist');

// Middleware
app.use(cors()); // Enable CORS for frontend communication
app.use(express.json()); // Parse JSON bodies
app.use(express.static(CLIENT_DIST_PATH)); // Serve static files from client/dist

// Basic route
app.get('/api', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to the Mentat API!' });
});

// Serve React app
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(CLIENT_DIST_PATH, 'index.html'));
});
