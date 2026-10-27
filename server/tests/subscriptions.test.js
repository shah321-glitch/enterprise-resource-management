import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User } from '../src/modules/users/user.model.js';
import { Subscription } from '../src/modules/subscriptions/subscription.model.js';
import { signAccessToken } from '../src/utils/jwt.js';

const app = createApp();

describe('Subscriptions & Renewal API Integration Tests', () => {
  let adminToken;
  let adminUser;

  beforeEach(async () => {
    adminUser = await User.create({
      name: 'Sub Admin',
      email: 'sub.admin@test.internal',
      passwordHash: 'dummyhash',
      role: 'ADMIN',
    });
    adminToken = signAccessToken({ userId: adminUser._id.toString(), role: adminUser.role, email: adminUser.email });
  });

  it('should create subscription and query upcoming renewals', async () => {
    const renewalDate = new Date();
    renewalDate.setDate(renewalDate.getDate() + 10); // 10 days from now

    const res = await request(app)
      .post('/api/v1/subscriptions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Figma Organization Plan',
        provider: 'Figma',
        plan: 'Enterprise',
        startDate: new Date().toISOString(),
        billingFrequency: 'MONTHLY',
        nextRenewalDate: renewalDate.toISOString(),
        costInCents: 4500, // $45.00
        currency: 'USD',
        autoRenew: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Figma Organization Plan');

    // Query upcoming renewals <= 30 days
    const upcomingRes = await request(app)
      .get('/api/v1/subscriptions/renewals/upcoming?days=30')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(upcomingRes.status).toBe(200);
    expect(upcomingRes.body.data.length).toBeGreaterThanOrEqual(1);
    expect(upcomingRes.body.data[0].provider).toBe('Figma');
  });

  it('should process manual renewal, advance nextRenewalDate and update billing history', async () => {
    const initialRenewal = new Date('2026-11-01T00:00:00.000Z');
    const sub = await Subscription.create({
      name: 'Datadog APM Pro',
      provider: 'Datadog',
      plan: 'Pro Tier',
      startDate: new Date('2026-10-01T00:00:00.000Z'),
      billingFrequency: 'MONTHLY',
      nextRenewalDate: initialRenewal,
      costInCents: 15000,
      currency: 'USD',
      status: 'ACTIVE',
    });

    const renewRes = await request(app)
      .post(`/api/v1/subscriptions/${sub._id}/renew`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        amountInCents: 15000,
        invoiceRef: 'INV-DD-9921',
      });

    expect(renewRes.status).toBe(200);
    expect(renewRes.body.success).toBe(true);

    const updatedSub = await Subscription.findById(sub._id);
    expect(new Date(updatedSub.nextRenewalDate).getMonth()).toBe((initialRenewal.getMonth() + 1) % 12);
    expect(updatedSub.renewalHistory.length).toBe(1);
    expect(updatedSub.billingHistory.length).toBe(1);
    expect(updatedSub.billingHistory[0].invoiceRef).toBe('INV-DD-9921');
  });

  it('should cancel subscription, record reason, and mark status as CANCELLED', async () => {
    const sub = await Subscription.create({
      name: 'Miro Team Space',
      provider: 'Miro',
      startDate: new Date(),
      billingFrequency: 'MONTHLY',
      nextRenewalDate: new Date(Date.now() + 86400000 * 5),
      costInCents: 3200,
      status: 'ACTIVE',
    });

    const cancelRes = await request(app)
      .post(`/api/v1/subscriptions/${sub._id}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        reason: 'Consolidating whiteboarding tools onto Figma FigJam',
      });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe('CANCELLED');
    expect(cancelRes.body.data.autoRenew).toBe(false);

    // Cancelled subscriptions should NOT be returned in upcoming renewals
    const upcomingRes = await request(app)
      .get('/api/v1/subscriptions/renewals/upcoming?days=30')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(upcomingRes.body.data.some((s) => s._id === sub._id.toString())).toBe(false);
  });
});

