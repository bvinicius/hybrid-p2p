import { createSocket, RemoteInfo } from "dgram";
import { argv, exit } from "process";
import IPacketData from "./src/interface/IPacketData";
import { ServerMessage } from "./src/IndexServer/ServerMessage";
import IndexServer from "./src/IndexServer/IndexServer";
import { PeerMessage } from "./src/Peer/PeerMessage";
import { exec } from "child_process";

/* SOCKET CONFIG */
const args = argv.slice(2);
const portArg = args[0];

const port = Number(portArg);
if (!port) {
  console.log("[INDEX] usage: ts-node npx index-server.ts <port>");
  exit(1);
}

const socket = createSocket("udp4");
socket.bind(port);

socket.on("listening", () => {
  console.log("[INDEX] listening on port", port);
  setupSuperPeers();
});

socket.on("message", (message, info) => {
  try {
    console.log(`\n[INDEX] received message from ${info.address}:${info.port}`);

    const data = JSON.parse(message.toString()) as IPacketData<
      ServerMessage,
      any
    >;

    console.log("[INDEX] data: ", data);
    const messages: Record<string, any> = {
      [ServerMessage.requestSuperPeer]: onSuperPeerRequested,
    };

    if (data.message in messages) {
      console.log("[INDEX] message exists.");
      messages[data.message](info);
    } else {
      console.log("[INDEX] message does not exist.");
    }
  } catch (err) {
    console.log("[INDEX] Error receiving message: ", err);
  }
});

function setupSuperPeers() {
  console.log("[INDEX] Setting super peers.");

  Object.values(indexServer.superPeers).forEach((sp) => {
    const { port, addr } = sp;
    exec(`npm run peer ${addr} ${port}`);
  });
}

/* Index Server Message Handling */
const indexServer = new IndexServer();

function onSuperPeerRequested(info: RemoteInfo) {
  const sp = indexServer.pickSuperPeer();
  const data: IPacketData<PeerMessage, any> = {
    message: PeerMessage.superPeerData,
    payload: sp,
  };

  const message = JSON.stringify(data);
  socket.send(message, info.port, info.address);
}
