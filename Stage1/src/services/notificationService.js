import Notification from "../models/Notification.js";
import { AppError } from "../middleware/errorHandler.js";

const createNotification = async (payload, io) => {
  const notification = await Notification.create(payload);

  if (io) {
    io.to(notification.userId).emit("notification:new", notification);
  }

  return notification;
};

const getUserNotifications = async (userId, options) => {
  const page = Math.max(parseInt(options.page || "1", 10), 1);
  const limit = Math.max(parseInt(options.limit || "10", 10), 1);

  const query = { userId };
  if (options.isRead !== undefined) {
    query.isRead = options.isRead === "true" || options.isRead === true;
  }

  const [items, total] = await Promise.all([
    Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Notification.countDocuments(query)
  ]);

  return { items, page, limit, total };
};

const getNotificationById = async (id) => {
  const notification = await Notification.findById(id).lean();

  if (!notification) {
    throw new AppError("Notification not found", 404);
  }

  return notification;
};

const markNotificationAsRead = async (id, io) => {
  const notification = await Notification.findByIdAndUpdate(
    id,
    { isRead: true, readAt: new Date() },
    { new: true }
  ).lean();

  if (!notification) {
    throw new AppError("Notification not found", 404);
  }

  if (io) {
    io.to(notification.userId).emit("notification:read", notification);
  }

  return notification;
};

const markAllNotificationsAsRead = async (userId, io) => {
  const now = new Date();

  await Notification.updateMany(
    { userId, isRead: false },
    { isRead: true, readAt: now }
  );

  if (io) {
    io.to(userId).emit("notification:read", { userId });
  }

  return { userId };
};

const deleteNotification = async (id, io) => {
  const notification = await Notification.findByIdAndDelete(id).lean();

  if (!notification) {
    throw new AppError("Notification not found", 404);
  }

  if (io) {
    io.to(notification.userId).emit("notification:delete", notification);
  }

  return notification;
};

const getNotificationStats = async (userId) => {
  const [total, read, unread] = await Promise.all([
    Notification.countDocuments({ userId }),
    Notification.countDocuments({ userId, isRead: true }),
    Notification.countDocuments({ userId, isRead: false })
  ]);

  return { total, read, unread };
};

export default {
  createNotification,
  getUserNotifications,
  getNotificationById,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getNotificationStats
};
