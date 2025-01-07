
# Solana Trading Bot

A **high-performance, automated trading bot** designed for trading Solana tokens with precision and efficiency. This bot leverages the **Solana Tracker API** to access real-time market data and integrates with multiple decentralized exchanges (DEXs) to execute trades seamlessly.

---

## ⚠️ Warning

- **Never share your API keys or wallet private keys with anyone.**
- **Do not paste your private keys or API keys into any websites.**
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

To configure the bot, you need a **Solana Tracker Data API Key** and an **RPC Endpoint URL**. Follow these steps to obtain them and set up your `.env` file:

### Step 1: Get a Free Solana Tracker Data API Key

1. Visit the [Solana Tracker API Documentation](https://docs.solanatracker.io/public-data-api/docs).
2. Sign up for an account if you don’t already have one.
3. After signing in, navigate to the **API Key Management** section.
4. Generate a new API key (free tier is available for basic usage).
5. Copy the generated API key.

### Step 2: Get a Solana RPC Endpoint URL

#### Option 1: Use a Free Public RPC
Use the default Solana mainnet RPC:
```plaintext
https://api.mainnet-beta.solana.com
```
Note: Public RPCs are rate-limited and may not be suitable for high-frequency trading.

#### Option 2: Use a Premium/Private RPC
For better reliability and higher rate limits, consider using premium providers like:
- [Ankr](https://www.ankr.com)
- [Alchemy](https://www.alchemy.com/dapps/solana-tracker)
- [Helius](https://dev.helius.xyz)

### Step 3: Create and Configure Your `.env` File

1. Create a new `.env` file in your project directory:
   ```bash
   touch .env
   ```

2. Open the `.env` file in a text editor:
   ```bash
   nano .env
   ```

3. Add the following content to your `.env` file:
```plaintext
# Bot Configuration
AMOUNT=0.001
DELAY=1000
MONITOR_INTERVAL=3000
SLIPPAGE=25
PRIORITY_FEE=0.00005
JITO=false

# Solana Tracker API Key (replace with your actual key)
API_KEY=your_solana_tracker_api_key_here

# Solana RPC Endpoint URL (replace with your actual endpoint)
RPC_URL=https://api.mainnet-beta.solana.com

# WebSocket Configuration (replace with your WebSocket URL)
WS_URL=wss://websocket-url-here

# Wallet Configuration (replace with your wallet's private key in Base58 format)
PRIVATE_KEY=your_base58_private_key_here

# Token Filtering Parameters
MIN_LIQUIDITY=1000
MAX_LIQUIDITY=1000000
MIN_MARKET_CAP=2000
MAX_MARKET_CAP=10000000
MIN_RISK_SCORE=0
MAX_RISK_SCORE=8
REQUIRE_SOCIAL_DATA=false

# PnL Thresholds for Selling Positions
MAX_NEGATIVE_PNL=-50
MAX_POSITIVE_PNL=5

# Markets to Trade On (Comma-Separated)
MARKETS=raydium,orca,pumpfun,moonshot,raydium-cpmm
```

4. Replace placeholders (`your_solana_tracker_api_key_here`, `your_base58_private_key_here`, etc.) with your actual values.

5. Save and exit (`CTRL+O`, then `Enter`, followed by `CTRL+X` in nano).

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

## ⚙️ Configuration

Customize the bot's behavior by adjusting settings in your `.env` file:

| Setting                  | Description                                                                 |
|--------------------------|-----------------------------------------------------------------------------|
| `AMOUNT`                | The amount of SOL to swap in each transaction                               |
| `DELAY`                 | Delay between buying cycles (in milliseconds)                              |
| `MONITOR_INTERVAL`      | Interval for monitoring positions (in milliseconds)                        |
| `SLIPPAGE`              | Maximum allowed slippage (in percentage)                                   |
| `PRIORITY_FEE`          | Priority fee for transactions                                              |
| `JITO`                  | Set to "true" to use Jito for transaction processing                       |
| `RPC_URL`               | Your Solana RPC URL                                                        |
| `API_KEY`               | Your Solana Tracker API Key                                                |
| `PRIVATE_KEY`           | Your wallet's private key                                                  |
| `MIN_LIQUIDITY/MAX_LIQUIDITY` | Liquidity range for token selection                                      |
| `MIN_MARKET_CAP/MAX_MARKET_CAP` | Market cap range for token selection                                   |
| `MIN_RISK_SCORE/MAX_RISK_SCORE` | Risk score range for token selection                                   |
| `REQUIRE_SOCIAL_DATA`    | Set to "true" to only trade tokens with social data                        |
| `MAX_NEGATIVE_PNL/MAX_POSITIVE_PNL` | PnL thresholds for selling positions                              |
| `MARKETS`               | Comma-separated list of markets to trade on                                |

---

## ❗ Disclaimer

This bot is for educational purposes only. Use at your own risk. Always understand the code you're running and the potential financial implications of automated trading.

The goal of this project is to demonstrate potential ways of using the Solana Tracker API.

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!  
Feel free to check the [issues page](https://github.com/YZYLAB/solana-trade-bot/issues).

---

## ⭐ Support

If you find this project helpful, please consider giving it a ⭐️ on GitHub!

--- 

### Key Features:
1. Proper headings (`#`, `##`) for clear sectioning.
2. Tables (`|---`) are used for structured information like settings or supported platforms.
3. Code blocks (` ```bash`) are used consistently for commands and example configurations.
4. Emojis (`⚠️`, `📜`) add visual appeal while maintaining readability.

Paste this directly into your GitHub README editor—it will render perfectly!

Citations:
[1] https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/quickstart-for-writing-on-github
[2] https://www.freecodecamp.org/news/github-flavored-markdown-syntax-examples/
[3] https://github.com/darsaveli/Readme-Markdown-Syntax
[4] https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax
[5] https://dev.to/sameerkatija/github-markdown-cheat-sheet-everything-you-need-to-know-to-write-readme-md-2eca
[6] https://www.youtube.com/watch?v=LfuY7EvxuH0
[7] https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github
