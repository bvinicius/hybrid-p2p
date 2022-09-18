import { fstat, mkdirSync, rmdirSync, writeFileSync } from "fs";
import { Socket } from "net";
import { isContext } from "vm";
import { IConnectable } from "../interface/IConnectable";
import IPacketData from "../interface/IPacketData";
import { DOWNLOAD_FOLDER } from "../shared/Constants";
import { ipPortKey } from "../SuperPeer/SuperPeer";
import { PeerMessage } from "./PeerMessage";
import PeerServer, { IDownloadData, PeerServerMessae } from "./PeerServer";

class PeerClient implements IConnectable {
  private socket: Socket;

  constructor(public addr: string, public port: number) {
    this.socket = new Socket();
    this.socket.on("data", this.onDataReceived.bind(this));
  }

  get downloadsPath(): string {
    const folderName = ipPortKey(this.addr, this.port);
    return `${DOWNLOAD_FOLDER}/${folderName}`;
  }

  private onDataReceived(message: Buffer) {
    const data = JSON.parse(message.toString()) as IPacketData<
      PeerClientMessage,
      any
    >;

    const handlers = {
      [PeerClientMessage.fileReceived]: this.onFileReceived.bind(this),
    };

    if (!handlers[data.message]) {
      console.log("not found...");
      return;
    }

    handlers[data.message](message);
  }

  private onFileReceived(message: Buffer) {
    const data = JSON.parse(message.toString()) as IPacketData<
      PeerClientMessage,
      IDownloadData
    >;
    if (!data.payload) {
      return;
    }

    this.createDownloadFolder();
    const filePath = `${this.downloadsPath}/${data.payload.fileName}`;
    writeFileSync(filePath, data.payload.content);
  }

  private createDownloadFolder() {
    try {
      mkdirSync(this.downloadsPath);
      console.log("created without problem.");
    } catch (err) {
      rmdirSync(this.downloadsPath);
      mkdirSync(this.downloadsPath);
      console.log("had to delete it first.");
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
