export function getDecimalFromLastDigits(hash: string): number {
  const partialHash = hash.slice(-2);
  const lastBits = parseInt(partialHash, 16).toString(2).slice(-2);
  return parseInt(lastBits, 2);
}
