import * as notificationService from './notification.service.js';

export const listNotifications = async (req, res, next) => {
  try {
    const result = await notificationService.listUserNotifications(req.user._id, req.query);
    res.status(200).json({
      success: true,
      data: result.notifications,
      unreadCount: result.unreadCount,
      meta: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const notification = await notificationService.markAsRead(req.params.id, req.user._id);
    res.status(200).json({
      success: true,
      data: notification,
      message: 'Notification marked as read',
    });
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    const result = await notificationService.markAllAsRead(req.user._id);
    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};
