/* eslint-disable n/no-process-exit */
/* eslint-disable no-console */
"use strict";

const http = require("http");
// TODO: Göra en lista av olika typer av längd för att utöka testet.
const SERVER_DELAY = 3000; // 3 seconds delay

const server = http.createServer((req, res) => {
  if (req.method === "POST") {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      // console.time("1337 response took: ");
      const data = JSON.parse(body);
      // Do something with the data...
      console.log("1337 parsed DATA: ", data);
      setTimeout(() => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.write(JSON.stringify({ message: "Data received", date: Date.now() }));
        res.end();
        // console.timeEnd("1337 response took: ");
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

  /**
   * Socket must be less han request and both options needs to be in place.
   * TODO:
   *  - lägga till någon typ av validering av timeout?
   *  - alternativt lägga på ett felmeddelande att med timeout.socket = x och timeout.requext = y
   *  så för väntar du dig att svaret från servern ska alltid vara mindre än y och mindre x.
   */

  timeout: {
    socket: 3500,
    request: 4000,
  },

  /**
   * TODO:
   *  - Om jag inte vet hur lång tid servern svarar, vad ska jag ha för options då?
   */
  // retry: {
  //   limit: 3, // The maximum amount of times to retry the request.
  //   methods: [ "POST" ], // The HTTP methods that should be retried.
  //   statusCodes: [ 408, 500, 502, 503, 504 ], // The HTTP status codes that should be retried.
  //   maxRetryAfter: 4000, // The maximum amount of time in milliseconds that the request should be retried after.
  // },
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

testFetchTimeout().then(() => {
  console.log("Test complete");
  process.exit(0);
});

// const got = require("got");

// async function testGot() {
//   console.time("got took:");
//   try {
//     let elapsed = Date.now();
//     const response = await Promise.race([
//       got.post(url, {
//         body: JSON.stringify({ body: "{ test: 123 }" }),
//         // timeout: 5000,
//         // retry: {
//         //   limit: 3,
//         //   calculateDelay: ({ attemptCount }) => attemptCount * 1000,
//         // },
//       }),
//     ]);
//     // console.log(await response);
//     const { message, date } = JSON.parse(await response.body);
//     console.log("got res message: ", message);
//     console.timeEnd("got took:");

//     elapsed = date - elapsed;
//     if (elapsed > behavior.request) {
//       console.log(`Elapsed time (${elapsed}ms) is longer than ${behavior.request}`);
//     } else {
//       console.log(`Elapsed time (${elapsed})ms is shorter than request: ${behavior.request}`);
//     }
//   } catch (error) {
//     console.log("testGot error: ", error);
//   }
//   // const gres = await got.post(url, { body: JSON.stringify({ body: "{ test: 123 }" }) });
//   // console.log("GOT DATA: ", gres.data);
// }

// testGot();
