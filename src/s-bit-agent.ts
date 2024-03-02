import { repl } from '@nestjs/core';
import { CommandFactory } from 'nest-commander';
import { AppModule } from './app.module';

let onHunt = false;

['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, () => {
    if (onHunt) {
      console.error('Forcefully killed by user');
      process.exit(1);
    }
    console.warn(
      [
        'Started kill sequence, please wait for',
        'a graceful exit. Press again to force exit.',
      ].join(' '),
    );
    onHunt = true;
    setTimeout(() => {
      console.error('Timeout reached, forcefully killed by system');
      process.exit(1);
    }, 10_000);
  });
});

async function bootstrap() {
  if (process.env.REPL) {
    const replServer = await repl(AppModule);
    replServer.setupHistory('.repl_history', (err) => {
      if (err) console.error(err);
    });
  } else
    await CommandFactory.run(AppModule, {
      cliName: 's-bit-agent',
      version: 'IN-DEV',
      logger: ['warn', 'error'],
    });
}
bootstrap();
