import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';

const app = createApp();

describe('Health, Readiness & Infrastructure Integration Tests', () => {
  it('should return 200 for GET /api/v1/health', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.uptime).toBeDefined();
    expect(res.body.timestamp).toBeDefined();
  });

  it('should return 200 for GET /api/v1/ready when database is connected', async () => {
    const res = await request(app).get('/api/v1/ready');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
    expect(res.body.database).toBe('connected');
  });

  it('should include X-Request-Id header in responses', async () => {
    // Generate custom client request id
    const customId = 'test-req-id-12345';
    const res1 = await request(app)
      .get('/api/v1/health')
      .set('X-Request-Id', customId);

    expect(res1.headers['x-request-id']).toBe(customId);

    // Auto-generate when header omitted
    const res2 = await request(app).get('/api/v1/health');
    expect(res2.headers['x-request-id']).toBeDefined();
    expect(res2.headers['x-request-id'].length).toBeGreaterThan(10);
  });

  it('should enforce security headers with Helmet', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
  });

  it('should return standardized JSON envelope on 404 Not Found', async () => {
    const res = await request(app).get('/api/v1/non-existent-route-xyz');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.message).toContain('not found');
  });
});
