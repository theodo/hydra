import { spawn } from "child_process";
import mapValues from "lodash/mapValues.js";

const ENV_VARIABLE_PLACEHOLDER = /\{([0-9a-zA-Z_]+)(=([^\}]*))?\}/g;

export default class ProcessManager {
  constructor(configuration) {
    this.processes = {};
    this.processOutputs = {};
    this.configuration = configuration;
  }

  getSelectedMode(serviceName) {
    return this.configuration.topology
      .find(({ name }) => name === serviceName)
      .modes.find(
        ({ name }) => this.configuration.getServiceConfig(serviceName) === name
      );
  }

  stopAll() {
    this.configuration.topology
      .map(({ name }) => name)
      .forEach(serviceName => this.stop(serviceName));
  }

  startAll() {
    this.configuration.topology
      .map(({ name }) => name)
      .forEach(serviceName => this.start(serviceName));
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

  start(serviceName) {
    this.stop(serviceName);

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
      shell: "/bin/sh",
      cwd: this.evaluateValue(serviceMode.run.location)
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

  stop(serviceName) {
    if (!this.processes[serviceName]) {
      return;
    }

    this.processes[serviceName].kill();
  }
}
