import { IConnectable } from "../interface/IConnectable";

class Peer implements IConnectable {
  superPeer: IConnectable;

  constructor(public addr, public port) {}
}

export default Peer;
