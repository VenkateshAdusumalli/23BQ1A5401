import { Router } from "express";
import { body, param } from "express-validator";
import notificationController from "../controllers/notificationController.js";

const router = Router();

router.post(
  "/notifications",
  [
    body("userId").notEmpty().withMessage("userId is required"),
    body("title").notEmpty().withMessage("title is required"),
    body("message").notEmpty().withMessage("message is required")
  ],
  notificationController.createNotification
);

router.get(
  "/users/:userId/notifications",
  [param("userId").notEmpty().withMessage("userId is required")],
  notificationController.getUserNotifications
);

router.get(
  "/notifications/:id",
  [param("id").isMongoId().withMessage("Invalid notification id")],
  notificationController.getNotificationById
);

router.patch(
  "/notifications/:id/read",
  [param("id").isMongoId().withMessage("Invalid notification id")],
  notificationController.markNotificationAsRead
);

router.patch(
  "/users/:userId/notifications/read-all",
  [param("userId").notEmpty().withMessage("userId is required")],
  notificationController.markAllNotificationsAsRead
);

router.delete(
  "/notifications/:id",
  [param("id").isMongoId().withMessage("Invalid notification id")],
  notificationController.deleteNotification
);

router.get(
  "/users/:userId/notifications/stats",
  [param("userId").notEmpty().withMessage("userId is required")],
  notificationController.getNotificationStats
);

export default router;
