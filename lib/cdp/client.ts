import { Coinbase, Wallet } from '@coinbase/coinbase-sdk';

/**
 * CDP Client - Wrapper for Coinbase Developer Platform SDK
 *
 * Handles smart wallet creation, session keys, and Base L2 transactions
 * for /vibe's economic infrastructure.
 */

class CDPClient {
  private sdk: Coinbase;
  private network: string = 'base';

  constructor() {
    // Initialize with API credentials from environment
    this.sdk = new Coinbase({
      apiKeyName: process.env.CDP_API_KEY_NAME!,
      privateKey: process.env.CDP_PRIVATE_KEY!,
    });
  }

  /**
   * Create a new smart wallet with Account Abstraction
   *
   * @param userId - GitHub ID or unique user identifier
   * @param handle - /vibe handle (e.g., @seth)
   * @returns Wallet instance with address
   */
  async createSmartWallet(userId: string, handle: string): Promise<Wallet> {
    const wallet = await this.sdk.createWallet({
      networkId: this.network,
      // Enable Account Abstraction (smart wallet, not EOA)
      useServerSigner: true,
    });

    // Export wallet data for storage
    const walletData = await wallet.export();

    return {
      address: wallet.getDefaultAddress()?.getId() || '',
      walletData,
      handle,
      userId,
    };
  }

  /**
   * Load existing wallet from stored data
   */
  async loadWallet(walletData: string): Promise<Wallet> {
    const wallet = await this.sdk.importWallet(JSON.parse(walletData));
    return wallet;
  }

  /**
   * Get USDC balance for a wallet address
   *
   * @param address - Wallet address
   * @returns Balance in USDC (human-readable)
   */
  async getUSDCBalance(address: string): Promise<number> {
    const wallet = await this.sdk.getWallet(address);
    const balance = await wallet.getBalance('usdc');

    // Convert from smallest unit (6 decimals for USDC)
    return parseFloat(balance.toString()) / 1e6;
  }

  /**
   * Transfer USDC between wallets
   */
  async transferUSDC(
    fromWallet: Wallet,
    toAddress: string,
    amount: number
  ): Promise<string> {
    const transfer = await fromWallet.createTransfer({
      amount: amount,
      assetId: 'usdc',
      destination: toAddress,
      gasless: true, // Use paymaster for gas
    });

    await transfer.wait();
    return transfer.getTransactionHash() || '';
  }

  /**
   * Get the SDK instance for advanced operations
   */
  getSDK(): Coinbase {
    return this.sdk;
  }
}

// Singleton instance
let cdpClient: CDPClient | null = null;

export function getCDPClient(): CDPClient {
  if (!cdpClient) {
    cdpClient = new CDPClient();
  }
  return cdpClient;
}

export default CDPClient;
