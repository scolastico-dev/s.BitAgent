import { Injectable } from '@nestjs/common';
import { AutostartService as AutostartServiceInterface } from './autostart.interface';
import { CronAutostartService } from './cron.service';
import { SystemdAutostartService } from './systemd.service';
import { XinitrcAutostartService } from './xinitrc.service';
import { LaunchAgentAutostartService } from './macos.service';

@Injectable()
export class AutostartService {
  constructor(
    private readonly cronService: CronAutostartService,
    private readonly systemdService: SystemdAutostartService,
    private readonly xinitrcService: XinitrcAutostartService,
    private readonly launchAgentService: LaunchAgentAutostartService,
  ) {}

  async getAvailableServices(): Promise<AutostartServiceInterface[]> {
    const services = [
      this.cronService,
      this.systemdService,
      this.xinitrcService,
      this.launchAgentService,
    ];
    const res = await Promise.all(
      services.map((service) => service.canActivate()),
    );
    return services.filter((_, i) => res[i]);
  }

  async isInstalled(
    services: AutostartServiceInterface[],
  ): Promise<AutostartServiceInterface | null> {
    for (const service of services)
      if (await service.isInstalled('s-bit-agent')) {
        return service;
      }
    return null;
  }

  install(
    command: string,
    service: AutostartServiceInterface,
  ): Promise<boolean> {
    return service.install(command, 's.BitAgent', 's-bit-agent');
  }

  uninstall(service: AutostartServiceInterface): Promise<boolean> {
    return service.uninstall('s-bit-agent');
  }
}
