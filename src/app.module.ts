import { Module } from '@nestjs/common';
import { KeyModule } from './key/key.module';
import { BitwardenModule } from './bitwarden/bitwarden.module';
import { CliModule } from './cli/cli.module';
import { SharedModule } from './shared/shared.module';
import { GuiModule } from './gui/gui.module';
import { AutostartModule } from './autostart/autostart.module';

@Module({
  imports: [
    SharedModule,
    KeyModule,
    BitwardenModule,
    GuiModule,
    CliModule,
    AutostartModule,
  ],
})
export class AppModule {}
