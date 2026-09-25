# smart-home-web

> This is a private, personal home-automation project. It's tailored to one specific house's wiring, Modbus PLC, Z-Wave setup, and HomeKit configuration, so it's unlikely to be useful to anyone else as-is.

Node.js web service that bridges a Modbus PLC, a Z-Wave controller, and Apple HomeKit (via HAP-NodeJS), and exposes a Socket.IO-driven web UI for controlling lights and outlets.

## What it does

- Polls/writes device states over **Modbus TCP** (`modbusapp.js`).
- Polls/writes device states over a **Z-Wave HTTP gateway** (`zwave.js`).
- Publishes devices to **Apple HomeKit** as either a single Bridge accessory or individual accessories (`apple.js`).
- Serves a small web UI and a Socket.IO channel for real-time state (`gui.js`, `public/`).
- Optionally syncs state with an external "Booco" API (`booco.js`).

All device state lives in `vars-and-flags.js`, which lists the logical variables (`var1`, `var2`, ...) and how they map to Modbus/Z-Wave devices, HomeKit titles, and bridging behavior.

## Configuration

Configuration is handled by the [`config`](https://www.npmjs.com/package/config) npm package.

- `config/default.json` — base configuration.
- `config/development.json` — overrides used when `NODE_ENV=development`.
- A production deployment typically overrides the config directory entirely via the `NODE_CONFIG_DIR` environment variable (see `docker-compose.yml`, which points it at a mounted `/data` volume containing `default.json`/`local.json`). Whatever file lives there is what actually applies in that deployment — it takes precedence over the files under `config/` in this repo.

Key sections:

```jsonc
{
  "General": { "port": 8000 },
  "Modbus": {
    "host": "localhost",
    "port": "502",
    "unitId": 1,
    "timeout": 500
  },
  "ZWave": {
    "enable": true,
    "host": "localhost",
    "port": "8083",
    "user": "",
    "pass": "",
    "device_path": "/ZWaveAPI/Run/",
    "timeout": 2000
  },
  "hap": {
    "enable": true,
    "dir": "./persist",
    "useBridge": false,
    "serviceName": "hap-dev.booco",
    "serviceMac": "20:77:77:77:77:00",
    "pincode": "111-22-333"
  },
  "booco": {
    "enable": false,
    "username": "",
    "password": "",
    "host": "localhost",
    "port": "3000",
    "target": "http://localhost:8000/booco"
  }
}
```

### `hap` section (HomeKit)

- `enable` — turn HomeKit publishing on/off.
- `dir` — path to the HAP persistent storage (pairing keys, identifier cache), resolved relative to the app directory unless given as an absolute path. **Must point to a location that survives container restarts** (e.g. an absolute path under a mounted volume such as `/data/persist`), or every restart will invalidate existing HomeKit pairings.
- `useBridge` — `true` publishes one HomeKit Bridge accessory containing all devices except those flagged `noBridge: true` in `vars-and-flags.js` (those are always published individually). `false` publishes every device as its own individual accessory.
- `serviceName` / `serviceMac` — identity used to derive the bridge's UUID/username. Changing `serviceMac` effectively creates a brand-new HomeKit identity.
- `pincode` — the HomeKit pairing code (format `XXX-XX-XXX`), used for both the bridge and any individually published accessories.

### Devices (`vars-and-flags.js`)

Each entry maps a logical variable to:
- `name` — internal identifier (`var1`, `var2`, ...).
- `title` — display name shown in HomeKit and the web UI.
- `zwave` / Modbus wiring for how the device is actually read/written.
- `noBridge: true` (optional) — force this device to be published as a standalone HomeKit accessory even when `useBridge` is on.

## Running

### Locally with Node.js

```bash
npm install
npm start          # production (NODE_ENV=production node app.js)
# or
npm run start:dev  # development (NODE_ENV=development node app.js, uses config/development.json)
```

The web UI is then available at `http://localhost:8000` (or whatever `General.port` is set to).

### With Docker

Build for a single target platform (defaults to `linux/amd64`, version tag read from `package.json`):

```bash
./docker-build.sh
```

Run with Docker Compose:

```bash
docker compose up -d
```

`docker-compose.yml` uses a `macvlan` network so the container gets its own address on the LAN — this is required for HomeKit's mDNS/Bonjour discovery to work; a regular bridge/NAT network will prevent HomeKit from finding the accessories. Update `driver_opts.parent` and the static IP/subnet/gateway to match your network interface before deploying.

Volumes:
- `./data:/data` — mounted as `NODE_CONFIG_DIR`, holding the real production configuration.
- `./persist:/usr/src/app/persist` — HomeKit pairing storage (only relevant if `hap.dir` in your active config resolves to this path).

### Pairing with Apple Home

1. Open the Home app → **+** → **Add Accessory**.
2. If it isn't found automatically, choose **I Don't Have a Code or Cannot Scan**, then select the accessory from the list (or enter it manually).
3. Enter the pairing code configured in `hap.pincode`.
4. Repeat for the bridge (if `useBridge: true`) and for each accessory flagged `noBridge: true` — these are always separate, individually paired accessories.

## Notes on `NODE_CONFIG_DIR` in production

Because `docker-compose.yml` sets `NODE_CONFIG_DIR=/data`, the effective production config is whatever `default.json`/`local.json` exists in the mounted `./data` directory on the host — **not** `config/default.json` from this repository. When changing production settings (HomeKit pincode, `hap.dir`, Modbus/Z-Wave hosts, etc.), edit the file under the deployment's `data/` directory, not the one checked into git.
