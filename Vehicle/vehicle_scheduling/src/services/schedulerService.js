const apiService = require("./apiService");
const { solveKnapsack } = require("../utils/knapsack");

function createError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function extractTasks(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && Array.isArray(payload.tasks)) {
    return payload.tasks;
  }

  throw createError(502, "Tasks payload is not an array");
}

function normalizeTasks(rawTasks) {
  return rawTasks.map((task) => {
    const operationalImpactScore = Number(task.operationalImpactScore);
    const serviceDurationHours = Number(task.serviceDurationHours);

    if (!Number.isFinite(operationalImpactScore) || operationalImpactScore <= 0) {
      throw createError(400, "operationalImpactScore must be a positive number");
    }

    if (
      !Number.isFinite(serviceDurationHours) ||
      serviceDurationHours <= 0 ||
      !Number.isInteger(serviceDurationHours)
    ) {
      throw createError(400, "serviceDurationHours must be a positive integer");
    }

    return {
      taskId: task.taskId,
      vehicleId: task.vehicleId,
      operationalImpactScore,
      serviceDurationHours
    };
  });
}

async function buildSchedule(depotId, budgetHours) {
  const [depotDetails, tasksPayload] = await Promise.all([
    apiService.getDepotById(depotId),
    apiService.getTasksByDepot(depotId)
  ]);

  if (!depotDetails) {
    throw createError(404, "Depot not found");
  }

  const tasks = normalizeTasks(extractTasks(tasksPayload));
  const knapsackResult = solveKnapsack(tasks, budgetHours);

  return {
    depotId,
    budgetHours,
    maxImpactScore: knapsackResult.maxImpactScore,
    totalHoursUsed: knapsackResult.totalHours,
    selectedTasks: knapsackResult.selectedTasks.map((task) => ({
      taskId: task.taskId,
      vehicleId: task.vehicleId,
      impactScore: task.operationalImpactScore,
      duration: task.serviceDurationHours
    }))
  };
}

module.exports = {
  buildSchedule
};
