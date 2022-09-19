import { readFileSync } from "fs";
import { AddressInfo, createServer, Server, Socket } from "net";
import { IConnectable } from "../interface/IConnectable";
import IPacketData from "../interface/IPacketData";
import { bufferToUInt8Array } from "../shared/BufferUtils";
import { IResourceData } from "./Peer";
import { PeerClientMessage } from "./PeerClient";

class PeerServer implements IConnectable {
  private server: Server;

  private socket?: Socket;

  constructor(
    addr: string,
    private registeredLocalFiles: Record<string, IResourceData>
  ) {
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
      string
    >;

    if (!packet.payload) {
      return;
    }

    const resource = this.registeredLocalFiles[packet.payload];
    const resourceBuffer = readFileSync(
      `${resource.folderPath}/${resource.fileName}`
    );

    this.socket?.write(resourceBuffer);
  }
}

export default PeerServer;

export interface IDownloadData {
  fileName: string;
  content: Uint8Array;
}

export enum PeerServerMessae {
  fileRequest = "fileRequest",
}
