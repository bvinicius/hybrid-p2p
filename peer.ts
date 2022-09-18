import { createSocket, RemoteInfo } from "dgram";
import { argv, exit } from "process";
import IPacketData from "./src/interface/IPacketData";
import { PeerMessage } from "./src/Peer/PeerMessage";
import { ServerMessage } from "./src/IndexServer/ServerMessage";
import { IConnectable } from "./src/interface/IConnectable";
import * as readline from "readline";
import Peer, { IResourceData } from "./src/Peer/Peer";
import { SuperPeerMessage } from "./src/SuperPeer/SuperPeerMessage";
import { KA_INTERVAL, SERVER_ADDR, SERVER_PORT } from "./src/shared/Constants";
import FilePicker from "./src/Peer/FilePicker";
import PeerServer from "./src/Peer/PeerServer";
import PeerClient from "./src/Peer/PeerClient";

const args = argv.slice(2);
const [strAddr, portArg] = args;
const addr = strAddr === "localhost" ? "127.0.0.1" : strAddr;

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
      [PeerMessage.searchResult]: onSearchResult,
      [PeerMessage.fileRequest]: onFileRequested,
      [PeerMessage.connectionInfo]: onConnectionInfoReceived,
    };

    messages[data.message](message, info);
  } catch (err) {
    console.log("[PEER] Error receiving message: ", err);
  }
});

// HANDLING MESSAGES RECEIVED

function onConnectionInfoReceived(message: Buffer) {
  const data = JSON.parse(message.toString()) as IPacketData<
    PeerMessage,
    IConnectable
  >;
  if (!data.payload) {
    return;
  }

  const { addr, port } = data.payload;
  const peerClient = new PeerClient();
  if (peer.filePicker?.lastPickedFile) {
    peerClient.requestFile(peer.filePicker.lastPickedFile.hash, addr, port);
  }
}

async function onFileRequested(message: Buffer, info: RemoteInfo) {
  const data = JSON.parse(message.toString()) as IPacketData<
    PeerMessage,
    string
  >;

  const hash: string | undefined = data.payload;
  if (!hash) {
    return;
  }

  if (hash in peer.localFiles) {
    const peerServer = new PeerServer(peer.addr);
    const { addr, port } = await peerServer.listeningReady();
    const data: IPacketData<PeerMessage, IConnectable> = {
      message: PeerMessage.connectionInfo,
      payload: { addr, port },
    };
    socket.send(JSON.stringify(data), info.port, info.address);
  }
}

async function onSearchResult(message: Buffer, info: RemoteInfo) {
  reader.close();
  const data = JSON.parse(message.toString()) as IPacketData<
    PeerMessage,
    Record<string, IResourceData>
  >;

  if (!data.payload) {
    return;
  }

  peer.filePicker = new FilePicker(data.payload);
  const answer = await peer.filePicker.showOptions();
  if (answer) {
    console.log(answer);
    requestFile(answer.hash, answer.addr, answer.port);
  }

  peer.filePicker.dismiss();
  reader = makeReader();
  listenCommands();
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

// HANDLING COMMANDS FROM TERMINAL

function requestFile(hash: string, addr: string, port: number) {
  const data: IPacketData<PeerMessage, string> = {
    message: PeerMessage.fileRequest,
    payload: hash,
  };
  socket.send(JSON.stringify(data), port, addr);
}

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
  const data: IPacketData<SuperPeerMessage, Record<string, IResourceData>> = {
    message: SuperPeerMessage.registerFiles,
    payload: peer.localFiles,
  };

  const serializedBody = JSON.stringify(data);
  socket.send(serializedBody, peer.superPeer!.port, peer.superPeer!.addr);
}

function scheduleKeepAlive() {
  setInterval(() => {
    sendKeepAlive();
  }, KA_INTERVAL);
}

function sendKeepAlive() {
  const data: IPacketData<SuperPeerMessage, undefined> = {
    message: SuperPeerMessage.keepAlive,
  };
  socket.send(JSON.stringify(data), peer.superPeer!.port, peer.superPeer!.addr);
}

// TERMINAL
let reader = makeReader();
listenCommands();

function question(question: string): Promise<string> {
  return new Promise((resolve) => {
    return reader.question(question, (answer) => {
      resolve(answer);
    });
  });
}

function makeReader(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

async function listenCommands() {
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
}
