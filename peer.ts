import { createSocket, RemoteInfo } from "dgram";
import { argv, exit } from "process";
import IPacketData from "./src/interface/IPacketData";
import { PeerMessage } from "./src/Peer/PeerMessage";
import { ServerMessage } from "./src/IndexServer/ServerMessage";
import { IConnectable } from "./src/interface/IConnectable";
import * as readline from "readline";
import Peer, { IResourceData } from "./src/Peer/Peer";
import { SuperPeerMessage } from "./src/SuperPeer/SuperPeerMessage";
import { KA_TIMEOUT, SERVER_ADDR, SERVER_PORT } from "./src/shared/Constants";

const args = argv.slice(2);
const [addr, portArg] = args;

// SOCKET CONFIG
const port = Number(portArg);
if (!port || !addr) {
  console.log("[PEER] usage: ts-node npx peer.ts <addr> <port>");
  exit(1);
}

const peer: Peer = new Peer(addr, port);

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

    const messages: Record<
      PeerMessage,
      (message: Buffer, info: RemoteInfo) => void
    > = {
      [PeerMessage.superPeerData]: onSuperPeerReceived,
    };

    messages[data.message](message, info);
  } catch (err) {
    console.log("[PEER] Error receiving message: ", err);
  }
});

// HANDLING MESSAGES RECEIVED
function onSuperPeerReceived(message: Buffer, info: RemoteInfo) {
  console.log("PEER RECEIVED", info.port);
  const data = JSON.parse(message.toString()) as IPacketData<
    PeerMessage,
    IConnectable
  >;
  peer.superPeer = data.payload!;
  scheduleKeepAlive();
}

// TERMINAL
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(): Promise<string> {
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
    answer = await question();

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

  const body: IPacketData<ServerMessage, undefined> = {
    message: ServerMessage.requestSuperPeer,
  };

  const serializedBody = JSON.stringify(body);
  socket.send(serializedBody, SERVER_PORT, SERVER_ADDR);
}

function search(fileName: string) {
  console.log("gonna send request: search");

  const body: IPacketData<SuperPeerMessage, { name: string }> = {
    message: SuperPeerMessage.searchResource,
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
    SuperPeerMessage,
    Record<string, Partial<IResourceData>>
  > = {
    message: SuperPeerMessage.registerFiles,
    payload: peer.localFiles,
  };

  const serializedBody = JSON.stringify(data);
  socket.send(serializedBody, peer.superPeer!.port, peer.superPeer!.addr);
}

function scheduleKeepAlive() {
  setInterval(() => {
    sendKeepAlive();
  }, KA_TIMEOUT);
}

function sendKeepAlive() {
  const data: IPacketData<SuperPeerMessage, undefined> = {
    message: SuperPeerMessage.keepAlive,
  };
  socket.send(JSON.stringify(data), peer.superPeer!.port, peer.superPeer!.addr);
}
