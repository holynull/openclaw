import { Type } from "@sinclair/typebox";
import { ethers } from "ethers";
import { getSoftHSMClient } from "./softhsm-client.js";

// Infura network mapping by chainId
const INFURA_NETWORKS: Record<number, string> = {
  1: "mainnet",                    // Ethereum Mainnet
  11155111: "sepolia",             // Sepolia Testnet
  137: "polygon-mainnet",          // Polygon Mainnet
  80002: "polygon-amoy",           // Polygon Amoy Testnet
  42161: "arbitrum-mainnet",       // Arbitrum One
  421614: "arbitrum-sepolia",      // Arbitrum Sepolia
  10: "optimism-mainnet",          // Optimism
  11155420: "optimism-sepolia",    // Optimism Sepolia
  8453: "base-mainnet",            // Base
  84532: "base-sepolia",           // Base Sepolia
  59144: "linea-mainnet",          // Linea
  59141: "linea-sepolia",          // Linea Sepolia
  43114: "avalanche-mainnet",      // Avalanche C-Chain
  43113: "avalanche-fuji",         // Avalanche Fuji Testnet
};

// Fallback public RPC endpoints
const PUBLIC_RPC_ENDPOINTS: Record<number, string> = {
  1: "https://eth.llamarpc.com",
  11155111: "https://rpc.sepolia.org",
  137: "https://polygon-rpc.com",
  42161: "https://arb1.arbitrum.io/rpc",
  10: "https://mainnet.optimism.io",
  8453: "https://mainnet.base.org",
  56: "https://bsc-dataseed.binance.org",
};

// Helper function to get JSON-RPC provider
// chainId is REQUIRED - no default value to force explicit chain specification
function getProvider(chainId: number, rpcUrl?: string): ethers.JsonRpcProvider {
  // Configure static network to avoid automatic network detection
  const staticNetwork = ethers.Network.from(chainId);
  
  // If custom RPC URL provided, use it directly
  if (rpcUrl) {
    console.log(`Using custom RPC for chainId ${chainId}: ${rpcUrl}`);
    return new ethers.JsonRpcProvider(rpcUrl, staticNetwork, {
      staticNetwork: staticNetwork,
      batchMaxCount: 1, // Disable batching for better compatibility
    });
  }

  // Try to use Infura if API key is available
  const infuraKey = process.env.INFURA_KEY;
  if (infuraKey && INFURA_NETWORKS[chainId]) {
    const network = INFURA_NETWORKS[chainId];
    const infuraUrl = `https://${network}.infura.io/v3/${infuraKey}`;
    console.log(`Using Infura for chainId ${chainId}: ${infuraUrl.replace(infuraKey, '***')}`);
    return new ethers.JsonRpcProvider(infuraUrl, staticNetwork, {
      staticNetwork: staticNetwork,
      batchMaxCount: 1,
    });
  }

  // Fallback to public RPC endpoints
  const fallbackUrl = PUBLIC_RPC_ENDPOINTS[chainId];
  if (!fallbackUrl) {
    throw new Error(`No RPC endpoint configured for chainId ${chainId}. Please provide rpcUrl parameter or configure INFURA_KEY.`);
  }
  console.log(`Using public RPC for chainId ${chainId}: ${fallbackUrl}`);
  return new ethers.JsonRpcProvider(fallbackUrl, staticNetwork, {
    staticNetwork: staticNetwork,
    batchMaxCount: 1,
  });
}

// ERC20 ABI for balance and transfer
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function transfer(address to, uint256 amount) returns (bool)",
];

export default function (api: any) {
  // ==================== Ethereum Tools ====================
  
  // Ethereum: Generate Address
  api.registerTool({
    name: "eth_get_address",
    description: "Get Ethereum address from SoftHSM using BIP44 derivation path. Supports multiple addresses by changing the account index.",
    parameters: Type.Object({
      accountIndex: Type.Optional(Type.Number({ 
        description: "Account index (0-based). Default: 0. Derives address at path m/44'/60'/0'/0/{accountIndex}" 
      })),
    }),
    async execute(_id: any, params: any) {
      try {
        const accountIndex = params.accountIndex ?? 0;
        const client = getSoftHSMClient();
        const address = await client.getEthereumAddress(accountIndex);
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                chain: "ethereum",
                address,
                accountIndex,
              }, null, 2),
            },
          ],
        };
      } catch (error: any) {
				console.error("Error in eth_get_address:", error);
        return {
          content: [{ type: "text", text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    },
  }, { optional: true });

  // Ethereum: Get ETH Balance
  api.registerTool({
    name: "eth_get_balance",
    description: "Get ETH balance for an address. Returns balance in both wei and ether. chainId is REQUIRED.",
    parameters: Type.Object({
      address: Type.Optional(Type.String({ description: "Ethereum address. If not provided, uses default (account 0) address." })),
      chainId: Type.Number({ description: "Chain ID (REQUIRED): 1=Ethereum, 137=Polygon, 42161=Arbitrum, 10=Optimism, 8453=Base, 56=BSC, etc." }),
      rpcUrl: Type.Optional(Type.String({ description: "Custom RPC endpoint URL. If not provided, uses Infura (if INFURA_KEY set) or public RPC." })),
    }),
    async execute(_id: any, params: any) {
      try {
        let address = params.address;
        
        // If no address provided, get from SoftHSM
        if (!address) {
          const client = getSoftHSMClient();
          address = await client.getEthereumAddress(0);
        }
        
        const provider = getProvider(params.chainId, params.rpcUrl);
        const balanceWei = await provider.getBalance(address);
        const balanceEth = ethers.formatEther(balanceWei);
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                address,
                balance: {
                  wei: balanceWei.toString(),
                  ether: balanceEth,
                },
              }, null, 2),
            },
          ],
        };
      } catch (error: any) {
				console.error("Error in eth_get_balance:", error);
        return {
          content: [{ type: "text", text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    },
  }, { optional: true });

  // Ethereum: Get ERC20 Token Balance
  api.registerTool({
    name: "eth_get_token_balance",
    description: "Get ERC20 token balance for an address. Returns balance with token decimals and symbol. chainId is REQUIRED.",
    parameters: Type.Object({
      tokenAddress: Type.String({ description: "ERC20 token contract address (REQUIRED)" }),
      address: Type.Optional(Type.String({ description: "Holder address. If not provided, uses default (account 0) address." })),
      chainId: Type.Number({ description: "Chain ID (REQUIRED): 1=Ethereum, 137=Polygon, 42161=Arbitrum, 10=Optimism, 8453=Base, 56=BSC, etc." }),
      rpcUrl: Type.Optional(Type.String({ description: "Custom RPC endpoint URL. If not provided, uses Infura (if INFURA_KEY set) or public RPC." })),
    }),
    async execute(_id: any, params: any) {
      try {
        let address = params.address;
        
        // If no address provided, get from SoftHSM
        if (!address) {
          const client = getSoftHSMClient();
          address = await client.getEthereumAddress(0);
        }
        
        const provider = getProvider(params.chainId, params.rpcUrl);
        const tokenContract = new ethers.Contract(params.tokenAddress, ERC20_ABI, provider);
        
        const [balance, decimals, symbol] = await Promise.all([
          tokenContract.balanceOf(address),
          tokenContract.decimals(),
          tokenContract.symbol(),
        ]);
        
        const formattedBalance = ethers.formatUnits(balance, decimals);
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                address,
                token: {
                  address: params.tokenAddress,
                  symbol,
                  decimals: Number(decimals),
                },
                balance: {
                  raw: balance.toString(),
                  formatted: formattedBalance,
                },
              }, null, 2),
            },
          ],
        };
      } catch (error: any) {
				console.error("Error in eth_get_token_balance:", error);
        return {
          content: [{ type: "text", text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    },
  }, { optional: true });

  // Ethereum: Estimate Gas Fees
  api.registerTool({
    name: "eth_estimate_gas",
    description: "Estimate gas fees for ETH or ERC20 token transfers. Returns low/medium/high fee options with estimated costs. chainId is REQUIRED. Useful for showing users fee options before transfer.",
    parameters: Type.Object({
      chainId: Type.Number({ description: "Chain ID (REQUIRED): 1=Ethereum, 137=Polygon, 42161=Arbitrum, 10=Optimism, 8453=Base, 56=BSC, etc." }),
      to: Type.String({ description: "Recipient address (REQUIRED)" }),
      amount: Type.Optional(Type.String({ description: "Amount to transfer (e.g., '0.1' for 0.1 ETH or token). Used for more accurate gas estimation." })),
      tokenAddress: Type.Optional(Type.String({ description: "ERC20 token contract address. If provided, estimates token transfer gas; otherwise estimates ETH transfer gas." })),
      from: Type.Optional(Type.String({ description: "Sender address. If not provided, uses default (account 0) address." })),
      accountIndex: Type.Optional(Type.Number({ description: "Account index if from address not specified. Default: 0" })),
      rpcUrl: Type.Optional(Type.String({ description: "Custom RPC endpoint URL." })),
    }),
    async execute(_id: any, params: any) {
      try {
        // Determine from address
        let fromAddress = params.from;
        if (!fromAddress) {
          const accountIndex = params.accountIndex ?? 0;
          const client = getSoftHSMClient();
          fromAddress = await client.getEthereumAddress(accountIndex);
        }

        const provider = getProvider(params.chainId, params.rpcUrl);
        const network = await provider.getNetwork();
        const chainId = Number(network.chainId);
        
        // Get chain name
        const chainNames: Record<number, string> = {
          1: "Ethereum",
          137: "Polygon",
          42161: "Arbitrum",
          10: "Optimism",
          8453: "Base",
          56: "BSC",
          11155111: "Sepolia",
        };
        const chainName = chainNames[chainId] || `Chain ${chainId}`;
        
        // Get native currency symbol
        const nativeCurrencySymbols: Record<number, string> = {
          1: "ETH",
          137: "MATIC",
          42161: "ETH",
          10: "ETH",
          8453: "ETH",
          56: "BNB",
          11155111: "ETH",
        };
        const nativeSymbol = nativeCurrencySymbols[chainId] || "ETH";
        
        // Estimate gas limit
        let estimatedGasLimit: bigint;
        let tokenSymbol: string | undefined;
        let tokenDecimals: number | undefined;
        
        if (params.tokenAddress) {
          // Estimate ERC20 token transfer gas
          const tokenContract = new ethers.Contract(params.tokenAddress, ERC20_ABI, provider);
          tokenSymbol = await tokenContract.symbol();
          tokenDecimals = Number(await tokenContract.decimals());
          
          const amountWei = params.amount 
            ? ethers.parseUnits(params.amount, tokenDecimals)
            : ethers.parseUnits("1", tokenDecimals);
          
          // Encode transfer function data
          const data = tokenContract.interface.encodeFunctionData("transfer", [params.to, amountWei]);
          
          // Estimate gas using provider.estimateGas with from address
          estimatedGasLimit = await provider.estimateGas({
            from: fromAddress,
            to: params.tokenAddress,
            data: data,
          });
        } else {
          // Estimate ETH transfer gas
          const valueWei = params.amount ? ethers.parseEther(params.amount) : ethers.parseEther("0.01");
          estimatedGasLimit = await provider.estimateGas({
            from: fromAddress,
            to: params.to,
            value: valueWei,
          });
        }
        
        // Get current fee data
        const feeData = await provider.getFeeData();
        
        // Gas preset multipliers
        const gasPresets = {
          low: { multiplier: 0.8, speed: "~5-10 minutes", description: "Slower, cheaper" },
          medium: { multiplier: 1.0, speed: "~1-3 minutes", description: "Standard" },
          high: { multiplier: 1.3, speed: "~30-60 seconds", description: "Faster, more expensive" },
        };
        
        const result: any = {
          chainId,
          chainName,
          nativeCurrency: nativeSymbol,
          from: fromAddress,
          to: params.to,
          estimatedGasLimit: estimatedGasLimit.toString(),
          feeOptions: {},
        };
        
        if (params.tokenAddress) {
          result.transferType = "ERC20 Token";
          result.tokenAddress = params.tokenAddress;
          result.tokenSymbol = tokenSymbol;
        } else {
          result.transferType = "Native Currency";
        }
        
        if (params.amount) {
          result.amount = params.amount;
        }
        
        // Calculate fees for each preset
        for (const [preset, config] of Object.entries(gasPresets)) {
          const multiplier = config.multiplier;
          
          let maxFeePerGas: bigint;
          let maxPriorityFeePerGas: bigint;
          let gasPrice: bigint;
          let estimatedCostWei: bigint;
          
          if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
            // EIP-1559 pricing
            maxFeePerGas = BigInt(Math.floor(Number(feeData.maxFeePerGas) * multiplier));
            maxPriorityFeePerGas = BigInt(Math.floor(Number(feeData.maxPriorityFeePerGas) * multiplier));
            estimatedCostWei = estimatedGasLimit * maxFeePerGas;
            
            result.feeOptions[preset] = {
              description: config.description,
              estimatedSpeed: config.speed,
              maxFeePerGas: ethers.formatUnits(maxFeePerGas, 'gwei') + " Gwei",
              maxPriorityFeePerGas: ethers.formatUnits(maxPriorityFeePerGas, 'gwei') + " Gwei",
              estimatedGasLimit: estimatedGasLimit.toString(),
              estimatedCost: ethers.formatEther(estimatedCostWei) + ` ${nativeSymbol}`,
              estimatedCostWei: estimatedCostWei.toString(),
              transactionType: "EIP-1559",
            };
          } else if (feeData.gasPrice) {
            // Legacy pricing
            gasPrice = BigInt(Math.floor(Number(feeData.gasPrice) * multiplier));
            estimatedCostWei = estimatedGasLimit * gasPrice;
            
            result.feeOptions[preset] = {
              description: config.description,
              estimatedSpeed: config.speed,
              gasPrice: ethers.formatUnits(gasPrice, 'gwei') + " Gwei",
              estimatedGasLimit: estimatedGasLimit.toString(),
              estimatedCost: ethers.formatEther(estimatedCostWei) + ` ${nativeSymbol}`,
              estimatedCostWei: estimatedCostWei.toString(),
              transactionType: "Legacy",
            };
          }
        }
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: any) {
        console.error("Error in eth_estimate_gas:", error);
        return {
          content: [{ type: "text", text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    },
  }, { optional: true });

  // Ethereum: Transfer ETH
  api.registerTool({
    name: "eth_transfer",
    description: "Transfer ETH to another address. Supports both legacy and EIP-1559 transactions. chainId is REQUIRED. Transaction is automatically broadcast to network and signed by SoftHSM.",
    parameters: Type.Object({
      to: Type.String({ description: "Recipient address (REQUIRED)" }),
      amount: Type.String({ description: "Amount in ether (REQUIRED, e.g., '0.1' for 0.1 ETH)" }),
      chainId: Type.Number({ description: "Chain ID (REQUIRED): 1=Ethereum, 137=Polygon, 42161=Arbitrum, 10=Optimism, 8453=Base, 56=BSC, etc." }),
      gasPreset: Type.Optional(Type.Union([Type.Literal('low'), Type.Literal('medium'), Type.Literal('high')], { description: "Gas price preset: 'low' (slower, cheaper), 'medium' (standard), 'high' (faster, more expensive). Default: 'medium'" })),
      accountIndex: Type.Optional(Type.Number({ description: "Account index (0-based). Default: 0" })),
      gasLimit: Type.Optional(Type.String({ description: "Gas limit. If not provided, uses 21000 for ETH transfers" })),
      maxFeePerGas: Type.Optional(Type.String({ description: "Max fee per gas in gwei for EIP-1559. Overrides gasPreset if provided." })),
      maxPriorityFeePerGas: Type.Optional(Type.String({ description: "Max priority fee per gas in gwei for EIP-1559. Overrides gasPreset if provided." })),
      gasPrice: Type.Optional(Type.String({ description: "Gas price in gwei for legacy transactions. Overrides gasPreset if provided." })),
      nonce: Type.Optional(Type.Number({ description: "Transaction nonce. Auto-fetched if not provided." })),
    }),
    async execute(_id: any, params: any) {
      try {
        const accountIndex = params.accountIndex ?? 0;
        const client = getSoftHSMClient();
        const fromAddress = await client.getEthereumAddress(accountIndex);
        
        const provider = getProvider(params.chainId);
        const networkChainId = (await provider.getNetwork()).chainId;
        
        // Get nonce if not provided
        let nonce = params.nonce;
        if (nonce === undefined) {
          nonce = await provider.getTransactionCount(fromAddress, 'pending');
        }
        
        // Convert amount to wei
        const valueWei = ethers.parseEther(params.amount);
        
        // Gas preset multipliers (relative to current network fee)
        const gasPresetMultipliers = {
          low: 0.8,    // 20% less than current
          medium: 1.0, // Current network rate
          high: 1.3,   // 30% more than current
        };
        const gasPreset = params.gasPreset || 'medium';
        const multiplier = gasPresetMultipliers[gasPreset as keyof typeof gasPresetMultipliers];
        
        let signParams: any = {
          chainId: Number(networkChainId),
          to: params.to,
          value: valueWei.toString(),
          nonce,
          gasLimit: params.gasLimit || "21000",
          accountIndex,
        };
        
        let txType: number;
        
        // Determine transaction type (EIP-1559 or legacy)
        if (params.maxFeePerGas || params.maxPriorityFeePerGas) {
          // EIP-1559 transaction
          txType = 2;
          
          let maxFeePerGas = params.maxFeePerGas;
          let maxPriorityFeePerGas = params.maxPriorityFeePerGas;
          
          // Auto-fetch gas prices if not provided
          if (!maxFeePerGas || !maxPriorityFeePerGas) {
            const feeData = await provider.getFeeData();
            if (!maxFeePerGas) {
              const baseFee = feeData.maxFeePerGas || 0n;
              maxFeePerGas = ethers.formatUnits(BigInt(Math.floor(Number(baseFee) * multiplier)), 'gwei');
            }
            if (!maxPriorityFeePerGas) {
              const basePriority = feeData.maxPriorityFeePerGas || 0n;
              maxPriorityFeePerGas = ethers.formatUnits(BigInt(Math.floor(Number(basePriority) * multiplier)), 'gwei');
            }
          }
          
          signParams.maxFeePerGas = ethers.parseUnits(maxFeePerGas, 'gwei').toString();
          signParams.maxPriorityFeePerGas = ethers.parseUnits(maxPriorityFeePerGas, 'gwei').toString();
        } else {
          // Legacy transaction
          txType = 0;
          
          let gasPrice = params.gasPrice;
          if (!gasPrice) {
            const feeData = await provider.getFeeData();
            gasPrice = ethers.formatUnits(feeData.gasPrice || 0n, 'gwei');
          }
          
          signParams.gasPrice = ethers.parseUnits(gasPrice, 'gwei').toString();
        }
        
        // Sign transaction using SoftHSM
        const result = await client.signEthereumTransaction(signParams);
        
        // Broadcast transaction
        const tx = await provider.broadcastTransaction(result.signedTransaction);
        const txHash = tx.hash;
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                from: fromAddress,
                to: params.to,
                amount: params.amount,
                transactionHash: txHash,
                gasPreset: gasPreset,
                txType: txType === 2 ? 'EIP-1559' : 'Legacy',
                chainId: params.chainId,
                signatureId: result.signatureId,
              }, null, 2),
            },
          ],
        };
      } catch (error: any) {
        console.error("Error in eth_transfer:", error);
        return {
          content: [{ type: "text", text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    },
  }, { optional: true });

  // Ethereum: Transfer ERC20 Token
  api.registerTool({
    name: "eth_transfer_token",
    description: "Transfer ERC20 tokens to another address. Supports both legacy and EIP-1559 transactions. chainId is REQUIRED. Transaction is automatically broadcast to network.",
    parameters: Type.Object({
      tokenAddress: Type.String({ description: "ERC20 token contract address (REQUIRED)" }),
      to: Type.String({ description: "Recipient address (REQUIRED)" }),
      amount: Type.String({ description: "Amount in token units (REQUIRED, e.g., '100' for 100 tokens)" }),
      chainId: Type.Number({ description: "Chain ID (REQUIRED): 1=Ethereum, 137=Polygon, 42161=Arbitrum, 10=Optimism, 8453=Base, 56=BSC, etc." }),
      gasPreset: Type.Optional(Type.Union([Type.Literal('low'), Type.Literal('medium'), Type.Literal('high')], { description: "Gas price preset: 'low' (slower, cheaper), 'medium' (standard), 'high' (faster, more expensive). Default: 'medium'" })),
      accountIndex: Type.Optional(Type.Number({ description: "Account index (0-based). Default: 0" })),
      gasLimit: Type.Optional(Type.String({ description: "Gas limit. Default: auto-estimated" })),
      maxFeePerGas: Type.Optional(Type.String({ description: "Max fee per gas in gwei for EIP-1559. Overrides gasPreset if provided." })),
      maxPriorityFeePerGas: Type.Optional(Type.String({ description: "Max priority fee per gas in gwei for EIP-1559. Overrides gasPreset if provided." })),
      gasPrice: Type.Optional(Type.String({ description: "Gas price in gwei for legacy transactions. Overrides gasPreset if provided." })),
      nonce: Type.Optional(Type.Number({ description: "Transaction nonce. Auto-fetched if not provided." })),
    }),
    async execute(_id: any, params: any) {
      try {
        const accountIndex = params.accountIndex ?? 0;
        const client = getSoftHSMClient();
        const fromAddress = await client.getEthereumAddress(accountIndex);
        
        const provider = getProvider(params.chainId);
        const networkChainId = (await provider.getNetwork()).chainId;
        
        // Get token info
        const tokenContract = new ethers.Contract(params.tokenAddress, ERC20_ABI, provider);
        const decimals = await tokenContract.decimals();
        const symbol = await tokenContract.symbol();
        
        // Get nonce if not provided
        let nonce = params.nonce;
        if (nonce === undefined) {
          nonce = await provider.getTransactionCount(fromAddress, 'pending');
        }
        
        // Convert amount to token base units
        const amountWei = ethers.parseUnits(params.amount, decimals);
        
        // Encode ERC20 transfer function call
        const transferData = tokenContract.interface.encodeFunctionData("transfer", [params.to, amountWei]);
        
        // Estimate gas limit if not provided
        let gasLimit = params.gasLimit;
        if (!gasLimit) {
          try {
            const estimatedGas = await provider.estimateGas({
              from: fromAddress,
              to: params.tokenAddress,
              data: transferData,
            });
            gasLimit = (estimatedGas * 120n / 100n).toString(); // Add 20% buffer
          } catch (e) {
            console.error("Error estimating gas:", e);
            gasLimit = "100000"; // Default fallback
          }
        }
        
        // Gas preset multipliers (relative to current network fee)
        const gasPresetMultipliers = {
          low: 0.8,    // 20% less than current
          medium: 1.0, // Current network rate
          high: 1.3,   // 30% more than current
        };
        const gasPreset = params.gasPreset || 'medium';
        const multiplier = gasPresetMultipliers[gasPreset as keyof typeof gasPresetMultipliers];
        
        let signParams: any = {
          chainId: Number(networkChainId),
          to: params.tokenAddress,  // Contract address for ERC20
          value: "0",  // No ETH transfer for ERC20
          nonce,
          gasLimit,
          data: transferData,  // ERC20 transfer function call
          accountIndex,
        };
        
        let txType: number;
        
        // Determine transaction type (EIP-1559 or legacy)
        if (params.maxFeePerGas || params.maxPriorityFeePerGas) {
          // EIP-1559 transaction
          txType = 2;
          
          let maxFeePerGas = params.maxFeePerGas;
          let maxPriorityFeePerGas = params.maxPriorityFeePerGas;
          
          if (!maxFeePerGas || !maxPriorityFeePerGas) {
            const feeData = await provider.getFeeData();
            if (!maxFeePerGas) {
              const baseFee = feeData.maxFeePerGas || 0n;
              maxFeePerGas = ethers.formatUnits(BigInt(Math.floor(Number(baseFee) * multiplier)), 'gwei');
            }
            if (!maxPriorityFeePerGas) {
              const basePriority = feeData.maxPriorityFeePerGas || 0n;
              maxPriorityFeePerGas = ethers.formatUnits(BigInt(Math.floor(Number(basePriority) * multiplier)), 'gwei');
            }
          }
          
          signParams.maxFeePerGas = ethers.parseUnits(maxFeePerGas, 'gwei').toString();
          signParams.maxPriorityFeePerGas = ethers.parseUnits(maxPriorityFeePerGas, 'gwei').toString();
        } else {
          // Legacy transaction
          txType = 0;
          
          let gasPrice = params.gasPrice;
          if (!gasPrice) {
            const feeData = await provider.getFeeData();
            const basePrice = feeData.gasPrice || 0n;
            gasPrice = ethers.formatUnits(BigInt(Math.floor(Number(basePrice) * multiplier)), 'gwei');
          }
          
          signParams.gasPrice = ethers.parseUnits(gasPrice, 'gwei').toString();
        }
        
        // Sign transaction using SoftHSM
        const result = await client.signEthereumTransaction(signParams);
        
        // Broadcast transaction
        const tx = await provider.broadcastTransaction(result.signedTransaction);
        const txHash = tx.hash;
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                from: fromAddress,
                to: params.to,
                token: {
                  address: params.tokenAddress,
                  symbol,
                  decimals: Number(decimals),
                },
                amount: params.amount,
                transactionHash: txHash,
                gasPreset: gasPreset,
                txType: txType === 2 ? 'EIP-1559' : 'Legacy',
                chainId: params.chainId,
                signatureId: result.signatureId,
              }, null, 2),
            },
          ],
        };
      } catch (error: any) {
        console.error("Error in eth_transfer_token:", error);
        return {
          content: [{ type: "text", text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    },
  }, { optional: true });

  // Ethereum: Sign Message
  api.registerTool({
    name: "eth_sign_message",
    description: "Sign a message using Ethereum personal sign (EIP-191). NOTE: This feature requires SoftHSM service to implement message signing API, which is currently not available.",
    parameters: Type.Object({
      message: Type.String({ description: "Message to sign" }),
      accountIndex: Type.Optional(Type.Number({ description: "Account index (0-based). Default: 0" })),
    }),
    async execute(_id: any, params: any) {
      try {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Message signing is not yet implemented in SoftHSM service. Please contact administrator to add this feature.",
                message: params.message,
                accountIndex: params.accountIndex ?? 0,
              }, null, 2),
            },
          ],
          isError: true,
        };
      } catch (error: any) {
        console.error("Error in eth_sign_message:", error);
        return {
          content: [{ type: "text", text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    },
  }, { optional: true });

  // Ethereum: Get Transaction
  api.registerTool({
    name: "eth_get_transaction",
    description: "Get transaction details by transaction hash. Returns transaction data and optionally receipt. chainId is REQUIRED.",
    parameters: Type.Object({
      transactionHash: Type.String({ description: "Transaction hash (REQUIRED, e.g., '0x...')" }),
      chainId: Type.Number({ description: "Chain ID (REQUIRED): 1=Ethereum, 137=Polygon, 42161=Arbitrum, 10=Optimism, 8453=Base, 56=BSC, etc." }),
      includeReceipt: Type.Optional(Type.Boolean({ description: "Whether to include transaction receipt with logs and status. Default: true" })),
    }),
    async execute(_id: any, params: any) {
      try {
        const provider = getProvider(params.chainId);
        const includeReceipt = params.includeReceipt !== false; // Default to true
        
        // Get transaction data
        const transaction = await provider.getTransaction(params.transactionHash);
        
        if (!transaction) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                error: "Transaction not found",
                transactionHash: params.transactionHash,
                chainId: params.chainId,
              }, null, 2),
            }],
            isError: true,
          };
        }

        // Format transaction data
        const txData: any = {
          chainId: params.chainId,
          transactionHash: transaction.hash,
          from: transaction.from,
          to: transaction.to,
          value: transaction.value ? ethers.formatEther(transaction.value) + " ETH" : "0 ETH",
          valueWei: transaction.value ? transaction.value.toString() : "0",
          nonce: transaction.nonce,
          gasLimit: transaction.gasLimit ? transaction.gasLimit.toString() : null,
          data: transaction.data,
          blockNumber: transaction.blockNumber,
          blockHash: transaction.blockHash,
          type: transaction.type, // 0=Legacy, 1=EIP-2930, 2=EIP-1559
        };

        // Add gas price info based on transaction type
        if (transaction.type === 2) {
          // EIP-1559
          txData.transactionType = "EIP-1559";
          txData.maxFeePerGas = transaction.maxFeePerGas ? ethers.formatUnits(transaction.maxFeePerGas, "gwei") + " Gwei" : null;
          txData.maxPriorityFeePerGas = transaction.maxPriorityFeePerGas ? ethers.formatUnits(transaction.maxPriorityFeePerGas, "gwei") + " Gwei" : null;
        } else {
          // Legacy or EIP-2930
          txData.transactionType = transaction.type === 1 ? "EIP-2930" : "Legacy";
          txData.gasPrice = transaction.gasPrice ? ethers.formatUnits(transaction.gasPrice, "gwei") + " Gwei" : null;
        }

        // Get transaction receipt if requested
        if (includeReceipt && transaction.blockNumber) {
          const receipt = await provider.getTransactionReceipt(params.transactionHash);
          
          if (receipt) {
            txData.receipt = {
              status: receipt.status === 1 ? "success" : "failed",
              gasUsed: receipt.gasUsed.toString(),
              cumulativeGasUsed: receipt.cumulativeGasUsed.toString(),
              effectiveGasPrice: receipt.gasPrice ? ethers.formatUnits(receipt.gasPrice, "gwei") + " Gwei" : null,
              contractAddress: receipt.contractAddress,
              logsCount: receipt.logs.length,
              logs: receipt.logs.map((log: any) => ({
                address: log.address,
                topics: log.topics,
                data: log.data,
                blockNumber: log.blockNumber,
                transactionHash: log.transactionHash,
                transactionIndex: log.transactionIndex,
                logIndex: log.index,
              })),
            };

            // Calculate transaction fee
            const gasUsed = receipt.gasUsed;
            const effectiveGasPrice = receipt.gasPrice || BigInt(0);
            const txFee = gasUsed * effectiveGasPrice;
            txData.receipt.transactionFee = ethers.formatEther(txFee) + " ETH";
            txData.receipt.transactionFeeWei = txFee.toString();
          }
        }

        // Get current confirmations
        const currentBlock = await provider.getBlockNumber();
        if (transaction.blockNumber) {
          txData.confirmations = currentBlock - transaction.blockNumber + 1;
        } else {
          txData.confirmations = 0;
          txData.status = "pending";
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify(txData, null, 2),
          }],
        };
      } catch (error: any) {
        console.error("Error in eth_get_transaction:", error);
        return {
          content: [{ type: "text", text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    },
  }, { optional: true });

  // ==================== Bitcoin Tools ====================
  
  // Bitcoin: Generate Address (NOT SUPPORTED with SoftHSM)
  api.registerTool({
    name: "btc_get_address",
    description: "Bitcoin address generation is not supported when using SoftHSM. SoftHSM currently only supports Ethereum.",
    parameters: Type.Object({
      accountIndex: Type.Optional(Type.Number({ description: "Account index (0-based). Default: 0" })),
      addressType: Type.Optional(
        Type.String({
          description: "Address type: legacy, segwit, or native_segwit (default: native_segwit)",
        })
      ),
    }),
    async execute(_id: any, params: any) {
      try {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Bitcoin is not supported when using SoftHSM service. Only Ethereum is currently supported.",
                chain: "bitcoin",
                accountIndex: params.accountIndex ?? 0,
              }, null, 2),
            },
          ],
          isError: true,
        };
      } catch (error: any) {
        console.error("Error in btc_get_address:", error);
        return {
          content: [{ type: "text", text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    },
  }, { optional: true });

  // ==================== Solana Tools ====================
  
  // Solana: Generate Address (NOT SUPPORTED with SoftHSM)
  api.registerTool({
    name: "sol_get_address",
    description: "Solana address generation is not supported when using SoftHSM. SoftHSM currently only supports Ethereum.",
    parameters: Type.Object({
      accountIndex: Type.Optional(Type.Number({ description: "Account index (0-based). Default: 0. Derives address at path m/44'/501'/{accountIndex}'/0'" })),
    }),
    async execute(_id: any, params: any) {
      try {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Solana is not supported when using SoftHSM service. Only Ethereum is currently supported.",
                chain: "solana",
                accountIndex: params.accountIndex ?? 0,
              }, null, 2),
            },
          ],
          isError: true,
        };
      } catch (error: any) {
        console.error("Error in sol_get_address:", error);
        return {
          content: [{ type: "text", text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    },
  }, { optional: true });
}
