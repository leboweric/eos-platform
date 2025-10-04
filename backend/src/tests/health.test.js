import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../server.js';

describe('Health Check Endpoint', () => {
  it('should return healthy status', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);
    
    expect(response.body).toHaveProperty('status', 'healthy');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('uptime');
    expect(response.body).toHaveProperty('database', 'connected');
  });
  
  it('should return API info at root endpoint', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);
    
    expect(response.body).toHaveProperty('name', 'AXP API');
    expect(response.body).toHaveProperty('status', 'operational');
  });
});