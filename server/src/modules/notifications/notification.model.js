import mongoose from 'mongoose';

export const NOTIFICATION_TYPES = [
  'RENEWAL_UPCOMING',
  'SUBSCRIPTION_EXPIRED',
  'LOW_API_CREDIT',
  'SYNC_FAILED',
  'RESOURCE_ALLOCATED',
  'SYSTEM',
];

const notificationSchema = new mongoose.Schema({
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  type: {
    type: String,
    enum: NOTIFICATION_TYPES,
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  severity: {
    type: String,
    enum: ['INFO', 'WARNING', 'CRITICAL'],
    default: 'INFO',
  },
  targetEntity: {
    entityType: String,
    entityId: mongoose.Schema.Types.ObjectId,
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true,
  },
  readAt: Date,
}, {
  timestamps: true,
});

notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);

