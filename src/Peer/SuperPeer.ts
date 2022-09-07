import { RemoteInfo } from "dgram";
import Peer, { IResourceData } from "./Peer";

class SuperPeer extends Peer {
  dht: Record<string, IResourceData> = {};
  subPeers = new Set<string>();

  updateDHT(
    data: Record<string, Partial<IResourceData>>,
    peerInfo: RemoteInfo
  ) {
    Object.keys(data).forEach((hash) => {
      Object.assign(this.dht, {
        [hash]: { ...data[hash], addr: peerInfo.address, port: peerInfo.port },
      });
    });
    const ipPortKey = `${peerInfo.address}:${peerInfo.port}`;
    this.subPeers.add(ipPortKey);
  }

  searchInDHT(name: string): Record<string, IResourceData> {
    const hashes = Object.keys(this.dht).filter((hash) => {
      return this.dht[hash].fileName.toLowerCase().includes(name.toLowerCase());
    });

    const filteredDHT: Record<string, IResourceData> = {};
    hashes.forEach((hash) => {
      filteredDHT[hash] = this.dht[hash];
    });
    return filteredDHT;
  }
}

export default SuperPeer;
