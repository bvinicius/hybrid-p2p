import { RemoteInfo } from "dgram";
import { IConnectable } from "../interface/IConnectable";
import Peer, { IResourceData } from "../Peer/Peer";

const KA_TIMEOUT = 5000;

function ipPortKey(address: string, port: number) {
  return `${address}:${port}`;
}

class SuperPeer extends Peer {
  dht: Record<string, IResourceData> = {};

  peerSet = new Set<string>();

  peerTimeouts: Record<string, NodeJS.Timeout> = {};

  next?: IConnectable;

  updateDHT(
    data: Record<string, Partial<IResourceData>>,
    peerInfo: RemoteInfo
  ) {
    Object.keys(data).forEach((hash) => {
      Object.assign(this.dht, {
        [hash]: { ...data[hash], addr: peerInfo.address, port: peerInfo.port },
      });
    });

    this.addPeer(peerInfo.address, peerInfo.port);
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

  setPeerTimeout(address: string, port: number) {
    const key = ipPortKey(address, port);

    if (!this.peerSet.has(key)) {
      return;
    }

    const peerTimeout = this.peerTimeouts[key];
    if (peerTimeout) {
      clearTimeout(peerTimeout);
    }

    this.peerTimeouts[key] = setTimeout(() => {
      console.log(`Peer ${address}:${port} seems dead. Cleaning the house...`);
      this.flushPeer(address, port);
    }, KA_TIMEOUT);
  }

  addPeer(address: string, port: number) {
    this.peerSet.add(ipPortKey(address, port));
    this.setPeerTimeout(address, port);
  }

  private flushPeer(address: string, port: number) {
    this.peerSet.delete(ipPortKey(address, port));
    Object.keys(this.dht)
      .filter(
        (key) =>
          ipPortKey(address, port) ===
          ipPortKey(this.dht[key].addr, this.dht[key].port)
      )
      .forEach((hash) => {
        delete this.dht[hash];
      });
  }
}

export default SuperPeer;
