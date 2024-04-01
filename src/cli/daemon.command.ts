import { Command, CommandRunner, Option } from 'nest-commander';
import { SessionService } from 'src/bitwarden/session.service';
import { AgentService } from 'src/icp/agent.service';
import { ClientService } from 'src/icp/client.service';
import { LogService } from 'src/shared/log.service';
import { spawn } from 'child_process';
import { RequestPing, SBitAgentMessageType } from 'src/icp/types/message';
import { CacheService } from 'src/shared/cache.service';

@Command({
  name: 'daemon',
  description: 'Start the KeyAgent daemon and start the IPC socket.',
})
export class DaemonCommand extends CommandRunner {
  constructor(
    private readonly logService: LogService,
    private readonly agentService: AgentService,
    private readonly clientService: ClientService,
    private readonly sessionService: SessionService,
    private readonly cacheService: CacheService,
  ) {
    super();
  }

  @Option({
    flags: '-l, --log-to-file <path>',
    name: 'log',
    description: 'Log to file instead of console',
  })
  parseLogToFile(logToFile: string) {
    return logToFile;
  }

  @Option({
    flags: '-s, --silent',
    description: 'Do not log to console',
  })
  parseSilent(silent: boolean) {
    return !!silent;
  }

  @Option({
    flags: '-v, --verbose',
    description: 'Log more information',
  })
  parseVerbose(verbose: boolean) {
    return !!verbose;
  }

  @Option({
    flags: '--session-timeout <timeout>',
    description: [
      'Session timeout in seconds, zero for no timeout.',
      'This influnces how long the daemon waits for the user to be required to',
      'enter the password again. This is a security feature, as it prevents',
      'the daemon from being used by someone else if you leave your computer',
      'unattended.',
    ].join('\n'),
    defaultValue: 60 * 15,
  })
  parseSessionTimeout(timeout: string) {
    return Number(timeout);
  }

  @Option({
    flags: '--ipc-timeout <timeout>',
    description: [
      'IPC timeout in seconds, zero for no timeout.',
      'This influnces how long the daemon waits for example for',
      'the password to be entered. To be more exact at the moment your',
      'client connects a timout is started, its recommendet to keep',
      'this on as its a absolute clean up for the daemon, which also',
      'removes any died auth cycles.',
    ].join('\n'),
    defaultValue: 60 * 5,
  })
  parseIpcTimeout(timeout: string) {
    return Number(timeout);
  }

  @Option({
    flags: '--auth-retries <retries>',
    description: [
      'How many times the daemon should retry to authenticate the user',
      'before it gives up and denys the request. This is NOT a',
      'bruteforce protection!',
    ].join('\n'),
    defaultValue: 3,
  })
  parseAuthRetries(retries: string) {
    return Number(retries);
  }

  @Option({
    flags: '--no-watchdog',
    name: 'watchdog',
    description: [
      'Disable the watchdog, which restarts the daemon if it crashes or',
      'becomes unresponsive.',
    ].join('\n'),
  })
  parseNoWatchdog() {
    return false;
  }

  @Option({
    flags: '--cache-public-keys <file>',
    description: [
      'Cache the public keys in a local file. This prevents the daemon from',
      'asking for the password every time the ssh-agent is used, even if no',
      'key is available for that connection.',
    ].join('\n'),
  })
  parseCachePublicKeys(cachePublicKeys: string) {
    return cachePublicKeys;
  }

  @Option({
    flags: '--cache-timeout <timeout>',
    description: [
      'Cache timeout in seconds.',
      'This influnces how long the daemon caches the public keys before it',
      'insists on a password again. Default is 0, which means the daemon will',
      'only update the cache after you for example use a private key.',
      'Alternatively you can run the "s-bit-agent key cache update" command.',
    ].join('\n'),
  })
  parseCacheTimeout(cacheTimeout: string) {
    return Number(cacheTimeout);
  }

  async run(params: string[], options: Record<string, any>) {
    if (options.watchdog) {
      this.logService.setPrefix('[watchdog]');
      let pid = 0;
      const restart = () => {
        if (pid) {
          this.logService.log('Killing old daemon...');
          process.kill(pid);
        }
        const child = spawn(process.argv[0], [
          ...process.argv.slice(1),
          '--no-watchdog',
        ], {
          detached: true,
          stdio: 'pipe',
        });
        pid = child.pid;
        child.stdout.pipe(process.stdout);
        child.stderr.pipe(process.stderr);
        this.logService.log('Started new daemon with PID', pid);
      }
      restart();
      ['SIGINT', 'SIGTERM'].forEach(signal => process.on(signal, () => {
        if (pid) process.kill(pid, signal);
      }));
      setInterval(async () => {
        try {
          process.kill(pid, 0);
          const res = await this.clientService.sendMessage(new RequestPing())
          if (res.type === SBitAgentMessageType.RESPONSE_OK) return;
          this.logService.fatal('Daemon did not respond to ping, restarting...');
        } catch (ignored) {
          this.logService.fatal('Daemon is not running, restarting...');
        }
        restart();
      }, 15_000);
      return;
    }
    if (options.log) this.logService.setLogToFile(options.log);
    if (options.silent) this.logService.setLogToConsole(false);
    if (options.verbose) this.agentService.setLogging(true);
    if (options.cachePublicKeys) {
      this.cacheService.setPath(options.cachePublicKeys);
      if (options.cacheTimeout) this.cacheService.setTTL(options.cacheTimeout * 1000);
    }
    this.agentService.setTimeout(options.ipcTimeout * 1000);
    this.sessionService.updateConfig({
      timeout: options.sessionTimeout * 1000,
      retrys: options.authRetries,
    });
    this.agentService.start();
  }
}
