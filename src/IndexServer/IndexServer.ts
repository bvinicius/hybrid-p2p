import { IConnectable } from "../interface/IConnectable";
class IndexServer {
  readonly superPeers = {
    sp1: { addr: "localhost", port: 2020, next: "sp2" },
    sp2: { addr: "localhost", port: 2021, next: "sp3" },
    sp3: { addr: "localhost", port: 2022, next: "sp4" },
    sp4: { addr: "localhost", port: 2023, next: "sp1" },
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
