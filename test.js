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
const timeout = 5000; // 5 seconds
let startTimestamp;

console.time("fetchData");

// Create a Promise that resolves when the fetch request completes.
const fetchData = () => {
  return new Promise((resolve, reject) => {
    startTimestamp = Date.now();
    fetch(url, { cache: null })
      .then((response) => {
        if (response.ok) {
          resolve(response.json());
        } else {
          reject("Network reponse was not ok");
        }
      })
      .catch((error) => reject(error));
  });
};

// Use Promise.race() to create a timeout
Promise.race([
  fetchData(),
  new Promise((_, reject) => setTimeout(() => reject("request time out"), timeout)),
])
  .then((data) => {
    // Stop the time and log the elapsed time
    console.timeEnd("fetchData");
    console.log(data);
  })
  .catch((error) => {
    // stop the timer and log the error
    console.timeEnd("fetchData");
    // console.log("error: ", error.code);

    const endTimestamp = Date.now();
    const elapsed = endTimestamp - startTimestamp;
    console.log(`Request failed after ${elapsed}ms: ${error.message}`);

  });
