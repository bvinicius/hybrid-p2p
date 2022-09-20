import { createSocket, RemoteInfo } from "dgram";
import { argv, exit, send } from "process";
import IPacketData from "./src/interface/IPacketData";
import { IConnectable } from "./src/interface/IConnectable";
import Peer, { IResourceData } from "./src/Peer/Peer";
import { SuperPeerMessage } from "./src/SuperPeer/SuperPeerMessage";
import SuperPeer, { ipPortKey } from "./src/SuperPeer/SuperPeer";
import { ServerMessage } from "./src/IndexServer/ServerMessage";
import { KA_TIMEOUT, SERVER_ADDR, SERVER_PORT } from "./src/shared/Constants";
import { PeerMessage } from "./src/Peer/PeerMessage";
import { ISuperPeerData } from "./src/IndexServer/IndexServer";

const args = argv.slice(2);
const [strAddr, portArg] = args;

const addr = strAddr === "localhost" ? "127.0.0.1" : strAddr;

// SOCKET CONFIG
const port = Number(portArg);
if (!port || !addr) {
  console.log(" usage: ts-node npx peer.ts <addr> <port>");
  exit(1);
}

const peer: SuperPeer = new SuperPeer(addr, port);

const socket = createSocket("udp4");
socket.bind(port, addr);

socket.on("listening", () => {
  console.log(" listening on port", port);
  handshake();
});

socket.on("message", (message, info) => {
  try {
    const data = JSON.parse(message.toString()) as IPacketData<
      SuperPeerMessage,
      IConnectable
    >;

    const messages: Record<
      SuperPeerMessage,
      (message: Buffer, info: RemoteInfo) => void
    > = {
      [SuperPeerMessage.searchResource]: onSearchMessageReceived,
      [SuperPeerMessage.registerFiles]: onRegisterFilesMessageReceived,
      [SuperPeerMessage.keepAlive]: onKeepAlive,
      [SuperPeerMessage.serverInfo]: onServerInfoReceived,
      [SuperPeerMessage.dhtSearch]: onDHTSearch,
      [SuperPeerMessage.receivedDHT]: onDHTReceived,
      [SuperPeerMessage.deathNote]: onDeathNoteReceived,
    };

    messages[data.message](message, info);
  } catch (err) {
    console.log(" Error receiving message: ", err);
  }
});

// HANDLING MESSAGES RECEIVED

function onDeathNoteReceived(message: Buffer) {
  const data = JSON.parse(message.toString()) as IPacketData<
    SuperPeerMessage,
    IConnectable
  >;

  if (!data.payload) {
    return;
  }

  const { addr, port } = data.payload;
  console.log("Received death note of peer ", addr, port);
  if (!peer.peerSet.has(ipPortKey(addr, port))) {
    sendDeathNote(addr, port);
  }
  peer.flushPeer(addr, port);
  console.log("DHT: ", peer.dht);
}

function onDHTReceived(message: Buffer) {
  const data = JSON.parse(message.toString()) as IPacketData<
    SuperPeerMessage,
    Record<string, IResourceData>
  >;

  if (!data.payload) {
    return;
  }

  const filteredDHT = peer.filterHashes(data.payload);
  peer.updateDHT(filteredDHT);

  const { addr, port } = Object.values(data.payload)[0];
  const ipPortKey = `${addr}:${port}`;
  if (!peer.peerSet.has(ipPortKey)) {
    sendHashesToNext(data.payload);
  }
  // console.log("DHT: ", peer.dht);
}

function onDHTSearch(message: Buffer) {
  const data = JSON.parse(message.toString()) as IPacketData<
    SuperPeerMessage,
    IDHTSearchData
  >;

  const searchOrigin = data.payload!.searchOrigin;
  const peerInfo = data.payload!.peerInfo;
  const currentDHT = data.payload!.currentDHT;

  if (searchOrigin.addr === peer.addr && searchOrigin.port === peer.port) {
    const data: IPacketData<PeerMessage, Record<string, IResourceData>> = {
      message: PeerMessage.searchResult,
      payload: currentDHT,
    };

    socket.send(JSON.stringify(data), peerInfo.port, peerInfo.addr);
    return;
  }

  const localDHT = peer.searchInDHT(data.payload!.name);

  console.log("Received search request for ", data.payload!.name);

  searchOnNext(
    data.payload!.name,
    { ...currentDHT, ...localDHT },
    peerInfo,
    searchOrigin
  );
}

function onServerInfoReceived(message: Buffer) {
  const data = JSON.parse(message.toString()) as IPacketData<
    SuperPeerMessage,
    Partial<ISuperPeerData>
  >;

  const { payload } = data;
  if (!payload || !payload.next) {
    return;
  }
  peer.next = payload.next as IConnectable;
  peer.hashNumber = payload.hashValue;
}

function onKeepAlive(message: Buffer, info: RemoteInfo) {
  console.log("received K.A.");
  const { address, port } = info;
  setPeerTimeout(address, port);
}

function setPeerTimeout(address: string, port: number) {
  const key = ipPortKey(address, port);
  if (!peer.peerSet.has(key)) {
    return;
  }

  console.log("Setting peer timeout.");

  const peerTimeout = peer.peerTimeouts[key];
  if (peerTimeout) {
    clearTimeout(peerTimeout);
  }

  peer.peerTimeouts[key] = setTimeout(() => {
    console.log(`Peer ${address}:${port} seems dead. Cleaning the house...`);
    sendDeathNote(address, port);
  }, KA_TIMEOUT);
}

function sendDeathNote(addr: string, port: number) {
  const data: IPacketData<SuperPeerMessage, IConnectable> = {
    message: SuperPeerMessage.deathNote,
    payload: { addr, port },
  };

  socket.send(JSON.stringify(data), peer.next?.port, peer.next?.addr);
}

function onRegisterFilesMessageReceived(message: Buffer, info: RemoteInfo) {
  console.log("REGISTER FILES RECEIVED");

  const data = JSON.parse(message.toString()) as IPacketData<
    SuperPeerMessage,
    Record<string, IResourceData>
  >;

  if (!data.payload) {
    return;
  }

  peer.addPeer(info.address, info.port);
  console.log("Added peer: ", info.address, info.port);
  sendHashesToNext(data.payload);
}

function sendHashesToNext(hashes: Record<string, IResourceData>) {
  const data: IPacketData<SuperPeerMessage, Record<string, IResourceData>> = {
    message: SuperPeerMessage.receivedDHT,
    payload: hashes,
  };

  if (peer.next) {
    socket.send(JSON.stringify(data), peer.next.port, peer.next.addr);
  }
}

function onSearchMessageReceived(message: Buffer, info: RemoteInfo) {
  console.log("SEARCH REQUEST RECEIVED");
  const data = JSON.parse(message.toString()) as IPacketData<
    SuperPeerMessage,
    { name: string }
  >;

  const result = searchInLocalDHT(message);
  const peerInfo = { addr: info.address, port: info.port };
  const searchOrigin = { addr: peer.addr, port: peer.port };
  searchOnNext(data.payload!.name, result, peerInfo, searchOrigin);
}

function searchOnNext(
  name: string,
  currentDHT: Record<string, IResourceData>,
  peerInfo: IConnectable,
  searchOrigin: IConnectable
) {
  const data: IPacketData<SuperPeerMessage, IDHTSearchData> = {
    message: SuperPeerMessage.dhtSearch,
    payload: {
      name,
      currentDHT,
      peerInfo,
      searchOrigin,
    },
  };

  socket.send(JSON.stringify(data), peer.next?.port, peer.next?.addr);
}

// SENDING FUNCTIONS

function handshake() {
  const data: IPacketData<ServerMessage, undefined> = {
    message: ServerMessage.handshake,
  };

  socket.send(JSON.stringify(data), SERVER_PORT, SERVER_ADDR);
}

function searchInLocalDHT(message: Buffer): Record<string, IResourceData> {
  const data = JSON.parse(message.toString()) as IPacketData<
    SuperPeerMessage,
    Partial<IDHTSearchData>
  >;

  return peer.searchInDHT(data.payload!.name!);
}

interface IDHTSearchData {
  name: string;
  currentDHT: Record<string, IResourceData>;
  peerInfo: IConnectable;
  searchOrigin: IConnectable;
}
