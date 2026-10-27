import { Notification } from './notification.model.js';
import { User } from '../users/user.model.js';
import { logger } from '../../config/logger.js';

export const createNotification = async ({
  recipientId = null,
  type,
  title,
  message,
  severity = 'INFO',
  targetEntity = null,
}) => {
  try {
    // If no specific recipient is provided, broadcast notification to all Admin & Super Admin users
    if (!recipientId) {
      const admins = await User.find({
        role: { $in: ['ADMIN', 'SUPER_ADMIN'] },
        isActive: true,
      }).select('_id');

      const notifications = admins.map((admin) => ({
        recipientId: admin._id,
        type,
        title,
        message,
        severity,
        targetEntity,
      }));

      if (notifications.length > 0) {
        return await Notification.insertMany(notifications);
      }
      return [];
    }

    const notification = new Notification({
      recipientId,
      type,
      title,
      message,
      severity,
      targetEntity,
    });

    await notification.save();
    return notification;
  } catch (error) {
    logger.error({ err: error }, 'Failed to create in-app notification');
    return null;
  }
};

export const listUserNotifications = async (userId, { page = 1, limit = 20, unreadOnly = false }) => {
  const query = { recipientId: userId };
  if (unreadOnly === 'true' || unreadOnly === true) {
    query.isRead = false;
  }

  const skip = (page - 1) * limit;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(query),
    Notification.countDocuments({ recipientId: userId, isRead: false }),
  ]);

  return {
    notifications,
    unreadCount,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const markAsRead = async (id, userId) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: id, recipientId: userId },
    { isRead: true, readAt: new Date() },
    { new: true }
  );
  return notification;
};

export const markAllAsRead = async (userId) => {
  await Notification.updateMany(
    { recipientId: userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
  return { message: 'All notifications marked as read' };
};
