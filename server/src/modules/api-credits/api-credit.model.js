import mongoose from 'mongoose';

export const CREDIT_MODELS = ['MONETARY', 'REQUEST_QUOTA', 'TOKEN_QUOTA', 'UNIT_QUOTA'];
export const SYNC_STATUSES = ['SUCCESS', 'FAILED', 'NEVER_SYNCED', 'SYNCING'];

const usageRecordSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  amount: { type: Number, required: true },
  description: String,
}, { _id: true });

const apiCreditAccountSchema = new mongoose.Schema({
  provider: {
    type: String,
    required: [true, 'Provider name is required'],
    trim: true,
    index: true,
  },
  accountIdentifier: {
    type: String,
    required: [true, 'API account identifier is required'],
    trim: true,
    index: true,
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resource',
    index: true,
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    index: true,
  },
  creditModel: {
    type: String,
    enum: CREDIT_MODELS,
    required: true,
    index: true,
  },
  unit: {
    type: String,
    required: true,
    uppercase: true,
    default: 'USD_CENTS',
  },
  reportedBalance: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'Reported balance must be non-negative'],
  },
  estimatedBalance: {
    type: Number,
    default: 0,
    min: [0, 'Estimated balance must be non-negative'],
  },
  totalPurchased: {
    type: Number,
    default: 0,
  },
  thresholdLimit: {
    type: Number,
    required: true,
    default: 1000, // e.g. $10.00 or 1,000 tokens
  },
  usageRecords: [usageRecordSchema],
  lastSyncAt: Date,
  syncStatus: {
    type: String,
    enum: SYNC_STATUSES,
    default: 'NEVER_SYNCED',
  },
  lastSyncError: String,
  resetDate: Date,
}, {
  timestamps: true,
});

apiCreditAccountSchema.index({ provider: 1, creditModel: 1 });
apiCreditAccountSchema.index({ reportedBalance: 1, thresholdLimit: 1 });

export const ApiCreditAccount = mongoose.model('ApiCreditAccount', apiCreditAccountSchema);

