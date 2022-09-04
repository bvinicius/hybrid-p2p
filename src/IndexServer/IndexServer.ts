import { Socket, createSocket } from "dgram";
import { IConnectable } from "../interface/IConnectable";

class IndexServer implements IConnectable {
  superPeers = {
    sp1: { addr: "10.32.163.100", port: 4941, next: "sp2" },
    sp2: { addr: "10.32.163.122", port: 4941, next: "sp3" },
    sp3: { addr: "10.32.163.119", port: 16669, next: "sp4" },
    sp4: { addr: "10.32.163.157", port: 10821, next: "sp1" },
  };

  private server: Socket;

  constructor(public addr: string, public port: number) {
    this.server = createSocket("udp4");
    this.server.bind(this.port);

    this.server.on("message", (teste, info) => {
      console.log("received: ", teste.toString(), "from ", info);
      this.server.send("toma de volta entao", info.port);
    });
  }

  connect() {}
}

export default IndexServer;
