import mongoose from 'mongoose';

export const PROJECT_STATUSES = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED'];

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    index: true,
  },
  code: {
    type: String,
    required: [true, 'Project code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    index: true,
  },
  description: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: PROJECT_STATUSES,
    default: 'ACTIVE',
    index: true,
  },
  startDate: {
    type: Date,
  },
  targetEndDate: {
    type: Date,
  },
  leadId: {
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
  budgetInCents: {
    type: Number,
    min: [0, 'Budget must be >= 0'],
    default: 0,
  },
  currency: {
    type: String,
    required: true,
    uppercase: true,
    default: 'USD',
  },
}, {
  timestamps: true,
});

export const Project = mongoose.model('Project', projectSchema);
