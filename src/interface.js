import blessed from "neo-blessed";
import Microservice from "./microservice.js";

export default class Interface {
  constructor(configuration, processManager) {
    this.configuration = configuration;
    this.processManager = processManager;
    this.outputs = {};

    const configuratorHeight = this.configuration.topology.length;

    this.screen = blessed.screen({
      smartCSR: true
    });

    this.configurator = blessed.form({
      keys: true,
      vi: false,
      height: configuratorHeight
    });

    this.separator = blessed.line({
      top: configuratorHeight,
      height: 1,
      width: "100%",
      orientation: "horizontal",
      content: "text"
    });

    this.logLabel = blessed.text({
      top: configuratorHeight,
      height: 1,
      left: 1
    });

    this.termOutput = blessed.box({
      top: configuratorHeight + 1,
      bottom: 0,
      left: 0,
      right: 0
    });

    this.processManager.registerLogHandler((serviceName, log) => {
      this.outputs[serviceName].add(log);
      this.screen.render();
    });

    this.screen.append(this.configurator);
    this.screen.append(this.separator);
    this.screen.append(this.logLabel);
    this.screen.append(this.termOutput);

    this.microservices = configuration.topology.map(
      (service, index) => new Microservice(index, service, configuration)
    );

    this.microservices.forEach(microservice => {
      this.configurator.append(microservice.getConfigurator());
      this.termOutput.append(this.createLogOutput(microservice.service.name));
    });

    this.configurator.on("submit", () => processManager.startAll());

    this.screen.key(["escape", "q", "C-c"], () => {
      processManager.stopAll();
      process.exit(0);
    });

    this.screen.key(["enter"], () => {
      this.configurator.submit();
      this.configurator.reset();
      this.getCurrentOutput().focus();
    });

    this.screen.key(["l"], () => this.getCurrentOutput().focus());
    this.screen.key(["m"], () => this.configurator.focus());

    this.switchToOutput(Object.keys(this.outputs)[0]);
    this.configurator.focus();
    this.screen.render();
  }

  createLogOutput(serviceName) {
    const output = blessed.log({
      hidden: true,
      scrollbars: true,
      keys: true
    });
    output.key(["C-l"], () => {
      output.setContent("");
      this.screen.render();
    });
    output.key(["left"], () => this.offsetTermOutput(-1));
    output.key(["right"], () => this.offsetTermOutput(1));

    this.outputs[serviceName] = output;

    return output;
  }

  getCurrentOutput() {
    return this.outputs[this.streamingService];
  }

  setCurrentOutput(outputName) {
    this.streamingService = outputName;
  }

  offsetTermOutput(offset) {
    const outputNames = Object.keys(this.outputs);
    const newOuputName =
      outputNames[
        (outputNames.indexOf(this.streamingService) +
          offset +
          outputNames.length) %
          outputNames.length
      ];

    this.switchToOutput(newOuputName);
  }

  switchToOutput(newOuputName) {
    if (this.streamingService) {
      this.getCurrentOutput().hide();
    }

    this.setCurrentOutput(newOuputName);
    this.logLabel.setContent(newOuputName);

    this.getCurrentOutput().show();
    this.getCurrentOutput().focus();
    this.screen.render();
  }
}
