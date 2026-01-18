Markdown# Gas-Fused Tip Jar ⚡️

> **An autonomous, immutable financial primitive on Base.**
> Protects supporters from network congestion without a single line of off-chain logic.

---

## 💀 The Philosophy: Zero Backend

Most dApps rely on fragile Python bots or centralized APIs to monitor gas prices. If the server dies, the feature dies.

**This project is different.** The "Fuse" logic is baked directly into the EVM bytecode.
It enforces `tx.gasprice <= cap` inside a Solidity modifier.

* **Unstoppable:** No AWS, no Vercel, no Cron jobs.
* **Trustless:** The artist doesn't need to trust a bot to pause mints. The blockchain rejects the transaction automatically.
* **Atomic:** The check happens in the same transaction as the tip. No race conditions.

---

## ⚙️ Under the Hood

### 1. The "Fuse" Modifier
Instead of complex Oracles, we use the raw `tx.gasprice` opcode. Simple, gas-efficient, and impossible to trick.

```solidity
// contracts/src/TipJar.sol

modifier withinGasCap() {
    // If the network is congested, the transaction reverts immediately.
    // The user saves their ETH, paying only a tiny amount for the revert.
    if (tx.gasprice > maxGasPriceWei) revert GasPriceTooHigh();
    _;
}
2. Architecture Decisions: Why new TipJar()?You will notice the Factory uses new TipJar(...) instead of EIP-1167 (Minimal Proxies).Why pay ~150k gas instead of 45k?Simplicity > Optimization: Proxies introduce complexity (delegatecall context, initialization risks).Isolation: Each Jar is a sovereign contract with its own immutable storage.Security: On L2 (Base), the cost difference is negligible ($0.05 vs $0.01). We trade pennies for absolute architectural stability.3. Withdrawal SafetyWe use the CEI (Checks-Effects-Interactions) pattern and low-level calls to prevent gas griefing from smart-contract wallets (Gnosis Safe, Argent).Solidity(bool success, ) = payable(owner).call{value: amount}("");
require(success, "Transfer failed");
🛠 Tech StackContracts: Solidity 0.8.20, Foundry (Forge)Frontend: Next.js 16 (App Router), Wagmi v2, ViemNetwork: Base Mainnet / Base Sepolia🚀 Deployments (Base Mainnet)ContractAddressFactory0x16db7bf0afabf9ac9571ef4dec84f142a579d2a6Demo JarDeploy one via the UI to see it here📦 Run Locally1. Clone & InstallBashgit clone [https://github.com/mt1ns1de/gas-fused-tip-jar.git](https://github.com/mt1ns1de/gas-fused-tip-jar.git)
cd gas-fused-tip-jar
npm install
2. FrontendBashnpm run dev
# Open http://localhost:3000
3. Foundry TestsBashforge test -vv
