import Stripe from 'stripe';
import logger from '../utils/logger';

import SettingsService from './SettingsService';

export default class StripeService {
  /**
   * Helper to retrieve Stripe instance dynamically from DB settings.
   */
  private static async getStripeClient() {
    const settings = await SettingsService.getGatewaySettings();
    const secretKey = settings.stripeSecretKey || process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';
    return new Stripe(secretKey, {
      apiVersion: '2025-02-24.acacia' as any,
    });
  }
  /**
   * Creates a Stripe Checkout Session for funding an Escrow.
   */
  static async createEscrowFundingCheckout(params: {
    tournamentId: string;
    escrowId: string;
    transactionId: string;
    amountUsd: number;
    successUrl: string;
    cancelUrl: string;
  }) {
    logger.info(`[Stripe] Creating Escrow checkout for Tournament ${params.tournamentId}`);
    const stripe = await this.getStripeClient();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      client_reference_id: params.transactionId, // Our internal transaction ID
      metadata: {
        tournamentId: params.tournamentId,
        escrowId: params.escrowId,
        transactionId: params.transactionId,
        paymentType: 'escrow_funding',
      },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Tournament Escrow Funding`,
              description: `Funding for tournament ID: ${params.tournamentId}`,
            },
            unit_amount: Math.round(params.amountUsd * 100), // Stripe expects cents
          },
          quantity: 1,
        },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    });

    return (session.url as string) || '';
  }

  /**
   * Creates a Stripe Checkout Session for upgrading a Partner Subscription.
   */
  static async createSubscriptionCheckout(params: {
    partnerId: string;
    plan: string;
    priceUsd: number;
    successUrl: string;
    cancelUrl: string;
  }) {
    logger.info(`[Stripe] Creating Subscription checkout for Partner ${params.partnerId} -> ${params.plan}`);
    const stripe = await this.getStripeClient();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription', // Note: If selling recurring, 'subscription'. If one-time upgrade, 'payment'. 
      // Using 'payment' for now to align with existing model logic where an annual/monthly price is paid upfront.
      // We will default to payment unless recurring billing is set up in products.
      metadata: {
        partnerId: params.partnerId,
        plan: params.plan,
        paymentType: 'subscription_upgrade',
      },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${params.plan.toUpperCase()} Plan Subscription`,
            },
            unit_amount: Math.round(params.priceUsd * 100), // Cents
          },
          quantity: 1,
        },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    });

    return (session.url as string) || '';
  }

  /**
   * Validates Stripe webhook requests.
   */
  static async validateWebhookSignature(payload: string | Buffer, signature: string) {
    try {
      const stripe = await this.getStripeClient();
      const settings = await SettingsService.getGatewaySettings();
      const webhookSecret = settings.stripeWebhookSecret || process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder';
      const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      return event;
    } catch (err: any) {
      logger.error(`[Stripe Webhook] Signature validation failed: ${err.message}`);
      throw new Error(`Invalid signature`);
    }
  }
}
