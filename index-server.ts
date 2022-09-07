import { createSocket, RemoteInfo } from "dgram";
import { argv, exit } from "process";
import IPacketData from "./src/interface/IPacketData";
import { ServerMessage } from "./src/IndexServer/ServerMessage";
import IndexServer from "./src/IndexServer/IndexServer";
import { PeerMessage } from "./src/Peer/PeerMessage";

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
});

socket.on("message", (message, info) => {
  try {
    const data = JSON.parse(message.toString()) as IPacketData<
      ServerMessage,
      any
    >;

    const messages: Record<string, any> = {
      [ServerMessage.requestSuperPeer]: onSuperPeerRequested,
    };

    if (!(data.message in messages)) {
      messages[data.message](info);
    }
  } catch (err) {
    console.log("[INDEX] Error receiving message: ", err);
  }
});

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
