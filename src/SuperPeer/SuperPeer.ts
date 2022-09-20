import { RemoteInfo } from "dgram";
import { IConnectable } from "../interface/IConnectable";
import Peer, { IResourceData } from "../Peer/Peer";
import { KA_TIMEOUT } from "../shared/Constants";
import { getDecimalFromLastDigits } from "../shared/HashProcessor";

export function ipPortKey(address: string, port: number) {
  return `${address}:${port}`;
}

class SuperPeer extends Peer {
  dht: Record<string, IResourceData> = {};

  peerSet = new Set<string>();

  peerTimeouts: Record<string, NodeJS.Timeout> = {};

  next?: IConnectable;

  hashNumber?: number;

  updateDHT(data: Record<string, IResourceData>) {
    Object.keys(data).forEach((hash) => {
      Object.assign(this.dht, {
        [hash]: { ...data[hash] },
      });
    });
    console.log("DHT: ", this.dht);
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

  addPeer(address: string, port: number) {
    this.peerSet.add(ipPortKey(address, port));
    // this.setPeerTimeout(address, port);
  }

  flushPeer(address: string, port: number) {
    const peerKey = ipPortKey(address, port);
    this.peerSet.delete(peerKey);
    Object.keys(this.dht)
      .filter(
        (key) =>
          ipPortKey(address, port) ===
          ipPortKey(this.dht[key].addr, this.dht[key].port)
      )
      .forEach((hash) => {
        delete this.dht[hash];
      });
    delete this.peerTimeouts[peerKey];
  }

  filterHashes(hashes: Record<string, IResourceData>) {
    const filteredHashes = { ...hashes };

    Object.keys(hashes)
      .filter((hash) => {
        const hashNumber = getDecimalFromLastDigits(hash);
        console.log(`HASH NUMBER: ${hash} -> ${hashNumber}`);
        return this.hashNumber !== hashNumber;
      })
      .forEach((hash) => delete filteredHashes[hash]);

    return filteredHashes;
  }

  onPeerTimeout(addr: string, port: number) {
    this.flushPeer(addr, port);
  }
}

export default SuperPeer;
