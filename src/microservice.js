import blessed from "neo-blessed";

export default class Microservice {
  constructor(index, service, configuration) {
    this.service = service;
    this.configuration = configuration;

    this.container = blessed.box({
      width: "100%",
      height: 1,
      top: index
    });

    this.label = blessed.text({
      content: this.service.name
    });

    this.modeSelector = blessed.input({
      left:
        Math.max(
          ...this.configuration.topology.map(({ name }) => name.length)
        ) + 1,
      content: this.configuration.getServiceConfig(this.service.name),
      keyable: true,
      focus: true,
      style: {
        focus: {
          bg: "yellow",
          fg: "black"
        }
      }
    });

    this.modeSelector.key(["left", "p"], this.previousConfig.bind(this));
    this.modeSelector.key(["right", "n"], this.nextConfig.bind(this));

    this.container.append(this.label);
    this.container.append(this.modeSelector);
  }

  getCurrentConfig() {
    return this.service.modes.find(
      ({ name }) =>
        name === this.configuration.getServiceConfig(this.service.name)
    );
  }

  setConfigName(configName) {
    this.configuration.setServiceConfig(this.service.name, configName);
    this.modeSelector.setContent(configName);
    this.modeSelector.screen.render();
  }

  offsetConfigName(offset) {
    const modes = this.service.modes;
    const currentConfig = this.getCurrentConfig();

    const newConfigName =
      modes[
        (modes.indexOf(currentConfig) + offset + modes.length) % modes.length
      ].name;

    this.setConfigName(newConfigName);
  }

  nextConfig() {
    this.offsetConfigName(1);
  }

  previousConfig() {
    this.offsetConfigName(-1);
  }

  getConfigurator() {
    return this.container;
  }
}
