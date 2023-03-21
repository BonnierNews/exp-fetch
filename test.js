/* eslint-disable no-console */
"use strict";

const fetchBuilder = require("./index");

const url = "https://make-a-timeout.nu";
const behavior = {
  httpMethod: "POST",
  socket: 1000,
  request: 1500,
};
const { fetch } = fetchBuilder(behavior);
const TIMEOUT_MS = 5000; // 5 seconds

async function fetchDataWithTimeout() {
  const startTimestamp = Date.now();
  try {
    const response = await Promise.race([
      fetch(url),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), TIMEOUT_MS)
      ),
    ]);
    const data = await response.json();
    console.log("Data:", data);
  } catch (error) {
    const endTimestamp = Date.now();
    const elapsed = endTimestamp - startTimestamp;
    console.error(`Request failed after ${elapsed}ms: ${error.message}`);
  }
}

fetchDataWithTimeout();
