import { Socket } from "net";
import IPacketData from "../interface/IPacketData";
import PeerServer, { PeerServerMessae } from "./PeerServer";

class PeerClient {
  private socket: Socket;

  constructor() {
    this.socket = new Socket();

    this.socket.on("data", this.onDataReceived.bind(this));
  }

  private onDataReceived(data: Buffer) {
    console.log("DATA RECEIVED FROM SERVER!!!!!", data.toString());
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
