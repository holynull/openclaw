import { Type } from "@sinclair/typebox";
import { ethers } from "ethers";

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
  "function name() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
];

// Extended ERC20 ABI for logs
const ERC20_TRANSFER_EVENT_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 value)",
];

export default function (api: any) {
  // ==================== Ethereum Tools ====================
  
  // Ethereum: Get ETH Balance
  api.registerTool({
    name: "eth_get_balance",
    description: "Get ETH balance for an address. Returns balance in both wei and ether. chainId is REQUIRED.",
    parameters: Type.Object({
      address: Type.String({ description: "Ethereum address (REQUIRED)" }),
      chainId: Type.Number({ description: "Chain ID (REQUIRED): 1=Ethereum, 137=Polygon, 42161=Arbitrum, 10=Optimism, 8453=Base, 56=BSC, etc." }),
      rpcUrl: Type.Optional(Type.String({ description: "Custom RPC endpoint URL. If not provided, uses Infura (if INFURA_KEY set) or public RPC." })),
    }),
    async execute(_id: any, params: any) {
      try {
        const address = params.address;
        
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
      address: Type.String({ description: "Holder address (REQUIRED)" }),
      chainId: Type.Number({ description: "Chain ID (REQUIRED): 1=Ethereum, 137=Polygon, 42161=Arbitrum, 10=Optimism, 8453=Base, 56=BSC, etc." }),
      rpcUrl: Type.Optional(Type.String({ description: "Custom RPC endpoint URL. If not provided, uses Infura (if INFURA_KEY set) or public RPC." })),
    }),
    async execute(_id: any, params: any) {
      try {
        const address = params.address;
        
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
      from: Type.String({ description: "Sender address (REQUIRED)" }),
      amount: Type.Optional(Type.String({ description: "Amount to transfer (e.g., '0.1' for 0.1 ETH or token). Used for more accurate gas estimation." })),
      tokenAddress: Type.Optional(Type.String({ description: "ERC20 token contract address. If provided, estimates token transfer gas; otherwise estimates ETH transfer gas." })),
      rpcUrl: Type.Optional(Type.String({ description: "Custom RPC endpoint URL." })),
    }),
    async execute(_id: any, params: any) {
      try {
        const fromAddress = params.from;

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

  // Ethereum: Get Token Info
  api.registerTool({
    name: "eth_get_token_info",
    description: "Get detailed ERC20 token information including name, symbol, decimals, and total supply. chainId is REQUIRED.",
    parameters: Type.Object({
      tokenAddress: Type.String({ description: "ERC20 token contract address (REQUIRED)" }),
      chainId: Type.Number({ description: "Chain ID (REQUIRED): 1=Ethereum, 137=Polygon, 42161=Arbitrum, 10=Optimism, 8453=Base, 56=BSC, etc." }),
      rpcUrl: Type.Optional(Type.String({ description: "Custom RPC endpoint URL." })),
    }),
    async execute(_id: any, params: any) {
      try {
        const provider = getProvider(params.chainId, params.rpcUrl);
        const tokenContract = new ethers.Contract(params.tokenAddress, ERC20_ABI, provider);
        
        const [name, symbol, decimals, totalSupply] = await Promise.all([
          tokenContract.name().catch(() => "Unknown"),
          tokenContract.symbol().catch(() => "UNKNOWN"),
          tokenContract.decimals().catch(() => 18),
          tokenContract.totalSupply().catch(() => BigInt(0)),
        ]);
        
        const formattedTotalSupply = ethers.formatUnits(totalSupply, decimals);
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              chainId: params.chainId,
              address: params.tokenAddress,
              name,
              symbol,
              decimals: Number(decimals),
              totalSupply: {
                raw: totalSupply.toString(),
                formatted: formattedTotalSupply,
              },
            }, null, 2),
          }],
        };
      } catch (error: any) {
        console.error("Error in eth_get_token_info:", error);
        return {
          content: [{ type: "text", text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    },
  }, { optional: true });

  // Ethereum: Get Nonce
  api.registerTool({
    name: "eth_get_nonce",
    description: "Get transaction count (nonce) for an address. Useful for understanding pending transactions. chainId is REQUIRED.",
    parameters: Type.Object({
      address: Type.String({ description: "Ethereum address (REQUIRED)" }),
      chainId: Type.Number({ description: "Chain ID (REQUIRED): 1=Ethereum, 137=Polygon, 42161=Arbitrum, 10=Optimism, 8453=Base, 56=BSC, etc." }),
      pending: Type.Optional(Type.Boolean({ description: "Whether to include pending transactions. Default: false" })),
      rpcUrl: Type.Optional(Type.String({ description: "Custom RPC endpoint URL." })),
    }),
    async execute(_id: any, params: any) {
      try {
        const provider = getProvider(params.chainId, params.rpcUrl);
        const blockTag = params.pending ? "pending" : "latest";
        const nonce = await provider.getTransactionCount(params.address, blockTag);
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              chainId: params.chainId,
              address: params.address,
              nonce,
              blockTag,
            }, null, 2),
          }],
        };
      } catch (error: any) {
        console.error("Error in eth_get_nonce:", error);
        return {
          content: [{ type: "text", text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    },
  }, { optional: true });

  // Ethereum: Call Contract Method
  api.registerTool({
    name: "eth_call",
    description: "Call a read-only contract method without sending a transaction. chainId is REQUIRED.",
    parameters: Type.Object({
      contractAddress: Type.String({ description: "Contract address (REQUIRED)" }),
      abi: Type.String({ description: "Contract ABI as JSON string (REQUIRED, must include the method definition)" }),
      method: Type.String({ description: "Method name to call (REQUIRED)" }),
      params: Type.Optional(Type.Array(Type.Any(), { description: "Array of method parameters. Default: []" })),
      chainId: Type.Number({ description: "Chain ID (REQUIRED): 1=Ethereum, 137=Polygon, 42161=Arbitrum, 10=Optimism, 8453=Base, 56=BSC, etc." }),
      rpcUrl: Type.Optional(Type.String({ description: "Custom RPC endpoint URL." })),
    }),
    async execute(_id: any, params: any) {
      try {
        const provider = getProvider(params.chainId, params.rpcUrl);
        const abi = JSON.parse(params.abi);
        const contract = new ethers.Contract(params.contractAddress, abi, provider);
        
        const methodParams = params.params || [];
        const result = await contract[params.method](...methodParams);
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              chainId: params.chainId,
              contractAddress: params.contractAddress,
              method: params.method,
              params: methodParams,
              result: result.toString(),
            }, null, 2),
          }],
        };
      } catch (error: any) {
        console.error("Error in eth_call:", error);
        return {
          content: [{ type: "text", text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    },
  }, { optional: true });

  // Ethereum: Get Block
  api.registerTool({
    name: "eth_get_block",
    description: "Get block information by block number or hash. chainId is REQUIRED.",
    parameters: Type.Object({
      blockNumber: Type.Optional(Type.Union([Type.Number(), Type.String()], { 
        description: "Block number or 'latest'. Either blockNumber or blockHash must be provided." 
      })),
      blockHash: Type.Optional(Type.String({ description: "Block hash. Either blockNumber or blockHash must be provided." })),
      chainId: Type.Number({ description: "Chain ID (REQUIRED): 1=Ethereum, 137=Polygon, 42161=Arbitrum, 10=Optimism, 8453=Base, 56=BSC, etc." }),
      includeTransactions: Type.Optional(Type.Boolean({ description: "Whether to include full transaction objects. Default: false (only hashes)" })),
      rpcUrl: Type.Optional(Type.String({ description: "Custom RPC endpoint URL." })),
    }),
    async execute(_id: any, params: any) {
      try {
        const provider = getProvider(params.chainId, params.rpcUrl);
        
        let block: any;
        if (params.blockHash) {
          block = await provider.getBlock(params.blockHash, params.includeTransactions || false);
        } else if (params.blockNumber !== undefined) {
          const blockNum = params.blockNumber === 'latest' ? 'latest' : Number(params.blockNumber);
          block = await provider.getBlock(blockNum, params.includeTransactions || false);
        } else {
          throw new Error("Either blockNumber or blockHash must be provided");
        }
        
        if (!block) {
          throw new Error("Block not found");
        }
        
        // Convert BigInt fields to strings for JSON serialization
        const blockData: any = {
          chainId: params.chainId,
          number: block.number,
          hash: block.hash,
          parentHash: block.parentHash,
          timestamp: block.timestamp,
          date: new Date(block.timestamp * 1000).toISOString(),
          nonce: block.nonce,
          difficulty: block.difficulty?.toString() || "0",
          gasLimit: block.gasLimit.toString(),
          gasUsed: block.gasUsed.toString(),
          miner: block.miner,
          extraData: block.extraData,
          transactionsCount: block.transactions.length,
          transactions: params.includeTransactions 
            ? block.transactions 
            : block.transactions.slice(0, 10), // Show first 10 tx hashes if not full
        };
        
        // Add baseFeePerGas if available (EIP-1559 blocks)
        if (block.baseFeePerGas !== undefined && block.baseFeePerGas !== null) {
          blockData.baseFeePerGas = block.baseFeePerGas.toString();
        }
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify(blockData, null, 2),
          }],
        };
      } catch (error: any) {
        console.error("Error in eth_get_block:", error);
        return {
          content: [{ type: "text", text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    },
  }, { optional: true });

  // Ethereum: Get Event Logs
  api.registerTool({
    name: "eth_get_logs",
    description: "Query contract event logs with filters. chainId is REQUIRED. Use carefully with narrow filters to avoid timeout.",
    parameters: Type.Object({
      address: Type.Optional(Type.String({ description: "Contract address to filter logs. Can be omitted for all contracts." })),
      topics: Type.Optional(Type.Array(Type.Any(), { description: "Array of topics to filter. First topic is usually event signature hash." })),
      fromBlock: Type.Optional(Type.Union([Type.Number(), Type.String()], { 
        description: "Starting block number or 'latest'. Default: 'latest'" 
      })),
      toBlock: Type.Optional(Type.Union([Type.Number(), Type.String()], { 
        description: "Ending block number or 'latest'. Default: 'latest'" 
      })),
      chainId: Type.Number({ description: "Chain ID (REQUIRED): 1=Ethereum, 137=Polygon, 42161=Arbitrum, 10=Optimism, 8453=Base, 56=BSC, etc." }),
      limit: Type.Optional(Type.Number({ description: "Maximum number of logs to return. Default: 100" })),
      rpcUrl: Type.Optional(Type.String({ description: "Custom RPC endpoint URL." })),
    }),
    async execute(_id: any, params: any) {
      try {
        const provider = getProvider(params.chainId, params.rpcUrl);
        
        const filter: any = {
          fromBlock: params.fromBlock || 'latest',
          toBlock: params.toBlock || 'latest',
        };
        
        if (params.address) {
          filter.address = params.address;
        }
        
        if (params.topics) {
          filter.topics = params.topics;
        }
        
        const logs = await provider.getLogs(filter);
        const limit = params.limit || 100;
        const limitedLogs = logs.slice(0, limit);
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              chainId: params.chainId,
              filter,
              totalLogs: logs.length,
              returnedLogs: limitedLogs.length,
              logs: limitedLogs.map((log: any) => ({
                address: log.address,
                topics: log.topics,
                data: log.data,
                blockNumber: log.blockNumber,
                transactionHash: log.transactionHash,
                transactionIndex: log.transactionIndex,
                logIndex: log.index,
                removed: log.removed,
              })),
            }, null, 2),
          }],
        };
      } catch (error: any) {
        console.error("Error in eth_get_logs:", error);
        return {
          content: [{ type: "text", text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    },
  }, { optional: true });

  // Ethereum: Get Current Gas Price
  api.registerTool({
    name: "eth_get_gas_price",
    description: "Get current gas price information for a chain. Returns both legacy and EIP-1559 fee data. chainId is REQUIRED.",
    parameters: Type.Object({
      chainId: Type.Number({ description: "Chain ID (REQUIRED): 1=Ethereum, 137=Polygon, 42161=Arbitrum, 10=Optimism, 8453=Base, 56=BSC, etc." }),
      rpcUrl: Type.Optional(Type.String({ description: "Custom RPC endpoint URL." })),
    }),
    async execute(_id: any, params: any) {
      try {
        const provider = getProvider(params.chainId, params.rpcUrl);
        const feeData = await provider.getFeeData();
        const blockNumber = await provider.getBlockNumber();
        
        const result: any = {
          chainId: params.chainId,
          blockNumber,
        };
        
        if (feeData.gasPrice) {
          result.gasPrice = {
            wei: feeData.gasPrice.toString(),
            gwei: ethers.formatUnits(feeData.gasPrice, "gwei"),
          };
        }
        
        if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
          result.eip1559 = {
            maxFeePerGas: {
              wei: feeData.maxFeePerGas.toString(),
              gwei: ethers.formatUnits(feeData.maxFeePerGas, "gwei"),
            },
            maxPriorityFeePerGas: {
              wei: feeData.maxPriorityFeePerGas.toString(),
              gwei: ethers.formatUnits(feeData.maxPriorityFeePerGas, "gwei"),
            },
          };
        }
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
        };
      } catch (error: any) {
        console.error("Error in eth_get_gas_price:", error);
        return {
          content: [{ type: "text", text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    },
  }, { optional: true });

  // ==================== Bitcoin Tools ====================

  // Bitcoin: Get Balance
  api.registerTool({
    name: "btc_get_balance",
    description: "Get Bitcoin balance for an address. Supports mainnet and testnet. Uses Blockstream API.",
    parameters: Type.Object({
      address: Type.String({ description: "Bitcoin address (REQUIRED)" }),
      network: Type.Optional(Type.Union([Type.Literal('mainnet'), Type.Literal('testnet')], { 
        description: "Network: 'mainnet' or 'testnet'. Default: 'mainnet'" 
      })),
    }),
    async execute(_id: any, params: any) {
      try {
        const network = params.network || 'mainnet';
        const baseUrl = network === 'testnet' 
          ? 'https://blockstream.info/testnet/api'
          : 'https://blockstream.info/api';
        
        const addressUrl = `${baseUrl}/address/${params.address}`;
        const response = await fetch(addressUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch Bitcoin address data: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Convert satoshis to BTC
        const balanceBTC = (data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum) / 100000000;
        const unconfirmedBTC = (data.mempool_stats.funded_txo_sum - data.mempool_stats.spent_txo_sum) / 100000000;
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              network,
              address: params.address,
              balance: {
                confirmed: balanceBTC + " BTC",
                confirmedSatoshis: data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum,
                unconfirmed: unconfirmedBTC + " BTC",
                unconfirmedSatoshis: data.mempool_stats.funded_txo_sum - data.mempool_stats.spent_txo_sum,
              },
              transactions: {
                confirmed: data.chain_stats.tx_count,
                unconfirmed: data.mempool_stats.tx_count,
              },
            }, null, 2),
          }],
        };
      } catch (error: any) {
        console.error("Error in btc_get_balance:", error);
        return {
          content: [{ type: "text", text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    },
  }, { optional: true });

  // Bitcoin: Get Transaction
  api.registerTool({
    name: "btc_get_transaction",
    description: "Get Bitcoin transaction details by transaction ID (txid). Supports mainnet and testnet.",
    parameters: Type.Object({
      txid: Type.String({ description: "Transaction ID (REQUIRED)" }),
      network: Type.Optional(Type.Union([Type.Literal('mainnet'), Type.Literal('testnet')], { 
        description: "Network: 'mainnet' or 'testnet'. Default: 'mainnet'" 
      })),
    }),
    async execute(_id: any, params: any) {
      try {
        const network = params.network || 'mainnet';
        const baseUrl = network === 'testnet' 
          ? 'https://blockstream.info/testnet/api'
          : 'https://blockstream.info/api';
        
        const txUrl = `${baseUrl}/tx/${params.txid}`;
        const response = await fetch(txUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch Bitcoin transaction: ${response.statusText}`);
        }
        
        const tx = await response.json();
        
        // Calculate total input and output values
        const totalInput = tx.vin.reduce((sum: number, vin: any) => 
          sum + (vin.prevout?.value || 0), 0);
        const totalOutput = tx.vout.reduce((sum: number, vout: any) => 
          sum + vout.value, 0);
        const fee = totalInput - totalOutput;
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              network,
              txid: tx.txid,
              version: tx.version,
              locktime: tx.locktime,
              size: tx.size,
              weight: tx.weight,
              fee: {
                satoshis: fee,
                btc: fee / 100000000,
              },
              status: {
                confirmed: tx.status.confirmed,
                blockHeight: tx.status.block_height,
                blockHash: tx.status.block_hash,
                blockTime: tx.status.block_time,
              },
              inputs: tx.vin.map((vin: any) => ({
                txid: vin.txid,
                vout: vin.vout,
                value: vin.prevout?.value,
                address: vin.prevout?.scriptpubkey_address,
              })),
              outputs: tx.vout.map((vout: any) => ({
                value: vout.value,
                address: vout.scriptpubkey_address,
                scriptpubkey_type: vout.scriptpubkey_type,
              })),
            }, null, 2),
          }],
        };
      } catch (error: any) {
        console.error("Error in btc_get_transaction:", error);
        return {
          content: [{ type: "text", text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    },
  }, { optional: true });

  // Bitcoin: Get Block
  api.registerTool({
    name: "btc_get_block",
    description: "Get Bitcoin block information by block height or hash. Supports mainnet and testnet.",
    parameters: Type.Object({
      blockHeight: Type.Optional(Type.Number({ description: "Block height (number). Either blockHeight or blockHash must be provided." })),
      blockHash: Type.Optional(Type.String({ description: "Block hash. Either blockHeight or blockHash must be provided." })),
      network: Type.Optional(Type.Union([Type.Literal('mainnet'), Type.Literal('testnet')], { 
        description: "Network: 'mainnet' or 'testnet'. Default: 'mainnet'" 
      })),
    }),
    async execute(_id: any, params: any) {
      try {
        const network = params.network || 'mainnet';
        const baseUrl = network === 'testnet' 
          ? 'https://blockstream.info/testnet/api'
          : 'https://blockstream.info/api';
        
        let blockHash = params.blockHash;
        
        // If blockHeight provided, first get the block hash
        if (params.blockHeight !== undefined && !blockHash) {
          const heightUrl = `${baseUrl}/block-height/${params.blockHeight}`;
          const heightResponse = await fetch(heightUrl);
          if (!heightResponse.ok) {
            throw new Error(`Failed to fetch block hash for height ${params.blockHeight}`);
          }
          blockHash = await heightResponse.text();
        }
        
        if (!blockHash) {
          throw new Error("Either blockHeight or blockHash must be provided");
        }
        
        const blockUrl = `${baseUrl}/block/${blockHash}`;
        const response = await fetch(blockUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch Bitcoin block: ${response.statusText}`);
        }
        
        const block = await response.json();
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              network,
              id: block.id,
              height: block.height,
              version: block.version,
              timestamp: block.timestamp,
              date: new Date(block.timestamp * 1000).toISOString(),
              bits: block.bits,
              nonce: block.nonce,
              difficulty: block.difficulty,
              merkleRoot: block.merkle_root,
              txCount: block.tx_count,
              size: block.size,
              weight: block.weight,
              previousBlockHash: block.previousblockhash,
            }, null, 2),
          }],
        };
      } catch (error: any) {
        console.error("Error in btc_get_block:", error);
        return {
          content: [{ type: "text", text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    },
  }, { optional: true });

  // Bitcoin: Get UTXOs
  api.registerTool({
    name: "btc_get_utxos",
    description: "Get unspent transaction outputs (UTXOs) for a Bitcoin address. Essential for understanding spendable balance.",
    parameters: Type.Object({
      address: Type.String({ description: "Bitcoin address (REQUIRED)" }),
      network: Type.Optional(Type.Union([Type.Literal('mainnet'), Type.Literal('testnet')], { 
        description: "Network: 'mainnet' or 'testnet'. Default: 'mainnet'" 
      })),
    }),
    async execute(_id: any, params: any) {
      try {
        const network = params.network || 'mainnet';
        const baseUrl = network === 'testnet' 
          ? 'https://blockstream.info/testnet/api'
          : 'https://blockstream.info/api';
        
        const utxoUrl = `${baseUrl}/address/${params.address}/utxo`;
        const response = await fetch(utxoUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch UTXOs: ${response.statusText}`);
        }
        
        const utxos = await response.json();
        
        const totalValue = utxos.reduce((sum: number, utxo: any) => sum + utxo.value, 0);
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              network,
              address: params.address,
              utxoCount: utxos.length,
              totalValue: {
                satoshis: totalValue,
                btc: totalValue / 100000000,
              },
              utxos: utxos.map((utxo: any) => ({
                txid: utxo.txid,
                vout: utxo.vout,
                value: {
                  satoshis: utxo.value,
                  btc: utxo.value / 100000000,
                },
                status: utxo.status,
              })),
            }, null, 2),
          }],
        };
      } catch (error: any) {
        console.error("Error in btc_get_utxos:", error);
        return {
          content: [{ type: "text", text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    },
  }, { optional: true });

  // Bitcoin: Get Address Info
  api.registerTool({
    name: "btc_get_address_info",
    description: "Get detailed statistics for a Bitcoin address including transaction history summary.",
    parameters: Type.Object({
      address: Type.String({ description: "Bitcoin address (REQUIRED)" }),
      network: Type.Optional(Type.Union([Type.Literal('mainnet'), Type.Literal('testnet')], { 
        description: "Network: 'mainnet' or 'testnet'. Default: 'mainnet'" 
      })),
    }),
    async execute(_id: any, params: any) {
      try {
        const network = params.network || 'mainnet';
        const baseUrl = network === 'testnet' 
          ? 'https://blockstream.info/testnet/api'
          : 'https://blockstream.info/api';
        
        const addressUrl = `${baseUrl}/address/${params.address}`;
        const response = await fetch(addressUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch Bitcoin address info: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        const confirmedBalance = (data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum) / 100000000;
        const unconfirmedBalance = (data.mempool_stats.funded_txo_sum - data.mempool_stats.spent_txo_sum) / 100000000;
        const totalReceived = data.chain_stats.funded_txo_sum / 100000000;
        const totalSent = data.chain_stats.spent_txo_sum / 100000000;
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              network,
              address: params.address,
              balance: {
                confirmed: `${confirmedBalance} BTC`,
                unconfirmed: `${unconfirmedBalance} BTC`,
              },
              totalReceived: `${totalReceived} BTC`,
              totalSent: `${totalSent} BTC`,
              transactions: {
                confirmed: data.chain_stats.tx_count,
                unconfirmed: data.mempool_stats.tx_count,
              },
            }, null, 2),
          }],
        };
      } catch (error: any) {
        console.error("Error in btc_get_address_info:", error);
        return {
          content: [{ type: "text", text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    },
  }, { optional: true });

  // ==================== Solana Tools ====================

  // Solana: Get Balance
  api.registerTool({
    name: "sol_get_balance",
    description: "Get SOL balance for a Solana address. Supports mainnet and devnet.",
    parameters: Type.Object({
      address: Type.String({ description: "Solana address (REQUIRED)" }),
      network: Type.Optional(Type.Union([Type.Literal('mainnet'), Type.Literal('devnet'), Type.Literal('testnet')], { 
        description: "Network: 'mainnet', 'devnet', or 'testnet'. Default: 'mainnet'" 
      })),
      rpcUrl: Type.Optional(Type.String({ description: "Custom Solana RPC URL. If not provided, uses public endpoints." })),
    }),
    async execute(_id: any, params: any) {
      try {
        const network = params.network || 'mainnet';
        
        // Determine RPC endpoint
        let rpcUrl = params.rpcUrl;
        if (!rpcUrl) {
          const endpoints: Record<string, string> = {
            mainnet: 'https://api.mainnet-beta.solana.com',
            devnet: 'https://api.devnet.solana.com',
            testnet: 'https://api.testnet.solana.com',
          };
          rpcUrl = endpoints[network];
        }
        
        // Make RPC request
        const response = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getBalance',
            params: [params.address],
          }),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch Solana balance: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error.message || 'Solana RPC error');
        }
        
        const lamports = data.result.value;
        const sol = lamports / 1000000000; // 1 SOL = 1e9 lamports
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              network,
              address: params.address,
              balance: {
                lamports: lamports,
                sol: sol,
              },
            }, null, 2),
          }],
        };
      } catch (error: any) {
        console.error("Error in sol_get_balance:", error);
        return {
          content: [{ type: "text", text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    },
  }, { optional: true });

  // Solana: Get Token Balance
  api.registerTool({
    name: "sol_get_token_balance",
    description: "Get SPL token balance for a Solana token account. Returns token amount with decimals.",
    parameters: Type.Object({
      tokenAccount: Type.String({ description: "SPL token account address (REQUIRED, not the token mint address)" }),
      network: Type.Optional(Type.Union([Type.Literal('mainnet'), Type.Literal('devnet'), Type.Literal('testnet')], { 
        description: "Network: 'mainnet', 'devnet', or 'testnet'. Default: 'mainnet'" 
      })),
      rpcUrl: Type.Optional(Type.String({ description: "Custom Solana RPC URL. If not provided, uses public endpoints." })),
    }),
    async execute(_id: any, params: any) {
      try {
        const network = params.network || 'mainnet';
        
        // Determine RPC endpoint
        let rpcUrl = params.rpcUrl;
        if (!rpcUrl) {
          const endpoints: Record<string, string> = {
            mainnet: 'https://api.mainnet-beta.solana.com',
            devnet: 'https://api.devnet.solana.com',
            testnet: 'https://api.testnet.solana.com',
          };
          rpcUrl = endpoints[network];
        }
        
        // Make RPC request
        const response = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getTokenAccountBalance',
            params: [params.tokenAccount],
          }),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch Solana token balance: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error.message || 'Solana RPC error');
        }
        
        const tokenBalance = data.result.value;
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              network,
              tokenAccount: params.tokenAccount,
              balance: {
                amount: tokenBalance.amount,
                decimals: tokenBalance.decimals,
                uiAmount: tokenBalance.uiAmount,
                uiAmountString: tokenBalance.uiAmountString,
              },
            }, null, 2),
          }],
        };
      } catch (error: any) {
        console.error("Error in sol_get_token_balance:", error);
        return {
          content: [{ type: "text", text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    },
  }, { optional: true });

  // Solana: Get Transaction
  api.registerTool({
    name: "sol_get_transaction",
    description: "Get Solana transaction details by signature. Returns transaction data including logs and status.",
    parameters: Type.Object({
      signature: Type.String({ description: "Transaction signature (REQUIRED)" }),
      network: Type.Optional(Type.Union([Type.Literal('mainnet'), Type.Literal('devnet'), Type.Literal('testnet')], { 
        description: "Network: 'mainnet', 'devnet', or 'testnet'. Default: 'mainnet'" 
      })),
      rpcUrl: Type.Optional(Type.String({ description: "Custom Solana RPC URL. If not provided, uses public endpoints." })),
    }),
    async execute(_id: any, params: any) {
      try {
        const network = params.network || 'mainnet';
        
        // Determine RPC endpoint
        let rpcUrl = params.rpcUrl;
        if (!rpcUrl) {
          const endpoints: Record<string, string> = {
            mainnet: 'https://api.mainnet-beta.solana.com',
            devnet: 'https://api.devnet.solana.com',
            testnet: 'https://api.testnet.solana.com',
          };
          rpcUrl = endpoints[network];
        }
        
        // Make RPC request with maxSupportedTransactionVersion
        const response = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getTransaction',
            params: [
              params.signature,
              {
                encoding: 'json',
                maxSupportedTransactionVersion: 0,
              }
            ],
          }),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch Solana transaction: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error.message || 'Solana RPC error');
        }
        
        if (!data.result) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                error: "Transaction not found",
                signature: params.signature,
                network,
              }, null, 2),
            }],
            isError: true,
          };
        }
        
        const tx = data.result;
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              network,
              signature: params.signature,
              slot: tx.slot,
              blockTime: tx.blockTime,
              meta: {
                err: tx.meta.err,
                fee: tx.meta.fee,
                preBalances: tx.meta.preBalances,
                postBalances: tx.meta.postBalances,
                logMessages: tx.meta.logMessages,
                computeUnitsConsumed: tx.meta.computeUnitsConsumed,
              },
              transaction: {
                signatures: tx.transaction.signatures,
                message: {
                  accountKeys: tx.transaction.message.accountKeys,
                  recentBlockhash: tx.transaction.message.recentBlockhash,
                  instructions: tx.transaction.message.instructions,
                },
              },
            }, null, 2),
          }],
        };
      } catch (error: any) {
        console.error("Error in sol_get_transaction:", error);
        return {
          content: [{ type: "text", text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    },
  }, { optional: true });

  // Solana: Get Account Info
  api.registerTool({
    name: "sol_get_account_info",
    description: "Get detailed Solana account information including lamports, owner, and data.",
    parameters: Type.Object({
      address: Type.String({ description: "Solana account address (REQUIRED)" }),
      network: Type.Optional(Type.Union([Type.Literal('mainnet'), Type.Literal('devnet'), Type.Literal('testnet')], { 
        description: "Network: 'mainnet', 'devnet', or 'testnet'. Default: 'mainnet'" 
      })),
      rpcUrl: Type.Optional(Type.String({ description: "Custom Solana RPC URL." })),
    }),
    async execute(_id: any, params: any) {
      try {
        const network = params.network || 'mainnet';
        
        let rpcUrl = params.rpcUrl;
        if (!rpcUrl) {
          const endpoints: Record<string, string> = {
            mainnet: 'https://api.mainnet-beta.solana.com',
            devnet: 'https://api.devnet.solana.com',
            testnet: 'https://api.testnet.solana.com',
          };
          rpcUrl = endpoints[network];
        }
        
        const response = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getAccountInfo',
            params: [
              params.address,
              { encoding: 'base64' }
            ],
          }),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch Solana account info: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error.message || 'Solana RPC error');
        }
        
        const accountInfo = data.result.value;
        
        if (!accountInfo) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                network,
                address: params.address,
                exists: false,
              }, null, 2),
            }],
          };
        }
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              network,
              address: params.address,
              exists: true,
              lamports: accountInfo.lamports,
              sol: accountInfo.lamports / 1000000000,
              owner: accountInfo.owner,
              executable: accountInfo.executable,
              rentEpoch: accountInfo.rentEpoch,
              dataLength: accountInfo.data ? accountInfo.data[0].length : 0,
            }, null, 2),
          }],
        };
      } catch (error: any) {
        console.error("Error in sol_get_account_info:", error);
        return {
          content: [{ type: "text", text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    },
  }, { optional: true });

  // Solana: Get Token Accounts by Owner
  api.registerTool({
    name: "sol_get_token_accounts",
    description: "Get all SPL token accounts owned by an address. Shows all tokens the address holds.",
    parameters: Type.Object({
      ownerAddress: Type.String({ description: "Owner address (REQUIRED)" }),
      network: Type.Optional(Type.Union([Type.Literal('mainnet'), Type.Literal('devnet'), Type.Literal('testnet')], { 
        description: "Network: 'mainnet', 'devnet', or 'testnet'. Default: 'mainnet'" 
      })),
      rpcUrl: Type.Optional(Type.String({ description: "Custom Solana RPC URL." })),
    }),
    async execute(_id: any, params: any) {
      try {
        const network = params.network || 'mainnet';
        
        let rpcUrl = params.rpcUrl;
        if (!rpcUrl) {
          const endpoints: Record<string, string> = {
            mainnet: 'https://api.mainnet-beta.solana.com',
            devnet: 'https://api.devnet.solana.com',
            testnet: 'https://api.testnet.solana.com',
          };
          rpcUrl = endpoints[network];
        }
        
        const response = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getTokenAccountsByOwner',
            params: [
              params.ownerAddress,
              { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
              { encoding: 'jsonParsed' }
            ],
          }),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch token accounts: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error.message || 'Solana RPC error');
        }
        
        const accounts = data.result.value;
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              network,
              ownerAddress: params.ownerAddress,
              tokenAccountCount: accounts.length,
              tokenAccounts: accounts.map((account: any) => ({
                pubkey: account.pubkey,
                mint: account.account.data.parsed.info.mint,
                tokenAmount: account.account.data.parsed.info.tokenAmount,
                owner: account.account.data.parsed.info.owner,
              })),
            }, null, 2),
          }],
        };
      } catch (error: any) {
        console.error("Error in sol_get_token_accounts:", error);
        return {
          content: [{ type: "text", text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    },
  }, { optional: true });

  // Solana: Get Token Supply
  api.registerTool({
    name: "sol_get_token_supply",
    description: "Get total supply information for an SPL token.",
    parameters: Type.Object({
      mintAddress: Type.String({ description: "Token mint address (REQUIRED)" }),
      network: Type.Optional(Type.Union([Type.Literal('mainnet'), Type.Literal('devnet'), Type.Literal('testnet')], { 
        description: "Network: 'mainnet', 'devnet', or 'testnet'. Default: 'mainnet'" 
      })),
      rpcUrl: Type.Optional(Type.String({ description: "Custom Solana RPC URL." })),
    }),
    async execute(_id: any, params: any) {
      try {
        const network = params.network || 'mainnet';
        
        let rpcUrl = params.rpcUrl;
        if (!rpcUrl) {
          const endpoints: Record<string, string> = {
            mainnet: 'https://api.mainnet-beta.solana.com',
            devnet: 'https://api.devnet.solana.com',
            testnet: 'https://api.testnet.solana.com',
          };
          rpcUrl = endpoints[network];
        }
        
        const response = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getTokenSupply',
            params: [params.mintAddress],
          }),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch token supply: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error.message || 'Solana RPC error');
        }
        
        const supply = data.result.value;
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              network,
              mintAddress: params.mintAddress,
              supply: {
                amount: supply.amount,
                decimals: supply.decimals,
                uiAmount: supply.uiAmount,
                uiAmountString: supply.uiAmountString,
              },
            }, null, 2),
          }],
        };
      } catch (error: any) {
        console.error("Error in sol_get_token_supply:", error);
        return {
          content: [{ type: "text", text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    },
  }, { optional: true });

  // ==================== Cross-Chain Tools ====================

  // Get Token Price
  api.registerTool({
    name: "get_token_price",
    description: "Get current token price in USD using CoinGecko API. Supports thousands of tokens across multiple chains.",
    parameters: Type.Object({
      tokenId: Type.String({ description: "CoinGecko token ID (REQUIRED, e.g., 'bitcoin', 'ethereum', 'solana', 'usd-coin'). Use CoinGecko search to find token IDs." }),
      vsCurrency: Type.Optional(Type.String({ description: "Currency to show price in. Default: 'usd'. Options: usd, eur, gbp, jpy, etc." })),
    }),
    async execute(_id: any, params: any) {
      try {
        const vsCurrency = params.vsCurrency || 'usd';
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${params.tokenId}&vs_currencies=${vsCurrency}&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch token price: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data[params.tokenId]) {
          throw new Error(`Token '${params.tokenId}' not found. Please verify the CoinGecko token ID.`);
        }
        
        const tokenData = data[params.tokenId];
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              tokenId: params.tokenId,
              currency: vsCurrency.toUpperCase(),
              price: tokenData[vsCurrency],
              change24h: tokenData[`${vsCurrency}_24h_change`],
              marketCap: tokenData[`${vsCurrency}_market_cap`],
              volume24h: tokenData[`${vsCurrency}_24h_vol`],
              timestamp: new Date().toISOString(),
            }, null, 2),
          }],
        };
      } catch (error: any) {
        console.error("Error in get_token_price:", error);
        return {
          content: [{ type: "text", text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    },
  }, { optional: true });

  // Validate and Decode Address
  api.registerTool({
    name: "decode_address",
    description: "Validate and identify blockchain address type. Helps detect which chain an address belongs to.",
    parameters: Type.Object({
      address: Type.String({ description: "Blockchain address to validate (REQUIRED)" }),
    }),
    async execute(_id: any, params: any) {
      try {
        const address = params.address;
        const result: any = {
          address,
          detectedChains: [],
        };
        
        // Check Ethereum/EVM address
        if (/^0x[a-fA-F0-9]{40}$/.test(address)) {
          try {
            const checksummed = ethers.getAddress(address);
            result.detectedChains.push({
              type: 'EVM',
              chains: ['Ethereum', 'Polygon', 'Arbitrum', 'Optimism', 'Base', 'BSC', 'Avalanche'],
              valid: true,
              checksumAddress: checksummed,
            });
          } catch {
            result.detectedChains.push({
              type: 'EVM',
              valid: false,
              error: 'Invalid EVM address checksum',
            });
          }
        }
        
        // Check Bitcoin address
        if (/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address) || 
            /^bc1[a-z0-9]{39,87}$/.test(address)) {
          result.detectedChains.push({
            type: 'Bitcoin',
            chains: ['Bitcoin'],
            valid: true,
            addressType: address.startsWith('1') ? 'P2PKH' :
                         address.startsWith('3') ? 'P2SH' :
                         address.startsWith('bc1q') ? 'P2WPKH (Bech32)' :
                         address.startsWith('bc1p') ? 'P2TR (Taproot)' : 'Unknown',
          });
        }
        
        // Check Solana address
        if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address) && !address.startsWith('0x')) {
          result.detectedChains.push({
            type: 'Solana',
            chains: ['Solana'],
            valid: true,
          });
        }
        
        if (result.detectedChains.length === 0) {
          result.valid = false;
          result.error = 'Address format not recognized. Supported: Ethereum/EVM (0x...), Bitcoin (1.../3.../bc1...), Solana (base58)';
        } else {
          result.valid = true;
        }
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
        };
      } catch (error: any) {
        console.error("Error in decode_address:", error);
        return {
          content: [{ type: "text", text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    },
  }, { optional: true });
}
