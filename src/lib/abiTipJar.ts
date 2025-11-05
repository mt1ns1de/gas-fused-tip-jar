// src/lib/abiTipJar.ts
export const TIPJAR_ABI = [
  { "type":"constructor","inputs":[
    {"name":"_owner","type":"address","internalType":"address"},
    {"name":"_maxGasPriceWei","type":"uint256","internalType":"uint256"}
  ],"stateMutability":"nonpayable" },
  { "type":"receive","stateMutability":"payable" },
  { "type":"function","name":"maxGasPriceWei","inputs":[],"outputs":[{"name":"","type":"uint256","internalType":"uint256"}],"stateMutability":"view" },
  { "type":"function","name":"owner","inputs":[],"outputs":[{"name":"","type":"address","internalType":"address"}],"stateMutability":"view" },
  { "type":"function","name":"tip","inputs":[{"name":"message","type":"string","internalType":"string"}],"outputs":[],"stateMutability":"payable" },
  { "type":"function","name":"withdraw","inputs":[],"outputs":[],"stateMutability":"nonpayable" },
  { "type":"event","name":"Tipped","inputs":[
    {"name":"from","type":"address","indexed":true,"internalType":"address"},
    {"name":"amount","type":"uint256","indexed":false,"internalType":"uint256"},
    {"name":"message","type":"string","indexed":false,"internalType":"string"}
  ],"anonymous":false }
] as const;
