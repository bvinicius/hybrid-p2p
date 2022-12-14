import { IConnectable } from "../interface/IConnectable";
import fs from "fs";
import { createHash, createHmac } from "crypto";
import FilePicker from "./FilePicker";
import { IDownloadData } from "./PeerServer";
class Peer implements IConnectable {
  superPeer?: IConnectable;
  localFiles: Record<string, IResourceData> = {};
  filePicker?: FilePicker;

  constructor(public addr: string, public port: number) {}

  registerFiles(folderPath: string) {
    fs.readdirSync(folderPath).forEach((fileName) => {
      const content = fs.readFileSync(`${folderPath}/${fileName}`);
      const hash = createHash("sha1");
      hash.setEncoding("hex");
      hash.write(content);
      hash.end();
      const digest: string = hash.read();

      Object.assign(this.localFiles, {
        [digest]: { fileName, folderPath, addr: this.addr, port: this.port },
      });
    });
  }
}

export default Peer;

export interface IResourceData
  extends IConnectable,
    Omit<IDownloadData, "content"> {
  folderPath: string;
}
