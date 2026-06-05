import { validationResult } from "express-validator";
import notificationService from "../services/notificationService.js";
import { successResponse } from "../utils/responseFormatter.js";

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      data: { errors: errors.array() }
    });
    return true;
  }

  return false;
};

const createNotification = async (req, res, next) => {
  try {
    if (handleValidation(req, res)) {
      return;
    }

    const io = req.app.get("io");
    const notification = await notificationService.createNotification(req.body, io);

    return successResponse(res, "Notification created successfully", notification, 201);
  } catch (error) {
    return next(error);
  }
};

const getUserNotifications = async (req, res, next) => {
  try {
    if (handleValidation(req, res)) {
      return;
    }

    const { userId } = req.params;
    const data = await notificationService.getUserNotifications(userId, req.query);

    return successResponse(res, "Notifications fetched successfully", data);
  } catch (error) {
    return next(error);
  }
};

const getNotificationById = async (req, res, next) => {
  try {
    if (handleValidation(req, res)) {
      return;
    }

    const data = await notificationService.getNotificationById(req.params.id);

    return successResponse(res, "Notification fetched successfully", data);
  } catch (error) {
    return next(error);
  }
};

const markNotificationAsRead = async (req, res, next) => {
  try {
    if (handleValidation(req, res)) {
      return;
    }

    const io = req.app.get("io");
    const data = await notificationService.markNotificationAsRead(req.params.id, io);

    return successResponse(res, "Notification marked as read", data);
  } catch (error) {
    return next(error);
  }
};

const markAllNotificationsAsRead = async (req, res, next) => {
  try {
    if (handleValidation(req, res)) {
      return;
    }

    const io = req.app.get("io");
    const data = await notificationService.markAllNotificationsAsRead(req.params.userId, io);

    return successResponse(res, "All notifications marked as read", data);
  } catch (error) {
    return next(error);
  }
};

const deleteNotification = async (req, res, next) => {
  try {
    if (handleValidation(req, res)) {
      return;
    }

    const io = req.app.get("io");
    const data = await notificationService.deleteNotification(req.params.id, io);

    return successResponse(res, "Notification deleted successfully", data);
  } catch (error) {
    return next(error);
  }
};

const getNotificationStats = async (req, res, next) => {
  try {
    if (handleValidation(req, res)) {
      return;
    }

    const data = await notificationService.getNotificationStats(req.params.userId);

    return successResponse(res, "Notification stats fetched successfully", data);
  } catch (error) {
    return next(error);
  }
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
