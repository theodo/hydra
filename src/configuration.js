import fs from "fs";

export default class Configuration {
  constructor(topologyPath) {
    this.topology = JSON.parse(fs.readFileSync(topologyPath, "utf8"));
    this.config = this.topology.reduce(
      (config, service) => ({
        ...config,
        [service.name]: service.modes[0].name
      }),
      {}
    );
  }

  getServiceConfig(serviceName) {
    return this.config[serviceName];
  }

  setServiceConfig(serviceName, newMode) {
    this.config[serviceName] = newMode;
  }
}
