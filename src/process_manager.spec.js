import ProcessManager from "./process_manager";

jest.mock("child_process", () => ({
  spawn: jest.fn();
}));

describe("Process Manager", () => {
  let processManager;
  const configuration = {};

  beforeEach(() => {
    processManager = new ProcessManager(configuration);
  });
  describe("getChildProcesses", () => {
    it("should return the list of child processes", () => {});
  });
});
