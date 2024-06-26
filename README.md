# s.BitAgent

*wip*

A wrapper arround the Bitwarden CLI to provide a SSH Key Agent IPC interface.

## Installation

```bash
npm i -g s-bit-agent
s-bit-agent -- bw config server https://<your-server>
s-bit-agent -- bw login
s-bit-agent -- bw lock <token from login>
```

Run `s-bit-agent daemon` in autostart.

```bash
s-bit-agent setup # shows which automatic autostart installation is possible
s-bit-agent daemon --help # See possible config options for the daemon
s-bit-agent setup --type SystemdAutostartService --args "--session-timeout 900" # for example
```

Add the socket to your `.bashrc` or `.profile`:
```bash
export SSH_AUTH_SOCK=~/.ssh/s-bit-agent.sock
```

## Usage

```bash
s-bit-agent --help
s-bit-agent -- bw --help
s-bit-agent -- bwa --help
s-bit-agent status
```

## Differences to `bw` and `bwa`

```bash
user@example:~$ s-bit-agent -- bw status
{..., "status": "locked"}

user@example:~$ s-bit-agent -- bwa status
Requesting session
Connected to server
Sent S_BIT_AGENT_REQUEST_SESSION
Received session
{..., "status": "unlocked"}
``` 


## TODO
- [X] Add basic IPC communication to talk accordingly to [draft-miller-ssh-agent](https://datatracker.ietf.org/doc/html/draft-miller-ssh-agent)
- [X] Add caching for the session
- [X] add a `key add` command
- [X] Add a `key import` command
- [X] Add a `status` command
- [X] Implement S_BIT_AGENT_REQUEST_SESSION into IPC
- [X] Add a `bw` and `bwa` command
- [X] Add a `setup` command to automatically install the daemon in the autostart
- [X] Expand the S_BIT_AGENT_REQUEST_SESSION to also handle some other requests
- [X] Add a public key local cache to speed up the key lookup, and reduce the password requests
- [X] Handle detection of dead pipes and automatic removal of them
- [X] Support for multiple IPC connections at once
- [ ] Look into the secure heap implementation possibilitys
- [ ] Add a `lock` command
- [ ] Add setting to disable approval requests, or at least to set a timeout
- [ ] Add a `key list` command
- [ ] Add a `key delete` command
- [ ] Add a `key rename` command
- [ ] Add a `key export` command
- [ ] Add tests
- [ ] [Maybe™] Test or add support for windows.
- [ ] [Maybe™] Develop a Tauri frontend/client, which internally uses the `s-bit-agent` to communicate with the server.
- [ ] [Maybe™] Add capability to unlock the agent through bitwarden remote approval
- [ ] [Maybe™] Add capability to unlock the agent through webauthn

## Windows Support

Theoretically, the agent should work on windows, but it is not tested.
If you want to help, please open an issue. If you encounter any problems,
try to use wsl, that should work.

Also if you do not use wsl, you will need to manually register the agent in
the autostart. Lastly as a tipp: you can modify the pipe name the daemon
creates, by passing the `SSH_AUTH_SOCK` environment variable to the daemon.
