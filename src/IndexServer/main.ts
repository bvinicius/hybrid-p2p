import { createSocket } from "dgram";
import { argv, exit } from "process";
import IPacketData from "../interface/IPacketData";
import { ServerMessage } from "./ServerMessage";

const args = argv.slice(2);
const portArg = args[0];

const port = Number(portArg);
if (!port) {
  console.log("[INDEX] usage: ts-node npx main.ts <port>");
  exit(1);
}

const superPeers = {
  sp1: { addr: "10.32.163.100", port: 4941, next: "sp2" },
  sp2: { addr: "10.32.163.122", port: 4941, next: "sp3" },
  sp3: { addr: "10.32.163.119", port: 16669, next: "sp4" },
  sp4: { addr: "10.32.163.157", port: 10821, next: "sp1" },
};

const socket = createSocket("udp4");
socket.bind(port);

socket.on("listening", () => {
  console.log("[INDEX] listening on port", port);
});

socket.on("message", (message, info) => {
  try {
    const data = JSON.parse(message.toString()) as IPacketData;

    switch (data.message) {
      case ServerMessage.requestSuperPeer: {
        console.log("received request.");
        break;
      }
    }
  } catch (err) {
    console.log("[INDEX] Error receiving message: ", err);
  }
});
