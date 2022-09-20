import { mkdirSync, writeFileSync } from "fs";
import { Socket } from "net";
import { IConnectable } from "../interface/IConnectable";
import IPacketData from "../interface/IPacketData";
import { DOWNLOAD_FOLDER } from "../shared/Constants";
import { ipPortKey } from "../SuperPeer/SuperPeer";
import { BufferJSON, IDownloadData, PeerServerMessae } from "./PeerServer";

class PeerClient implements IConnectable {
  private socket: Socket;

  private currentBuffer: Buffer | null = null;

  private timeout?: NodeJS.Timeout;

  constructor(public addr: string, public port: number) {
    this.socket = new Socket();
    this.socket.on("data", this.onDataReceived.bind(this));
  }

  get downloadsPath(): string {
    const folderName = ipPortKey(this.addr, this.port)
      .replace(/\./g, "-")
      .replace(/:/g, "_");
    return `${DOWNLOAD_FOLDER}/${folderName}`;
  }

  resetTimeout() {
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
      const fullPacket = this.currentBuffer?.toString();
      const data = JSON.parse(fullPacket!) as IDownloadData;

      this.writeInFolder(
        this.downloadsPath,
        data.fileName,
        Uint8Array.from((data.content as BufferJSON).data)
      );
      this.currentBuffer = null;
    }, 200);
  }

  private onDataReceived(message: Buffer) {
    console.log("chunk received.");

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
    this.socket.end();
  }
}
export default PeerClient;

export enum PeerClientMessage {
  fileReceived = "fileReceived",
}
