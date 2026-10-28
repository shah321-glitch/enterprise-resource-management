import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User } from '../src/modules/users/user.model.js';
import { AuditLog } from '../src/modules/audit-logs/audit-log.model.js';
import { Department } from '../src/modules/departments/department.model.js';

const app = createApp();

describe('Auth & Security API Integration Tests', () => {
  beforeEach(async () => {
    process.env.ALLOW_PUBLIC_REGISTRATION = 'true';
  });

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

  const superAdminUser = {
    name: 'Enterprise Super Admin',
    email: 'superadmin@test.internal',
    password: 'SuperAdmin#2026!Secure',
    role: 'SUPER_ADMIN',
    department: 'Executive Operations',
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

  it('should reject unauthenticated requests to protected endpoints', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
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

  it('should allow user session revocation via /revoke-sessions', async () => {
    await request(app).post('/api/v1/auth/register').send(validUser);
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: validUser.email, password: validUser.password });

    const accessToken = loginRes.body.data.accessToken;

    const revokeRes = await request(app)
      .post('/api/v1/auth/revoke-sessions')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(revokeRes.status).toBe(200);
    expect(revokeRes.body.success).toBe(true);

    const audit = await AuditLog.findOne({ action: 'SESSIONS_REVOKED' });
    expect(audit).toBeDefined();
  });

  it('should immediately block deactivated accounts from protected APIs and login', async () => {
    // 1. Create user and obtain token
    await request(app).post('/api/v1/auth/register').send(validUser);
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: validUser.email, password: validUser.password });

    const empToken = loginRes.body.data.accessToken;

    // 2. Deactivate the user in database
    await User.updateOne({ email: validUser.email }, { isActive: false, refreshTokens: [] });

    // 3. User attempts to query /me with existing token -> 403 Forbidden
    const checkRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${empToken}`);

    expect(checkRes.status).toBe(403);
    expect(checkRes.body.error.message).toContain('deactivated');

    // 4. User attempts to log in again -> 403 Forbidden
    const loginAttempt = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: validUser.email, password: validUser.password });

    expect(loginAttempt.status).toBe(403);
    expect(loginAttempt.body.error.message).toContain('deactivated');
  });

  it('should prevent users from elevating their own roles', async () => {
    // Register initial admin so system is bootstrapped
    await request(app).post('/api/v1/auth/register').send(superAdminUser);

    // Register regular employee
    await request(app).post('/api/v1/auth/register').send(validUser);
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: validUser.email, password: validUser.password });

    const empToken = loginRes.body.data.accessToken;

    // Regular employee tries to elevate role via profile update
    const profileRes = await request(app)
      .put('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${empToken}`)
      .send({
        name: 'Updated Name',
        role: 'SUPER_ADMIN', // Must be ignored / stripped
      });

    expect(profileRes.status).toBe(200);
    expect(profileRes.body.data.user.role).toBe('EMPLOYEE');

    const dbUser = await User.findOne({ email: validUser.email });
    expect(dbUser.role).toBe('EMPLOYEE');
  });

  it('should support complete password reset flow with expiring secure tokens', async () => {
    await request(app).post('/api/v1/auth/register').send(validUser);

    // 1. Request password reset
    const forgotRes = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: validUser.email });

    expect(forgotRes.status).toBe(200);
    expect(forgotRes.body.success).toBe(true);
    expect(forgotRes.body.resetToken).toBeDefined();

    const resetToken = forgotRes.body.resetToken;

    // 2. Reject reset with invalid or expired token
    const invalidReset = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({
        token: 'invalid-non-existent-token-12345',
        newPassword: 'BrandNew#2026!Secure',
      });

    expect(invalidReset.status).toBe(400);

    // 3. Complete valid password reset
    const validReset = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({
        token: resetToken,
        newPassword: 'BrandNew#2026!Secure',
      });

    expect(validReset.status).toBe(200);
    expect(validReset.body.success).toBe(true);

    // 4. Old password must now fail
    const oldLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: validUser.email, password: validUser.password });
    expect(oldLogin.status).toBe(401);

    // 5. New password succeeds
    const newLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: validUser.email, password: 'BrandNew#2026!Secure' });
    expect(newLogin.status).toBe(200);
    expect(newLogin.body.data.accessToken).toBeDefined();
  });

  it('should enforce single-company registration policy when public registration is disabled', async () => {
    process.env.ALLOW_PUBLIC_REGISTRATION = 'false';

    // First user creates SUPER_ADMIN initial bootstrap
    const firstRes = await request(app)
      .post('/api/v1/auth/register')
      .send(superAdminUser);

    expect(firstRes.status).toBe(201);
    expect(firstRes.body.data.user.role).toBe('SUPER_ADMIN');

    // Subsequent public self-registration without admin token must be rejected with 403 Forbidden!
    const secondRes = await request(app)
      .post('/api/v1/auth/register')
      .send(validUser);

    expect(secondRes.status).toBe(403);
    expect(secondRes.body.error.message).toContain('Public registration is disabled');
  });

  it('should allow Admin to provision new enterprise user accounts via POST /api/v1/users', async () => {
    // 1. Create Super Admin
    await request(app).post('/api/v1/auth/register').send(superAdminUser);
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: superAdminUser.email, password: superAdminUser.password });
    const superAdminToken = adminLogin.body.data.accessToken;

    // 2. Super Admin provisions new employee
    const createRes = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: 'New Provisioned User',
        email: 'provisioned@enterprise.internal',
        password: 'Provisioned#2026!Secure',
        role: 'PROJECT_MANAGER',
        department: 'Product & Engineering',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.data.email).toBe('provisioned@enterprise.internal');
    expect(createRes.body.data.role).toBe('PROJECT_MANAGER');
  });

  it('should manage enterprise departments with validation and integer budget cents', async () => {
    await request(app).post('/api/v1/auth/register').send(superAdminUser);
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: superAdminUser.email, password: superAdminUser.password });
    const adminToken = adminLogin.body.data.accessToken;

    // 1. Admin creates department
    const deptRes = await request(app)
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Cybersecurity & Compliance',
        code: 'SEC',
        description: 'InfoSec and audit governance',
        budgetInCents: 12000000, // $120,000.00
        currency: 'USD',
      });

    expect(deptRes.status).toBe(201);
    expect(deptRes.body.data.code).toBe('SEC');
    expect(deptRes.body.data.budgetInCents).toBe(12000000);

    // 2. Reject duplicate department code
    const dupRes = await request(app)
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Another Security Team',
        code: 'SEC',
      });

    expect(dupRes.status).toBe(409);
  });
});
