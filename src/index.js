#!/usr/bin/env node

import Configuration from "./configuration.js";
import ProcessManager from "./process_manager.js";
import Interface from "./interface.js";
import dotenv from "dotenv";

dotenv.config();

const configuration = new Configuration("./topology.json");
const processManager = new ProcessManager(configuration);

try {
  new Interface(configuration, processManager);
} catch (e) {
  processManager.stopAll();
  throw e;
}
