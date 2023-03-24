/* eslint-disable n/no-process-exit */
/* eslint-disable no-console */
"use strict";

const http = require("http");
const SERVER_DELAY = 3000; // 3 seconds delay
const someDelays = [ 4000, 5000, 2000, 3000 ];
const SERVER_DELAYS = [ SERVER_DELAY, ...someDelays ];
let index = 0;

const server = http.createServer((req, res) => {
  if (req.method === "POST") {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      console.time("1337 response took: ");
      const data = JSON.parse(body);
      console.log("1337 parsed DATA: ", data);
      console.log("Server delay: ", SERVER_DELAYS[index]);
      setTimeout(() => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.write(JSON.stringify({ message: "Data received", date: Date.now() }));
        res.end();
        if (index < SERVER_DELAYS.length) {
          index += 1;
        } else {
          index = 0;
        }
        console.timeEnd("1337 response took: ");
      }, SERVER_DELAYS[index]);
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
  timeout: {
    socket: 2500,
    request: 3000,
  },
  retry: {
    limit: 3,
    methods: [ "POST" ],
    statusCodes: [ 408, 500, 502, 503, 504 ],
    maxRetryAfter: 4000,
  },
};

const { fetch } = fetchBuilder(behavior);

async function testRetry() {
  console.time("fetch took:");
  try {
    let elapsed = Date.now();
    const response = await fetch(url, { body: "{ test: 123 }" });
    const { message, date } = await response;
    console.log("res message: ", message);
    console.timeEnd("fetch took:");

    elapsed = date - elapsed;
    if (elapsed > behavior.request) {
      console.log(`Elapsed time (${elapsed}ms) is longer than ${behavior?.timeout?.request}`);
    } else {
      console.log(`Elapsed time (${elapsed})ms is shorter than request: ${behavior?.timeout?.request}`);
    }
  } catch (error) {
    console.timeEnd("fetch took:");
    console.log("testFetchTimout error: ", error.message);
  }
}

testRetry().then(() => {
  console.log("Test complete");
  process.exit(0);
});
