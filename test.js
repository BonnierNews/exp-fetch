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
        res.write(JSON.stringify({ message: "Data received" }));
        res.end();
      }, SERVER_DELAY);
    });
  }
});

server.listen(1337, () => {
  console.log("Server listening on port 1337");
});

const fetchBuilder = require("./index");

const url = "http://localhost:1337";
const behavior = {
  httpMethod: "POST",
  socket: 1000,
  request: 1500,
};

const { fetch } = fetchBuilder(behavior);
const TIMEOUT_MS = 2000; // 2 seconds

async function testFetchTimeout() {
  console.time("fetch");
  try {
    const response = await Promise.race([
      fetch(url, { cache: null, body: "{ test: 123 }" }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), TIMEOUT_MS)
      ),
    ]);
    const data = await response.json();
    console.timeEnd("fetch");
    console.log("Data:", data);
    const elapsed = Date.now() - response.headers.get("date");
    if (elapsed > 1500) {
      console.warn(`Elapsed time (${elapsed}ms) is longer than 1500ms`);
    }
  } catch (error) {
    console.timeEnd("fetch");
    console.error(error.message);
  }
}

testFetchTimeout().then(() => {
  console.log("Test complete");
});
