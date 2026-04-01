/**
 * Omnibridge Extension for OpenClaw
 *
 * Registers tools for cross-chain token swapping via Omnibridge API
 */

import { Type } from "@sinclair/typebox";
import {
  OmnibridgeClient,
  formatOrderStatus,
  formatDetailState,
  toAmountWithDecimals,
  fromAmountWithDecimals,
  NATIVE_TOKEN_ADDRESS,
} from "./src/api-client.js";

export default function register(api: any) {
  const config = api.pluginConfig || {};
  const client = new OmnibridgeClient({
    sourceFlag: config.sourceFlag,
    sourceType: config.sourceType,
    equipmentNo: config.equipmentNo,
  });

  // Tool 1: Get Coin List
  api.registerTool(
    {
      name: "omnibridge_get_coins",
      description:
        "Get list of all supported coins/tokens on Omnibridge. Returns token contract addresses, decimals, symbols, and supported chains. Each token has mainNetwork (chain) and contact (contract address) fields.",
      parameters: Type.Object({
        mainNetwork: Type.Optional(
          Type.String({
            description:
              "Filter by chain name (e.g., 'ETH', 'BSC', 'POLYGON', 'TRON'). Leave empty to get all chains.",
          }),
        ),
        supportType: Type.Optional(
          Type.String({
            description: "Support type: 'advanced' for cross-chain swaps (default: 'advanced')",
          }),
        ),
      }),
      async execute(_id: any, params: any) {
        try {
          const coins = await client.getCoinList({
            mainNetwork: params.mainNetwork,
            supportType: params.supportType || "advanced",
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    totalCoins: coins.length,
                    coins: coins.map((c) => ({
                      coinCode: c.coinCode,
                      coinName: c.coinName,
                      mainNetwork: c.mainNetwork,
                      contact: c.contact,
                      decimals: c.coinDecimal,
                      isSupportAdvanced: c.isSupportAdvanced,
                    })),
                    note: "Use coinCode for API calls (e.g., 'USDT(BSC)' = USDT on BSC chain)",
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        } catch (error: any) {
          console.error("Error in omnibridge_get_coins:", error);
          return {
            content: [{ type: "text", text: `Error: ${error.message}` }],
            isError: true,
          };
        }
      },
    },
    { optional: true },
  );

  // Tool 2: Get Fee Rates (Quote)
  api.registerTool(
    {
      name: "omnibridge_get_quote",
      description:
        "Get quote for cross-chain swap. Returns exchange rate, fees, and min/max limits. MUST be called before creating order. Use coin codes like 'USDT(BSC)' or 'ETH' for depositCoinCode/receiveCoinCode.",
      parameters: Type.Object({
        depositCoinCode: Type.String({
          description:
            "Source coin code (e.g., 'USDT(BSC)', 'ETH', 'BNB(BSC)'). Format: TOKEN(CHAIN) or just TOKEN for native coins.",
        }),
        receiveCoinCode: Type.String({
          description: "Destination coin code (e.g., 'USDT(ETH)', 'BTC', 'MATIC(POLYGON)')",
        }),
        depositCoinAmt: Type.Optional(
          Type.String({
            description:
              "Amount to swap WITHOUT decimals (e.g., '100' for 100 USDT). Optional but recommended for accurate quote.",
          }),
        ),
        fixedRate: Type.Optional(
          Type.String({
            description: "'Y' for fixed rate, 'N' for floating rate (default: 'N')",
          }),
        ),
      }),
      async execute(_id: any, params: any) {
        try {
          const quote = await client.getFeeRates({
            depositCoinCode: params.depositCoinCode,
            receiveCoinCode: params.receiveCoinCode,
            depositCoinAmt: params.depositCoinAmt,
            fixedRate: params.fixedRate,
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    exchangeRate: quote.instantRate,
                    platformFeeRate: quote.depositCoinFeeRate,
                    chainFee: quote.chainFee,
                    limits: {
                      min: quote.depositMin,
                      max: quote.depositMax,
                    },
                    burnRate: quote.burnRate,
                    isSupportNoGas: quote.isSupportNoGas,
                    isSupport: quote.isSupport,
                    note: "Platform fee is deducted from deposit amount (e.g., 0.3% = 0.003)",
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        } catch (error: any) {
          console.error("Error in omnibridge_get_quote:", error);
          return {
            content: [{ type: "text", text: `Error: ${error.message}` }],
            isError: true,
          };
        }
      },
    },
    { optional: true },
  );

  // Tool 3: Create Order
  api.registerTool(
    {
      name: "omnibridge_create_order",
      description:
        "Create cross-chain swap order. Returns orderId and platformAddr (deposit address). User must send tokens to platformAddr. IMPORTANT: Call omnibridge_get_quote FIRST to validate amounts and fees. Amounts should be WITHOUT decimals.",
      parameters: Type.Object({
        depositCoinCode: Type.String({
          description: "Source coin code from quote (e.g., 'USDT(BSC)')",
        }),
        receiveCoinCode: Type.String({
          description: "Destination coin code from quote (e.g., 'USDT(ETH)')",
        }),
        depositCoinAmt: Type.String({
          description: "Amount to deposit WITHOUT decimals (e.g., '100' for 100 USDT)",
        }),
        receiveCoinAmt: Type.String({
          description:
            "Expected receive amount WITHOUT decimals (from quote's instantRate calculation)",
        }),
        destinationAddr: Type.String({
          description: "Receiver wallet address (where tokens will be sent on destination chain)",
        }),
        refundAddr: Type.String({
          description:
            "Refund address (where tokens will be returned if swap fails, should be on source chain)",
        }),
        slippage: Type.Optional(
          Type.String({
            description: "Slippage tolerance (e.g., '0.02' for 2%, default: '0.02')",
          }),
        ),
        fixedRate: Type.Optional(
          Type.String({
            description: "'Y' for fixed rate, 'N' for floating rate (default: 'N')",
          }),
        ),
      }),
      async execute(_id: any, params: any) {
        try {
          const order = await client.createOrder({
            depositCoinCode: params.depositCoinCode,
            receiveCoinCode: params.receiveCoinCode,
            depositCoinAmt: params.depositCoinAmt,
            receiveCoinAmt: params.receiveCoinAmt,
            destinationAddr: params.destinationAddr,
            refundAddr: params.refundAddr,
            slippage: params.slippage,
            fixedRate: params.fixedRate,
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    orderId: order.orderId,
                    platformAddr: order.platformAddr,
                    depositCoinCode: order.depositCoinCode,
                    receiveCoinCode: order.receiveCoinCode,
                    depositCoinAmt: order.depositCoinAmt,
                    receiveCoinAmt: order.receiveCoinAmt,
                    orderState: formatOrderStatus(order.orderState),
                    createdAt: order.createTime,
                    nextSteps: [
                      `1. Send ${order.depositCoinAmt} ${order.depositCoinCode} to ${order.platformAddr}`,
                      "2. After transaction confirms, call omnibridge_upload_tx with orderId and transaction hash",
                      "3. Use omnibridge_query_order to track order status",
                    ],
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        } catch (error: any) {
          console.error("Error in omnibridge_create_order:", error);
          return {
            content: [{ type: "text", text: `Error: ${error.message}` }],
            isError: true,
          };
        }
      },
    },
    { optional: true },
  );

  // Tool 4: Upload Transaction Hash
  api.registerTool(
    {
      name: "omnibridge_upload_tx",
      description:
        "Upload transaction hash after sending deposit to platform address. This notifies Omnibridge to process the swap. MUST be called after deposit transaction is broadcast and confirmed.",
      parameters: Type.Object({
        orderId: Type.String({
          description: "Order ID from omnibridge_create_order",
        }),
        depositTxid: Type.String({
          description: "Transaction hash of the deposit transaction",
        }),
      }),
      async execute(_id: any, params: any) {
        try {
          const result = await client.uploadTxHash({
            orderId: params.orderId,
            depositTxid: params.depositTxid,
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    result,
                    message:
                      "Transaction hash uploaded successfully. Use omnibridge_query_order to track progress.",
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        } catch (error: any) {
          console.error("Error in omnibridge_upload_tx:", error);
          return {
            content: [{ type: "text", text: `Error: ${error.message}` }],
            isError: true,
          };
        }
      },
    },
    { optional: true },
  );

  // Tool 5: Query Order Status
  api.registerTool(
    {
      name: "omnibridge_query_order",
      description:
        "Query order status and details. Returns current order state, transaction hashes, amounts, and timestamps. Use this to track swap progress.",
      parameters: Type.Object({
        orderId: Type.String({
          description: "Order ID from omnibridge_create_order",
        }),
      }),
      async execute(_id: any, params: any) {
        try {
          const status = await client.queryOrderStatus({
            orderId: params.orderId,
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    orderId: status.orderId,
                    orderState: formatOrderStatus(status.orderState),
                    detailState: formatDetailState(status.detailState),
                    depositCoinState: status.depositCoinState,
                    deposit: {
                      amount: status.depositCoinAmt,
                      coinCode: status.depositCoinCode,
                      feeAmt: status.depositCoinFeeAmt,
                      feeRate: status.depositCoinFeeRate,
                      txHash: status.depositTxid,
                      explorer: status.depositHashExplore,
                    },
                    receive: {
                      amount: status.receiveCoinAmt,
                      actualAmount: status.dealReceiveCoinAmt,
                      coinCode: status.receiveCoinCode,
                      txHash: status.transactionId,
                      explorer: status.receiveHashExplore,
                      address: status.destinationAddr,
                    },
                    refund: status.refundCoinAmt
                      ? {
                          amount: status.refundCoinAmt,
                          reason: status.refundReason,
                          explorer: status.refundHashExplore,
                        }
                      : null,
                    timing: {
                      created: status.createTime,
                      platform: status.platformAddr,
                    },
                    instantRate: status.instantRate,
                    chainFee: status.chainFee,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        } catch (error: any) {
          console.error("Error in omnibridge_query_order:", error);
          return {
            content: [{ type: "text", text: `Error: ${error.message}` }],
            isError: true,
          };
        }
      },
    },
    { optional: true },
  );

  api.logger.info?.(`omnibridge: Registered ${5} tools`);
}
