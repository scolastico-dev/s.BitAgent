import { Injectable } from '@nestjs/common';

@Injectable()
export class InquirerService {
  async password(message: string): Promise<string> {
    return (
      await (await import('inquirer')).createPromptModule()([
        {
          type: 'password',
          name: 'password',
          message: message,
        },
      ])
    ).password;
  }

  async string(message: string): Promise<string> {
    return (
      await (await import('inquirer')).createPromptModule()([
        {
          type: 'input',
          name: 'input',
          message,
        },
      ])
    ).input;
  }

  async number(message: string): Promise<number> {
    return (
      await (await import('inquirer')).createPromptModule()([
        {
          type: 'number',
          name: 'number',
          message,
        },
      ])
    ).number;
  }

  async confirm(message: string): Promise<boolean> {
    return (
      await (await import('inquirer')).createPromptModule()([
        {
          type: 'confirm',
          name: 'confirm',
          message,
        },
      ])
    ).confirm;
  }
}
