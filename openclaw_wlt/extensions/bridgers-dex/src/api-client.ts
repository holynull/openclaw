/**
 * Bridgers DEX API Client
 *
 * Provides TypeScript client for Bridgers API
 * Base URL: https://api.bridgers.xyz
 * All requests use POST method with application/json
 */

import axios from "axios";

const BRIDGERS_BASE_URL = "https://api.bridgers.xyz";

export enum BridgersResponseCode {
  SUCCESS = 100,
  FAILURE = 101,
}

export interface BridgersResponse<T = any> {
  resCode: number; // API returns numeric code
  resMsg: string;
  data?: T;
}

export interface TokenInfo {
  chain: string;
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  logoURI: string;
  isCrossEnable: string;
  withdrawGas: string;
}

export interface QuoteData {
  txData: {
    amountOutMin: string;
    chainFee: string;
    contractAddress: string;
    depositMin: string;
    depositMax: string;
    dex: string;
    fee: number;
    feeToken: string;
    fromTokenAmount: string;
    fromTokenDecimal: number;
    toTokenAmount: string;
    toTokenDecimal: number;
    path: string[];
    logoUrl: string;
  };
}

export interface SwapData {
  txData: {
    data: string;
    to: string;
    value: string;
  };
}

export interface OrderData {
  orderId: string;
}

export interface OrderStatus {
  id: number;
  orderId: string;
  fromTokenAddress: string;
  toTokenAddress: string;
  fromTokenAmount: string;
  toTokenAmount: string;
  fromAddress: string;
  toAddress: string;
  slippage: string;
  fromChain: string;
  toChain: string;
  hash: string;
  depositHashExplore: string;
  dexName: string;
  status: string;
  createTime: string;
  source: string;
  toHash: string;
  receiveHashExplore: string;
  equipmentNo: string;
  refundCoinAmt: string;
  refundHash: string;
  refundHashExplore: string;
  refundReason: string;
  fromCoinCode: string;
  toCoinCode: string;
}

export interface QueryOrdersData {
  list: OrderStatus[];
  total: number;
  pageNo: string;
}

/**
 * Bridgers API Client
 */
export class BridgersClient {
  private sourceFlag: string;
  private sourceType: string;
  private equipmentNo: string;

  constructor(config?: { sourceFlag?: string; sourceType?: string; equipmentNo?: string }) {
    this.sourceFlag = config?.sourceFlag || "catwallet_openclaw";
    this.sourceType = config?.sourceType || "catwallet_openclaw";
    this.equipmentNo = config?.equipmentNo || "";
  }

  async getTokens(): Promise<TokenInfo[]> {
    const response = await axios.post<BridgersResponse<{ tokens: TokenInfo[] }>>(
      `${BRIDGERS_BASE_URL}/api/exchangeRecord/getToken`,
    );

    if (response.data.resCode === BridgersResponseCode.SUCCESS) {
      return response.data.data?.tokens || [];
    }
    throw new Error(`Bridgers API error: ${response.data.resMsg}`);
  }

  async getQuote(params: {
    fromTokenAddress: string;
    toTokenAddress: string;
    fromTokenAmount: string;
    fromTokenChain: string;
    toTokenChain: string;
    userAddr: string;
  }): Promise<QuoteData> {
    const requestParams = {
      ...params,
      equipmentNo: this.equipmentNo,
      sourceFlag: this.sourceFlag,
      sourceType: this.sourceType,
    };

    const response = await axios.post<BridgersResponse<QuoteData>>(
      `${BRIDGERS_BASE_URL}/api/sswap/quote`,
      requestParams,
    );

    console.log(
      "[Bridgers] Quote API Response:",
      JSON.stringify(
        {
          resCode: response.data.resCode,
          resMsg: response.data.resMsg,
          hasData: !!response.data.data,
          dataKeys: response.data.data ? Object.keys(response.data.data) : [],
        },
        null,
        2,
      ),
    );

    if (response.data.resCode === BridgersResponseCode.SUCCESS) {
      return response.data.data!;
    }
    throw new Error(
      `Bridgers quote error: resCode=${response.data.resCode}, resMsg=${response.data.resMsg}`,
    );
  }

  async getSwapData(params: {
    fromTokenAddress: string;
    toTokenAddress: string;
    fromAddress: string;
    toAddress: string;
    fromTokenChain: string;
    toTokenChain: string;
    fromTokenAmount: string;
    amountOutMin: string;
    fromCoinCode: string;
    toCoinCode: string;
  }): Promise<SwapData> {
    const requestParams = {
      ...params,
      equipmentNo: this.equipmentNo,
      sourceType: this.sourceType,
      sourceFlag: this.sourceFlag,
    };

    const response = await axios.post<BridgersResponse<SwapData>>(
      `${BRIDGERS_BASE_URL}/api/sswap/swap`,
      requestParams,
    );

    if (response.data.resCode === BridgersResponseCode.SUCCESS) {
      return response.data.data!;
    }
    throw new Error(`Bridgers swap error: ${response.data.resMsg}`);
  }

  async createOrder(params: {
    hash: string;
    fromTokenAddress: string;
    toTokenAddress: string;
    fromAddress: string;
    toAddress: string;
    fromTokenChain: string;
    toTokenChain: string;
    fromTokenAmount: string;
    amountOutMin: string;
    fromCoinCode: string;
    toCoinCode: string;
  }): Promise<OrderData> {
    const requestParams = {
      ...params,
      sourceFlag: this.sourceFlag,
      sourceType: this.sourceType,
    };

    const response = await axios.post<BridgersResponse<OrderData>>(
      `${BRIDGERS_BASE_URL}/api/exchangeRecord/updateDataAndStatus`,
      requestParams,
    );

    if (response.data.resCode === BridgersResponseCode.SUCCESS) {
      return response.data.data!;
    }
    throw new Error(`Bridgers order creation error: ${response.data.resMsg}`);
  }

  async queryOrders(params: {
    pageNo?: number;
    pageSize?: number;
    fromAddress?: string;
  }): Promise<QueryOrdersData> {
    const requestParams = {
      pageNo: params.pageNo || 1,
      pageSize: params.pageSize || 10,
      fromAddress: params.fromAddress || "",
      equipmentNo: this.equipmentNo,
      sourceType: this.sourceType,
      sourceFlag: this.sourceFlag,
    };

    const response = await axios.post<BridgersResponse<QueryOrdersData>>(
      `${BRIDGERS_BASE_URL}/api/exchangeRecord/getTransData`,
      requestParams,
    );

    if (response.data.resCode === BridgersResponseCode.SUCCESS) {
      return response.data.data!;
    }
    throw new Error(`Bridgers query error: ${response.data.resMsg}`);
  }
}

// Helper functions
export const NATIVE_TOKEN_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

export function formatOrderStatus(status: string): string {
  const statusMap: Record<string, string> = {
    wait_deposit_send: "⏳ 等待存币",
    wait_deposit_send_fail: "❌ 存币失败",
    wait_exchange_push: "🔄 正在兑换中...",
    wait_exchange_return: "🔄 正在兑换中...",
    wait_exchange_return_success: "🔄 正在兑换中...",
    wait_receive_send: "⏳ 兑换完成，等待发币",
    wait_enough_send: "📤 正在发币中...",
    wait_receive_confirm: "⏳ 发币确认中...",
    receive_complete: "✅ 发币完成",
    wait_refund_send: "↩️ 等待退币",
    wait_refund_confirm: "↩️ 退币确认中...",
    refund_complete: "↩️ 退币完成",
    timeout: "⏰ 兑换超时",
    ERROR: "🔄 正在兑换中...",
    wait_for_information: "📞 请联系客服",
  };
  return statusMap[status] || status;
}

export function formatRefundReason(reason: string): string {
  const reasonMap: Record<string, string> = {
    "1": "流动性不足",
    "2": "误差超过阈值",
    "3": "原币维护",
    "4": "黑名单",
    "5": "目标币维护",
    "6": "兑换数量不在范围内",
    "7": "存币超时",
    "8": "与风险地址交互",
  };
  return reasonMap[reason] || reason;
}

export function toAmountWithDecimals(amount: string, decimals: number): string {
  const amountNum = parseFloat(amount);
  if (isNaN(amountNum)) {
    throw new Error("Invalid amount");
  }
  const multiplier = Math.pow(10, decimals);
  const result = Math.floor(amountNum * multiplier);
  return result.toString();
}

export function fromAmountWithDecimals(amount: string, decimals: number): string {
  const amountNum = parseFloat(amount);
  if (isNaN(amountNum)) {
    throw new Error("Invalid amount");
  }
  const divisor = Math.pow(10, decimals);
  const result = amountNum / divisor;
  return result.toFixed(decimals);
}
