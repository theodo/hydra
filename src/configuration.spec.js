import Configuration from "./configuration";
import { readFileSync } from "fs";

jest.mock("fs", () => ({
  readFileSync: jest.fn()
}));

describe("Configuration", () => {
  it("load a topology file", () => {
    readFileSync.mockReturnValue(
      JSON.stringify([
        {
          name: "api",
          modes: [{ name: "local" }]
        },
        {
          name: "front",
          modes: [{ name: "local" }]
        }
      ])
    );

    const configuration = new Configuration("filepath");

    expect(configuration.topology[0].name).toBe("api");
    expect(configuration.topology[1].name).toBe("front");
  });

  it("stores a config", () => {
    readFileSync.mockReturnValue(
      JSON.stringify([
        {
          name: "api",
          modes: [{ name: "local" }, { name: "dev" }]
        },
        {
          name: "front",
          modes: [{ name: "local" }]
        }
      ])
    );

    const configuration = new Configuration("filepath");

    configuration.setServiceConfig("api", "dev");

    expect(configuration.getServiceConfig("api")).toBe("dev");
  });
});
