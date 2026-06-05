const express = require("express");
const schedulerController = require("../controllers/schedulerController");

const router = express.Router();

router.get("/schedule/:depotId", schedulerController.getSchedule);

module.exports = router;
