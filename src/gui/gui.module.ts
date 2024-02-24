import { Global, Module } from '@nestjs/common';
import { GuiService } from './gui.service';

const providers = [GuiService];

@Global()
@Module({ providers, exports: providers })
export class GuiModule {}
