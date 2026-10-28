import mongoose from 'mongoose';

const billingRecordSchema = new mongoose.Schema({
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    required: [true, 'Subscription reference is required'],
    index: true,
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resource',
    index: true,
  },
  billingDate: {
    type: Date,
    required: [true, 'Billing date is required'],
    index: true,
  },
  amountInCents: {
    type: Number,
    required: [true, 'Amount in cents is required'],
    min: [0, 'Amount must be >= 0'],
  },
  currency: {
    type: String,
    required: true,
    uppercase: true,
    default: 'USD',
  },
  invoiceRef: {
    type: String,
    trim: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['PAID', 'PENDING', 'FAILED', 'REFUNDED'],
    default: 'PAID',
    index: true,
  },
  renewalType: {
    type: String,
    enum: ['AUTOMATIC', 'MANUAL', 'ONE_TIME'],
    default: 'AUTOMATIC',
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  notes: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

billingRecordSchema.index({ subscriptionId: 1, billingDate: -1 });
billingRecordSchema.index({ billingDate: -1 });

export const BillingRecord = mongoose.model('BillingRecord', billingRecordSchema);

