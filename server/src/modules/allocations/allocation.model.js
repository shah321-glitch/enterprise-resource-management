import mongoose from 'mongoose';

export const ALLOCATION_METHODS = ['EQUAL', 'PERCENTAGE', 'FIXED_AMOUNT', 'USAGE_BASED'];
export const ALLOCATION_STATUSES = ['ACTIVE', 'TERMINATED', 'EXPIRED'];

const allocationSchema = new mongoose.Schema({
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resource',
    required: [true, 'Resource reference is required'],
    index: true,
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project reference is required'],
    index: true,
  },
  assignedEmployeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  allocationMethod: {
    type: String,
    enum: ALLOCATION_METHODS,
    required: true,
    default: 'PERCENTAGE',
  },
  allocationValue: {
    type: Number,
    required: true,
    min: [0, 'Allocation value must be >= 0'],
    default: 100, // e.g. 100% or amount in cents
  },
  calculatedCostInCents: {
    type: Number,
    required: true,
    min: [0, 'Calculated cost must be >= 0'],
    default: 0,
  },
  currency: {
    type: String,
    required: true,
    uppercase: true,
    default: 'USD',
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  endDate: {
    type: Date,
  },
  status: {
    type: String,
    enum: ALLOCATION_STATUSES,
    default: 'ACTIVE',
    index: true,
  },
  usageLimit: {
    type: Number,
  },
  notes: String,
}, {
  timestamps: true,
});

allocationSchema.index({ resourceId: 1, status: 1 });
allocationSchema.index({ projectId: 1, status: 1 });

export const ResourceAllocation = mongoose.model('ResourceAllocation', allocationSchema);
