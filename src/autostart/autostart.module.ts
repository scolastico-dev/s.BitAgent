import { Global, Module } from '@nestjs/common';
import { AutostartService } from './autostart.service';
import { CronAutostartService } from './cron.service';
import { SystemdAutostartService } from './systemd.service';
import { XinitrcAutostartService } from './xinitrc.service';
import { LaunchAgentAutostartService } from './macos.service';

@Global()
@Module({
  providers: [
    AutostartService,
    CronAutostartService,
    SystemdAutostartService,
    XinitrcAutostartService,
    LaunchAgentAutostartService,
  ],
  exports: [AutostartService],
})
export class AutostartModule {}
