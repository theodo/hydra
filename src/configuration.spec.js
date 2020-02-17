import Configuration from "./configuration";
import { readFileSync } from "fs";
import nodeLocalStorage from "node-localstorage";

jest.mock("fs", () => ({
  readFileSync: jest.fn()
}));

jest.mock("node-localstorage", () => {
  const _ls = {
    setItem: jest.fn(),
    has: jest.fn(),
    getItem: jest.fn()
  };

  return {
    _ls,
    LocalStorage: function() {
      return _ls;
    }
  };
});

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

  it("loads the previous config", () => {
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
    nodeLocalStorage._ls.has.mockReturnValue(true);
    nodeLocalStorage._ls.getItem.mockReturnValue(
      JSON.stringify({ api: "dev" })
    );

    const configuration = new Configuration("filepath");

    expect(configuration.getServiceConfig("api")).toBe("dev");
  });
});
