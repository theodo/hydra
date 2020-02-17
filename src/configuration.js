import fs from "fs";
import { LocalStorage } from "node-localstorage";

export const CONFIG_KEY_VERSION = "CONFIG_1";

export default class Configuration {
  constructor(topologyPath) {
    this.storage = new LocalStorage("./config");
    const storedConfig = this.storage.getItem(CONFIG_KEY_VERSION);
    this.topology = JSON.parse(fs.readFileSync(topologyPath, "utf8"));
    const topologyConfig = this.topology.reduce(
      (config, service) => ({
        ...config,
        [service.name]: service.modes[0].name
      }),
      {}
    );

    this.config = {
      ...topologyConfig,
      ...(storedConfig ? JSON.parse(storedConfig) : {})
    };
  }

  getServiceConfig(serviceName) {
    return this.config[serviceName];
  }

  setServiceConfig(serviceName, newMode) {
    this.config[serviceName] = newMode;
    this.storage.setItem(CONFIG_KEY_VERSION, JSON.stringify(this.config));
  }
}
