/**
 * Test preload: `node --require fake-tty.cjs supervise.mjs approve`.
 *
 * `approve` refuses a stdin that is not a terminal. The harness answers on a
 * pipe, so this preload marks stdin as a terminal, and nothing else.
 */
"use strict";

process.stdin.isTTY = true;
