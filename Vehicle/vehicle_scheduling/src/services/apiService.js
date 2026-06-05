const axios = require("axios");

const httpClient = axios.create({
  timeout: 10000
});

function createError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function buildDepotUrl(depotId) {
  const baseUrl = process.env.DEPOTS_API_URL;

  if (!baseUrl) {
    throw createError(500, "DEPOTS_API_URL is not set");
  }

  if (baseUrl.includes("{depotId}")) {
    return baseUrl.replace("{depotId}", encodeURIComponent(depotId));
  }

  if (baseUrl.includes(":depotId")) {
    return baseUrl.replace(":depotId", encodeURIComponent(depotId));
  }

  return `${baseUrl.replace(/\/$/, "")}/${encodeURIComponent(depotId)}`;
}

function buildTasksUrl(depotId) {
  const baseUrl = process.env.TASKS_API_URL;

  if (!baseUrl) {
    throw createError(500, "TASKS_API_URL is not set");
  }

  if (baseUrl.includes("{depotId}")) {
    return baseUrl.replace("{depotId}", encodeURIComponent(depotId));
  }

  if (baseUrl.includes(":depotId")) {
    return baseUrl.replace(":depotId", encodeURIComponent(depotId));
  }

  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}depotId=${encodeURIComponent(depotId)}`;
}

function wrapAxiosError(error, message) {
  if (error.response) {
    return createError(
      error.response.status,
      `${message}. Upstream status: ${error.response.status}`
    );
  }

  if (error.request) {
    return createError(502, `${message}. Upstream service did not respond`);
  }

  return createError(500, `${message}. ${error.message}`);
}

async function getDepotById(depotId) {
  try {
    const url = buildDepotUrl(depotId);
    const response = await httpClient.get(url);
    return response.data;
  } catch (error) {
    throw wrapAxiosError(error, "Failed to fetch depot details");
  }
}

async function getTasksByDepot(depotId) {
  try {
    const url = buildTasksUrl(depotId);
    const response = await httpClient.get(url);
    return response.data;
  } catch (error) {
    throw wrapAxiosError(error, "Failed to fetch maintenance tasks");
  }
}

module.exports = {
  getDepotById,
  getTasksByDepot
};
