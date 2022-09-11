import { createSocket, RemoteInfo } from "dgram";
import { argv, exit } from "process";
import IPacketData from "./src/interface/IPacketData";
import { IConnectable } from "./src/interface/IConnectable";
import { IResourceData } from "./src/Peer/Peer";
import { SuperPeerMessage } from "./src/SuperPeer/SuperPeerMessage";
import SuperPeer from "./src/SuperPeer/SuperPeer";

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
    };

    messages[data.message](message, info);
  } catch (err) {
    console.log("[PEER] Error receiving message: ", err);
  }
});

// HANDLING MESSAGES RECEIVED

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
