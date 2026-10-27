import mongoose from 'mongoose';

export const EXPENSE_CATEGORIES = [
  'INFRASTRUCTURE',
  'CLOUD_INFRASTRUCTURE',
  'SOFTWARE_LICENSE',
  'SAAS_TOOL',
  'API_CREDITS',
  'CONSULTING',
  'HARDWARE',
  'OTHER',
];

export const PAYMENT_STATUSES = ['PAID', 'PENDING', 'FAILED', 'REFUNDED'];

const expenseSchema = new mongoose.Schema({
  amountInCents: {
    type: Number,
    required: [true, 'Expense amount in cents is required'],
    min: [0, 'Amount must be >= 0'],
  },
  currency: {
    type: String,
    required: true,
    uppercase: true,
    default: 'USD',
  },
  paymentDate: {
    type: Date,
    required: [true, 'Payment date is required'],
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
    index: true,
  },
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    index: true,
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    index: true,
  },
  category: {
    type: String,
    enum: EXPENSE_CATEGORIES,
    default: 'OTHER',
    index: true,
  },
  invoiceNumber: {
    type: String,
    trim: true,
    index: true,
  },
  paymentStatus: {
    type: String,
    enum: PAYMENT_STATUSES,
    default: 'PAID',
    index: true,
  },
  paymentMethod: {
    type: String,
    trim: true,
    default: 'Corporate Card',
  },
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  isForecast: {
    type: Boolean,
    default: false,
    index: true, // Strict invariant: false means actual confirmed expenditure
  },
}, {
  timestamps: true,
});

expenseSchema.index({ paymentDate: -1, isForecast: 1 });
expenseSchema.index({ provider: 1, paymentDate: -1 });
expenseSchema.index({ category: 1, paymentDate: -1 });
expenseSchema.index({ projectId: 1, paymentDate: -1 });

export const Expense = mongoose.model('Expense', expenseSchema);
