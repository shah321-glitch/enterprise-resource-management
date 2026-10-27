import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User } from '../src/modules/users/user.model.js';
import { signAccessToken } from '../src/utils/jwt.js';

const app = createApp();

describe('Resources API Integration Tests', () => {
  let adminToken;
  let employeeToken;

  beforeEach(async () => {
    const admin = await User.create({
      name: 'Resource Admin',
      email: 'admin.res@test.internal',
      passwordHash: 'dummyhash',
      role: 'ADMIN',
    });
    adminToken = signAccessToken({ userId: admin._id.toString(), role: admin.role, email: admin.email });

    const employee = await User.create({
      name: 'Regular Staff',
      email: 'staff.res@test.internal',
      passwordHash: 'dummyhash',
      role: 'EMPLOYEE',
    });
    employeeToken = signAccessToken({ userId: employee._id.toString(), role: employee.role, email: employee.email });
  });

  it('should allow admin to create a new resource with integer cents cost', async () => {
    const payload = {
      name: 'Production Kubernetes Cluster',
      provider: 'AWS',
      category: 'CLOUD_INFRASTRUCTURE',
      resourceType: 'EKS Cluster',
      costInCents: 45000, // $450.00
      currency: 'USD',
      department: 'DevOps',
    };

    const res = await request(app)
      .post('/api/v1/resources')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.costInCents).toBe(45000);
    expect(res.body.data.name).toBe(payload.name);
  });

  it('should block regular employee from creating a resource', async () => {
    const res = await request(app)
      .post('/api/v1/resources')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        name: 'Unauthorized Resource',
        provider: 'AWS',
        category: 'CLOUD_INFRASTRUCTURE',
        costInCents: 1000,
      });

    expect(res.status).toBe(403);
  });

  it('should filter resources by category, provider, and search keyword', async () => {
    await request(app)
      .post('/api/v1/resources')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'GitHub Enterprise Team',
        provider: 'GitHub',
        category: 'DEVELOPER_TOOL',
        costInCents: 2100,
      });

    await request(app)
      .post('/api/v1/resources')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'AWS S3 Asset Storage',
        provider: 'AWS',
        category: 'CLOUD_INFRASTRUCTURE',
        costInCents: 8500,
      });

    const searchRes = await request(app)
      .get('/api/v1/resources?search=GitHub')
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(searchRes.status).toBe(200);
    expect(searchRes.body.data.length).toBe(1);
    expect(searchRes.body.data[0].provider).toBe('GitHub');

    const catRes = await request(app)
      .get('/api/v1/resources?category=CLOUD_INFRASTRUCTURE')
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(catRes.status).toBe(200);
    expect(catRes.body.data.length).toBe(1);
    expect(catRes.body.data[0].name).toBe('AWS S3 Asset Storage');
  });

  it('should archive a resource and exclude it from active list', async () => {
    const createRes = await request(app)
      .post('/api/v1/resources')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Legacy Jenkins Worker',
        provider: 'Internal',
        category: 'DEVELOPER_TOOL',
        costInCents: 5000,
      });

    const resourceId = createRes.body.data._id;

    const archiveRes = await request(app)
      .patch(`/api/v1/resources/${resourceId}/archive`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(archiveRes.status).toBe(200);
    expect(archiveRes.body.data.isArchived).toBe(true);

    const listRes = await request(app)
      .get('/api/v1/resources')
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(listRes.body.data.some((r) => r._id === resourceId)).toBe(false);
  });
});

