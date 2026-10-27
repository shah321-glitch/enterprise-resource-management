import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User } from '../src/modules/users/user.model.js';
import { Resource } from '../src/modules/resources/resource.model.js';
import { Project } from '../src/modules/projects/project.model.js';
import { signAccessToken } from '../src/utils/jwt.js';

const app = createApp();

describe('Projects & Resource Allocation API Integration Tests', () => {
  let adminToken;
  let testResource;
  let projectA;
  let projectB;

  beforeEach(async () => {
    const admin = await User.create({
      name: 'Alloc Admin',
      email: 'alloc.admin@test.internal',
      passwordHash: 'dummyhash',
      role: 'ADMIN',
    });
    adminToken = signAccessToken({ userId: admin._id.toString(), role: admin.role, email: admin.email });

    testResource = await Resource.create({
      name: 'Dedicated AI Inference Cluster',
      provider: 'AWS',
      category: 'CLOUD_INFRASTRUCTURE',
      costInCents: 100000, // $1,000.00
      currency: 'USD',
    });

    projectA = await Project.create({
      name: 'Customer Support LLM Assistant',
      code: 'PRJ-LLM-01',
      budgetInCents: 500000,
    });

    projectB = await Project.create({
      name: 'Document Analysis Pipeline',
      code: 'PRJ-DOC-02',
      budgetInCents: 300000,
    });
  });

  it('should allocate 60% of resource to project A and compute correct cost in cents', async () => {
    const res = await request(app)
      .post('/api/v1/allocations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        resourceId: testResource._id.toString(),
        projectId: projectA._id.toString(),
        allocationMethod: 'PERCENTAGE',
        allocationValue: 60,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.calculatedCostInCents).toBe(60000); // 60% of 100,000
    expect(res.body.data.status).toBe('ACTIVE');
  });

  it('should reject allocation when cumulative percentage exceeds 100%', async () => {
    // Allocate 70% to Project A
    await request(app)
      .post('/api/v1/allocations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        resourceId: testResource._id.toString(),
        projectId: projectA._id.toString(),
        allocationMethod: 'PERCENTAGE',
        allocationValue: 70,
      });

    // Attempt to allocate 40% to Project B (70% + 40% = 110% > 100%)
    const overAllocRes = await request(app)
      .post('/api/v1/allocations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        resourceId: testResource._id.toString(),
        projectId: projectB._id.toString(),
        allocationMethod: 'PERCENTAGE',
        allocationValue: 40,
      });

    expect(overAllocRes.status).toBe(400);
    expect(overAllocRes.body.error.message).toContain('cannot exceed 100%');
  });

  it('should terminate an active allocation and release capacity', async () => {
    const allocRes = await request(app)
      .post('/api/v1/allocations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        resourceId: testResource._id.toString(),
        projectId: projectA._id.toString(),
        allocationMethod: 'PERCENTAGE',
        allocationValue: 100,
      });

    const allocId = allocRes.body.data._id;

    const termRes = await request(app)
      .delete(`/api/v1/allocations/${allocId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(termRes.status).toBe(200);
    expect(termRes.body.data.status).toBe('TERMINATED');
    expect(termRes.body.data.endDate).toBeDefined();

    // Now Project B should be able to allocate 100% since previous allocation is terminated
    const newAllocRes = await request(app)
      .post('/api/v1/allocations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        resourceId: testResource._id.toString(),
        projectId: projectB._id.toString(),
        allocationMethod: 'PERCENTAGE',
        allocationValue: 100,
      });

    expect(newAllocRes.status).toBe(201);
  });
});
