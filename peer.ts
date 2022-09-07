import { createSocket, RemoteInfo } from "dgram";
import { argv, exit } from "process";
import IPacketData from "./src/interface/IPacketData";
import { PeerMessage } from "./src/Peer/PeerMessage";
import { ServerMessage } from "./src/IndexServer/ServerMessage";
import { IConnectable } from "./src/interface/IConnectable";
import * as readline from "readline";
import Peer from "./src/Peer/Peer";

const args = argv.slice(2);
const [addr, portArg] = args;

// SOCKET CONFIG
const port = Number(portArg);
if (!port || !addr) {
  console.log("[PEER] usage: ts-node npx peer.ts <addr> <port>");
  exit(1);
}

const peer = new Peer(addr, port);

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
    };

    messages[data.message](message, info);
  } catch (err) {
    console.log("[PEER] Error receiving message: ", err);
  }
});

// HANDLING MESSAGES RECEIVED
function onSuperPeerReceived(message: Buffer, info: RemoteInfo) {
  console.log("PEER RECEIVED", message, info);
  const data = JSON.parse(message.toString()) as IPacketData<
    PeerMessage,
    IConnectable
  >;
  peer.superPeer = data.payload!;
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

    const splitAnswer = answer.split(" ");
    const cmd = splitAnswer[0];
    const preCommands: Record<string, any> = {
      connect: () => requestSuperPeer(),
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
  console.log("gonna send request.");

  const body: IPacketData<ServerMessage, undefined> = {
    message: ServerMessage.requestSuperPeer,
  };

  const serializedBody = JSON.stringify(body);
  socket.send(serializedBody, 8080);
}
