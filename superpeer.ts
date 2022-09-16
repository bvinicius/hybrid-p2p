import { createSocket, RemoteInfo } from "dgram";
import { argv, exit } from "process";
import IPacketData from "./src/interface/IPacketData";
import { IConnectable } from "./src/interface/IConnectable";
import Peer, { IResourceData } from "./src/Peer/Peer";
import { SuperPeerMessage } from "./src/SuperPeer/SuperPeerMessage";
import SuperPeer from "./src/SuperPeer/SuperPeer";
import { ServerMessage } from "./src/IndexServer/ServerMessage";
import { SERVER_ADDR, SERVER_PORT } from "./src/shared/Constants";
import { PeerMessage } from "./src/Peer/PeerMessage";
import { ISuperPeerData } from "./src/IndexServer/IndexServer";

const args = argv.slice(2);
const [addr, portArg] = args;

// SOCKET CONFIG
const port = Number(portArg);
if (!port || !addr) {
  console.log("[PEER] usage: ts-node npx peer.ts <addr> <port>");
  exit(1);
}

const peer: SuperPeer = new SuperPeer(addr, port);

const socket = createSocket("udp4");
socket.bind(port, addr);

socket.on("listening", () => {
  console.log("[PEER] listening on port", port);
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
    };

    messages[data.message](message, info);
  } catch (err) {
    console.log("[PEER] Error receiving message: ", err);
  }
});

// HANDLING MESSAGES RECEIVED

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
  const { address, port } = info;
  (peer as SuperPeer).setPeerTimeout(address, port);
}

function onRegisterFilesMessageReceived(message: Buffer, info: RemoteInfo) {
  console.log("REGISTER FILES RECEIVED");

  const superPeer = peer as SuperPeer;

  const data = JSON.parse(message.toString()) as IPacketData<
    SuperPeerMessage,
    Record<string, Partial<IResourceData>>
  >;

  // filtra a dht só com os meus hashes
  const filteredDHT = data.payload!;

  // caso houver, manda o restante dos hashes para o next.
  superPeer.updateDHT(data.payload!, info);
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
