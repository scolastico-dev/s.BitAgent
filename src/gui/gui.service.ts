import { Injectable } from '@nestjs/common';
import * as net from 'net';
import { LogService } from 'src/shared/log.service';

@Injectable()
export class GuiService {
  constructor(private readonly logService: LogService) {}

  async findFreePort(): Promise<number> {
    const server = net.createServer();
    return new Promise<number>((resolve, reject) => {
      server.on('error', reject);
      server.listen(0, () => {
        const port = (server.address() as net.AddressInfo).port;
        server.close(() => resolve(port));
      });
    });
  }

  async getInput(
    message: string,
    type: 'password' | 'text' | 'confirm' = 'text',
    timeout: number = 300, // TODO: Implement timeout
  ): Promise<string> {
    const express = await import('express');
    const app = (express as any)();
    const port = await this.findFreePort();
    this.logService.info('Opening input form on port', port);

    app.get('/', (req, res) => {
      res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Input Form</title>
                    <style>
                        body {
                            background-color: #222;
                            color: #eee;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            height: 100vh; margin: 0;
                            font-family: sans-serif;
                        }
                        .form-container {
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            gap: 10px;
                            padding: 20px;
                            background-color: #333;
                            border-radius: 8px;
                        }
                    </style>
                </head>
                <body>
                    <div class="form-container">
                        <label for="dataInput">${message}</label>
                        ${
                          type === 'confirm'
                            ? '<button onclick="submitData({x: true})">Yes</button>' +
                              '<button onclick="submitData({x: false})">No</button>'
                            : `<input type="${type}" id="dataInput">` +
                              '<button onclick="submitData()">Submit</button>'
                        }
                    </div>
                    <script>
                        function submitData(val) {
                            const inputValue = val && typeof val.x === 'boolean' ? val.x : document.getElementById('dataInput').value;
                            fetch('/', { method: 'POST', body: inputValue })
                                .then(() => {
                                    // Success! Modify the form container 
                                    document.querySelector('.form-container').innerHTML = 
                                        '<p>Your input has been received. You may now close this window.</p>';
                                
                                    // Attempt to close the window with a short delay
                                    setTimeout(() => window.close(), 500) // Slight delay for message display
                                });
                        }
                    
                        document.getElementById('dataInput').addEventListener('keydown', function(event) {
                            if (event.key === "Enter") {
                                submitData();
                                event.preventDefault(); // Prevent the default action to stop form
                                //                         submission or any other unwanted behavior
                            }
                        });
                    </script>
                </body>
                </html>
            `);
    });

    let inputValue = '';

    const prom = new Promise<string>((resolve) => {
      const timeout = setTimeout(
        () => {
          this.logService.error('Input form timed out');
          server.close();
          resolve('');
        },
        1000 * 60 * 5,
      ); // 5 minutes
      app.post('/', express.text(), (req: any, res: any) => {
        this.logService.info('Received input closing server');
        clearTimeout(timeout);
        inputValue = req.body;
        res.end();
        server.close();
        resolve(inputValue);
      });
    });

    const ip = '127.0.0.1';
    const server = app.listen(port, ip);

    // workaround because of commonjs
    const open = (await eval(`import('open')`)) as typeof import('open');
    await open.default(`http://${ip}:${port}`);
    this.logService.info('Waiting for input...');

    // Wait for server closure and resolve with the input value
    return await prom;
  }
}
