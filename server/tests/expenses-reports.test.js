import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User } from '../src/modules/users/user.model.js';
import { Expense } from '../src/modules/expenses/expense.model.js';
import { Resource } from '../src/modules/resources/resource.model.js';
import { Subscription } from '../src/modules/subscriptions/subscription.model.js';
import { signAccessToken } from '../src/utils/jwt.js';

const app = createApp();

describe('Expenses & Business Reports API Integration Tests', () => {
  let adminToken;

  beforeEach(async () => {
    const admin = await User.create({
      name: 'Finance Admin',
      email: 'finance.admin@test.internal',
      passwordHash: 'dummyhash',
      role: 'ADMIN',
    });
    adminToken = signAccessToken({ userId: admin._id.toString(), role: admin.role, email: admin.email });
  });

  it('should record an actual verified expense in integer cents and prevent duplicate invoices', async () => {
    const expenseData = {
      amountInCents: 24900, // $249.00
      currency: 'USD',
      paymentDate: new Date().toISOString(),
      provider: 'MongoDB Atlas',
      category: 'CLOUD_INFRASTRUCTURE',
      invoiceNumber: 'INV-ATLAS-2026-001',
      paymentStatus: 'PAID',
    };

    const res = await request(app)
      .post('/api/v1/expenses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(expenseData);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.amountInCents).toBe(24900);
    expect(res.body.data.isForecast).toBe(false);

    // Duplicate invoice for same provider must be rejected
    const dupRes = await request(app)
      .post('/api/v1/expenses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(expenseData);

    expect(dupRes.status).toBe(409);
    expect(dupRes.body.error.code).toBe('CONFLICT');
  });

  it('should project recurring forecasts without polluting actual expenses', async () => {
    await Subscription.create({
      name: 'GitHub Copilot Enterprise',
      provider: 'GitHub',
      plan: 'Enterprise',
      startDate: new Date(),
      billingFrequency: 'MONTHLY',
      nextRenewalDate: new Date(),
      costInCents: 19000, // $190.00
      status: 'ACTIVE',
    });

    const forecastRes = await request(app)
      .get('/api/v1/expenses/forecasts?months=3')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(forecastRes.status).toBe(200);
    expect(forecastRes.body.data.length).toBe(3);
    expect(forecastRes.body.data[0].projectedAmountInCents).toBe(19000);

    // Actual expenses collection should remain untouched
    const actualExpensesCount = await Expense.countDocuments();
    expect(actualExpensesCount).toBe(0);
  });

  it('should return live database KPI statistics and charts for dashboard', async () => {
    await Resource.create({
      name: 'Stripe Billing API',
      provider: 'Stripe',
      category: 'SAAS_TOOL',
      costInCents: 0,
      currency: 'USD',
    });

    await Subscription.create({
      name: 'Google Workspace Enterprise',
      provider: 'Google',
      startDate: new Date(),
      billingFrequency: 'MONTHLY',
      nextRenewalDate: new Date(Date.now() + 86400000 * 5),
      costInCents: 36000,
      status: 'ACTIVE',
    });

    await Expense.create({
      amountInCents: 36000,
      currency: 'USD',
      paymentDate: new Date(),
      provider: 'Google',
      category: 'SOFTWARE_LICENSE',
      paymentStatus: 'PAID',
      isForecast: false,
    });

    const res = await request(app)
      .get('/api/v1/reports/dashboard-stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.kpis.totalResources).toBeGreaterThanOrEqual(1);
    expect(res.body.data.kpis.activeSubscriptions).toBeGreaterThanOrEqual(1);
    expect(res.body.data.kpis.upcomingRenewals).toBeGreaterThanOrEqual(1);
    expect(res.body.data.kpis.totalExpensesInCents).toBe(36000);
    expect(Array.isArray(res.body.data.charts.monthlyExpenses)).toBe(true);
  });

  it('should export formatted CSV report with correct headers', async () => {
    await Resource.create({
      name: 'AWS RDS Aurora Cluster',
      provider: 'AWS',
      category: 'CLOUD_INFRASTRUCTURE',
      costInCents: 85000,
      currency: 'USD',
    });

    const res = await request(app)
      .get('/api/v1/reports/export/resources')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('attachment; filename="resources-');
    expect(res.text).toContain('AWS RDS Aurora Cluster');
    expect(res.text).toContain('CLOUD_INFRASTRUCTURE');
  });
});

