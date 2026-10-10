declare module "ws" {
  namespace WebSocket {
    export type Data = string | Buffer | ArrayBuffer | Buffer[];
  }
  class WebSocket {
    constructor(address: string);
    on(event: string, listener: (...args: any[]) => void): this;
    off(event: string, listener: (...args: any[]) => void): this;
    send(data: any, cb?: (err?: Error) => void): void;
    close(): void;
  }
  export = WebSocket;
}
