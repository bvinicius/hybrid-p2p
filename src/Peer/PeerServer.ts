import { readFileSync } from "fs";
import { AddressInfo, createServer, Server, Socket } from "net";
import { IConnectable } from "../interface/IConnectable";
import IPacketData from "../interface/IPacketData";
import { IResourceData } from "./Peer";

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

  private onSocketDataReceived(data: Buffer) {
    console.log("A peer just requested a resource.");

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

    const objData: IDownloadData = {
      fileName: resource.fileName,
      content: resourceBuffer,
    };

    this.socket?.write(JSON.stringify(objData));
  }
}

export default PeerServer;

export interface IDownloadData {
  fileName: string;
  content: Buffer | BufferJSON;
}

export type BufferJSON = { type: "Buffer"; data: number[] };

export enum PeerServerMessae {
  fileRequest = "fileRequest",
}
