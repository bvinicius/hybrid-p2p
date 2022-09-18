import { AddressInfo, createServer, Server, Socket } from "net";
import { IConnectable } from "../interface/IConnectable";
import IPacketData from "../interface/IPacketData";

class PeerServer implements IConnectable {
  private server: Server;

  private socket?: Socket;

  constructor(addr: string) {
    this.server = createServer((socket: Socket) => {
      this.socket = socket;
      socket.on("data", this.onSocketDataReceived.bind(this));
    });

    this.server.listen(undefined, addr);
  }

  get port() {
    return (this.server.address() as AddressInfo).port;
  }

  get addr() {
    return (this.server.address() as AddressInfo).address;
  }

  listeningReady(): Promise<IConnectable> {
    return new Promise((resolve) => {
      if (this.server.listening) {
        resolve({ port: this.port, addr: this.addr });
      }

      this.server.on("listening", () => {
        resolve({ port: this.port, addr: this.addr });
      });
    });
  }

  private onSocketDataReceived(data: Buffer, info: any) {
    console.log("SERVER RECEIVED DATA", info);

    const packet = JSON.parse(data.toString()) as IPacketData<
      PeerServerMessae,
      any
    >;

    const payload = "cu de aipim";

    this.socket?.write(payload);
  }
}

export default PeerServer;

export enum PeerServerMessae {
  fileRequest = "fileRequest",
}
