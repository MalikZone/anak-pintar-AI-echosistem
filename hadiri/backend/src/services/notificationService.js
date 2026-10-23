import { notificationRepository } from '../repositories/NotificationRepository.js';
import { userRepository } from '../repositories/UserRepository.js';
import { AppError } from '../utils/appError.js';

class NotificationService {
  /**
   * Create a single notification for a specific user
   */
  async createNotification({ tenantId, userId, type = 'system', title, message, link = null }) {
    if (!tenantId || !userId || !title || !message) {
      return null;
    }
    const id = `NTF-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    return notificationRepository.create({
      id,
      tenantId,
      userId,
      type,
      title,
      message,
      link,
      isRead: false,
    });
  }

  /**
   * Send notification to a specific user
   */
  async notifyUser(userId, { tenantId, type = 'system', title, message, link = null }) {
    return this.createNotification({ tenantId, userId, type, title, message, link });
  }

  /**
   * Notify leader if specified
   */
  async notifyLeader(leaderId, { tenantId, type = 'system', title, message, link = null }) {
    if (!leaderId) return null;
    return this.createNotification({ tenantId, userId: leaderId, type, title, message, link });
  }

  /**
   * Notify all HR Admins of a tenant (and optionally Super Admins)
   */
  async notifyAdmins(tenantId, { type = 'system', title, message, link = null, excludeUserId = null }) {
    try {
      const users = await userRepository.findByTenant(tenantId);
      const admins = users.filter(
        (u) =>
          (u.role === 'hr_admin' || u.role === 'super_admin') &&
          u.id !== excludeUserId &&
          u.isActive
      );

      const promises = admins.map((admin) =>
        this.createNotification({
          tenantId: admin.tenantId || tenantId,
          userId: admin.id,
          type,
          title,
          message,
          link,
        })
      );
      return Promise.all(promises);
    } catch (err) {
      console.error('[NotificationService] notifyAdmins error:', err.message);
      return [];
    }
  }

  /**
   * Get user notifications with unread count
   */
  async getUserNotifications(userId, { unreadOnly = false, limit = 20, offset = 0 } = {}) {
    const [list, unreadCount] = await Promise.all([
      notificationRepository.findByUser(userId, { unreadOnly, limit, offset }),
      notificationRepository.getUnreadCount(userId),
    ]);
    return {
      notifications: list,
      unreadCount,
    };
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(id, userId) {
    return notificationRepository.markAsRead(id, userId);
  }

  /**
   * Mark all user notifications as read
   */
  async markAllAsRead(userId) {
    return notificationRepository.markAllAsRead(userId);
  }

  /**
   * Mark notifications related to a specific action/request link as read for an approver or admin
   */
  async markActionNotificationsAsRead({ userId, tenantId, link, keyword }) {
    try {
      return await notificationRepository.markAsReadByCriteria({ userId, tenantId, link, keyword });
    } catch (err) {
      console.warn('[NotificationService] markActionNotificationsAsRead error:', err.message);
      return false;
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;

