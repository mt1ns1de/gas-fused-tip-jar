# Gas-Fused Tip Jar

Tip jar on **Base** with a built-in gas fuse.

You choose the maximum gas price a supporter is allowed to pay.  
If the network goes above that level, the tip reverts and their ETH stays with them.

---

## How it works

- Deploy a jar and set a **gas cap** (max gas price in wei).
- Supporters send tips directly to the jar on Base.
- If current gas ≤ cap → the tip is processed.
- If current gas > cap → the transaction reverts with a clear error.

No offchain services. The fuse logic lives fully onchain in the jar contract.

---

## Why it’s useful

- Protects supporters from tipping during unexpected gas spikes.
- Lets creators choose how “aggressive” or “conservative” their jars are.
- Easy to share: send your jar URL and start receiving tips.

---

## Contracts

**Base Mainnet**

- TipJarFactory: `0x16db7bf0afabf9ac9571ef4dec84f142a579d2a6`

**Base Sepolia**

- TipJarFactory: `0x4432b13DABF32b67Bd41472e1350d7E083be6B01`

Every jar is a minimal proxy created by the factory.

---

## Stack

- Next.js 16 (App Router, TypeScript)
- wagmi v2 + viem
- Tailwind CSS, Base-inspired UI
