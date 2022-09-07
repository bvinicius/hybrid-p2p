import { IConnectable } from "../interface/IConnectable";
class IndexServer {
  private superPeers = {
    sp1: { addr: "10.32.163.100", port: 4941, next: "sp2" },
    sp2: { addr: "10.32.163.122", port: 4941, next: "sp3" },
    sp3: { addr: "10.32.163.119", port: 16669, next: "sp4" },
    sp4: { addr: "10.32.163.157", port: 10821, next: "sp1" },
  };

  constructor() {}

  pickSuperPeer(): IConnectable {
    const random =
      Math.floor(Math.random() * 100) % Object.keys(this.superPeers).length;

    const superPeer = Object.values(this.superPeers)[random];
    return {
      addr: superPeer.addr,
      port: superPeer.port,
    };
  }
}

export default IndexServer;
