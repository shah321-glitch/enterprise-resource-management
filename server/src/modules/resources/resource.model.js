import mongoose from 'mongoose';

export const RESOURCE_CATEGORIES = [
  'CLOUD_INFRASTRUCTURE',
  'SAAS_TOOL',
  'DOMAIN_DNS',
  'DEVELOPER_TOOL',
  'SECURITY',
  'OTHER',
];

export const RESOURCE_STATUSES = ['ACTIVE', 'INACTIVE', 'ARCHIVED', 'MAINTENANCE'];

const resourceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Resource name is required'],
    trim: true,
    index: true,
  },
  provider: {
    type: String,
    required: [true, 'Provider name is required'],
    trim: true,
    index: true,
  },
  category: {
    type: String,
    enum: RESOURCE_CATEGORIES,
    default: 'OTHER',
    index: true,
  },
  resourceType: {
    type: String,
    trim: true,
    default: 'General Resource',
  },
  description: {
    type: String,
    trim: true,
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  department: {
    type: String,
    trim: true,
    default: 'Engineering',
    index: true,
  },
  costInCents: {
    type: Number,
    required: true,
    min: [0, 'Cost in cents must be >= 0'],
    default: 0,
  },
  currency: {
    type: String,
    required: true,
    uppercase: true,
    default: 'USD',
  },
  status: {
    type: String,
    enum: RESOURCE_STATUSES,
    default: 'ACTIVE',
    index: true,
  },
  isArchived: {
    type: Boolean,
    default: false,
    index: true,
  },
  renewalInfo: {
    renewalType: {
      type: String,
      enum: ['AUTO', 'MANUAL', 'NONE'],
      default: 'NONE',
    },
    interval: {
      type: String,
      enum: ['MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM', 'NONE'],
      default: 'NONE',
    },
    nextRenewalDate: Date,
  },
  notes: {
    type: String,
  },
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    index: true,
  },
}, {
  timestamps: true,
});

// Compound indexes
resourceSchema.index({ provider: 1, category: 1, status: 1 });
resourceSchema.index({ isArchived: 1, status: 1 });

export const Resource = mongoose.model('Resource', resourceSchema);

