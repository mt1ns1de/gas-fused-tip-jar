// scripts/deployFactory.ts
import 'dotenv/config';
import { createWalletClient, createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import fs from 'fs';

const ARTIFACT_PATHS = [
  './contracts/out/src/TipJarFactory.sol/TipJarFactory.json',
  './contracts/out/TipJarFactory.sol/TipJarFactory.json',
  './out/src/TipJarFactory.sol/TipJarFactory.json',
  './out/TipJarFactory.sol/TipJarFactory.json',
  './artifacts/contracts/TipJarFactory.sol/TipJarFactory.json',
];

function findArtifact() {
  for (const p of ARTIFACT_PATHS) {
    if (fs.existsSync(p)) {
      console.log(`📦 Found artifact: ${p}`);
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    }
  }
  throw new Error('❌ Factory artifact not found — проверь путь.');
}

async function main() {
  const pk = process.env.PRIVATE_KEY;
  const rpc = process.env.RPC_URL_BASE_MAINNET || 'https://mainnet.base.org';
  if (!pk) throw new Error('❌ PRIVATE_KEY not found in .env');

  const account = privateKeyToAccount(pk as `0x${string}`);

  // 🧱 создаём клиента для отправки транзакции
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http(rpc),
  });

  // 👀 создаём клиента для чтения сети (ждём подтверждение)
  const publicClient = createPublicClient({
    chain: base,
    transport: http(rpc),
  });

  console.log(`\n🚀 Deploying TipJarFactory from ${account.address} on Base Mainnet...`);

  const artifact = findArtifact();
  const abi = artifact.abi;
  const bytecode =
    artifact.bytecode?.object ||
    artifact.bytecode ||
    artifact.deployedBytecode ||
    artifact.evm?.bytecode?.object;

  if (!bytecode || bytecode === '0x') {
    throw new Error('❌ Bytecode not found in artifact.');
  }

  // 🚀 Отправляем транзакцию
  const hash = await walletClient.deployContract({
    abi,
    bytecode: bytecode as `0x${string}`,
    args: [],
  });

  console.log('⛓️  Tx hash:', hash);

  // ⏳ Ждём подтверждения через publicClient
  console.log('⏳ Waiting for receipt...');
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const contractAddress = receipt.contractAddress!;
  console.log(`✅ Deployed successfully! Address: ${contractAddress}`);

  const abiOneLine = JSON.stringify(abi);
  console.log('\n=== COPY TO .env.local ===');
  console.log('NEXT_PUBLIC_NETWORK=base');
  console.log(`NEXT_PUBLIC_FACTORY_BASE_MAINNET=${contractAddress}`);
  console.log(`NEXT_PUBLIC_FACTORY_ABI=${abiOneLine}`);
  console.log('NEXT_PUBLIC_RPC_URL_BASE=https://mainnet.base.org');
  console.log('NEXT_PUBLIC_APP_NAME=Gas-Fused Tip Jar');
  console.log('==========================\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
