require("dotenv").config();
const { SolanaTracker } = require("solana-swap");
const { Keypair, PublicKey, Connection } = require("@solana/web3.js");
const bs58 = require("bs58").default;
const winston = require("winston");
const chalk = require("chalk");
const axios = require("axios");
const axiosRetry = require('axios-retry').default;
const fs = require("fs").promises;

// Configure axios with retry logic
const session = axios.create({
  baseURL: "https://data.solanatracker.io/",
  timeout: 30000,
  headers: { "x-api-key": process.env.API_KEY },
});

// Configure retry behavior
axiosRetry(axios, { 
  retries: 3,
  retryDelay: (retryCount) => {
    return retryCount * 2000;
  },
  retryCondition: (error) => {
    return (
      axiosRetry.isNetworkOrIdempotentRequestError(error) || 
      error.code === 'ECONNABORTED' ||
      error.code === 'ETIMEDOUT'
    );
  }
});

const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

// Helper function to format numbers with commas and fixed decimals
function formatNumber(num, decimals = 2) {
  if (typeof num !== 'number') return '0';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

// Helper function to format currency
function formatCurrency(num) {
  if (typeof num !== 'number') return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

class StatusTicker {
  constructor() {
    this.lastUpdate = Date.now();
    this.startTime = Date.now();
  }

  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }

  logStatus(status) {
    const now = Date.now();
    const runTime = this.formatDuration(now - this.startTime);
    const message = `[Runtime: ${runTime}] ${status}`;
    
    // Only log if more than 2 seconds have passed since last update
    if (now - this.lastUpdate >= 2000) {
      logger.info(message);
      this.lastUpdate = now;
    }
  }
}

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    winston.format.printf((info) => {
      const statusColors = {
        success: chalk.green,
        info: chalk.white,
        warn: chalk.yellow,
        error: chalk.red,
      };

      const symbols = {
        success: "✓",
        info: "ℹ",
        warn: "⚠",
        error: "✖",
      };

      const status = info.status || "info";
      const colorize = statusColors[status];
      const symbol = symbols[status];

      return `${info.timestamp} ${colorize(`${symbol} ${info.level}: ${info.message}`)}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ 
      filename: "trading-bot.log",
      format: winston.format.printf((info) => {
        return `${info.timestamp} ${info.level}: ${info.message}`;
      })
    }),
  ],
});

class CircuitBreaker {
  constructor() {
    this.failures = 0;
    this.lastFailure = null;
    this.isOpen = false;
  }

  async execute(fn) {
    if (this.isOpen) {
      const timeSinceLastFailure = Date.now() - this.lastFailure;
      if (timeSinceLastFailure > 300000) {
        this.reset();
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.reset();
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailure = Date.now();
      
      if (this.failures >= 5) {
        this.isOpen = true;
      }
      throw error;
    }
  }

  reset() {
    this.failures = 0;
    this.lastFailure = null;
    this.isOpen = false;
  }
}

class TradingBot {
  constructor() {
    this.config = {
      amount: parseFloat(process.env.AMOUNT),
      delay: parseInt(process.env.DELAY),
      monitorInterval: parseInt(process.env.MONITOR_INTERVAL),
      slippage: parseInt(process.env.SLIPPAGE),
      priorityFee: parseFloat(process.env.PRIORITY_FEE),
      useJito: process.env.JITO === "true",
      rpcUrl: process.env.RPC_URL,
      fallbackRPCs: [
        "https://api.mainnet-beta.solana.com",
        "https://solana-api.projectserum.com",
        "https://rpc.ankr.com/solana",
        process.env.RPC_URL
      ],
      rpcRetries: 3,
      currentRPCIndex: 0,
      minLiquidity: parseFloat(process.env.MIN_LIQUIDITY) || 0,
      maxLiquidity: parseFloat(process.env.MAX_LIQUIDITY) || Infinity,
      minMarketCap: parseFloat(process.env.MIN_MARKET_CAP) || 0,
      maxMarketCap: parseFloat(process.env.MAX_MARKET_CAP) || Infinity,
      minRiskScore: parseInt(process.env.MIN_RISK_SCORE) || 0,
      maxRiskScore: parseInt(process.env.MAX_RISK_SCORE) || 10,
      requireSocialData: process.env.REQUIRE_SOCIAL_DATA === "true",
      maxNegativePnL: parseFloat(process.env.MAX_NEGATIVE_PNL) || -Infinity,
      maxPositivePnL: parseFloat(process.env.MAX_POSITIVE_PNL) || Infinity,
      markets: process.env.MARKETS?.split(",").map((m) => m.trim()) || ['raydium', 'orca', 'pumpfun', 'moonshot', 'raydium-cpmm'],
    };

    this.privateKey = process.env.PRIVATE_KEY;
    this.SOL_ADDRESS = "So11111111111111111111111111111111111111112";
    this.positions = new Map();
    this.positionsFile = "positions.json";
    this.soldPositionsFile = "sold_positions.json";
    this.soldPositions = [];
    this.seenTokens = new Set();
    this.buyingTokens = new Set();
    this.sellingPositions = new Set();
    this.circuitBreaker = new CircuitBreaker();
    this.ticker = new StatusTicker();

    this.connection = new Connection(this.config.rpcUrl, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000,
      disableRetryOnRateLimit: false,
    });
  }

  async rotateRPC() {
    this.config.currentRPCIndex = (this.config.currentRPCIndex + 1) % this.config.fallbackRPCs.length;
    const newRPC = this.config.fallbackRPCs[this.config.currentRPCIndex];
    logger.info(`Rotating to RPC endpoint: ${newRPC}`, { status: 'info' });
    this.connection = new Connection(newRPC, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000,
      disableRetryOnRateLimit: false,
    });
    return newRPC;
  }

  async checkApiHealth() {
    try {
      this.ticker.logStatus("Checking API health...");
      const response = await session.get('/health');
      const isHealthy = response.status === 200;
      logger.info(`API Health Check: ${isHealthy ? 'OK' : 'Issues Detected'}`, {
        status: isHealthy ? 'success' : 'error'
      });
      return isHealthy;
    } catch (error) {
      logger.error(`API Health Check Failed: ${error.message}`, { status: 'error' });
      return false;
    }
  }

  async checkRPCConnection() {
    const maxAttempts = this.config.fallbackRPCs.length * 2;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        this.ticker.logStatus("Verifying RPC connection...");
        const startTime = Date.now();
        const result = await this.connection.getLatestBlockhash();
        const endTime = Date.now();
        const latency = endTime - startTime;
        
        if (result && latency < 10000) {
          logger.info(`RPC connection successful. Latency: ${latency}ms`, {
            status: 'success'
          });
          return true;
        } else {
          logger.warn(`RPC response too slow (${latency}ms), rotating...`, { status: 'warn' });
          await this.rotateRPC();
        }
      } catch (error) {
        logger.error(`RPC Connection Error: ${error.message}`, { status: 'error' });
        await this.rotateRPC();
      }
      
      attempts++;
      if (attempts < maxAttempts) {
        await sleep(2000);
      }
    }
    
    logger.error('All RPC endpoints failed', { status: 'error' });
    return false;
  }

  async verifyRPCHealth() {
    let checksCount = 0;
    while (true) {
      try {
        checksCount++;
        this.ticker.logStatus(`Performing RPC health check #${checksCount}...`);
        const status = await this.checkRPCConnection();
        if (!status) {
          logger.warn('RPC health check failed, attempting to rotate...', { status: 'warn' });
          await this.rotateRPC();
        }
      } catch (error) {
        logger.error(`RPC health verification error: ${error.message}`, { status: 'error' });
      }
      this.ticker.logStatus("Waiting for next RPC health check...");
      await sleep(30000);
    }
  }

  async initialize() {
    this.ticker.logStatus("Initializing bot...");
    this.keypair = Keypair.fromSecretKey(bs58.decode(this.privateKey));
    this.solanaTracker = new SolanaTracker(this.keypair, this.config.rpcUrl);
    await this.loadPositions();
    await this.loadSoldPositions();
    logger.info("Bot initialization complete", { status: 'success' });
  }

  async fetchTokens() {
    try {
      return await this.circuitBreaker.execute(async () => {
        const response = await session.get("/tokens/latest");
        return response.data;
      });
    } catch (error) {
      if (error.message === 'Circuit breaker is open') {
        logger.error('Circuit breaker triggered, pausing operations', { status: 'error' });
        await sleep(300000); // 5 minutes
        return [];
      }
      
      logger.error(`Error fetching token data: ${error.message}`, {
        status: 'error',
        code: error.code,
        responseStatus: error?.response?.status,
        timeout: error.code === 'ECONNABORTED',
        data: error?.response?.data
      });

      if (error.code === 'ECONNABORTED') {
        this.ticker.logStatus('Waiting 30 seconds before next token fetch attempt...');
        await sleep(30000);
      }
      
      return [];
    }
  }

  async fetchTokenData(tokenId) {
    try {
      const response = await session.get(`/tokens/${tokenId}`);
      return response.data;
    } catch (error) {
      logger.error(`Error fetching token data [${error?.response?.data || error}]`, { status: 'error' });
      return null;
    }
  }

  filterTokens(tokens) {
    const filteredTokens = [];
    for (const token of tokens) {
      const pool = token.pools[0];
      const liquidity = pool.liquidity.usd;
      const marketCap = pool.marketCap.usd;
      const riskScore = token.risk.score;
      const hasSocialData = !!(
        token.token.twitter ||
        token.token.telegram ||
        token.token.website
      );
      const isInAllowedMarket = this.config.markets.includes(pool.market);
      
      // Prepare filter results
      const filterResults = {
        symbol: token.token.symbol,
        failures: [],
        passed: true
      };

      // Check liquidity
      if (liquidity < this.config.minLiquidity) {
        filterResults.passed = false;
        filterResults.failures.push(`Liquidity too low: ${formatCurrency(liquidity)}/${formatCurrency(this.config.minLiquidity)}`);
      } else if (liquidity > this.config.maxLiquidity) {
        filterResults.passed = false;
        filterResults.failures.push(`Liquidity too high: ${formatCurrency(liquidity)}/${formatCurrency(this.config.maxLiquidity)}`);
      }

      // Check market cap
      if (marketCap < this.config.minMarketCap) {
        filterResults.passed = false;
        filterResults.failures.push(`Market cap too low: ${formatCurrency(marketCap)}/${formatCurrency(this.config.minMarketCap)}`);
      } else if (marketCap > this.config.maxMarketCap) {
        filterResults.passed = false;
        filterResults.failures.push(`Market cap too high: ${formatCurrency(marketCap)}/${formatCurrency(this.config.maxMarketCap)}`);
      }

      // Check risk score
      if (riskScore < this.config.minRiskScore || riskScore > this.config.maxRiskScore) {
        filterResults.passed = false;
        filterResults.failures.push(`Risk score outside range: ${riskScore} (min: ${this.config.minRiskScore}, max: ${this.config.maxRiskScore})`);
      }

      // Check social data
      if (this.config.requireSocialData && !hasSocialData) {
        filterResults.passed = false;
        filterResults.failures.push('No social data available');
      }

      // Check market
      if (!isInAllowedMarket) {
        filterResults.passed = false;
        filterResults.failures.push(`Market not allowed: ${pool.market}`);
      }

      // Check if token was seen before
      if (this.seenTokens.has(token.token.mint)) {
        filterResults.passed = false;
        filterResults.failures.push('Token already seen');
      }

      // Check if token is being bought
      if (this.buyingTokens.has(token.token.mint)) {
        filterResults.passed = false;
        filterResults.failures.push('Token purchase in progress');
      }

      // Log filter results
      if (!filterResults.passed) {
        logger.info(`Token ${filterResults.symbol} failed filters:`, { status: 'info' });
        filterResults.failures.forEach(failure => {
          logger.info(`  - ${failure}`, { status: 'info' });
        });
      } else {
        logger.info(`Token ${filterResults.symbol} passed all filters ✓ (${formatCurrency(liquidity)} liquidity)`, { status: 'success' });
        filteredTokens.push(token);
      }
    }

    return filteredTokens;
  }
  
  async checkAndSellPosition(tokenMint) {
    if (this.sellingPositions.has(tokenMint)) {
      return;
    }

    const position = this.positions.get(tokenMint);
    if (!position) return;

    const tokenData = await this.fetchTokenData(tokenMint);
    if (!tokenData) {
      logger.error(`Failed to fetch data for token ${tokenMint}`, { status: 'error' });
      return;
    }

    const currentPrice = tokenData.pools[0].price.quote;
    const pnlPercentage =
      ((currentPrice - position.entryPrice) / position.entryPrice) * 100;

    logger.info(
      `PnL for position [${position.symbol}] [${pnlPercentage.toFixed(2)}%]`,
      { status: pnlPercentage >= 0 ? 'success' : 'warn' }
    );

    if (
      pnlPercentage <= this.config.maxNegativePnL ||
      pnlPercentage >= this.config.maxPositivePnL
    ) {
      const currentAmount = await this.getWalletAmount(
        this.keypair.publicKey.toBase58(),
        tokenMint
      );
      if (currentAmount !== null && currentAmount > 0) {
        this.sellingPositions.add(tokenMint);
        this.performSwap(tokenData, false).catch((error) => {
          logger.error(`Error selling position: ${error.message}`, { status: 'error', error });
          this.sellingPositions.delete(tokenMint);
        });
      } else {
        logger.warn(
          `No balance found for ${position.symbol}, removing from positions`,
          { status: 'warn' }
        );
        this.positions.delete(tokenMint);
        await this.savePositions();
      }
    }
  }

  async performSwap(token, isBuy) {
    const action = isBuy ? 'BUYING' : 'SELLING';
    logger.info(
      `${action} [${this.keypair.publicKey.toBase58()}] [${token.token.symbol}] [${token.token.mint}]`,
      { status: 'info' }
    );
    const { amount, slippage, priorityFee } = this.config;
    const [fromToken, toToken] = isBuy
      ? [this.SOL_ADDRESS, token.token.mint]
      : [token.token.mint, this.SOL_ADDRESS];

    try {
      let swapAmount;
      if (isBuy) {
        swapAmount = amount;
      } else {
        const position = this.positions.get(token.token.mint);
        if (!position) {
          logger.error(
            `No position found for ${token.token.symbol} when trying to sell`,
            { status: 'error' }
          );
          return false;
        }
        swapAmount = position.amount;
      }

      this.ticker.logStatus(`Getting swap instructions for ${token.token.symbol}...`);
      const swapResponse = await this.solanaTracker.getSwapInstructions(
        fromToken,
        toToken,
        swapAmount,
        slippage,
        this.keypair.publicKey.toBase58(),
        priorityFee
      );

      this.ticker.logStatus(`Executing swap for ${token.token.symbol}...`);
      const swapOptions = this.buildSwapOptions();
      const txid = await this.solanaTracker.performSwap(
        swapResponse,
        swapOptions
      );
      this.logTransaction(txid, isBuy, token);

      if (isBuy) {
        this.ticker.logStatus(`Confirming ${token.token.symbol} purchase...`);
        const tokenAmount = await this.getWalletAmount(
          this.keypair.publicKey.toBase58(),
          token.token.mint
        );
        if (!tokenAmount) {
          logger.error(
            `Swap failed ${token.token.mint}`,
            { status: 'error' }
          );
          return false;
        }
        this.positions.set(token.token.mint, {
          txid,
          symbol: token.token.symbol,
          entryPrice: token.pools[0].price.quote,
          amount: tokenAmount,
          openTime: Date.now(),
        });
        this.seenTokens.add(token.token.mint);
        this.buyingTokens.delete(token.token.mint);
        logger.info(`Successfully bought ${token.token.symbol} (Amount: ${formatNumber(tokenAmount)})`, { status: 'success' });
      } else {
        const position = this.positions.get(token.token.mint);
        if (position) {
          const exitPrice = token.pools[0].price.quote;
          const pnl = (exitPrice - position.entryPrice) * position.amount;
          const pnlPercentage =
            (pnl / (position.entryPrice * position.amount)) * 100;

          const soldPosition = {
            ...position,
            exitPrice,
            pnl,
            pnlPercentage,
            closeTime: Date.now(),
            closeTxid: txid,
          };

          this.soldPositions.push(soldPosition);

          logger.info(
            `Closed position for ${token.token.symbol}. PnL: ${formatCurrency(pnl)} (${pnlPercentage.toFixed(2)}%)`,
            { status: pnlPercentage >= 0 ? 'success' : 'warn' }
          );
          this.positions.delete(token.token.mint);
          this.sellingPositions.delete(token.token.mint);

          await this.saveSoldPositions();
        }
      }

      await this.savePositions();
      return txid;
    } catch (error) {
      logger.error(
        `Error performing ${isBuy ? "buy" : "sell"}: ${error.message}`,
        { status: 'error', error }
      );
      if (isBuy) {
        this.buyingTokens.delete(token.token.mint);
      } else {
        this.sellingPositions.delete(token.token.mint);
      }
      return false;
    }
  }

  async buyMonitor() {
    let tokenCheckCount = 0;
    while (true) {
      this.ticker.logStatus("Scanning for new tokens...");
      const tokens = await this.fetchTokens();
      const filteredTokens = this.filterTokens(tokens);
      
      tokenCheckCount++;
      logger.info(`Token scan #${tokenCheckCount}: Found ${formatNumber(tokens.length)} tokens, ${filteredTokens.length} passed filters`, {
        status: filteredTokens.length > 0 ? 'success' : 'info'
      });

      for (const token of filteredTokens) {
        if (!this.positions.has(token.token.mint) && !this.buyingTokens.has(token.token.mint)) {
          this.ticker.logStatus(`Attempting to buy ${token.token.symbol}...`);
          this.buyingTokens.add(token.token.mint);
          this.performSwap(token, true).catch((error) => {
            logger.error(`Error buying token: ${error.message}`, { status: 'error', error });
            this.buyingTokens.delete(token.token.mint);
          });
        }
      }

      this.ticker.logStatus("Waiting for next token scan...");
      await sleep(this.config.delay);
    }
  }

  async positionMonitor() {
    while (true) {
      const positions = Array.from(this.positions.keys());
      if (positions.length > 0) {
        this.ticker.logStatus(`Monitoring ${positions.length} active positions...`);
        const positionPromises = positions.map(
          (tokenMint) => this.checkAndSellPosition(tokenMint)
        );
        await Promise.allSettled(positionPromises);
      } else {
        this.ticker.logStatus("No active positions to monitor");
      }
      await sleep(this.config.monitorInterval);
    }
  }

  buildSwapOptions() {
    return {
      sendOptions: { skipPreflight: true },
      confirmationRetries: 30,
      confirmationRetryTimeout: 1000,
      lastValidBlockHeightBuffer: 150,
      resendInterval: 1000,
      confirmationCheckInterval: 1000,
      commitment: "processed",
      jito: this.config.useJito ? { enabled: true, tip: 0.0001 } : undefined,
    };
  }

  logTransaction(txid, isBuy, token) {
    const action = isBuy ? 'BOUGHT' : 'SOLD';
    logger.info(
      `${action} ${token.token.symbol} [${txid}]`,
      { status: 'success' }
    );
  }

  async loadSoldPositions() {
    try {
      const data = await fs.readFile(this.soldPositionsFile, "utf8");
      this.soldPositions = JSON.parse(data);
      logger.info(
        `Loaded ${this.soldPositions.length} sold positions from file`,
        { status: 'success' }
      );
    } catch (error) {
      if (error.code !== "ENOENT") {
        logger.error("Error loading sold positions", { status: 'error', error });
      }
    }
  }

  async saveSoldPositions() {
    try {
      await fs.writeFile(
        this.soldPositionsFile,
        JSON.stringify(this.soldPositions, null, 2)
      );
      logger.info(`Saved ${this.soldPositions.length} sold positions to file`, { status: 'success' });
    } catch (error) {
      logger.error("Error saving sold positions", { status: 'error', error });
    }
  }
  
  async loadPositions() {
    try {
      const data = await fs.readFile(this.positionsFile, "utf8");
      const loadedPositions = JSON.parse(data);
      this.positions = new Map(Object.entries(loadedPositions));
      this.seenTokens = new Set(this.positions.keys());
      logger.info(`Loaded ${this.positions.size} positions from file`, { status: 'success' });
    } catch (error) {
      if (error.code !== "ENOENT") {
        logger.error("Error loading positions", { status: 'error', error });
      }
    }
  }

  async savePositions() {
    try {
      const positionsObject = Object.fromEntries(this.positions);
      await fs.writeFile(
        this.positionsFile,
        JSON.stringify(positionsObject, null, 2)
      );
      logger.info(`Saved ${this.positions.size} positions to file`, { status: 'success' });
    } catch (error) {
      logger.error("Error saving positions", { status: 'error', error });
    }
  }

  async start() {
    try {
      logger.info("🤖 Starting Trading Bot", { status: 'success' });
      
      // Check API health before starting
      const apiHealthy = await this.checkApiHealth();
      if (!apiHealthy) {
        logger.warn("API health check failed, waiting before retry...", { status: 'warn' });
        await sleep(60000);
        return this.start();
      }

      // Check RPC connection
      const rpcHealthy = await this.checkRPCConnection();
      if (!rpcHealthy) {
        logger.warn("All RPC connections failed, waiting before retry...", { status: 'warn' });
        await sleep(60000);
        return this.start();
      }

      await this.initialize();
      logger.info("Bot initialization complete!", { status: 'success' });
      
      // Start monitors in parallel
      await Promise.allSettled([
        this.buyMonitor(),
        this.positionMonitor(),
        this.verifyRPCHealth()
      ]);
    } catch (error) {
      logger.error("Error starting bot", { status: 'error', error });
      await sleep(60000);
      this.start();
    }
  }
}

const bot = new TradingBot();
bot.start().catch((error) => console.error("Error in bot execution", error));
