// Chain constants
export const BASE_SEPOLIA = {
  chainIdDec: 84532,
  chainIdHex: "0x14A34",
  rpcUrl: "https://sepolia.base.org",
  chainName: "Base Sepolia",
  blockExplorerUrls: ["https://sepolia.basescan.org"],
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }
};

// Deployed Factory (Base Sepolia)
export const TIPJAR_FACTORY_ADDRESS =
  "0x4432b13DABF32b67Bd41472e1350d7E083be6B01";

// ABIs
export const TIPJAR_FACTORY_ABI = [
  {"type":"constructor","inputs":[{"name":"_initialLogic","type":"address","internalType":"address"},{"name":"_initialOwner","type":"address","internalType":"address"}],"stateMutability":"nonpayable"},
  {"type":"function","name":"createJar","inputs":[{"name":"_maxGasPriceWei","type":"uint256","internalType":"uint256"}],"outputs":[{"name":"jarAddress","type":"address","internalType":"address payable"}],"stateMutability":"nonpayable"},
  {"type":"function","name":"logicImplementation","inputs":[],"outputs":[{"name":"","type":"address","internalType":"address"}],"stateMutability":"view"},
  {"type":"function","name":"owner","inputs":[],"outputs":[{"name":"","type":"address","internalType":"address"}],"stateMutability":"view"},
  {"type":"function","name":"renounceOwnership","inputs":[],"outputs":[],"stateMutability":"nonpayable"},
  {"type":"function","name":"transferOwnership","inputs":[{"name":"newOwner","type":"address","internalType":"address"}],"outputs":[],"stateMutability":"nonpayable"},
  {"type":"function","name":"updateImplementation","inputs":[{"name":"_newLogic","type":"address","internalType":"address"}],"outputs":[],"stateMutability":"nonpayable"},
  {"type":"event","name":"ImplementationUpdated","inputs":[{"name":"newImplementation","type":"address","indexed":false,"internalType":"address"}],"anonymous":false},
  {"type":"event","name":"JarCreated","inputs":[{"name":"recipient","type":"address","indexed":true,"internalType":"address"},{"name":"jarAddress","type":"address","indexed":false,"internalType":"address"},{"name":"maxGasPriceWei","type":"uint256","indexed":false,"internalType":"uint256"}],"anonymous":false},
  {"type":"event","name":"OwnershipTransferred","inputs":[{"name":"previousOwner","type":"address","indexed":true,"internalType":"address"},{"name":"newOwner","type":"address","indexed":true,"internalType":"address"}],"anonymous":false},
  {"type":"error","name":"FailedDeployment","inputs":[]},
  {"type":"error","name":"InitializationFailed","inputs":[]},
  {"type":"error","name":"InsufficientBalance","inputs":[{"name":"balance","type":"uint256","internalType":"uint256"},{"name":"needed","type":"uint256","internalType":"uint256"}]},
  {"type":"error","name":"InvalidImplementation","inputs":[]},
  {"type":"error","name":"OwnableInvalidOwner","inputs":[{"name":"owner","type":"uint256","internalType":"address"}]},
  {"type":"error","name":"OwnableUnauthorizedAccount","inputs":[{"name":"account","type":"address","internalType":"address"}]}
];

export const TIPJAR_LOGIC_ABI = [
  {"type":"constructor","inputs":[],"stateMutability":"nonpayable"},
  {"type":"receive","stateMutability":"payable"},
  {"type":"function","name":"initialize","inputs":[{"name":"_recipient","type":"address","internalType":"address"},{"name":"_maxGasPriceWei","type":"uint256","internalType":"uint256"}],"outputs":[],"stateMutability":"nonpayable"},
  {"type":"function","name":"maxGasPriceWei","inputs":[],"outputs":[{"name":"","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},
  {"type":"function","name":"recipient","inputs":[],"outputs":[{"name":"","type":"address","internalType":"address"}],"stateMutability":"view"},
  {"type":"function","name":"updateMaxGasPrice","inputs":[{"name":"_newMaxGasPriceWei","type":"uint256","internalType":"uint256"}],"outputs":[],"stateMutability":"nonpayable"},
  {"type":"event","name":"GasPriceUpdated","inputs":[{"name":"newMaxGasPriceWei","type":"uint256","indexed":false,"internalType":"uint256"}],"anonymous":false},
  {"type":"event","name":"Initialized","inputs":[{"name":"version","type":"uint64","indexed":false,"internalType":"uint64"}],"anonymous":false},
  {"type":"event","name":"TipReceived","inputs":[{"name":"tipper","type":"address","indexed":true,"internalType":"address"},{"name":"amount","type":"uint256","indexed":false,"internalType":"uint256"}],"anonymous":false},
  {"type":"error","name":"GasPriceTooHigh","inputs":[]},
  {"type":"error","name":"InvalidGasPrice","inputs":[]},
  {"type":"error","name":"InvalidInitialization","inputs":[]},
  {"type":"error","name":"InvalidRecipient","inputs":[]},
  {"type":"error","name":"NotInitializing","inputs":[]},
  {"type":"error","name":"OnlyRecipient","inputs":[]},
  {"type":"error","name":"ReentrancyGuardReentrantCall","inputs":[]},
  {"type":"error","name":"TransferFailed","inputs":[]}
];
