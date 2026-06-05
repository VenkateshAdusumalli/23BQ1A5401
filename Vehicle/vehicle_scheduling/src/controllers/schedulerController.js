const schedulerService = require("../services/schedulerService");

const DEFAULT_BUDGET_HOURS = 8;

async function getSchedule(req, res, next) {
  try {
    const depotId = req.params.depotId;

    if (!depotId) {
      return res.status(400).json({ error: "depotId is required" });
    }

    const budgetParam = req.query.budget;
    const budgetHours = budgetParam ? Number(budgetParam) : DEFAULT_BUDGET_HOURS;

    if (!Number.isInteger(budgetHours) || budgetHours <= 0) {
      return res
        .status(400)
        .json({ error: "budget must be a positive integer" });
    }

    const schedule = await schedulerService.buildSchedule(depotId, budgetHours);
    res.json(schedule);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSchedule
};
