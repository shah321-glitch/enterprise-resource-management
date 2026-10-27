import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User } from '../src/modules/users/user.model.js';
import { AuditLog } from '../src/modules/audit-logs/audit-log.model.js';

const app = createApp();

describe('Auth & Security API Integration Tests', () => {
  const validUser = {
    name: 'Enterprise Engineer',
    email: 'engineer@test.internal',
    password: 'Password#2026!Secure',
    role: 'EMPLOYEE',
    department: 'Engineering',
  };

  const adminUser = {
    name: 'Enterprise Admin',
    email: 'admin@test.internal',
    password: 'Admin#2026!Secure',
    role: 'ADMIN',
    department: 'Operations',
  };

  it('should register a new user successfully with hashed password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(validUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(validUser.email);
    expect(res.body.data.user.passwordHash).toBeUndefined();

    const dbUser = await User.findOne({ email: validUser.email }).select('+passwordHash');
    expect(dbUser).toBeDefined();
    expect(dbUser.passwordHash).not.toBe(validUser.password);
  });

  it('should reject registration with weak password violating policy', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        ...validUser,
        password: 'weakpassword',
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should reject registration if email is already taken', async () => {
    await request(app).post('/api/v1/auth/register').send(validUser);
    const duplicateRes = await request(app).post('/api/v1/auth/register').send(validUser);

    expect(duplicateRes.status).toBe(409);
    expect(duplicateRes.body.success).toBe(false);
    expect(duplicateRes.body.error.code).toBe('CONFLICT');
  });

  it('should authenticate user and return access token and refresh token', async () => {
    await request(app).post('/api/v1/auth/register').send(validUser);

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: validUser.email,
        password: validUser.password,
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.data.accessToken).toBeDefined();
    expect(loginRes.body.data.user.email).toBe(validUser.email);

    // Verify audit log
    const audit = await AuditLog.findOne({ action: 'LOGIN_SUCCESS' });
    expect(audit).toBeDefined();
    expect(audit.actorEmail).toBe(validUser.email);
  });

  it('should reject authentication with invalid password and log failure', async () => {
    await request(app).post('/api/v1/auth/register').send(validUser);

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: validUser.email,
        password: 'WrongPassword#123!',
      });

    expect(loginRes.status).toBe(401);
    expect(loginRes.body.success).toBe(false);

    const audit = await AuditLog.findOne({ action: 'LOGIN_FAILED' });
    expect(audit).toBeDefined();
  });

  it('should rotate refresh token and issue new token pair', async () => {
    await request(app).post('/api/v1/auth/register').send(validUser);
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: validUser.email,
        password: validUser.password,
      });

    const cookies = loginRes.headers['set-cookie'];
    expect(cookies).toBeDefined();

    // Call refresh with cookie
    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookies)
      .send({});

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.success).toBe(true);
    expect(refreshRes.body.data.accessToken).toBeDefined();
  });

  it('should detect refresh token reuse and invalidate all user sessions', async () => {
    await request(app).post('/api/v1/auth/register').send(validUser);
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: validUser.email,
        password: validUser.password,
      });

    const firstCookies = loginRes.headers['set-cookie'];

    // First rotation succeeds
    const refresh1 = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', firstCookies)
      .send({});
    expect(refresh1.status).toBe(200);

    // Replay attack: attempt to reuse the first (already consumed) refresh token!
    const replayAttack = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', firstCookies)
      .send({});

    expect(replayAttack.status).toBe(401);
    expect(replayAttack.body.error.message).toContain('Refresh token reuse detected');

    // All active tokens should now be invalidated for this user
    const dbUser = await User.findOne({ email: validUser.email });
    expect(dbUser.refreshTokens.length).toBe(0);

    // Security alert audit log logged
    const alertAudit = await AuditLog.findOne({ action: 'REFRESH_TOKEN_REUSE_DETECTED' });
    expect(alertAudit).toBeDefined();
  });

  it('should enforce role-based access control (RBAC)', async () => {
    // Register employee
    await request(app).post('/api/v1/auth/register').send(validUser);
    const empLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: validUser.email, password: validUser.password });
    const empToken = empLogin.body.data.accessToken;

    // Register admin
    await request(app).post('/api/v1/auth/register').send(adminUser);
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: adminUser.email, password: adminUser.password });
    const adminToken = adminLogin.body.data.accessToken;

    // Employee tries to list users (requires ADMIN or SUPER_ADMIN) -> 403 Forbidden
    const forbiddenRes = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${empToken}`);
    expect(forbiddenRes.status).toBe(403);

    // Admin accesses user list -> 200 OK
    const adminRes = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminRes.status).toBe(200);
    expect(adminRes.body.success).toBe(true);
    expect(Array.isArray(adminRes.body.data)).toBe(true);
  });
});

