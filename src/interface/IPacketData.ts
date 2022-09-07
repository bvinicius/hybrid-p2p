export default interface IPacketData<MT, PT> {
  message: MT;
  payload?: PT;
}
