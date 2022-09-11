import { IConnectable } from "../interface/IConnectable";
class IndexServer {
  readonly superPeers: Record<string, ISuperPeerData> = {
    sp1: { addr: "127.0.0.1", port: 2020, next: "sp2" },
    sp2: { addr: "127.0.0.1", port: 2021, next: "sp3" },
    sp3: { addr: "127.0.0.1", port: 2022, next: "sp4" },
    sp4: { addr: "127.0.0.1", port: 2023, next: "sp1" },
  };

  constructor() {}

  pickNextPeer(addr: string, port: number): IConnectable | null {
    const peerKey = Object.keys(this.superPeers).find(
      (key) =>
        this.superPeers[key].addr === addr && this.superPeers[key].port === port
    );

    if (!peerKey) {
      return null;
    }

    const nextKey = this.superPeers[peerKey].next as string;
    return {
      addr: this.superPeers[nextKey].addr,
      port: this.superPeers[nextKey].port,
    };
  }

  pickSuperPeer(): IConnectable {
    const random =
      Math.floor(Math.random() * 100) % Object.keys(this.superPeers).length;

    const superPeer = Object.values(this.superPeers)[random];
    return {
      addr: superPeer.addr,
      port: superPeer.port,
    };
  }

  get superPeerRing(): ISuperPeerData[] {
    return Object.values(this.superPeers).map((sp) => {
      const next = this.superPeers[sp.next as string];
      return {
        addr: sp.addr,
        port: sp.port,
        next: { addr: next.addr, port: next.port },
      };
    });
  }
}

export default IndexServer;

interface ISuperPeerData extends IConnectable {
  next: string | IConnectable;
}
