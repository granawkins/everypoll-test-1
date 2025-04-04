import fs from 'fs';
import path from 'path';
import request from 'supertest';
import { app, CLIENT_DIST_PATH } from '../app';

describe('API Endpoints', () => {
  it('should return welcome message on GET /api', async () => {
    const response = await request(app).get('/api');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toBe('Welcome to the EveryPoll API!');
  });

  it('should return database status on GET /api/status', async () => {
    const response = await request(app).get('/api/status');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('tables');
    expect(response.body).toHaveProperty('message');
    expect(response.body.status).toBe('online');
    expect(Array.isArray(response.body.tables)).toBe(true);
    expect(response.body.tables).toContain('Users');
    expect(response.body.tables).toContain('Polls');
    expect(response.body.tables).toContain('Answers');
    expect(response.body.tables).toContain('Votes');
  });

  // Test for serving React app is conditional on client/dist existing
  // This is because in CI/test environment, we might not have built the frontend
  it('should handle the root path appropriately', async () => {
    const response = await request(app).get('/');
    
    // In test environment, client/dist might not exist, so we accept both outcomes
    const clientDistExists = fs.existsSync(CLIENT_DIST_PATH) && 
                            fs.existsSync(path.join(CLIENT_DIST_PATH, 'index.html'));
    
    if (clientDistExists) {
      // If client/dist exists, we expect a 200 and HTML
      expect(response.status).toBe(200);
      expect(response.header['content-type']).toContain('text/html');
    } else {
      // If client/dist doesn't exist, we expect a 404
      expect(response.status).toBe(404);
    }
  });
});
