import ProcessManager from "./process_manager";
import { spawn } from "child_process";
import { writeFileSync } from "fs";
import { join } from "path";

jest.mock("child_process", () => ({
  spawn: jest.fn(),
}));

jest.mock("fs", () => ({
  writeFileSync: jest.fn(),
}));

const spawnMock = (data) => ({
  stdout: {
    on: (event, cb) => {
      if (event === "end") {
        setTimeout(() => cb());
      } else {
        cb(data);
      }
    },
  },
});

describe("Process Manager", () => {
  let processManager;
  const configuration = {};

  beforeEach(() => {
    processManager = new ProcessManager(configuration);
  });
  describe("getChildProcesses", () => {
    beforeEach(() => {
      spawn.mockReturnValue(
        spawnMock(
          [
            "    PID    PPID COMMAND",
            "   1812    1000 /bin/chromium",
            "   1875    1750 /bin/zsh",
            "   3980    1875 ps -wwo pid,ppid,command",
          ].join("\n")
        )
      );
    });
    it("should return the list of child processes", () => {
      processManager.processes = { ps: { pid: 3980 } };

      expect(processManager.getChildProcesses("ps")).resolves.toEqual([
        {
          cmd: "ps -wwo pid,ppid,command",
          pid: "3980",
          ppid: "1875",
        },
      ]);
    });
  });

  describe("start", () => {
    beforeEach(() => {
      processManager.logHandler = jest.fn();
      processManager.stop = jest.fn();
      processManager.evaluateDependencies = jest.fn();
      processManager.evaluateValue = jest.fn((v) => v);
      spawn.mockReturnValue({
        stdout: { on: jest.fn },
        stderr: { on: jest.fn },
      });
      processManager.configuration = {
        topology: [
          {
            name: "service",
            modes: [
              { name: "off" },
              {
                name: "env",
                dependencies: { env: {} },
                run: { command: "c", location: "l" },
              },
              {
                name: "dotenv",
                dependencies: { dotenv: {} },
                run: { command: "c", location: "l" },
              },
            ],
          },
        ],
        getServiceConfig: jest.fn(() => "env"),
      };
    });
    it("stops the service first", async () => {
      await processManager.start("service");

      expect(processManager.stop).toHaveBeenCalledWith("service");
    });

    it("does not spawn any process if the service has an empty run configuration", async () => {
      processManager.configuration.getServiceConfig.mockReturnValue("off");

      await processManager.start("service");

      expect(spawn).not.toHaveBeenCalled();
    });

    it("uses starts the command on the provided location", async () => {
      await processManager.start("service");

      expect(spawn.mock.calls[0][0]).toEqual("c");
      expect(spawn.mock.calls[0][1].cwd).toEqual("l");
    });

    it("sets the environnement", async () => {
      const env = { key: "value" };
      processManager.configuration.getServiceConfig.mockReturnValue("env");
      processManager.evaluateDependencies.mockReturnValue(env);

      await processManager.start("service");

      expect(spawn.mock.calls[0][1].env).toHaveProperty("key", "value");
    });

    it("creates the required dotenv file", async () => {
      const env = { key: "value", otherkey: "value2" };
      processManager.configuration.getServiceConfig.mockReturnValue("dotenv");
      processManager.evaluateDependencies.mockReturnValue(env);

      await processManager.start("service");

      expect(writeFileSync).toHaveBeenCalledWith(
        join("l", ".env"),
        "key=value\notherkey=value2"
      );
    });

    it("evaluates env vars to detrmine the path and values of the .env file", async () => {
      const env = { key: "value", otherkey: "value2" };
      processManager.configuration.getServiceConfig.mockReturnValue("dotenv");
      processManager.evaluateDependencies.mockReturnValue(env);
      processManager.evaluateValue.mockImplementation((v) => `eval(${v})`);

      await processManager.start("service");

      expect(writeFileSync).toHaveBeenCalledWith(
        join("eval(l)", ".env"),
        "key=value\notherkey=value2"
      );
    });

    it("uses /bin/sh as a default shell", async () => {
      processManager.configuration.getServiceConfig.mockReturnValue("env");

      await processManager.start("service");

      expect(spawn.mock.calls[0][1].shell).toEqual("/bin/sh");
    });
  });
});
