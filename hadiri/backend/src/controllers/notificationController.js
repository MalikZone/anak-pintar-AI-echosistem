import { notificationService } from '../services/notificationService.js';
import { sendSuccess } from '../utils/responseHandler.js';

export const getNotifications = async (req, res, next) => {
  try {
    const { unreadOnly, limit, offset } = req.query;
    const result = await notificationService.getUserNotifications(req.user.id, {
      unreadOnly: unreadOnly === 'true',
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
    });
    return sendSuccess(res, result, 'notification.loaded');
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const updated = await notificationService.markAsRead(req.params.id, req.user.id);
    return sendSuccess(res, updated, 'notification.marked_read');
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    await notificationService.markAllAsRead(req.user.id);
    return sendSuccess(res, { success: true }, 'notification.all_marked_read');
  } catch (error) {
    next(error);
  }
};

