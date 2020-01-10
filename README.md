# Hydra

Hydra manages your local microservices configuration, and handle configuring and running those you want.

## Install

```
npm i @clementhannicq/hydra
```

## Setup

Hydra uses a file named `topology.json`, read from the current directory to know what services are available, what are the modes you can run them on, and how to configure and execute them.

For example you could have a topology with one backend service, and one frontend, the backend could be run either locally or on a dev server.

The topology.json file would look like this:

```json
[
  {
    "name": "backend",
    "modes": [
      {
        "name": "local",
        "run": {
          "command": "yarn start",
          "location": "{LOCAL_BACKEND_REPO}"
        },
        "config": {
          "url": "http://localhost:8080"
        }
      },
      {
        "name": "dev",
        "config": {
          "url": "https://backend.dev.mycompany"
        }
      }
    ]
  },
  {
    "name": "frontend",
    "modes": [
      {
        "name": "local",
        "run": {
          "command": "yarn start",
          "location": "{LOCAL_FRONTEND_REPO}"
        },
        "dependencies": {
          "env": {
            "API_URL": "backend.url"
          }
        }
      }
    ]
  }
]
```

If you choose to run the backend on dev and the frontend on local, hydra will run `yarn start` on the en variable `LOCAL_FRONTEND_REPO` folder with `API_URL` set to `https://backend.dev.mycompany` in its env.

If you instead chose to run both of them locally, hydra will start both and set the `API_URL` env variable to `http://localhost:8080` in the frontend process environment.

### Hydra environment variables

Hydra takes the environment variables from the `.env` file in the active directory, and inject the variables into the `topology.json` file's placeholders, marked with a single set of brackets (`{}`). A default variable can be set in the topology.json file using the `=` separator, and multiple variables can be used in the same field. For example:

```json
{
  "command": "{LOCAL_YARN_PATH=yarn} {LOCAL_RUN_SCRIPT=start} --watch"
}
```

Main use of those environment variables should be to handle computer-dependent data (for instance, the location of the different services on your filesystem, if you are not using a monorepo) and secrets (since you may want to commit the topology file).

The following `topology.json` fields do interpret env variable placeholders:

- `[*].modes[*].run.command`
- `[*].modes[*].run.location`
- `[*].modes[*].config.*`

### Configuration

Every mode of a service exposes it's external configuration, for instance, an backend node process would expose it's url for other services to depend upon.
In the previous example, `backend` exposes an `url` config, which is refenrenced on the `frontend` dependencies using `backend.url`.

## Usage

When run interactively, Hydra has two use cases: `log` and `mode configuration`.

It starts on `mode configuration`, the user is expected to choose a mode for each service, and then press `enter` to run them

### Global Hotkeys

- q, C-c, esc: Quit Hydra.
- enter: Lanch (or relaunch) the services using the selected modes, also switches to `log`.
- m: Switch to `mode configuration`.
- l: Switch to `log`.

### Mode Configuration Hotkeys

- up, down: Select another service.
- left, right: Change the mode of the selected service.

### Log Hotkeys

- up, down: Scroll the current log output (can also be scrolled with the mousewheel)
- left, right: Switch to the log output of a different service. The current service being logged is displayed on top of the logs.
- C-l: Clear the log ouput for the currently selected service.
