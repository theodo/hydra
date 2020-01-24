import { spawn } from "child_process";
import mapValues from "lodash/mapValues.js";
import groupBy from "lodash/groupBy.js";
import flatten from "lodash/flatten.js";

import os from "os";

const ENV_VARIABLE_PLACEHOLDER = /\{([0-9a-zA-Z_]+)(=([^\}]*))?\}/g;

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    let output = [];
    const process = spawn(command, args, {});
    process.stdout.on("data", data => {
      output = output.concat(
        data
          .toString()
          .trimEnd()
          .split("\n")
      );
    });
    process.stdout.on("end", () => resolve(output));
  });
}

async function getProcesses(...args) {
  return (await runCommand("ps", ["-ww", "-o", "pid,ppid,command", ...args]))
    .map(line => line.trim().match(/^(\d+)\s+(\d+)\s+(.*)$/))
    .map(([line, pid, ppid, cmd]) => ({ pid, ppid, cmd }));
}

function getChildren(processByPPID, processes) {
  return flatten(
    processes.map(process => {
      if (processByPPID[process.pid]) {
        return [
          process,
          ...getChildren(processByPPID, processByPPID[process.pid])
        ];
      }
      return [process];
    })
  );
}

export default class ProcessManager {
  constructor(configuration) {
    this.processes = {};
    this.processOutputs = {};
    this.configuration = configuration;
  }

  async getChildProcesses(serviceName) {
    const processList = await getProcesses();

    const processByPPID = groupBy(processList, "ppid");

    const process = processList.find(
      ({ pid }) => pid === this.processes[serviceName].pid.toString()
    );

    if (process) {
      return getChildren(processByPPID, [process]);
    }

    return [];
  }

  getSelectedMode(serviceName) {
    return this.configuration.topology
      .find(({ name }) => name === serviceName)
      .modes.find(
        ({ name }) => this.configuration.getServiceConfig(serviceName) === name
      );
  }

  async stopAll() {
    await Promise.all(
      this.configuration.topology
        .map(({ name }) => name)
        .map(serviceName => this.stop(serviceName))
    );
  }

  async startAll() {
    await Promise.all(
      this.configuration.topology
        .map(({ name }) => name)
        .map(serviceName => this.start(serviceName))
    );
  }

  evaluateDependencies(dependencies) {
    if (!dependencies) {
      return {};
    }

    return mapValues(dependencies, value => {
      const [serviceName, setting] = value.split(".");
      const serviceMode = this.getSelectedMode(serviceName);

      if (!serviceMode.config.hasOwnProperty(setting)) {
        throw new Error(
          `Missing configuration on ${serviceName}.${serviceMode.name}.config.${setting}`
        );
      }

      return this.evaluateValue(serviceMode.config[setting]);
    });
  }

  evaluateValue(value) {
    if (typeof value !== "string") {
      return value;
    }
    return value.replace(
      ENV_VARIABLE_PLACEHOLDER,
      (match, name, _, defaultValue) => {
        if (!process.env.hasOwnProperty(name) && defaultValue === undefined) {
          throw new Error(`Missing env variable: ${name}`);
        }

        return process.env[name] || defaultValue;
      }
    );
  }

  async start(serviceName) {
    await this.stop(serviceName);

    const serviceMode = this.getSelectedMode(serviceName);

    if (!serviceMode.run) {
      return;
    }

    const serviceProcess = spawn(this.evaluateValue(serviceMode.run.command), {
      env: {
        ...process.env,
        ...(serviceMode.dependencies
          ? this.evaluateDependencies(serviceMode.dependencies.env)
          : {})
      },
      shell: serviceMode.run.shell
        ? this.evaluateValue(serviceMode.run.shell)
        : "/bin/sh",
      cwd: this.evaluateValue(serviceMode.run.location),
      detached: false
    });

    serviceProcess.stdout.on("data", data =>
      this.logHandler(serviceName, data.toString().trimEnd())
    );
    serviceProcess.stderr.on("data", data =>
      this.logHandler(serviceName, data.toString().trimEnd())
    );

    this.processes[serviceName] = serviceProcess;
  }

  registerLogHandler(logHandler) {
    this.logHandler = logHandler;
  }

  async terminateSubProcess(serviceName, child, force = false) {
    const status = await getProcesses(child.pid);

    if (status.length === 1 && status[0].cmd === child.cmd) {
      await runCommand("kill", [...(force ? ["-9"] : []), child.pid]);
      if (force) {
        this.logHandler(
          serviceName,
          `## HYDRA ##: Reaped rogue process: [${child.pid}] ${child.cmd}`
        );
      }
    }
  }

  async stop(serviceName) {
    if (!this.processes[serviceName]) {
      return;
    }

    this.logHandler(serviceName, `## HYDRA ##: Terminating`);

    const children = await this.getChildProcesses(serviceName);

    await new Promise(resolve => {
      this.processes[serviceName].on("end", resolve());
      this.processes[serviceName].kill(os.constants.signals.SIGINT);
    });

    await Promise.all(
      children.map(async child => {
        await this.terminateSubProcess(serviceName, child);
        await new Promise(resolve => setTimeout(resolve, 1000));
        await this.terminateSubProcess(serviceName, child, true);
      })
    );

    this.logHandler(serviceName, `## HYDRA ##: Terminated`);
  }
}
