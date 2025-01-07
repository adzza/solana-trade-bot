

# Solana Trading Bot

A **high-performance, automated trading bot** designed for trading Solana tokens with precision and efficiency. This bot leverages the **Solana Tracker API** to access real-time market data and integrates with multiple decentralized exchanges (DEXs) to execute trades seamlessly.

---

## ⚠️ Warning

- **Never share your API keys or wallet private keys with anyone.**
- **Do not paste your private keys or API keys into any websites or scripts you have mot personally verified as safe.**
- Keep these sensitive details secure to protect your funds and data.

---

## 📜 Credits

This project is a fork of [YZYLAB/solana-trade-bot](https://github.com/YZYLAB/solana-trade-bot).  
All credits go to the original authors.

---

## ✨ Features

- Automated buying and selling of Solana tokens.
- Multi-token support.
- Configurable trading parameters (liquidity, market cap, risk score).
- Real-time position monitoring and management.
- Parallel execution of buying and selling operations.
- Detailed logging with timestamps and color-coded actions.
- Persistent storage of positions and transaction history.

---

## 🔗 Supported Platforms

This bot integrates with the following platforms:

| Platform         | Type                          | Features                                                                 |
|------------------|-------------------------------|-------------------------------------------------------------------------|
| **Raydium**      | AMM + Order Book Integration  | Hybrid AMM/order book model; deep liquidity; V4/CPMM support            |
| **Orca**         | AMM                           | Low slippage; concentrated liquidity pools (Whirlpools)                 |
| **Jupiter**      | Liquidity Aggregator          | Finds best swap routes across multiple DEXs; ensures optimal pricing    |
| **Pumpfun**      | Niche DEX                     | Focused on specific token markets or unique trading strategies          |
| **Moonshot**     | Speculative Trading Strategy  | Targets volatile tokens with high growth potential                      |

---

## 🛠️ Why Use This Bot?

- **Efficiency**: Automates trading to save time and reduce manual effort.
- **Best Pricing**: Leverages aggregators like Jupiter to ensure optimal trade execution across multiple DEXs.
- **Versatility**: Supports a wide range of trading strategies, from stable token swaps to speculative investments.
- **Low Costs**: Built on Solana, benefiting from its low fees and high-speed transactions.

---

## 📦 Includes

This bot includes two examples:
1. Using HTTP requests for fetching data.
2. Using faster, more efficient WebSocket streams from Solana Tracker.

---

## ✅ Prerequisites

Before using this bot, ensure you have the following:

- A fresh Ubuntu 22.04 VPS/installation.
- Node.js (v14 or later recommended).
- npm (comes with Node.js).
- A Solana wallet funded with SOL.
- API Key (Billing Token) from [Solana Tracker Data API](https://docs.solanatracker.io).

---

## 🚀 Installation (Fresh Ubuntu 22.04 Install)

1. Clone the repository:
   ```bash
   git clone https://github.com/adzza/solana-trading-bot.git
   cd solana-trading-bot
   ```

2. Install dependencies:
   ```bash
   npm install
   apt install curl
   apt install git
   npm install dotenv bs58
   npm update
   ```

3. Update Node Version Manager (nvm):
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   ```

4. Restart your terminal or run:
   ```bash
   export NVM_DIR="$HOME/.nvm"
   [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm
   [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion" # This loads nvm bash_completion (optional)
   ```

5. Install the LTS version of Node.js:
   ```bash
   nvm install --lts
   ```

6. Use the newly installed version:
   ```bash
   nvm use --lts
   ```

7. Manually create a `.env` file and configure it.

---

## 📝 Setting Up the `.env` File

To configure the bot, you need a **Solana Tracker Data API Key**, an **RPC Endpoint URL**, and a **WebSocket URL** for real-time data streaming.

### Step 1: Get a Free Solana Tracker Data API Key

1. Visit the [Solana Tracker API Documentation](https://docs.solanatracker.io/public-data-api/docs).
2. Sign up for an account if you don’t already have one.
3. After signing in, navigate to the **API Key Management** section.
4. Generate a new API key (free tier is available for basic usage).
5. Copy the generated API key.

### Step 2: Get a Solana RPC Endpoint URL

#### Option 1: Use a Free Public RPC
Use the default Solana mainnet RPC:
```
https://api.mainnet-beta.solana.com
```
Note: Public RPCs are rate-limited and may not be suitable for high-frequency trading.

#### Option 2: Use a Premium/Private RPC
For better reliability and higher rate limits, consider using premium providers like:
- [Ankr](https://www.ankr.com)
- [Alchemy](https://www.alchemy.com/dapps/solana-tracker)
- [Helius](https://dev.helius.xyz)

### Step 3: Get Your WebSocket URL

1. Upgrade your Solana Tracker plan to Premium or higher to access WebSocket streaming.
2. Navigate to the WebSocket section in your Solana Tracker dashboard.
3. Copy your unique WebSocket URL (e.g., `wss://websocket.solanatracker.io`).

##   Available Rooms for Subscriptions

latest	Updates about new tokens and pools
price:poolId	Price updates for a specific pool
transaction:tokenAddress	Transactions for a specific token
wallet:walletAddress	


### Step 4: Add Configuration to `.env`

Add your API key, RPC URL, and WebSocket URL to your `.env` file:
```plaintext
# Solana Tracker API Key (replace with your actual key)
API_KEY=your_solana_tracker_api_key_here

# Solana RPC Endpoint URL (replace with your actual endpoint)
RPC_URL=https://api.mainnet-beta.solana.com

# WebSocket Configuration (replace with your WebSocket URL)
WS_URL=wss://websocket.solanatracker.io
```

---

## 🌐 Configuring WebSocket Streams

The WebSocket API allows you to stream real-time data such as price updates, transactions, and token information.



### Available Rooms for Subscriptions

### **WebSocket Rooms Table**

| **Room Name**                          | **Description**                                                                 |
|----------------------------------------|---------------------------------------------------------------------------------|
| `latest`                               | Updates about new tokens and pools.                                            |
| `price:poolId`                         | Price updates for a specific pool (`poolId`).                                  |
| `transaction:tokenAddress`             | Transactions for a specific token (`tokenAddress`).                            |
| `transaction:tokenAddress:poolId`      | Transactions for a specific token pair and pool ID (`tokenAddress` & `poolId`).|
| `price-by-token:tokenId`               | Price updates for a specific token (`tokenId`).                                |
| `wallet:walletAddress`                 | Transactions involving a specific wallet (`walletAddress`).                    |
| `pool:poolId`                          | Updates about changes in a specific pool (`poolId`).                           |
| `graduating`                           | Notifications about graduating tokens nearing bonding curve completion.        |
| `graduated`                            | Notifications about graduated tokens now available on Raydium.                |

---

## ▶️ Usage

Run the bot using one of the following commands:

```bash
node index.js 
```

or

```bash
node websocket.js 
```

---

## 📖 Definitions Table

Here’s a quick reference table explaining common terms used in this project:

| Term/Acronym       | Definition                                                                                     |
|--------------------|-----------------------------------------------------------------------------------------------|
| **AMM**            | Automated Market Maker – A type of decentralized exchange that uses liquidity pools instead of order books. |
| **V4**             | Version 4 – Refers to Raydium’s latest protocol version with improved features like routing efficiency. |
| **CPMM**           | Constant Product Market Maker – An AMM formula where `x * y = k`, ensuring liquidity at all prices. |
| **DEX**            | Decentralized Exchange – A platform that allows peer-to-peer trading without intermediaries.    |
| **RPC**            | Remote Procedure Call – A protocol allowing interaction with blockchain nodes for data retrieval or transactions. |
| **WebSocket**      | A communication protocol enabling real-time data streaming between client and server over a persistent connection.|

---

## ⚙️ .env Configuration Table

Customize the bot’s behavior by adjusting settings in your `.env` file:


| **Variable**                  | **Description**                                                                                     |
|-------------------------------|-----------------------------------------------------------------------------------------------------|
| `AMOUNT`                      | The amount of SOL to swap in each transaction.                                                     |
| `DELAY`                       | Delay between buying cycles (in milliseconds).                                                    |
| `MONITOR_INTERVAL`            | Interval for monitoring positions (in milliseconds).                                              |
| `SLIPPAGE`                    | Maximum allowed slippage (in percentage).                                                         |
| `PRIORITY_FEE`                | Priority fee for transactions.                                                                    |
| `JITO`                        | Set to `"true"` to use Jito for transaction processing.                                            |
| `RPC_URL`                     | Your Solana RPC URL (e.g., `https://api.mainnet-beta.solana.com`).                                 |
| `API_KEY`                     | Your Solana Tracker API Key.                                                                      |
| `PRIVATE_KEY`                 | Your wallet's private key in Base58 format.                                                      |
| `WS_URL`                      | WebSocket URL for real-time data streaming (e.g., `wss://websocket.solanatracker.io`).            |
| `MIN_LIQUIDITY` / `MAX_LIQUIDITY` | Liquidity range for token selection (minimum and maximum).                                       |
| `MIN_MARKET_CAP` / `MAX_MARKET_CAP` | Market cap range for token selection (minimum and maximum).                                      |
| `MIN_RISK_SCORE` / `MAX_RISK_SCORE` | Risk score range for token selection (minimum and maximum).                                      |
| `REQUIRE_SOCIAL_DATA`         | Set to `"true"` to only trade tokens with social data.                                             |
| `MAX_NEGATIVE_PNL` / `MAX_POSITIVE_PNL` | PnL thresholds for selling positions (maximum negative/positive profit-and-loss thresholds).    |
| `MARKETS`                     | Comma-separated list of markets to trade on (e.g., `"raydium,orca,pumpfun,moonshot"`).            |

---

These tables can be copied directly into your GitHub README or documentation, and they will render perfectly with proper alignment and formatting!

---

## ❗ Disclaimer

This bot is for educational purposes only. Use at your own risk.

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).

---

## ⭐ Support

If you find this project helpful, please consider giving it a ⭐️ on GitHub!

