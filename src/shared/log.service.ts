import { Injectable } from '@nestjs/common';

import * as Colors from 'colors';
import * as fs from 'fs';

export type MessageType = Array<string | number>;

@Injectable()
export class LogService {
  private logToFile: string | null = null;
  private logToConsole = true;
  private prefix = '';

  public setPrefix(prefix: string) {
    this.prefix = prefix + ' ';
  }

  public setLogToFile(logToFile: string | null) {
    if (logToFile) {
      if (!fs.existsSync(logToFile)) {
        fs.writeFileSync(logToFile, '');
      }
    }
    this.logToFile = logToFile;
  }

  public setLogToConsole(logToConsole: boolean) {
    this.logToConsole = logToConsole;
  }

  private save(message: MessageType) {
    if (!this.logToFile) return;
    fs.appendFileSync(this.logToFile, message.join(' ') + '\n');
  }

  private print(
    message: MessageType,
    textColor: Colors.Color,
    numberColor: Colors.Color,
  ) {
    this.save(message);
    if (!this.logToConsole) return;
    console.log(
      Colors.cyan(this.prefix) +
      (message.length === 2
        ? textColor(message[0].toString()) +
            ' ' +
            numberColor(message[1].toString())
        : message
            .map((part) => {
              if (typeof part === 'number') {
                return numberColor(part.toString());
              }
              return textColor(part);
            })
            .join(' '))
    );
  }

  log(...message: MessageType) {
    this.print(message, Colors.white, Colors.blue);
  }

  info(...message: MessageType) {
    this.print(message, Colors.green, Colors.blue);
  }

  warn(...message: MessageType) {
    this.print(message, Colors.yellow, Colors.blue);
  }

  error(...message: MessageType) {
    this.print(message, Colors.red, Colors.blue);
  }

  fatal(...message: MessageType) {
    this.print(message, Colors.red, Colors.blue);
    process.exit(1);
  }

  raw(...message: MessageType) {
    this.save(message);
    if (!this.logToConsole) return;
    console.log(message.join(' '));
  }
}
