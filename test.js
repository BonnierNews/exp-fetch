/* eslint-disable n/no-process-exit */
/* eslint-disable no-console */
"use strict";

const http = require("http");
const SERVER_DELAY = 3000; // 3 seconds delay

const server = http.createServer((req, res) => {
  if (req.method === "POST") {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      const data = JSON.parse(body);
      // Do something with the data...
      console.log("DATA: ", data);
      setTimeout(() => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.write(JSON.stringify({ message: "Data received", date: Date.now() }));
        res.end();
      }, SERVER_DELAY);
    });
  }
});

server.listen(1337, () => {
  console.log(`Server listening on port 1337 with server delay: ${SERVER_DELAY / 1000}s`);
});

const fetchBuilder = require("./index");

const url = "http://localhost:1337";
const behavior = {
  httpMethod: "POST",
  // cache: null,
  socket: 1000,
  request: 1500,
};

const { fetch } = fetchBuilder(behavior);
// const TIMEOUT_MS = 10000; // 2 seconds

async function testFetchTimeout() {
  console.time("fetch took:");
  try {
    let elapsed = Date.now();
    const response = await Promise.race([
      fetch(url, { body: "{ test: 123 }" }),
      // new Promise((_, reject) =>
      //   setTimeout(() => reject(new Error("Timeout")), TIMEOUT_MS)
      // ),
    ]);
    const { message, date } = await response;
    console.log("res message: ", message);
    console.timeEnd("fetch took:");

    elapsed = date - elapsed;
    if (elapsed > 1500) {
      console.log(`Elapsed time (${elapsed}ms) is longer than 1500ms`);
    } else {
      console.log(`Elapsed time (${elapsed})ms is shorter than request: ${behavior.request}`);
    }
  } catch (error) {
    // console.timeEnd("fetch");
    console.error(error.message);
  }
}

testFetchTimeout().then(() => {
  console.log("Test complete");
  process.exit(0);
});
