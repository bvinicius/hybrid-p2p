import { createSocket, RemoteInfo } from "dgram";
import { argv, exit } from "process";
import IPacketData from "./src/interface/IPacketData";
import { IConnectable } from "./src/interface/IConnectable";
import { IResourceData } from "./src/Peer/Peer";
import { SuperPeerMessage } from "./src/SuperPeer/SuperPeerMessage";
import SuperPeer from "./src/SuperPeer/SuperPeer";
import { ServerMessage } from "./src/IndexServer/ServerMessage";
import { SERVER_ADDR, SERVER_PORT } from "./src/shared/Constants";

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
  requestNextPeer();
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
      [SuperPeerMessage.nextPeerData]: onNextPeerReceived,
    };

    messages[data.message](message, info);
  } catch (err) {
    console.log("[PEER] Error receiving message: ", err);
  }
});

// HANDLING MESSAGES RECEIVED

function onNextPeerReceived(message: Buffer) {
  const data = JSON.parse(message.toString()) as IPacketData<
    SuperPeerMessage,
    IConnectable
  >;

  if (!data.payload) {
    return;
  }
  peer.next = data.payload;
}

function onKeepAlive(message: Buffer, info: RemoteInfo) {
  const { address, port } = info;
  (peer as SuperPeer).setPeerTimeout(address, port);
}

function onRegisterFilesMessageReceived(message: Buffer, info: RemoteInfo) {
  console.log("REGISTER FILES RECEIVED");

  const superPeer = peer as SuperPeer;
  console.log(superPeer.dht);

  const data = JSON.parse(message.toString()) as IPacketData<
    SuperPeerMessage,
    Record<string, Partial<IResourceData>>
  >;

  superPeer.updateDHT(data.payload!, info);
}

function onSearchMessageReceived(message: Buffer) {
  console.log("SEARCH REQUEST RECEIVED");
  const data = JSON.parse(message.toString()) as IPacketData<
    SuperPeerMessage,
    { name: string }
  >;

  const result = (peer as SuperPeer).searchInDHT(data.payload!.name);
  console.log(result);
}

// SENDING FUNCTIONS

function requestNextPeer() {
  const data: IPacketData<ServerMessage, undefined> = {
    message: ServerMessage.requestNextPeer,
  };

  socket.send(JSON.stringify(data), SERVER_PORT, SERVER_ADDR);
}
