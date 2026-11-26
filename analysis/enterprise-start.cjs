"use strict";
// Portable prototype defaults to no inference; campus is an explicit dev choice.
process.env.ZEBRA_MODEL_MODE=process.env.ZEBRA_MODEL_MODE||"off";
require("../campus_review_server.cjs").start();
