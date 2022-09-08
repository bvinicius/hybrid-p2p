import { createSocket, RemoteInfo } from "dgram";
import { argv, exit } from "process";
import IPacketData from "./src/interface/IPacketData";
import { PeerMessage } from "./src/Peer/PeerMessage";
import { ServerMessage } from "./src/IndexServer/ServerMessage";
import { IConnectable } from "./src/interface/IConnectable";
import * as readline from "readline";
import Peer, { IResourceData } from "./src/Peer/Peer";
import SuperPeer from "./src/Peer/SuperPeer";

const KA_TIMEOUT = 1000;

const args = argv.slice(2);
const [addr, portArg] = args;

const isSuper = args.includes("super");
if (isSuper) console.log("[PEER] Creating super peer.");

// SOCKET CONFIG
const port = Number(portArg);
if (!port || !addr) {
  console.log("[PEER] usage: ts-node npx peer.ts <addr> <port>");
  exit(1);
}

const peer: Peer | SuperPeer = isSuper
  ? new SuperPeer(addr, port)
  : new Peer(addr, port);

const socket = createSocket("udp4");
socket.bind(port, addr);

socket.on("listening", () => {
  console.log("[PEER] listening on port", port);
});

socket.on("message", (message, info) => {
  try {
    const data = JSON.parse(message.toString()) as IPacketData<
      PeerMessage,
      IConnectable
    >;

    const messages = {
      [PeerMessage.superPeerData]: onSuperPeerReceived,
      [PeerMessage.searchResource]: onSearchMessageReceived,
      [PeerMessage.registerFiles]: onRegisterFilesMessageReceived,
      [PeerMessage.keepAlive]: onKeepAlive,
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
    PeerMessage,
    Record<string, Partial<IResourceData>>
  >;

  superPeer.updateDHT(data.payload!, info);
}

function onSuperPeerReceived(message: Buffer, info: RemoteInfo) {
  console.log("PEER RECEIVED", info.port);
  const data = JSON.parse(message.toString()) as IPacketData<
    PeerMessage,
    IConnectable
  >;
  peer.superPeer = data.payload!;
  scheduleKeepAlive();
}

function scheduleKeepAlive() {
  setInterval(() => {
    sendKeepAlive();
  }, KA_TIMEOUT);
}

function sendKeepAlive() {
  const data: IPacketData<PeerMessage, undefined> = {
    message: PeerMessage.keepAlive,
  };
  socket.send(JSON.stringify(data), peer.superPeer!.port, peer.superPeer!.addr);
}

function onSearchMessageReceived(message: Buffer, info: RemoteInfo) {
  console.log("SEARCH REQUEST RECEIVED");
  const data = JSON.parse(message.toString()) as IPacketData<
    PeerMessage,
    { name: string }
  >;

  const result = (peer as SuperPeer).searchInDHT(data.payload!.name);
  console.log(result);
}

// TERMINAL
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(question: string): Promise<string> {
  return new Promise((resolve) => {
    return rl.question("> ", (answer) => {
      resolve(answer);
    });
  });
}

(async () => {
  console.log("\n");
  let answer = "";
  while (answer != "quit") {
    answer = await question("> ");

    const [cmd, ...args] = answer.split(" ");
    const preCommands: Record<string, any> = {
      connect: () => requestSuperPeer(),
      search: () => search(args.join(" ")),
      register: () => registerFiles(args[0]),
    };

    if (cmd in preCommands) {
      preCommands[cmd]();
    } else {
      console.log(`[PEER] command not found: ${answer}`);
    }
  }
})();

// HANDLING COMMANDS FROM TERMINAL
function requestSuperPeer() {
  console.log("gonna send request: requestSuperPeer");

  const serverPort = 8080;
  const body: IPacketData<ServerMessage, undefined> = {
    message: ServerMessage.requestSuperPeer,
  };

  const serializedBody = JSON.stringify(body);
  socket.send(serializedBody, serverPort);
}

function search(fileName: string) {
  console.log("gonna send request: search");

  const body: IPacketData<PeerMessage, { name: string }> = {
    message: PeerMessage.searchResource,
    payload: { name: fileName },
  };

  const serializedBody = JSON.stringify(body);
  if (!peer.superPeer) {
    console.log(
      `[PEER] super per was not set! You need to run <connect> first.`
    );
    return;
  }
  socket.send(serializedBody, peer.superPeer!.port, peer.superPeer!.addr);
}

function registerFiles(folderPath: string) {
  if (!peer.superPeer) {
    console.log(
      `[PEER] super per was not set! You need to run <connect> first.`
    );
    return;
  }

  peer.registerFiles(folderPath);
  const data: IPacketData<
    PeerMessage,
    Record<string, Partial<IResourceData>>
  > = {
    message: PeerMessage.registerFiles,
    payload: peer.localFiles,
  };

  const serializedBody = JSON.stringify(data);
  socket.send(serializedBody, peer.superPeer!.port, peer.superPeer!.addr);
}
