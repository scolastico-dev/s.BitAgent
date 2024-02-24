import { Command, CommandRunner, Option } from 'nest-commander';
import { SessionService } from 'src/bitwarden/session.service';
import { AgentService } from 'src/key/agent.service';
import { LogService } from 'src/shared/log.service';

@Command({
  name: 'daemon',
  description: 'Start the KeyAgent daemon and start the IPC socket.',
})
export class DaemonCommand extends CommandRunner {
  constructor(
    private readonly logService: LogService,
    private readonly agentService: AgentService,
    private readonly sessionService: SessionService,
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
    ].join(' '),
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
      'client connects a timout is started, its recommendet to keep this on as',
      'its a absolute clean up for the daemon, which also removes any died auth cycles.',
    ].join(' '),
    defaultValue: 60 * 5,
  })
  parseIpcTimeout(timeout: string) {
    return Number(timeout);
  }

  @Option({
    flags: '--auth-retries <retries>',
    description: [
      'How many times the daemon should retry to authenticate the user',
      'before it gives up and denys the request. This is NOT a bruteforce protection!',
    ].join(' '),
    defaultValue: 3,
  })
  parseAuthRetries(retries: string) {
    return Number(retries);
  }

  async run(params: string[], options: Record<string, any>) {
    if (options.log) this.logService.setLogToFile(options.log);
    if (options.silent) this.logService.setLogToConsole(false);
    if (options.verbose) this.agentService.setLogging(true);
    this.agentService.setTimeout(options.ipcTimeout * 1000);
    this.sessionService.updateConfig({
      timeout: options.sessionTimeout * 1000,
      retrys: options.authRetries,
    });
    this.agentService.start();
  }
}
