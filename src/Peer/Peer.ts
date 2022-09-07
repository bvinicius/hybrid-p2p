import { IConnectable } from "../interface/IConnectable";

class Peer implements IConnectable {
  superPeer?: IConnectable;

  constructor(public addr: string, public port: number) {}
}

export default Peer;
