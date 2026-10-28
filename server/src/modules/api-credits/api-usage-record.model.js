import mongoose from 'mongoose';

const apiUsageRecordSchema = new mongoose.Schema({
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ApiCreditAccount',
    required: [true, 'API account reference is required'],
    index: true,
  },
  provider: {
    type: String,
    required: [true, 'Provider is required'],
    trim: true,
    index: true,
  },
  date: {
    type: Date,
    default: Date.now,
    index: true,
  },
  amount: {
    type: Number,
    required: [true, 'Usage amount is required'],
    min: [0, 'Usage amount must be non-negative'],
  },
  unit: {
    type: String,
    required: [true, 'Unit is required'],
    uppercase: true,
  },
  costInCents: {
    type: Number,
    min: [0, 'Cost in cents must be >= 0'],
    default: 0,
  },
  endpoint: {
    type: String,
    trim: true,
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    index: true,
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  description: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

apiUsageRecordSchema.index({ accountId: 1, date: -1 });
apiUsageRecordSchema.index({ projectId: 1, date: -1 });
apiUsageRecordSchema.index({ provider: 1, date: -1 });

export const ApiUsageRecord = mongoose.model('ApiUsageRecord', apiUsageRecordSchema);

