import crypto from 'crypto';
import logger from '../utils/logger';
import axios from 'axios';

import SettingsService from './SettingsService';

// Default endpoint (can be overridden by environment later if needed, or by SettingsService)
const MOMO_ENDPOINT = process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create';

export default class MomoService {
  /**
   * Helper to generate HMAC-SHA256 signature
   */
  private static async generateSignature(rawSignature: string): Promise<string> {
    const settings = await SettingsService.getGatewaySettings();
    return crypto
      .createHmac('sha256', settings.momoSecretKey || process.env.MOMO_SECRET_KEY || 'MOMO_SECRET_KEY_TEST')
      .update(rawSignature)
      .digest('hex');
  }

  /**
   * Helper to execute a payment request to MoMo
   */
  private static async executeMomoRequest(
    orderId: string,
    amount: number,
    orderInfo: string,
    returnUrl: string,
    notifyUrl: string,
    extraData: string = ''
  ) {
    const settings = await SettingsService.getGatewaySettings();
    const partnerCode = settings.momoPartnerCode || process.env.MOMO_PARTNER_CODE || 'MOMO_TEST';
    const accessKey = settings.momoAccessKey || process.env.MOMO_ACCESS_KEY || 'MOMO_ACCESS_KEY_TEST';
    const endpoint = settings.paymentEnv === 'production' 
      ? 'https://payment.momo.vn/v2/gateway/api/create' 
      : MOMO_ENDPOINT;

    const requestId = orderId;
    const requestType = 'captureWallet'; // Default 'pay with wallet' type

    const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${notifyUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${returnUrl}&requestId=${requestId}&requestType=${requestType}`;
    const signature = await this.generateSignature(rawSignature);

    const requestBody = {
      partnerCode,
      partnerName: 'TesticTour',
      storeId: 'TesticTour Store',
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl: returnUrl,
      ipnUrl: notifyUrl,
      lang: 'en',
      requestType,
      autoCapture: true,
      extraData,
      signature,
    };

    logger.debug(`[MoMo] Creating payment request: ${JSON.stringify(requestBody)}`);

    try {
      const result = await axios.post(MOMO_ENDPOINT, requestBody, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (result.data && result.data.payUrl) {
        return result.data.payUrl;
      }
      logger.error(`[MoMo] Missing payUrl in response: ${JSON.stringify(result.data)}`);
      throw new Error('MoMo gateway did not return a payment URL.');
    } catch (err: any) {
      logger.error(`[MoMo] Request failed: ${err.message}`);
      throw err;
    }
  }

  /**
   * Creates a MoMo payment link for an Escrow funding transaction.
   * Note: MoMo uses VND natively. We assume `amountVnd` is correctly scaled.
   */
  static async createEscrowFundingPayment(params: {
    tournamentId: string;
    transactionId: string;
    amountVnd: number;
    returnUrl: string;
    notifyUrl: string; // The webhook our system listens to
  }) {
    logger.info(`[MoMo] Creating Escrow checkout for Tournament ${params.tournamentId}`);
    
    // extraData acts as metadata payload base64 encoded
    const metadata = {
      tournamentId: params.tournamentId,
      transactionId: params.transactionId,
      paymentType: 'escrow_funding'
    };
    const extraData = Buffer.from(JSON.stringify(metadata)).toString('base64');
    
    const payUrl = await this.executeMomoRequest(
      params.transactionId, // we map MoMo's orderId 1:1 to our transactionId
      Math.round(params.amountVnd),
      `Tournament Escrow: ${params.tournamentId}`,
      params.returnUrl,
      params.notifyUrl,
      extraData
    );

    return payUrl;
  }

  /**
   * Creates a MoMo payment link for upgrading a Partner Subscription.
   */
  static async createSubscriptionPayment(params: {
    partnerId: string;
    transactionId: string;
    plan: string;
    amountVnd: number;
    returnUrl: string;
    notifyUrl: string;
  }) {
    logger.info(`[MoMo] Creating Subscription checkout for Partner ${params.partnerId} -> ${params.plan}`);
    
    const metadata = {
      partnerId: params.partnerId,
      transactionId: params.transactionId,
      plan: params.plan,
      paymentType: 'subscription_upgrade'
    };
    const extraData = Buffer.from(JSON.stringify(metadata)).toString('base64');

    const payUrl = await this.executeMomoRequest(
      params.transactionId,
      Math.round(params.amountVnd),
      `Sub Upgrade: ${params.plan.toUpperCase()}`,
      params.returnUrl,
      params.notifyUrl,
      extraData
    );

    return payUrl;
  }

  /**
   * Validates a webhook sent by MoMo via their IPN (Instant Payment Notification).
   */
  static async validateWebhookSignature(payload: any): Promise<boolean> {
    const {
      partnerCode, orderId, requestId, amount, orderInfo, 
      orderType, transId, resultCode, message, payType, 
      responseTime, extraData, signature
    } = payload;

    const settings = await SettingsService.getGatewaySettings();
    const accessKey = settings.momoAccessKey || process.env.MOMO_ACCESS_KEY || 'MOMO_ACCESS_KEY_TEST';

    const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;
    
    const computedSignature = await this.generateSignature(rawSignature);
    
    return computedSignature === signature;
  }
}
