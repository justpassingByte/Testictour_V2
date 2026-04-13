import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key_to_prevent_dev_crash');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS || 'noreply@testictour.com';

interface PasswordResetEmailParams {
  to: string;
  username: string;
  token: string;
  locale?: string;
}

// ── Bilingual content ────────────────────────────────────────
const content = {
  en: {
    subject: 'Reset your TesticTour password',
    greeting: (name: string) => `Hi ${name},`,
    body: 'We received a request to reset your password. Click the button below to set a new password:',
    button: 'Reset Password',
    expiry: 'This link expires in 30 minutes.',
    ignore: "If you didn't request this, you can safely ignore this email.",
    footer: '— The TesticTour Team',
  },
  vi: {
    subject: 'Đặt lại mật khẩu TesticTour',
    greeting: (name: string) => `Xin chào ${name},`,
    body: 'Chúng tôi nhận được yêu cầu đặt lại mật khẩu của bạn. Nhấn nút bên dưới để tạo mật khẩu mới:',
    button: 'Đặt lại mật khẩu',
    expiry: 'Liên kết này sẽ hết hạn sau 30 phút.',
    ignore: 'Nếu bạn không yêu cầu điều này, bạn có thể bỏ qua email này.',
    footer: '— Đội ngũ TesticTour',
  },
};

// ── HTML email template ──────────────────────────────────────
function buildResetEmailHtml(params: PasswordResetEmailParams): string {
  const locale = params.locale === 'vi' ? 'vi' : 'en';
  const t = content[locale];
  const resetUrl = `${FRONTEND_URL}/${locale}/reset-password?token=${params.token}`;

  return `
<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${t.subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#0f0f23;font-family:'Segoe UI',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0f0f23;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:linear-gradient(135deg,#1a1a40 0%,#16163a 100%);border-radius:16px;border:1px solid rgba(139,92,246,0.2);overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 0;text-align:center;">
              <h1 style="margin:0;font-size:24px;font-weight:700;background:linear-gradient(135deg,#a78bfa,#818cf8);-webkit-background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:-0.5px;">
                TesticTour
              </h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:28px 32px;">
              <p style="margin:0 0 16px;color:#e2e8f0;font-size:16px;line-height:1.6;">
                ${t.greeting(params.username)}
              </p>
              <p style="margin:0 0 28px;color:#cbd5e1;font-size:15px;line-height:1.6;">
                ${t.body}
              </p>
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" target="_blank" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#8b5cf6,#6366f1);color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;border-radius:10px;letter-spacing:0.3px;">
                      ${t.button}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:28px 0 0;color:#94a3b8;font-size:13px;line-height:1.6;">
                ${t.expiry}
              </p>
              <p style="margin:8px 0 0;color:#94a3b8;font-size:13px;line-height:1.6;">
                ${t.ignore}
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:0 32px 32px;">
              <hr style="border:none;border-top:1px solid rgba(139,92,246,0.15);margin:0 0 20px;" />
              <p style="margin:0;color:#64748b;font-size:13px;text-align:center;">
                ${t.footer}
              </p>
              <p style="margin:6px 0 0;color:#475569;font-size:12px;text-align:center;">
                testictour.com
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

// ── EmailService ─────────────────────────────────────────────
export default class EmailService {
  /**
   * Send a password reset email with a "Reset Password" button.
   * Never throws — logs errors so the calling endpoint can always return 200.
   */
  static async sendPasswordReset(params: PasswordResetEmailParams): Promise<boolean> {
    const locale = params.locale === 'vi' ? 'vi' : 'en';

    try {
      const { data, error } = await resend.emails.send({
        from: FROM_ADDRESS,
        to: params.to,
        subject: content[locale].subject,
        html: buildResetEmailHtml(params),
      });

      if (error) {
        console.error('[EmailService] Resend API error:', error);
        return false;
      }

      console.log(`[EmailService] Password reset email sent to ${params.to} (id: ${data?.id})`);
      return true;
    } catch (err) {
      console.error('[EmailService] Failed to send password reset email:', err);
      return false;
    }
  }
}
