import ProcessManager from "./process_manager";
import { spawn } from "child_process";

jest.mock("child_process", () => ({
  spawn: jest.fn()
}));

const spawnMock = data => ({
  stdout: {
    on: (event, cb) => {
      if (event === "end") {
        setTimeout(() => cb());
      } else {
        cb(data);
      }
    }
  }
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
            "   3980    1875 ps -wwo pid,ppid,command"
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
          ppid: "1875"
        }
      ]);
    });
  });
});
