import { prisma } from './prisma';

type SettingType = 'boolean' | 'number' | 'string';

type SettingDefinition = {
  key: string;
  value: string;
  type: SettingType;
  label: string;
  group: string;
};

const DEFAULT_PLATFORM_SETTINGS: SettingDefinition[] = [
  { key: 'escrowCommunityThresholdUsd', value: '50', type: 'number', label: 'Tournament Community Threshold (USD)', group: 'financial' },
  { key: 'escrowManualProofEnabled', value: 'true', type: 'boolean', label: 'Allow Escrow Manual Proof Review', group: 'general' },
  { key: 'escrowDefaultProvider', value: 'manual', type: 'string', label: 'Escrow Default Provider', group: 'general' },
  { key: 'escrowWebhookSecret', value: 'dev-escrow-secret', type: 'string', label: 'Escrow Webhook Secret', group: 'general' },
  { key: 'escrowReconciliationAlertMinutes', value: '30', type: 'number', label: 'Escrow Reconciliation Alert Minutes', group: 'limits' },
  { key: 'paymentEnv', value: 'sandbox', type: 'string', label: 'Payment Gateway Environment', group: 'gateways' },
  { key: 'stripePublicKey', value: 'pk_test_placeholder', type: 'string', label: 'Stripe Public Key', group: 'gateways' },
  { key: 'stripeSecretKey', value: 'sk_test_placeholder', type: 'string', label: 'Stripe Secret Key', group: 'gateways' },
  { key: 'stripeWebhookSecret', value: 'whsec_test_placeholder', type: 'string', label: 'Stripe Webhook Secret', group: 'gateways' },
  { key: 'momoPartnerCode', value: 'MOMO_TEST', type: 'string', label: 'MoMo Partner Code', group: 'gateways' },
  { key: 'momoAccessKey', value: 'MOMO_ACCESS_TEST', type: 'string', label: 'MoMo Access Key', group: 'gateways' },
  { key: 'momoSecretKey', value: 'MOMO_SECRET_TEST', type: 'string', label: 'MoMo Secret Key', group: 'gateways' },
];

export type EscrowSettings = {
  escrowCommunityThresholdUsd: number;
  escrowManualProofEnabled: boolean;
  escrowDefaultProvider: string;
  escrowWebhookSecret: string;
  escrowReconciliationAlertMinutes: number;
};

export type GatewaySettings = {
  paymentEnv: string;
  stripePublicKey: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  momoPartnerCode: string;
  momoAccessKey: string;
  momoSecretKey: string;
};

export default class SettingsService {
  static async ensureDefaults() {
    await Promise.all(
      DEFAULT_PLATFORM_SETTINGS.map((setting) =>
        prisma.platformSetting.upsert({
          where: { key: setting.key },
          update: {},
          create: setting,
        }),
      ),
    );
  }

  static parseSettingValue(type: SettingType, value: string) {
    if (type === 'boolean') {
      return value === 'true';
    }

    if (type === 'number') {
      return Number(value);
    }

    return value;
  }

  static async getSetting<T = string>(key: string, fallback?: T): Promise<T> {
    const setting = await prisma.platformSetting.findUnique({ where: { key } });
    if (!setting) {
      return fallback as T;
    }

    return this.parseSettingValue(setting.type as SettingType, setting.value) as T;
  }

  static async getEscrowSettings(): Promise<EscrowSettings> {
    await this.ensureDefaults();

    const [threshold, manualProofEnabled, defaultProvider, webhookSecret, alertMinutes] = await Promise.all([
      this.getSetting<number>('escrowCommunityThresholdUsd', 50),
      this.getSetting<boolean>('escrowManualProofEnabled', true),
      this.getSetting<string>('escrowDefaultProvider', 'manual'),
      this.getSetting<string>('escrowWebhookSecret', 'dev-escrow-secret'),
      this.getSetting<number>('escrowReconciliationAlertMinutes', 30),
    ]);

    return {
      escrowCommunityThresholdUsd: threshold,
      escrowManualProofEnabled: manualProofEnabled,
      escrowDefaultProvider: defaultProvider,
      escrowWebhookSecret: webhookSecret,
      escrowReconciliationAlertMinutes: alertMinutes,
    };
  }

  static async updateEscrowSettings(values: Partial<EscrowSettings>, updatedBy?: string) {
    await this.ensureDefaults();

    const updates = Object.entries(values).filter(([, value]) => value !== undefined);

    await Promise.all(
      updates.map(([key, value]) =>
        prisma.platformSetting.update({
          where: { key },
          data: { value: String(value), updatedBy },
        }),
      ),
    );

    return this.getEscrowSettings();
  }

  static async getGatewaySettings(): Promise<GatewaySettings> {
    await this.ensureDefaults();

    const [
      paymentEnv, stripePublicKey, stripeSecretKey, stripeWebhookSecret,
      momoPartnerCode, momoAccessKey, momoSecretKey
    ] = await Promise.all([
      this.getSetting<string>('paymentEnv', 'sandbox'),
      this.getSetting<string>('stripePublicKey', 'pk_test_placeholder'),
      this.getSetting<string>('stripeSecretKey', 'sk_test_placeholder'),
      this.getSetting<string>('stripeWebhookSecret', 'whsec_test_placeholder'),
      this.getSetting<string>('momoPartnerCode', 'MOMO_TEST'),
      this.getSetting<string>('momoAccessKey', 'MOMO_ACCESS_TEST'),
      this.getSetting<string>('momoSecretKey', 'MOMO_SECRET_TEST'),
    ]);

    return {
      paymentEnv, stripePublicKey, stripeSecretKey, stripeWebhookSecret,
      momoPartnerCode, momoAccessKey, momoSecretKey
    };
  }

  static async updateGatewaySettings(values: Partial<GatewaySettings>, updatedBy?: string) {
    await this.ensureDefaults();
    const updates = Object.entries(values).filter(([, value]) => value !== undefined);

    await Promise.all(
      updates.map(([key, value]) =>
        prisma.platformSetting.update({
          where: { key },
          data: { value: String(value), updatedBy },
        }),
      ),
    );

    return this.getGatewaySettings();
  }
}
