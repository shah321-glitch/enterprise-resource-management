import mongoose from 'mongoose';

export const BILLING_FREQUENCIES = ['MONTHLY', 'QUARTERLY', 'YEARLY', 'ONE_TIME', 'CUSTOM'];
export const SUBSCRIPTION_STATUSES = ['ACTIVE', 'TRIAL', 'PENDING_RENEWAL', 'EXPIRED', 'CANCELLED'];

const billingHistorySchema = new mongoose.Schema({
  billingDate: { type: Date, required: true },
  amountInCents: { type: Number, required: true },
  currency: { type: String, required: true, uppercase: true, default: 'USD' },
  invoiceRef: String,
  status: { type: String, enum: ['PAID', 'PENDING', 'FAILED'], default: 'PAID' },
}, { _id: true });

const renewalHistorySchema = new mongoose.Schema({
  renewedAt: { type: Date, default: Date.now },
  previousRenewalDate: Date,
  nextRenewalDate: Date,
  amountInCents: Number,
  currency: String,
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { _id: true });

const subscriptionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Subscription name is required'],
    trim: true,
    index: true,
  },
  provider: {
    type: String,
    required: [true, 'Provider is required'],
    trim: true,
    index: true,
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resource',
    required: false,
    index: true,
  },
  plan: {
    type: String,
    trim: true,
    default: 'Standard',
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required'],
  },
  billingFrequency: {
    type: String,
    enum: BILLING_FREQUENCIES,
    default: 'MONTHLY',
    index: true,
  },
  customIntervalDays: {
    type: Number,
    min: 1,
  },
  nextRenewalDate: {
    type: Date,
    required: true,
    index: true,
  },
  costInCents: {
    type: Number,
    required: true,
    min: [0, 'Cost in cents must be >= 0'],
  },
  currency: {
    type: String,
    required: true,
    uppercase: true,
    default: 'USD',
  },
  autoRenew: {
    type: Boolean,
    default: true,
  },
  status: {
    type: String,
    enum: SUBSCRIPTION_STATUSES,
    default: 'ACTIVE',
    index: true,
  },
  responsibleEmployeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  billingHistory: [billingHistorySchema],
  renewalHistory: [renewalHistorySchema],
  renewalRemindersSent: [{
    daysBefore: Number,
    sentAt: Date,
  }],
  cancellationDetails: {
    cancelledAt: Date,
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String,
  },
}, {
  timestamps: true,
});

// Compound indexes
subscriptionSchema.index({ status: 1, nextRenewalDate: 1 });
subscriptionSchema.index({ provider: 1, status: 1 });

export const Subscription = mongoose.model('Subscription', subscriptionSchema);
