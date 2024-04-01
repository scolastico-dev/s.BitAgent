import { Module } from '@nestjs/common';
import { ICPModule } from './icp/icp.module';
import { BitwardenModule } from './bitwarden/bitwarden.module';
import { CliModule } from './cli/cli.module';
import { SharedModule } from './shared/shared.module';
import { GuiModule } from './gui/gui.module';
import { AutostartModule } from './autostart/autostart.module';

@Module({
  imports: [
    SharedModule,
    ICPModule,
    BitwardenModule,
    GuiModule,
    CliModule,
    AutostartModule,
  ],
})
export class AppModule {}
