# NetMusic3D Corelink server (macOS and Linux)

Use branch `NetMusic3D-Server` of `https://github.com/Houvd/corelink-server`.
It includes the server receiver modules, per-receiver HOA feedback/routing,
server-side link simulation, traffic byte metrics and timing diagnostics.
Installing the upstream Corelink package alone does not include these changes.

## Prerequisites

This release retains the existing Node 16 runtime requirement; migration to
a supported Node release is separate work. Do not expose the example server
and its example accounts directly to the Internet.

On Ubuntu, install build tools for the native SQLite dependency:

```sh
sudo apt-get update
sudo apt-get install -y build-essential python3 git ca-certificates
```

On macOS, install Xcode Command Line Tools if absent (`xcode-select --install`).
Install/activate Node with your existing nvm installation:

```sh
nvm install 16.20.2
nvm use 16.20.2
```

## Install

```sh
git clone --branch NetMusic3D-Server https://github.com/Houvd/corelink-server.git
cd corelink-server
bash scripts/setup-netmusic3d.sh
bash scripts/start-netmusic3d.sh
```

A source ZIP from this branch also works: extract it, enter the extracted
directory and run the same two scripts. This standalone server has no Git
submodules. Node dependencies are installed locally on the destination machine;
never copy `node_modules` from macOS to Linux or between CPU architectures.

The setup copies missing configuration samples, installs locked dependencies,
migrates SQLite and runs receiver tests. Example seeds run only when no database
exists. Stop the server before setup/update. Existing databases are backed up
before migrations, including any WAL/SHM sidecars. If first-time initialization
fails, inspect the error before retrying: the partial database is treated as
existing and is never automatically reset or reseeded.

The repository includes example TLS material and example seed accounts; setup
does not copy credentials, private runtime data or accounts from another host.
To retain an existing installation's users/workspaces, transfer its stopped
SQLite database and configuration separately before running setup.

## Connect clients

Run one server for the session. Clients on other computers connect to this
server's LAN IP, not `localhost`. Allow incoming TCP 20010 (control) and UDP
20011 (audio) on the server. TCP audio uses 20011 when selected; WebSocket uses
20013. Do not start a second server on ports already occupied.

Plugin logs are stored on each plugin host in `~/.netmusic3d/metrics`.
Server traffic diagnostics are configured by `LOGGING.md` and `traffic-metrics.js`;
the SQLite database and ordinary server data live in `data/`.

## Update

Stop the server, then:

```sh
git pull --ff-only origin NetMusic3D-Server
nvm use
bash scripts/setup-netmusic3d.sh
bash scripts/start-netmusic3d.sh
```

For ZIP installations, extract the new release into a new folder and transfer
the stopped database/configuration before setup. Keep the old folder as backup.
Do not use `npm run devinstall`, rollback or seed commands on an existing
installation: those upstream development commands can delete its data.


## Serial receiver channel reservations

Updated NetMusic3D senders declare their maximum input layout before sending.
Corelink assigns stable workspace output blocks in registration order: a
9-channel sender followed by a 4-channel sender reserves 1–9 and 10–13 on
updated receivers. Per-receiver HOA reductions use only the prefix of the
reserved block. Manual output overrides remain local to each receiver.

Muting, unsubscribing or removing a sender does not repack surviving blocks.
The workspace allocation restarts when all declared senders leave. Receivers
clip output beyond their track capacity; this does not reduce network bytes.
Legacy clients without declarations remain manually routed.

The server also includes bounded asynchronous logging, retry/backoff for
interrupted writes, and traffic-byte diagnostics. Run `npm run test:receiver`
and `node tests/logger-resilience-test.js` to check these components without
starting a server. Stop the running server before updating and restart it
with the usual launcher afterward; updating source does not replace a live
Node process.
