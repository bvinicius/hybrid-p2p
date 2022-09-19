import { appendFileSync, mkdirSync, writeFileSync } from "fs";
import { Socket } from "net";
import { IConnectable } from "../interface/IConnectable";
import IPacketData from "../interface/IPacketData";
import { DOWNLOAD_FOLDER } from "../shared/Constants";
import { ipPortKey } from "../SuperPeer/SuperPeer";
import { PeerServerMessae } from "./PeerServer";

class PeerClient implements IConnectable {
  private socket: Socket;

  private currentBuffer: Buffer | null = null;

  private timeout?: NodeJS.Timeout;

  constructor(public addr: string, public port: number) {
    this.socket = new Socket();
    this.socket.on("data", this.onDataReceived.bind(this));
  }

  get downloadsPath(): string {
    const folderName = ipPortKey(this.addr, this.port);
    return `${DOWNLOAD_FOLDER}/${folderName}`;
  }

  resetTimeout() {
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
      this.writeInFolder(
        this.downloadsPath,
        "vini-downloads.png",
        Uint8Array.from(this.currentBuffer!)
      );
      this.currentBuffer = null;
    }, 200);
  }

  private onDataReceived(message: Buffer) {
    console.log("yay");

    this.resetTimeout();

    this.currentBuffer = this.currentBuffer
      ? Buffer.concat([this.currentBuffer, message])
      : Buffer.from(message);
  }

  private writeInFolder(folder: string, file: string, content: Uint8Array) {
    const filePath = `${folder}/${file}`;
    try {
      writeFileSync(filePath, content);
      console.log("file written!");
    } catch (err) {
      console.log("creating folder first...");
      mkdirSync(folder);
      writeFileSync(filePath, content);
      console.log("file written!");
    }
  }

  requestFile(hash: string, serverAddr: string, serverPort: number) {
    this.socket.connect(serverPort, serverAddr);

    const data: IPacketData<PeerServerMessae, string> = {
      message: PeerServerMessae.fileRequest,
      payload: hash,
    };

    this.socket.write(JSON.stringify(data));
  }
}
export default PeerClient;

export enum PeerClientMessage {
  fileReceived = "fileReceived",
}
