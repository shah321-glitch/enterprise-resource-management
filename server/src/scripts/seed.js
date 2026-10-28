import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

import mongoose from 'mongoose';
import { User } from '../modules/users/user.model.js';
import { Resource } from '../modules/resources/resource.model.js';
import { Subscription } from '../modules/subscriptions/subscription.model.js';
import { Project } from '../modules/projects/project.model.js';
import { ResourceAllocation } from '../modules/allocations/allocation.model.js';
import { ApiCreditAccount } from '../modules/api-credits/api-credit.model.js';
import { Expense } from '../modules/expenses/expense.model.js';
import { Notification } from '../modules/notifications/notification.model.js';
import { AuditLog } from '../modules/audit-logs/audit-log.model.js';
import { fileURLToPath } from 'url';
import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { logger } from '../config/logger.js';

export const runSeed = async (standalone = true) => {
  try {
    if (standalone) {
      await connectDatabase();
    }
    logger.info('Starting enterprise database seed process...');

    // Clean existing seed collections
    await Promise.all([
      User.deleteMany({}),
      Resource.deleteMany({}),
      Subscription.deleteMany({}),
      Project.deleteMany({}),
      ResourceAllocation.deleteMany({}),
      ApiCreditAccount.deleteMany({}),
      Expense.deleteMany({}),
      Notification.deleteMany({}),
      AuditLog.deleteMany({}),
    ]);

    logger.info('Purged existing records for fresh seed.');

    // 1. Seed Users
    const superAdminPassword = await User.hashPassword('Admin#2026!Secure');
    const adminPassword = await User.hashPassword('Admin#2026!Secure');
    const pmPassword = await User.hashPassword('Manager#2026!Secure');
    const employeePassword = await User.hashPassword('Employee#2026!Secure');

    const [superAdmin, admin, pm, employee] = await User.create([
      {
        name: 'Alex Rivera (Super Admin)',
        email: 'superadmin@enterprise.internal',
        passwordHash: superAdminPassword,
        role: 'SUPER_ADMIN',
        department: 'Executive Operations',
        isActive: true,
      },
      {
        name: 'Sarah Chen (Ops Admin)',
        email: 'admin@enterprise.internal',
        passwordHash: adminPassword,
        role: 'ADMIN',
        department: 'IT Operations',
        isActive: true,
      },
      {
        name: 'Marcus Vance (Project Lead)',
        email: 'pm@enterprise.internal',
        passwordHash: pmPassword,
        role: 'PROJECT_MANAGER',
        department: 'Product & Engineering',
        isActive: true,
      },
      {
        name: 'Elena Rostova (Senior Engineer)',
        email: 'engineer@enterprise.internal',
        passwordHash: employeePassword,
        role: 'EMPLOYEE',
        department: 'Core Infrastructure',
        isActive: true,
      },
    ]);

    logger.info('Seeded core enterprise users.');

    // 2. Seed Projects
    const [projectAI, projectPortal, projectCloud, projectMobile] = await Project.create([
      {
        name: 'Enterprise AI Knowledge Engine',
        code: 'PRJ-AI-01',
        description: 'Next-gen generative AI assistant for internal enterprise search and analytics.',
        status: 'ACTIVE',
        leadId: pm._id,
        department: 'Product & Engineering',
        budgetInCents: 5000000, // $50,000.00
        currency: 'USD',
        startDate: new Date('2026-01-15'),
      },
      {
        name: 'B2B Client Portal 2.0',
        code: 'PRJ-PORTAL-02',
        description: 'Modernized customer portal with real-time billing and service orchestration.',
        status: 'ACTIVE',
        leadId: pm._id,
        department: 'Customer Solutions',
        budgetInCents: 3500000, // $35,000.00
        currency: 'USD',
        startDate: new Date('2026-03-01'),
      },
      {
        name: 'Global Cloud Modernization',
        code: 'PRJ-CLOUD-03',
        description: 'Multi-region disaster recovery and zero-trust perimeter deployment.',
        status: 'ACTIVE',
        leadId: admin._id,
        department: 'IT Operations',
        budgetInCents: 8000000, // $80,000.00
        currency: 'USD',
        startDate: new Date('2026-02-10'),
      },
      {
        name: 'Mobile Workforce Application',
        code: 'PRJ-MOB-04',
        description: 'Cross-platform mobile client for field service and inventory checks.',
        status: 'PLANNING',
        leadId: pm._id,
        department: 'Product & Engineering',
        budgetInCents: 2000000, // $20,000.00
        currency: 'USD',
        startDate: new Date('2026-06-01'),
      },
    ]);

    logger.info('Seeded enterprise projects.');

    // 3. Seed Digital Resources
    const now = new Date();
    const in12Days = new Date(Date.now() + 12 * 86400000);
    const in25Days = new Date(Date.now() + 25 * 86400000);
    const in60Days = new Date(Date.now() + 60 * 86400000);

    const [resAws, resOpenAi, resGithub, resDatadog, resFigma, resCloudflare] = await Resource.create([
      {
        name: 'AWS Primary Production Cluster (us-east-1)',
        provider: 'AWS',
        category: 'CLOUD_INFRASTRUCTURE',
        resourceType: 'EKS & Compute Nodes',
        description: 'Multi-AZ Kubernetes cluster supporting production core APIs and microservices.',
        ownerId: admin._id,
        department: 'Core Infrastructure',
        costInCents: 385000, // $3,850.00/mo
        currency: 'USD',
        status: 'ACTIVE',
        renewalInfo: { renewalType: 'AUTO', interval: 'MONTHLY', nextRenewalDate: in12Days },
      },
      {
        name: 'OpenAI API Tier-5 Enterprise Account',
        provider: 'OpenAI',
        category: 'DEVELOPER_TOOL',
        resourceType: 'Generative AI Tokens',
        description: 'High-throughput LLM reasoning tokens and embedding models.',
        ownerId: pm._id,
        department: 'Product & Engineering',
        costInCents: 150000, // $1,500.00/mo
        currency: 'USD',
        status: 'ACTIVE',
        renewalInfo: { renewalType: 'AUTO', interval: 'MONTHLY', nextRenewalDate: in25Days },
      },
      {
        name: 'GitHub Enterprise Organization',
        provider: 'GitHub',
        category: 'DEVELOPER_TOOL',
        resourceType: 'Source Control & CI/CD',
        description: '120 developer seats, Actions runners, and secret scanning.',
        ownerId: employee._id,
        department: 'Core Infrastructure',
        costInCents: 252000, // $2,520.00/mo
        currency: 'USD',
        status: 'ACTIVE',
        renewalInfo: { renewalType: 'AUTO', interval: 'YEARLY', nextRenewalDate: in60Days },
      },
      {
        name: 'Datadog Observability & APM Suite',
        provider: 'Datadog',
        category: 'CLOUD_INFRASTRUCTURE',
        resourceType: 'Monitoring & Telemetry',
        description: 'Continuous profiling, APM tracing, and security signal detection.',
        ownerId: admin._id,
        department: 'IT Operations',
        costInCents: 120000, // $1,200.00/mo
        currency: 'USD',
        status: 'ACTIVE',
        renewalInfo: { renewalType: 'AUTO', interval: 'MONTHLY', nextRenewalDate: in12Days },
      },
      {
        name: 'Figma Enterprise Design System',
        provider: 'Figma',
        category: 'SAAS_TOOL',
        resourceType: 'Design Platform',
        description: 'Design system libraries, prototyping, and developer inspection seats.',
        ownerId: pm._id,
        department: 'Product & Engineering',
        costInCents: 45000, // $450.00/mo
        currency: 'USD',
        status: 'ACTIVE',
        renewalInfo: { renewalType: 'AUTO', interval: 'MONTHLY', nextRenewalDate: in25Days },
      },
      {
        name: 'Cloudflare Enterprise Edge & WAF',
        provider: 'Cloudflare',
        category: 'SECURITY',
        resourceType: 'DDoS Mitigation & DNS',
        description: 'Global CDN edge caching, Bot Management, and SSL/TLS management.',
        ownerId: admin._id,
        department: 'IT Operations',
        costInCents: 500000, // $5,000.00/yr
        currency: 'USD',
        status: 'ACTIVE',
        renewalInfo: { renewalType: 'MANUAL', interval: 'YEARLY', nextRenewalDate: in60Days },
      },
    ]);

    logger.info('Seeded digital resources.');

    // 4. Seed Subscriptions
    const [subAws, subOpenAi, subFigma, subDatadog] = await Subscription.create([
      {
        name: 'AWS Primary Reserved Capacity',
        provider: 'AWS',
        resourceId: resAws._id,
        plan: 'Compute Savings Plan 3-Year',
        startDate: new Date('2025-01-01'),
        billingFrequency: 'MONTHLY',
        nextRenewalDate: in12Days,
        costInCents: 385000,
        currency: 'USD',
        autoRenew: true,
        status: 'ACTIVE',
        responsibleEmployeeId: admin._id,
        billingHistory: [
          { billingDate: new Date('2026-08-01'), amountInCents: 385000, currency: 'USD', invoiceRef: 'INV-AWS-8831', status: 'PAID' },
          { billingDate: new Date('2026-09-01'), amountInCents: 385000, currency: 'USD', invoiceRef: 'INV-AWS-9124', status: 'PAID' },
          { billingDate: new Date('2026-10-01'), amountInCents: 385000, currency: 'USD', invoiceRef: 'INV-AWS-9482', status: 'PAID' },
        ],
      },
      {
        name: 'OpenAI Enterprise LLM Tier',
        provider: 'OpenAI',
        resourceId: resOpenAi._id,
        plan: 'Tier-5 Organization',
        startDate: new Date('2025-04-01'),
        billingFrequency: 'MONTHLY',
        nextRenewalDate: in25Days,
        costInCents: 150000,
        currency: 'USD',
        autoRenew: true,
        status: 'ACTIVE',
        responsibleEmployeeId: pm._id,
        billingHistory: [
          { billingDate: new Date('2026-09-15'), amountInCents: 150000, currency: 'USD', invoiceRef: 'INV-OAI-4402', status: 'PAID' },
          { billingDate: new Date('2026-10-15'), amountInCents: 150000, currency: 'USD', invoiceRef: 'INV-OAI-4819', status: 'PAID' },
        ],
      },
      {
        name: 'Figma Enterprise Workspace',
        provider: 'Figma',
        resourceId: resFigma._id,
        plan: 'Enterprise 30 Seats',
        startDate: new Date('2025-06-01'),
        billingFrequency: 'MONTHLY',
        nextRenewalDate: in25Days,
        costInCents: 45000,
        currency: 'USD',
        autoRenew: true,
        status: 'ACTIVE',
        responsibleEmployeeId: pm._id,
        billingHistory: [
          { billingDate: new Date('2026-10-05'), amountInCents: 45000, currency: 'USD', invoiceRef: 'INV-FIGMA-1029', status: 'PAID' },
        ],
      },
      {
        name: 'Datadog Pro Host Monitoring',
        provider: 'Datadog',
        resourceId: resDatadog._id,
        plan: 'Pro Tier 80 Hosts',
        startDate: new Date('2025-03-01'),
        billingFrequency: 'MONTHLY',
        nextRenewalDate: in12Days,
        costInCents: 120000,
        currency: 'USD',
        autoRenew: true,
        status: 'ACTIVE',
        responsibleEmployeeId: admin._id,
      },
    ]);

    logger.info('Seeded subscriptions.');

    // 5. Seed Resource Allocations
    await ResourceAllocation.create([
      {
        resourceId: resAws._id,
        projectId: projectPortal._id,
        assignedEmployeeId: employee._id,
        allocationMethod: 'PERCENTAGE',
        allocationValue: 50,
        calculatedCostInCents: 192500, // 50% of 385,000
        currency: 'USD',
        status: 'ACTIVE',
      },
      {
        resourceId: resAws._id,
        projectId: projectAI._id,
        assignedEmployeeId: employee._id,
        allocationMethod: 'PERCENTAGE',
        allocationValue: 40,
        calculatedCostInCents: 154000, // 40% of 385,000
        currency: 'USD',
        status: 'ACTIVE',
      },
      {
        resourceId: resOpenAi._id,
        projectId: projectAI._id,
        assignedEmployeeId: pm._id,
        allocationMethod: 'PERCENTAGE',
        allocationValue: 90,
        calculatedCostInCents: 135000, // 90% of 150,000
        currency: 'USD',
        status: 'ACTIVE',
      },
      {
        resourceId: resFigma._id,
        projectId: projectPortal._id,
        assignedEmployeeId: pm._id,
        allocationMethod: 'PERCENTAGE',
        allocationValue: 60,
        calculatedCostInCents: 27000, // 60% of 45,000
        currency: 'USD',
        status: 'ACTIVE',
      },
    ]);

    logger.info('Seeded project resource allocations.');

    // 6. Seed API Credit Accounts
    await ApiCreditAccount.create([
      {
        provider: 'OpenAI',
        accountIdentifier: 'org-enterprise-corp-01',
        resourceId: resOpenAi._id,
        projectId: projectAI._id,
        creditModel: 'TOKEN_QUOTA',
        unit: 'TOKENS',
        reportedBalance: 8500000, // 8.5M tokens
        estimatedBalance: 8420000,
        totalPurchased: 50000000,
        thresholdLimit: 2000000,
        lastSyncAt: new Date(Date.now() - 3600000),
        syncStatus: 'SUCCESS',
      },
      {
        provider: 'Anthropic',
        accountIdentifier: 'claude-enterprise-team',
        resourceId: resOpenAi._id,
        projectId: projectAI._id,
        creditModel: 'MONETARY',
        unit: 'USD_CENTS',
        reportedBalance: 145000, // $1,450.00
        estimatedBalance: 142500,
        totalPurchased: 500000,
        thresholdLimit: 50000, // $500.00
        lastSyncAt: new Date(Date.now() - 7200000),
        syncStatus: 'SUCCESS',
      },
      {
        provider: 'Stripe',
        accountIdentifier: 'acct_enterprise_prod_live',
        projectId: projectPortal._id,
        creditModel: 'REQUEST_QUOTA',
        unit: 'REQUESTS',
        reportedBalance: 4200, // Below threshold of 5000!
        estimatedBalance: 4180,
        totalPurchased: 100000,
        thresholdLimit: 5000, // Low credit alert trigger!
        lastSyncAt: new Date(Date.now() - 1800000),
        syncStatus: 'SUCCESS',
      },
    ]);

    logger.info('Seeded API credit accounts.');

    // 7. Seed Verified Paid Expenses
    const d1 = new Date(now.getFullYear(), now.getMonth() - 2, 12);
    const d2 = new Date(now.getFullYear(), now.getMonth() - 1, 10);
    const d3 = new Date(now.getFullYear(), now.getMonth(), 5);

    await Expense.create([
      {
        amountInCents: 385000,
        currency: 'USD',
        paymentDate: d1,
        provider: 'AWS',
        category: 'CLOUD_INFRASTRUCTURE',
        invoiceNumber: 'INV-AWS-8831',
        paymentStatus: 'PAID',
        projectId: projectCloud._id,
        createdBy: admin._id,
        isForecast: false,
      },
      {
        amountInCents: 385000,
        currency: 'USD',
        paymentDate: d2,
        provider: 'AWS',
        category: 'CLOUD_INFRASTRUCTURE',
        invoiceNumber: 'INV-AWS-9124',
        paymentStatus: 'PAID',
        projectId: projectCloud._id,
        createdBy: admin._id,
        isForecast: false,
      },
      {
        amountInCents: 385000,
        currency: 'USD',
        paymentDate: d3,
        provider: 'AWS',
        category: 'CLOUD_INFRASTRUCTURE',
        invoiceNumber: 'INV-AWS-9482',
        paymentStatus: 'PAID',
        projectId: projectCloud._id,
        createdBy: admin._id,
        isForecast: false,
      },
      {
        amountInCents: 150000,
        currency: 'USD',
        paymentDate: d2,
        provider: 'OpenAI',
        category: 'API_CREDITS',
        invoiceNumber: 'INV-OAI-4402',
        paymentStatus: 'PAID',
        projectId: projectAI._id,
        createdBy: pm._id,
        isForecast: false,
      },
      {
        amountInCents: 150000,
        currency: 'USD',
        paymentDate: d3,
        provider: 'OpenAI',
        category: 'API_CREDITS',
        invoiceNumber: 'INV-OAI-4819',
        paymentStatus: 'PAID',
        projectId: projectAI._id,
        createdBy: pm._id,
        isForecast: false,
      },
      {
        amountInCents: 45000,
        currency: 'USD',
        paymentDate: d3,
        provider: 'Figma',
        category: 'SAAS_TOOL',
        invoiceNumber: 'INV-FIGMA-1029',
        paymentStatus: 'PAID',
        projectId: projectPortal._id,
        createdBy: pm._id,
        isForecast: false,
      },
    ]);

    logger.info('Seeded verified paid expenses.');

    // 8. Seed In-app Notifications
    await Notification.create([
      {
        recipientId: admin._id,
        type: 'RENEWAL_UPCOMING',
        title: 'Upcoming Renewal (12 days): AWS Primary Reserved Capacity',
        message: 'Subscription AWS Primary Reserved Capacity ($3,850.00 USD) will renew in 12 days.',
        severity: 'WARNING',
        targetEntity: { entityType: 'Subscription', entityId: subAws._id },
        isRead: false,
      },
      {
        recipientId: pm._id,
        type: 'LOW_API_CREDIT',
        title: 'Low API Quota Alert: Stripe Request Quota',
        message: 'Account acct_enterprise_prod_live balance has fallen to 4,200 REQUESTS, below the 5,000 threshold limit.',
        severity: 'CRITICAL',
        isRead: false,
      },
      {
        recipientId: employee._id,
        type: 'RESOURCE_ALLOCATED',
        title: 'Resource Assigned: AWS Primary Production Cluster',
        message: 'You have been assigned as lead engineer for the B2B Client Portal 2.0 resource allocation.',
        severity: 'INFO',
        isRead: true,
      },
    ]);

    logger.info('Seeded in-app notifications.');

    // 9. Seed Audit Logs
    await AuditLog.create([
      {
        actorId: superAdmin._id,
        actorEmail: superAdmin.email,
        actorRole: superAdmin.role,
        action: 'TENANT_SEEDED',
        targetType: 'System',
        outcome: 'SUCCESS',
        details: { environment: 'Development Enterprise Baseline' },
      },
      {
        actorId: admin._id,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: 'RESOURCE_CREATED',
        targetType: 'Resource',
        targetId: resAws._id.toString(),
        targetName: resAws.name,
        details: { costInCents: resAws.costInCents, provider: resAws.provider },
      },
    ]);

    logger.info('Seeded audit logs.');
    logger.info('*** Enterprise Database Seeding Completed Successfully! ***');

    if (standalone) {
      await disconnectDatabase();
      process.exit(0);
    }
    return true;
  } catch (err) {
    logger.fatal({ err }, 'Failed to seed enterprise database');
    if (standalone) {
      await disconnectDatabase();
      process.exit(1);
    }
    throw err;
  }
};

// Auto-run if executed directly
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runSeed(true);
}


