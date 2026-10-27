import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    index: true,
  },
  actorEmail: {
    type: String,
    required: false,
  },
  actorRole: {
    type: String,
    required: false,
  },
  action: {
    type: String,
    required: true,
    index: true,
  },
  targetType: {
    type: String,
    required: true,
    index: true,
  },
  targetId: {
    type: String,
    required: false,
    index: true,
  },
  targetName: {
    type: String,
    required: false,
  },
  outcome: {
    type: String,
    enum: ['SUCCESS', 'FAILURE'],
    default: 'SUCCESS',
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  ipAddress: {
    type: String,
    required: false,
  },
  userAgent: {
    type: String,
    required: false,
  },
}, {
  timestamps: { createdAt: true, updatedAt: false }, // Immutable: no updatedAt
});

// Compound indexes for rapid filtering
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });

// Restrict modification or deletion
auditLogSchema.pre('updateOne', function () {
  throw new Error('Audit logs are immutable and cannot be updated');
});
auditLogSchema.pre('updateMany', function () {
  throw new Error('Audit logs are immutable and cannot be updated');
});
auditLogSchema.pre('findOneAndUpdate', function () {
  throw new Error('Audit logs are immutable and cannot be updated');
});

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);

