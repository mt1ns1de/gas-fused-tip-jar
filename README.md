# Gas-Fused Tip Jar

A tip jar on Base that respects your gas limits.
**No backend. No bots. 100% on-chain.**

---

## Why?

Most "gas protection" tools rely on off-chain relayers or Python scripts monitoring the mempool.
**If the server dies, the protection dies.**

I wanted something unstoppable. This project enforces the gas cap logic directly inside the EVM. If `tx.gasprice` exceeds the cap you set, the transaction reverts immediately.

The supporter keeps their ETH. You don't get overpaid tips.

## How it works

### 1. The Fuse (On-chain Logic)
Instead of an Oracle, I check the raw `tx.gasprice` opcode. It's efficient and impossible to spoof.

```solidity
// contracts/src/TipJar.sol

modifier withinGasCap() {
    // If network is busy, fail fast.
    if (tx.gasprice > maxGasPriceWei) revert GasPriceTooHigh();
    _;
}

```

### 2. No Proxies (The "Anti-Pattern")

You'll notice `TipJarFactory.sol` creates jars using `new TipJar(...)` instead of Clones (EIP-1167).

**Why pay ~150k gas instead of 45k?**

* **Simplicity:** No initialization logic, no delegatecall context confusion.
* **Safety:** Each jar is a sovereign contract.
* **Reality:** On Base (L2), the cost difference is negligible ($0.01 vs $0.05). I prefer code that is easy to read and impossible to break over premature optimization.

### 3. Withdrawals

Using `call` instead of `transfer` to handle smart-contract wallets (Gnosis Safe) correctly and prevent gas griefing.

---

## Tech Stack

* **Contracts:** Solidity 0.8.20, Foundry
* **Frontend:** Next.js 16, Wagmi v2, Viem
* **Network:** Base Mainnet

## Deployments

| Contract | Address |
| --- | --- |
| **Factory (Base)** | [`0x7CdA207B39F7648AABD5DF98c50f9AeA5f861e38`](https://www.google.com/search?q=https://basescan.org/address/0x7CdA207B39F7648AABD5DF98c50f9AeA5f861e38) |

## Run Locally

```bash
# 1. Install
git clone [https://github.com/mt1ns1de/gas-fused-tip-jar.git](https://github.com/mt1ns1de/gas-fused-tip-jar.git)
cd gas-fused-tip-jar
npm install

# 2. Run Frontend
npm run dev

# 3. Run Tests
forge test -vv

```

```

```
