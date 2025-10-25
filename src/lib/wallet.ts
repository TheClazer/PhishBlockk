import { ethers, BrowserProvider, Eip1193Provider } from "ethers";

declare global {
  interface Window {
    ethereum?: Eip1193Provider & {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

/**
 * Check if MetaMask or compatible wallet is installed
 */
export function isWalletInstalled(): boolean {
  return typeof window !== "undefined" && typeof window.ethereum !== "undefined";
}

/**
 * Clear any pending MetaMask requests
 */
export async function clearPendingRequests(): Promise<void> {
  if (!isWalletInstalled()) return;
  
  try {
    // Try to get accounts without requesting permission
    await window.ethereum!.request({ method: 'eth_accounts' });
  } catch (error) {
    console.log('Cleared pending requests');
  }
}

/**
 * Connect to user's wallet (MetaMask)
 */
export async function connectWallet(): Promise<{
  address: string;
  provider: BrowserProvider;
}> {
  if (!isWalletInstalled()) {
    throw new Error("No Ethereum wallet found. Please install MetaMask.");
  }

  // Clear any pending requests first
  await clearPendingRequests();
  
  const provider = new ethers.BrowserProvider(window.ethereum!);
  
  try {
    // Check if already connected
    const accounts = await provider.send("eth_accounts", []);
    if (accounts.length > 0) {
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      return { address, provider };
    }
    
    // Request permission with timeout
    const requestPromise = provider.send("eth_requestAccounts", []);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Connection timeout - please check MetaMask")), 10000)
    );
    
    await Promise.race([requestPromise, timeoutPromise]);
    
    const signer = await provider.getSigner();
    const address = await signer.getAddress();

    return { address, provider };
  } catch (error: any) {
    if (error.message.includes("User rejected") || error.code === 4001) {
      throw new Error("Connection rejected by user. Please try again.");
    }
    if (error.code === -32002) {
      throw new Error("MetaMask has a pending request. Please check MetaMask extension and approve/reject the request, then refresh the page and try again.");
    }
    if (error.message.includes("timeout")) {
      throw new Error("Connection timed out. Please check MetaMask and try again.");
    }
    throw new Error(`Failed to connect wallet: ${error.message || error}`);
  }
}

/**
 * Get current connected wallet address
 */
export async function getCurrentAddress(): Promise<string | null> {
  if (!isWalletInstalled()) {
    return null;
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum!);
    const signer = await provider.getSigner();
    return await signer.getAddress();
  } catch {
    return null;
  }
}

/**
 * Sign a message with the user's wallet
 */
export async function signMessage(message: string): Promise<string> {
  if (!isWalletInstalled()) {
    throw new Error("No Ethereum wallet found");
  }

  const provider = new ethers.BrowserProvider(window.ethereum!);
  const signer = await provider.getSigner();
  const signature = await signer.signMessage(message);

  return signature;
}

/**
 * Verify a signed message
 */
export function verifySignature(
  message: string,
  signature: string,
  expectedAddress: string
): boolean {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch {
    return false;
  }
}

/**
 * Get the current network chain ID
 */
export async function getChainId(): Promise<number> {
  if (!isWalletInstalled()) {
    throw new Error("No Ethereum wallet found");
  }

  const provider = new ethers.BrowserProvider(window.ethereum!);
  const network = await provider.getNetwork();
  return Number(network.chainId);
}

/**
 * Switch to a specific network
 */
export async function switchNetwork(chainId: number): Promise<void> {
  if (!isWalletInstalled()) {
    throw new Error("No Ethereum wallet found");
  }

  const chainIdHex = `0x${chainId.toString(16)}`;

  try {
    await window.ethereum!.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
  } catch (error: unknown) {
    // This error code indicates that the chain has not been added to MetaMask
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 4902) {
      throw new Error("Please add this network to MetaMask");
    }
    throw error;
  }
}

/**
 * Format address for display (0x1234...5678)
 */
export function formatAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Listen for account changes
 */
export function onAccountsChanged(callback: (accounts: string[]) => void): void {
  if (!isWalletInstalled()) return;

  window.ethereum!.on?.("accountsChanged" as never, callback as never);
}

/**
 * Listen for network changes
 */
export function onChainChanged(callback: (chainId: string) => void): void {
  if (!isWalletInstalled()) return;

  window.ethereum!.on?.("chainChanged" as never, callback as never);
}
