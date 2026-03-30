/**
 * Bridgers DEX Extension for OpenClaw
 * 
 * Registers tools for cross-chain token swapping via Bridgers API
 */

import { Type } from "@sinclair/typebox";
import {
  BridgersClient,
  formatOrderStatus,
  formatRefundReason,
  toAmountWithDecimals,
  NATIVE_TOKEN_ADDRESS,
} from "./src/api-client.js";

export default function register(api: any) {
  const config = api.pluginConfig || {};
  const client = new BridgersClient({
    sourceFlag: config.sourceFlag,
    sourceType: config.sourceType,
    equipmentNo: config.equipmentNo,
  });

  // Tool 1: Get Supported Tokens
  api.registerTool({
    name: "bridgers_get_tokens",
    description: "Get list of all supported tokens across all chains on Bridgers DEX. Returns token contract addresses, decimals, symbols, and supported chains.",
    parameters: Type.Object({}),
    async execute(_id: any, _params: any) {
      try {
        const tokens = await client.getTokens();
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                totalTokens: tokens.length,
                tokens: tokens.map(t => ({
                  chain: t.chain,
                  symbol: t.symbol,
                  name: t.name,
                  address: t.address,
                  decimals: t.decimals,
                })),
              }, null, 2),
            },
          ],
        };
      } catch (error: any) {
        console.error("Error in bridgers_get_tokens:", error);
        return {
          content: [{ type: "text", text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    },
  }, { optional: true });

  // Tool 2: Get Quote
  api.registerTool({
    name: "bridgers_get_quote",
    description: "Get quote for token swap. Returns expected output amount, fees, exchange rate, and min/max limits. MUST be called before executing swap.",
    parameters: Type.Object({
      fromTokenAddress: Type.String({ description: "Source token contract address (use 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee for native tokens like ETH/BNB)" }),
      toTokenAddress: Type.String({ description: "Destination token contract address" }),
      fromTokenAmount: Type.String({ description: "Amount to swap WITH decimals (e.g., '100000000000000000000' for 100 tokens with 18 decimals). Use toAmountWithDecimals helper or see token decimals from bridgers_get_tokens." }),
      fromTokenChain: Type.String({ description: "Source chain name (e.g., 'BSC', 'ETH', 'POLYGON', 'ARBITRUM')" }),
      toTokenChain: Type.String({ description: "Destination chain name" }),
      userAddress: Type.String({ description: "User wallet address (REQUIRED)" }),
    }),
    async execute(_id: any, params: any) {
      try {
        const quote = await client.getQuote({
          fromTokenAddress: params.fromTokenAddress,
          toTokenAddress: params.toTokenAddress,
          fromTokenAmount: params.fromTokenAmount,
          fromTokenChain: params.fromTokenChain,
          toTokenChain: params.toTokenChain,
          userAddr: params.userAddress,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                expectedOutput: quote.txData.toTokenAmount,
                minOutput: quote.txData.amountOutMin,
                platformFee: `${(quote.txData.fee * 100).toFixed(2)}%`,
                chainFee: quote.txData.chainFee,
                contractAddress: quote.txData.contractAddress,
                limits: {
                  min: quote.txData.depositMin,
                  max: quote.txData.depositMax,
                },
                decimals: {
                  from: quote.txData.fromTokenDecimal,
                  to: quote.txData.toTokenDecimal,
                },
              }, null, 2),
            },
          ],
        };
      } catch (error: any) {
        console.error("Error in bridgers_get_quote:", error);
        return {
          content: [{ type: "text", text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    },
  }, { optional: true });

  // Tool 3: Get Swap Transaction Data
  api.registerTool({
    name: "bridgers_get_swap_data",
    description: "Generate swap transaction data (calldata) for execution. Returns transaction object with 'to', 'data', and 'value' fields. User must sign and broadcast this transaction with their wallet. IMPORTANT: Must call bridgers_get_quote FIRST and use the returned amountOutMin value.",
    parameters: Type.Object({
      fromTokenAddress: Type.String({ description: "Source token contract address" }),
      toTokenAddress: Type.String({ description: "Destination token contract address" }),
      fromAddress: Type.String({ description: "Sender wallet address" }),
      toAddress: Type.String({ description: "Receiver wallet address (can be same as fromAddress)" }),
      fromTokenChain: Type.String({ description: "Source chain name" }),
      toTokenChain: Type.String({ description: "Destination chain name" }),
      fromTokenAmount: Type.String({ description: "Amount to swap WITH decimals" }),
      amountOutMin: Type.String({ description: "Minimum acceptable output amount (from quote response)" }),
      fromCoinCode: Type.String({ description: "Source coin code (e.g., 'USDT(BSC)')" }),
      toCoinCode: Type.String({ description: "Destination coin code (e.g., 'USDT(ETH)')" }),
    }),
    async execute(_id: any, params: any) {
      try {
        const swapData = await client.getSwapData({
          fromTokenAddress: params.fromTokenAddress,
          toTokenAddress: params.toTokenAddress,
          fromAddress: params.fromAddress,
          toAddress: params.toAddress,
          fromTokenChain: params.fromTokenChain,
          toTokenChain: params.toTokenChain,
          fromTokenAmount: params.fromTokenAmount,
          amountOutMin: params.amountOutMin,
          fromCoinCode: params.fromCoinCode,
          toCoinCode: params.toCoinCode,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                transaction: {
                  to: swapData.txData.to,
                  data: swapData.txData.data,
                  value: swapData.txData.value,
                },
                nextSteps: [
                  "Sign this transaction with your wallet (use wallet-manager or external wallet)",
                  "Broadcast the signed transaction to the network",
                  "Call bridgers_create_order with the transaction hash to track the order",
                ],
              }, null, 2),
            },
          ],
        };
      } catch (error: any) {
        console.error("Error in bridgers_get_swap_data:", error);
        return {
          content: [{ type: "text", text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    },
  }, { optional: true });

  // Tool 4: Create Order Record
  api.registerTool({
    name: "bridgers_create_order",
    description: "Create order record after broadcasting swap transaction. Returns orderId for tracking. MUST be called after transaction is broadcast to enable order tracking.",
    parameters: Type.Object({
      hash: Type.String({ description: "Transaction hash from broadcasted swap transaction (REQUIRED)" }),
      fromTokenAddress: Type.String({ description: "Source token contract address" }),
      toTokenAddress: Type.String({ description: "Destination token contract address" }),
      fromAddress: Type.String({ description: "Sender wallet address" }),
      toAddress: Type.String({ description: "Receiver wallet address" }),
      fromTokenChain: Type.String({ description: "Source chain name" }),
      toTokenChain: Type.String({ description: "Destination chain name" }),
      fromTokenAmount: Type.String({ description: "Amount swapped WITH decimals" }),
      amountOutMin: Type.String({ description: "Minimum acceptable output amount" }),
      fromCoinCode: Type.String({ description: "Source coin code" }),
      toCoinCode: Type.String({ description: "Destination coin code" }),
    }),
    async execute(_id: any, params: any) {
      try {
        const order = await client.createOrder({
          hash: params.hash,
          fromTokenAddress: params.fromTokenAddress,
          toTokenAddress: params.toTokenAddress,
          fromAddress: params.fromAddress,
          toAddress: params.toAddress,
          fromTokenChain: params.fromTokenChain,
          toTokenChain: params.toTokenChain,
          fromTokenAmount: params.fromTokenAmount,
          amountOutMin: params.amountOutMin,
          fromCoinCode: params.fromCoinCode,
          toCoinCode: params.toCoinCode,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                orderId: order.orderId,
                message: "Order created successfully. Use bridgers_query_orders to track status.",
              }, null, 2),
            },
          ],
        };
      } catch (error: any) {
        console.error("Error in bridgers_create_order:", error);
        return {
          content: [{ type: "text", text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    },
  }, { optional: true });

  // Tool 5: Query Orders
  api.registerTool({
    name: "bridgers_query_orders",
    description: "Query swap order history and status. Returns list of orders with current status, transaction hashes, and timestamps. Useful for tracking order progress.",
    parameters: Type.Object({
      fromAddress: Type.Optional(Type.String({ description: "Wallet address to query orders for. If not provided, returns recent orders." })),
      pageNo: Type.Optional(Type.Number({ description: "Page number (default: 1)" })),
      pageSize: Type.Optional(Type.Number({ description: "Results per page (default: 10, max: 50)" })),
    }),
    async execute(_id: any, params: any) {
      try {
        const result = await client.queryOrders({
          fromAddress: params.fromAddress,
          pageNo: params.pageNo || 1,
          pageSize: Math.min(params.pageSize || 10, 50),
        });

        const orders = result.list.map(order => ({
          orderId: order.orderId,
          status: formatOrderStatus(order.status),
          statusCode: order.status,
          from: `${order.fromTokenAmount} ${order.fromCoinCode}`,
          to: `${order.toTokenAmount} ${order.toCoinCode}`,
          fromChain: order.fromChain,
          toChain: order.toChain,
          createdAt: order.createTime,
          depositTx: order.hash,
          depositExplorer: order.depositHashExplore,
          receiveTx: order.toHash,
          receiveExplorer: order.receiveHashExplore,
          refundReason: order.refundReason ? formatRefundReason(order.refundReason) : null,
        }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                total: result.total,
                page: result.pageNo,
                orders,
              }, null, 2),
            },
          ],
        };
      } catch (error: any) {
        console.error("Error in bridgers_query_orders:", error);
        return {
          content: [{ type: "text", text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    },
  }, { optional: true });

  api.logger.info?.(`bridgers-dex: Registered ${5} tools`);
}
