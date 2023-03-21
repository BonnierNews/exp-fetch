/* eslint-disable no-console */
"use strict";

const fetchBuilder = require("./index");

const url = "https://make-a-timeout.nu";
const socket = 1000;
const cache = null;

const opt0 = {};

const opt1 = {
  socket,
  request: 1500,
};

const opt2 = {
  socket,
  request: 200000,
};

const opt3 = {
  socket,
  request: 400000,
};

const opt4 = {
  socket,
  request: 500,
};

const opt5 = {
  socket,
  request: 1000,
};

const opt6 = {
  socket,
  request: 1,
};

async function main(opt, nbr) {
  const r = opt?.request;
  try {
    const { fetch } = fetchBuilder(opt);
    console.time(`opt${nbr} request: ${r}`);
    await fetch(url, { cache });
  } catch (error) {
    // console.log("error");
    console.timeEnd(`opt${nbr} request: ${r}`);
  }
}

const options = [ opt0, opt1, opt2, opt3, opt4, opt5, opt6 ].sort(() => Math.random() - 0.5);

async function run() {
  for await (const [ index, opt ] of Object.entries(options)) {
    await main(opt, index);
  }
}

run();
