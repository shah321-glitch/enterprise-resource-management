import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
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
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      delete ret.passwordHash;
      delete ret.refreshTokens;
      delete ret.__v;
      return ret;
    },
  },
});

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

export const User = mongoose.model('User', userSchema);

