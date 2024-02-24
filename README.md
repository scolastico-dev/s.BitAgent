# s.BitAgent

*wip*

## Installation

```bash
npm i -g s-bit-agent
s-bit-agent bw config server https://<your-server>
s-bit-agent bw login
s-bit-agent bw lock <token from login>
```

Run `s-bit-agent daemon` in autostart.
Add the socket to your `.bashrc` or `.profile`:
```bash
export SSH_AUTH_SOCK=~/.ssh/s-bit-agent.sock
```

## Usage

```bash
s-bit-agent --help
s-bit-agent bw -- --help
s-bit-agent bwa -- --help # the wrapper will take care about the session creation
s-bit-agent status
```
