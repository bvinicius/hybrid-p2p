// import { createSocket, RemoteInfo } from "dgram";
// import { argv, argv0, exit } from "process";
// import IPacketData from "../interface/IPacketData";
// import { ServerSentMessage } from "../IndexServer/ServerSentMessage";
// import { ServerReceivedMessage } from "../IndexServer/ServerReceivedMessage";
// import { IConnectable } from "../interface/IConnectable";

// const args = argv.slice(2);
// const portArg = args[0];

// const port = Number(portArg);
// if (!port) {
//   console.log("[INDEX] usage: ts-node npx main.ts <port>");
//   exit(1);
// }

// const socket = createSocket("udp4");
// socket.bind(port);

// setTimeout(() => {
//   console.log("gonna send request.");

//   const body: IPacketData<ServerReceivedMessage, undefined> = {
//     message: ServerReceivedMessage.requestSuperPeer,
//   };

//   const serializedBody = JSON.stringify(body);
//   socket.send(serializedBody, 8080);
// }, 1000);

// socket.on("listening", () => {
//   console.log("[INDEX] listening on port", port);
// });

// socket.on("message", (message, info) => {
//   try {
//     const data = JSON.parse(message.toString()) as IPacketData<
//       ServerSentMessage,
//       IConnectable
//     >;

//     const messages = {
//       [ServerSentMessage.superPeerData]: onSuperPeerReceived,
//     };

//     messages[data.message](message, info);
//   } catch (err) {
//     console.log("[INDEX] Error receiving message: ", err);
//   }
// });

// function onSuperPeerReceived(message: Buffer, info: RemoteInfo) {
//   console.log("PEER RECEIVED", message, info);
//   const data = JSON.parse(message.toString());
//   console.log(data);
// }
