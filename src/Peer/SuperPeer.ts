import Peer, { IResourceData } from "./Peer";

class SuperPeer extends Peer {
  dht: Record<string, IResourceData> = {};
}

export default SuperPeer;
