import blessed from "neo-blessed";
import Interface from "./interface";

const blessedKeyTrigger = (element, key) => {
  element.key.mock.calls.forEach(([keys, callback]) => {
    if (keys === key || keys.includes(key)) {
      callback();
    }
  });
};

const blessedOnHandler = (element, targetEvent) => {
  element.on.mock.calls.forEach(([event, callback]) => {
    if (event === targetEvent) {
      callback();
    }
  });
};

jest.mock("neo-blessed", () => {
  const blessedMock = () => ({
    append: jest.fn(),
    on: jest.fn(),
    key: jest.fn(),
    add: jest.fn(),
    show: jest.fn(),
    submit: jest.fn(),
    reset: jest.fn(),
    hide: jest.fn(),
    focus: jest.fn(),
    render: jest.fn(),
    setContent: jest.fn(),
    screen: { render: jest.fn() }
  });
  return {
    box: jest.fn(blessedMock),
    screen: jest.fn(blessedMock),
    form: jest.fn(blessedMock),
    text: jest.fn(blessedMock),
    input: jest.fn(blessedMock),
    log: jest.fn(blessedMock),
    line: jest.fn(blessedMock),
    blessedMock
  };
});

describe("Interface", () => {
  const getTopology = jest.fn(() => [{ name: "api" }]);
  const configuration = {
    get topology() {
      return getTopology();
    },
    getServiceConfig: jest.fn()
  };

  const processManager = {
    registerLogHandler: jest.fn(),
    getChildProcesses: jest.fn(),
    stopAll: jest.fn(),
    startAll: jest.fn()
  };
  it("registers a log handler", () => {
    new Interface(configuration, processManager);

    expect(processManager.registerLogHandler).toHaveBeenCalled();
  });

  it("handles log incoming from the processManager", () => {
    const apiLogOutput = blessed.blessedMock();
    blessed.log.mockReturnValueOnce(apiLogOutput);
    new Interface(configuration, processManager);

    processManager.registerLogHandler.mock.calls[0][0]("api", "Hello World");

    expect(apiLogOutput.add).toHaveBeenCalledWith("Hello World");
  });

  it("focuses the form", () => {
    const form = blessed.blessedMock();
    blessed.form.mockReturnValue(form);
    new Interface(configuration, processManager);

    expect(form.focus).toHaveBeenCalled();
  });

  it("starts the processes when the form is validated", () => {
    const form = blessed.blessedMock();
    blessed.form.mockReturnValue(form);
    new Interface(configuration, processManager);

    blessedOnHandler(form, "submit");

    expect(processManager.startAll).toHaveBeenCalled();
  });

  describe("getCurrentOutput", () => {
    const firstOutput = blessed.blessedMock();
    const secondOutput = blessed.blessedMock();
    beforeEach(() => {
      getTopology.mockReturnValue([{ name: "first" }, { name: "second" }]);
      blessed.log
        .mockReturnValueOnce(firstOutput)
        .mockReturnValueOnce(secondOutput);
    });

    it("return the first defined service name", () => {
      const _interface = new Interface(configuration, processManager);

      expect(_interface.getCurrentOutput()).toBe(firstOutput);
    });

    it("return the requested service name", () => {
      const _interface = new Interface(configuration, processManager);

      _interface.setCurrentOutput("second");

      expect(_interface.getCurrentOutput()).toBe(secondOutput);
    });
  });

  describe("switchToOutput", () => {
    const firstOutput = blessed.blessedMock();
    const secondOutput = blessed.blessedMock();
    beforeEach(() => {
      getTopology.mockReturnValue([{ name: "first" }, { name: "second" }]);
      blessed.log
        .mockReturnValueOnce(firstOutput)
        .mockReturnValueOnce(secondOutput);
    });
    it("hides the previously selected output", () => {
      const _interface = new Interface(configuration, processManager);

      _interface.switchToOutput("second");

      expect(firstOutput.hide).toHaveBeenCalled();
    });

    it("shows the currently selected output", () => {
      const _interface = new Interface(configuration, processManager);

      _interface.switchToOutput("second");

      expect(secondOutput.show).toHaveBeenCalled();
    });
  });

  describe("globalActions", () => {
    const screen = blessed.blessedMock();
    blessed.screen.mockReturnValue(screen);
    it.each`
      key
      ${"q"}
      ${"C-c"}
      ${"escape"}
    `("exits hydra when the user presses $key", async ({ key }) => {
      global.process.exit = jest.fn();
      new Interface(configuration, processManager);

      await blessedKeyTrigger(screen, key);

      expect(global.process.exit).toHaveBeenCalled();
    });

    it("should run the selected configuration when the user presses enter", () => {
      const configurator = blessed.blessedMock();
      blessed.form.mockReturnValue(configurator);

      new Interface(configuration, processManager);

      blessedKeyTrigger(screen, "enter");

      expect(configurator.submit).toHaveBeenCalled();
      expect(configurator.reset).toHaveBeenCalled();
    });

    it("focuses the logs when l is pressed", () => {
      const apiLogs = blessed.blessedMock();
      blessed.log.mockReturnValue(apiLogs);

      new Interface(configuration, processManager);

      blessedKeyTrigger(screen, "l");

      expect(apiLogs.focus).toHaveBeenCalled();
    });

    it("focuses the configurator when m is pressed", () => {
      const configurator = blessed.blessedMock();
      blessed.form.mockReturnValue(configurator);

      new Interface(configuration, processManager);

      blessedKeyTrigger(screen, "m");

      expect(configurator.focus).toHaveBeenCalled();
    });
  });

  describe("logActions", () => {
    const firstOutput = blessed.blessedMock();
    const secondOutput = blessed.blessedMock();
    beforeEach(() => {
      getTopology.mockReturnValue([{ name: "first" }, { name: "second" }]);
      blessed.log
        .mockReturnValueOnce(firstOutput)
        .mockReturnValueOnce(secondOutput);
    });

    it("switch to the second log output when pressing right", () => {
      const _interface = new Interface(configuration, processManager);

      blessedKeyTrigger(firstOutput, "right");

      expect(_interface.getCurrentOutput()).toBe(secondOutput);
    });

    it("switches to the last log output when pressing left", () => {
      const _interface = new Interface(configuration, processManager);

      blessedKeyTrigger(firstOutput, "left");

      expect(_interface.getCurrentOutput()).toBe(secondOutput);
    });

    it("switches twice if the user presses left twice", () => {
      const _interface = new Interface(configuration, processManager);

      blessedKeyTrigger(firstOutput, "left");
      blessedKeyTrigger(firstOutput, "left");

      expect(_interface.getCurrentOutput()).toBe(firstOutput);
    });

    describe("?", () => {
      it("prints the running processes", async () => {
        new Interface(configuration, processManager);
        processManager.getChildProcesses.mockReturnValue([
          { pid: 552, cmd: "processName" },
          { pid: 4444, cmd: "subprocess" }
        ]);

        await blessedKeyTrigger(firstOutput, "?");

        expect(processManager.getChildProcesses).toHaveBeenCalledWith("first");
        expect(firstOutput.add).toHaveBeenCalledWith(
          "## Hydra ##: 552 processName"
        );
        expect(firstOutput.add).toHaveBeenCalledWith(
          "## Hydra ##: 4444 subprocess"
        );
      });

      it("prints the error if the process manager throws", async () => {
        new Interface(configuration, processManager);
        processManager.getChildProcesses.mockImplementation(() => {
          throw new Error("badError");
        });

        await blessedKeyTrigger(firstOutput, "?");

        expect(firstOutput.add).toHaveBeenCalledWith("Error: badError");
      });
    });

    it("clears the output when the user presses C-l", () => {
      new Interface(configuration, processManager);
      processManager.getChildProcesses.mockReturnValue([
        { pid: 552, cmd: "processName" },
        { pid: 4444, cmd: "subprocess" }
      ]);

      blessedKeyTrigger(firstOutput, "C-l");

      expect(firstOutput.setContent).toHaveBeenCalledWith("");
    });
  });
});
