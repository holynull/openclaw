/**
 * Omnibridge API Client
 *
 * Provides TypeScript client for Omnibridge cross-chain swap API
 * Base URL: https://api.omnibridge.pro
 * All requests use POST method with application/json
 */

import axios from "axios";

const OMNIBRIDGE_BASE_URL = "https://api.omnibridge.pro";

export enum OmnibridgeResponseCode {
  SUCCESS = "800",
  FAILURE = "900",
}

export interface OmnibridgeResponse<T = any> {
  resCode: string;
  resMsg: string;
  resMsgEn?: string;
  data?: T;
}

export interface CoinInfo {
  coinAllCode: string;
  coinCode: string;
  coinDecimal: number;
  coinImageUrl?: string;
  coinName?: string;
  contact: string; // Contract address
  isSupportAdvanced: string; // "Y" or "N"
  isSupportMemo: string; // "Y" or "N"
  mainNetwork: string; // Chain name: ETH, BSC, POLYGON, etc.
  noSupportCoin?: string;
}

export interface FeeRateInfo {
  chainFee: string; // Cross-chain fee
  depositCoinFeeRate: string; // Platform fee rate
  depositMax: string; // Max swap amount
  depositMin: string; // Min swap amount
  instantRate: string; // Exchange rate
  burnRate: string; // Burn rate
  isSupportNoGas?: boolean; // Support gas-free redemption
  isSupport?: boolean; // Whether swap is supported
}

export interface OrderData {
  orderId: string;
  platformAddr: string; // Deposit address
  depositCoinCode: string;
  receiveCoinCode: string;
  depositCoinAmt: string;
  receiveCoinAmt: string;
  depositCoinFeeAmt: string;
  depositCoinFeeRate: string;
  chainFee: string;
  instantRate: string;
  orderState: string; // wait_deposits, wait_send, complete, timeout, refund
  detailState: string; // Detailed status code
  createTime: string;
  destinationAddr: string;
  refundAddr: string;
  depositTxid?: string;
  transactionId?: string;
}

export interface OrderStatus extends OrderData {
  depositCoinState: string; // wait_send, already_confirm, etc.
  depositHashExplore: string;
  receiveHashExplore: string;
  refundHashExplore?: string;
  dealReceiveCoinAmt?: string;
  refundCoinAmt?: string;
  refundReason?: string;
  burnRate: string;
}

// Native token placeholder address
export const NATIVE_TOKEN_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

/**
 * Omnibridge API Client
 */
export class OmnibridgeClient {
  private sourceFlag: string;
  private sourceType: string;
  private equipmentNo: string;

  constructor(config?: { sourceFlag?: string; sourceType?: string; equipmentNo?: string }) {
    this.sourceFlag = config?.sourceFlag || "catwallet_openclaw";
    this.sourceType = config?.sourceType || "catwallet_openclaw";
    // Generate a default equipmentNo if not provided (required by API)
    this.equipmentNo = config?.equipmentNo || this.generateEquipmentNo();
  }

  /**
   * Generate a unique equipment identifier
   * Format similar to API documentation example: "zfgryh918f93a19fdg6918a68cf5"
   */
  private generateEquipmentNo(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    return `openclaw-${timestamp}${random}`.substring(0, 32);
  }

  /**
   * Get list of supported coins/tokens
   */
  async getCoinList(params?: {
    supportType?: string; // "advanced" for advanced swap
    mainNetwork?: string; // Filter by chain: ETH, BSC, POLYGON, etc.
  }): Promise<CoinInfo[]> {
    const requestParams = {
      supportType: params?.supportType || "advanced",
      mainNetwork: params?.mainNetwork || "",
      sourceFlag: this.sourceFlag,
    };

    const response = await axios.post<OmnibridgeResponse<CoinInfo[]>>(
      `${OMNIBRIDGE_BASE_URL}/api/v1/queryCoinList`,
      requestParams,
    );

    if (response.data.resCode === OmnibridgeResponseCode.SUCCESS) {
      return response.data.data || [];
    }
    throw new Error(`Omnibridge API error: ${response.data.resMsg || response.data.resMsgEn}`);
  }

  /**
   * Get fee rates and exchange information (quote)
   */
  async getFeeRates(params: {
    depositCoinCode: string; // e.g., "USDT(BSC)" or "ETH"
    receiveCoinCode: string; // e.g., "USDT(ETH)" or "BNB(BSC)"
    depositCoinAmt?: string; // Optional amount for accurate quote
    fixedRate?: string; // "Y" or "N" (default "N")
  }): Promise<FeeRateInfo> {
    const requestParams = {
      ...params,
      sourceFlag: this.sourceFlag,
      fixedRate: params.fixedRate || "N",
    };

    const response = await axios.post<OmnibridgeResponse<FeeRateInfo>>(
      `${OMNIBRIDGE_BASE_URL}/api/v1/getBaseInfo`,
      requestParams,
    );

    console.log(
      "[Omnibridge] FeeRates API Response:",
      JSON.stringify(
        {
          resCode: response.data.resCode,
          resMsg: response.data.resMsg,
          hasData: !!response.data.data,
        },
        null,
        2,
      ),
    );

    if (response.data.resCode === OmnibridgeResponseCode.SUCCESS) {
      if (!response.data.data) {
        throw new Error("No fee rate data returned");
      }
      return response.data.data;
    }
    throw new Error(`Omnibridge API error: ${response.data.resMsg || response.data.resMsgEn}`);
  }

  /**
   * Create swap order
   */
  async createOrder(params: {
    depositCoinCode: string; // e.g., "USDT(BSC)"
    receiveCoinCode: string; // e.g., "USDT(ETH)"
    depositCoinAmt: string; // Amount WITHOUT decimals
    receiveCoinAmt: string; // Expected amount WITHOUT decimals
    destinationAddr: string; // Receiver address
    refundAddr: string; // Refund address
    slippage?: string; // e.g., "0.02" for 2% (optional)
    fixedRate?: string; // "Y" or "N" (default "N")
  }): Promise<OrderData> {
    const requestParams: any = {
      ...params,
      equipmentNo: this.equipmentNo,
      sourceType: this.sourceType,
      sourceFlag: this.sourceFlag,
      slippage: params.slippage || "0.02",
      fixedRate: params.fixedRate || "N",
    };

    console.log("[Omnibridge] CreateOrder API Request:", JSON.stringify(requestParams, null, 2));

    const response = await axios.post<OmnibridgeResponse<OrderData>>(
      `${OMNIBRIDGE_BASE_URL}/api/v2/accountExchange`,
      requestParams,
    );

    console.log(
      "[Omnibridge] CreateOrder API Response:",
      JSON.stringify(
        {
          resCode: response.data.resCode,
          resMsg: response.data.resMsg,
          hasData: !!response.data.data,
        },
        null,
        2,
      ),
    );

    if (response.data.resCode === OmnibridgeResponseCode.SUCCESS) {
      if (!response.data.data) {
        throw new Error("No order data returned");
      }
      return response.data.data;
    }
    throw new Error(`Omnibridge API error: ${response.data.resMsg || response.data.resMsgEn}`);
  }

  /**
   * Upload transaction hash after user sends deposit
   */
  async uploadTxHash(params: {
    orderId: string;
    depositTxid: string; // Transaction hash
  }): Promise<string> {
    const response = await axios.post<OmnibridgeResponse<string>>(
      `${OMNIBRIDGE_BASE_URL}/api/v2/modifyTxId`,
      params,
    );

    if (response.data.resCode === OmnibridgeResponseCode.SUCCESS) {
      return response.data.data || "SUCCESS";
    }
    throw new Error(`Omnibridge API error: ${response.data.resMsg || response.data.resMsgEn}`);
  }

  /**
   * Query order status
   */
  async queryOrderStatus(params: { orderId: string }): Promise<OrderStatus> {
    const requestParams: any = {
      ...params,
      equipmentNo: this.equipmentNo,
      sourceType: this.sourceType,
      sourceFlag: this.sourceFlag,
    };

    const response = await axios.post<OmnibridgeResponse<OrderStatus>>(
      `${OMNIBRIDGE_BASE_URL}/api/v2/queryOrderState`,
      requestParams,
    );

    if (response.data.resCode === OmnibridgeResponseCode.SUCCESS) {
      if (!response.data.data) {
        throw new Error("No order status data returned");
      }
      return response.data.data;
    }
    throw new Error(`Omnibridge API error: ${response.data.resMsg || response.data.resMsgEn}`);
  }
}

/**
 * Helper: Format order status for display
 */
export function formatOrderStatus(status: string): string {
  const statusMap: Record<string, string> = {
    wait_deposits: "⏳ 等待用户存款",
    wait_send: "🔄 处理中",
    complete: "✅ 已完成",
    timeout: "⏱️ 已超时",
    refund: "↩️ 已退款",
  };
  return statusMap[status] || status;
}

/**
 * Helper: Format detailed state for display
 */
export function formatDetailState(detailState: string): string {
  const stateMap: Record<string, string> = {
    wait_deposit_send: "等待用户发送存款交易",
    wait_deposit_confirm: "等待存款交易确认",
    already_confirm: "存款已确认",
    wait_exchange: "等待兑换",
    exchanging: "兑换中",
    wait_send_coin: "等待发送代币",
    receive_complete: "已完成接收",
  };
  return stateMap[detailState] || detailState;
}

/**
 * Helper: Convert amount with decimals
 */
export function toAmountWithDecimals(amount: string | number, decimals: number): string {
  const cleanAmount = typeof amount === "string" ? amount.replace(/,/g, "") : amount.toString();
  const num = parseFloat(cleanAmount);
  if (isNaN(num)) {
    throw new Error(`Invalid amount: ${amount}`);
  }
  const multiplier = Math.pow(10, decimals);
  const result = Math.floor(num * multiplier);
  return result.toString();
}

/**
 * Helper: Convert amount from decimals (for display)
 */
export function fromAmountWithDecimals(amount: string, decimals: number): string {
  const num = parseFloat(amount);
  if (isNaN(num)) {
    throw new Error(`Invalid amount: ${amount}`);
  }
  const divisor = Math.pow(10, decimals);
  return (num / divisor).toFixed(decimals);
}
