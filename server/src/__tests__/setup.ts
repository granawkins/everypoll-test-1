import { app } from '../app';
import { Server } from 'http';

let server: Server;

// Setup before tests
beforeAll((done) => {
  server = app.listen(0, () => {
    done();
  });
});

// Cleanup after tests
afterAll((done) => {
  server.close(done);
});
