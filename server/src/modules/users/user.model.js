import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { ROLES } from '../../middleware/rbac.js';

const refreshTokenSchema = new mongoose.Schema({
  tokenHash: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  ipAddress: String,
  userAgent: String,
});

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'User name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email address is required'],
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  passwordHash: {
    type: String,
    required: [true, 'Password hash is required'],
    select: false,
  },
  role: {
    type: String,
    enum: Object.values(ROLES),
    default: ROLES.EMPLOYEE,
    index: true,
  },
  department: {
    type: String,
    trim: true,
    default: 'General',
    index: true,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  refreshTokens: [refreshTokenSchema],
  passwordResetTokenHash: {
    type: String,
    select: false,
  },
  passwordResetExpiresAt: {
    type: Date,
    select: false,
  },
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      delete ret.passwordHash;
      delete ret.refreshTokens;
      delete ret.passwordResetTokenHash;
      delete ret.passwordResetExpiresAt;
      delete ret.__v;
      return ret;
    },
  },
});

userSchema.index({ isActive: 1, role: 1 });
userSchema.index({ department: 1, isActive: 1 });

// Password verification method
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Static method to hash password
userSchema.statics.hashPassword = async function (password) {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

// Generates a cryptographically secure random reset token and stores sha256 hash
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetTokenHash = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  // Token expires in 1 hour
  this.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
  return resetToken;
};

// Clears the password reset token fields
userSchema.methods.clearPasswordResetToken = function () {
  this.passwordResetTokenHash = undefined;
  this.passwordResetExpiresAt = undefined;
};

// Revoke all active refresh sessions
userSchema.methods.revokeAllSessions = function () {
  this.refreshTokens = [];
};

export const User = mongoose.model('User', userSchema);
