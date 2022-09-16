import { createSocket, RemoteInfo } from "dgram";
import IPacketData from "./src/interface/IPacketData";
import { ServerMessage } from "./src/IndexServer/ServerMessage";
import IndexServer from "./src/IndexServer/IndexServer";
import { PeerMessage } from "./src/Peer/PeerMessage";
import { SuperPeerMessage } from "./src/SuperPeer/SuperPeerMessage";
import { SERVER_ADDR, SERVER_PORT } from "./src/shared/Constants";

/* SOCKET CONFIG */
const socket = createSocket("udp4");
socket.bind(SERVER_PORT, SERVER_ADDR);

socket.on("listening", () => {
  console.log("[INDEX] listening on port", SERVER_PORT);
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
      [ServerMessage.handshake]: onHandshake,
    };

    if (data.message in messages) {
      messages[data.message](info);
    } else {
      console.log(`[INDEX] message not registered: ${data.message}`);
    }
  } catch (err) {
    console.log("[INDEX] Error receiving message: ", err);
  }
});

/* Index Server Message Handling */
const indexServer = new IndexServer();

function onHandshake(info: RemoteInfo) {
  const sp = indexServer.getPeerInfo(info.address, info.port);
  const data: IPacketData<SuperPeerMessage, any> = {
    message: SuperPeerMessage.serverInfo,
    payload: sp,
  };

  const message = JSON.stringify(data);
  socket.send(message, info.port, info.address);
}

function onSuperPeerRequested(info: RemoteInfo) {
  const sp = indexServer.pickSuperPeer();
  const data: IPacketData<PeerMessage, any> = {
    message: PeerMessage.superPeerData,
    payload: sp,
  };

  const message = JSON.stringify(data);
  socket.send(message, info.port, info.address);
}
