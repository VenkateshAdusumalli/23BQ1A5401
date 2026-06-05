function solveKnapsack(tasks, capacity) {
  const taskCount = tasks.length;
  const dp = Array.from({ length: taskCount + 1 }, () =>
    Array(capacity + 1).fill(0)
  );
  const keep = Array.from({ length: taskCount + 1 }, () =>
    Array(capacity + 1).fill(false)
  );

  for (let i = 1; i <= taskCount; i += 1) {
    const task = tasks[i - 1];
    const weight = task.serviceDurationHours;
    const value = task.operationalImpactScore;

    for (let w = 0; w <= capacity; w += 1) {
      if (weight <= w) {
        const takeValue = value + dp[i - 1][w - weight];
        const skipValue = dp[i - 1][w];

        if (takeValue > skipValue) {
          dp[i][w] = takeValue;
          keep[i][w] = true;
        } else {
          dp[i][w] = skipValue;
        }
      } else {
        dp[i][w] = dp[i - 1][w];
      }
    }
  }

  const selectedTasks = [];
  let remaining = capacity;

  for (let i = taskCount; i >= 1; i -= 1) {
    if (keep[i][remaining]) {
      const task = tasks[i - 1];
      selectedTasks.unshift(task);
      remaining -= task.serviceDurationHours;
    }
  }

  const totalHours = selectedTasks.reduce(
    (sum, task) => sum + task.serviceDurationHours,
    0
  );

  return {
    maxImpactScore: dp[taskCount][capacity],
    selectedTasks,
    totalHours
  };
}

module.exports = {
  solveKnapsack
};
