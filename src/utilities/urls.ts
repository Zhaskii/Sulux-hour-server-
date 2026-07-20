/** Payload admin + REST API base (e.g. http://localhost:8000). */
export function getPayloadServerURL(): string {
  return (
    process.env.PAYLOAD_SERVER_URL ||
    process.env.NEXT_PUBLIC_SERVER_URL ||
    'http://localhost:8000'
  ).replace(/\/$/, '')
}

function normalizeStorefrontOrigin(url: string): string {
  try {
    const parsed = new URL(url)
    if (parsed.hostname === 'suluxcentre.com') {
      parsed.hostname = 'www.suluxcentre.com'
    }
    return parsed.origin
  } catch {
    return url.replace(/\/$/, '')
  }
}

/** Customer-facing Next.js storefront (e.g. http://localhost:3000). */
export function getStorefrontURL(): string {
  const configured = (
    process.env.STOREFRONT_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '')

  return normalizeStorefrontOrigin(configured)
}

function authEmailLayout(title: string, body: string, actionUrl: string, actionLabel: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border:1px solid #e7e5e4;">
        <tr><td style="padding:32px 28px 8px;text-align:center;">
          <p style="margin:0;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:#78716c;">Sulux Centre</p>
          <h1 style="margin:12px 0 0;font-size:22px;font-weight:400;color:#1c1917;">${title}</h1>
        </td></tr>
        <tr><td style="padding:8px 28px 24px;font-size:14px;line-height:1.6;color:#57534e;font-family:system-ui,sans-serif;">
          ${body}
        </td></tr>
        <tr><td style="padding:0 28px 32px;text-align:center;">
          <a href="${actionUrl}" style="display:inline-block;padding:14px 28px;background:#1c1917;color:#fff;text-decoration:none;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;font-family:system-ui,sans-serif;">${actionLabel}</a>
        </td></tr>
        <tr><td style="padding:0 28px 28px;font-size:11px;line-height:1.5;color:#a8a29e;font-family:system-ui,sans-serif;">
          If the button does not work, copy and paste this link into your browser:<br>
          <a href="${actionUrl}" style="color:#57534e;word-break:break-all;">${actionUrl}</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export function buildVerifyEmailHTML({
  token,
  user,
}: {
  token: string
  user: { email: string; firstName?: string | null }
}): string {
  const url = `${getStorefrontURL()}/verify/${token}`
  const name = user.firstName?.trim() || user.email
  return authEmailLayout(
    'Verify your email',
    `<p>Hi ${name},</p><p>Thanks for joining Sulux Centre. Please confirm your email address to activate your account and sign in.</p>`,
    url,
    'Verify email',
  )
}

export function buildForgotPasswordEmailHTML({
  token,
  user,
}: {
  token: string
  user: { email: string; firstName?: string | null }
}): string {
  const url = `${getStorefrontURL()}/change-password?token=${token}`
  const name = user.firstName?.trim() || user.email
  return authEmailLayout(
    'Reset your password',
    `<p>Hi ${name},</p><p>We received a request to reset your Sulux Centre password. This link expires after a short time. If you did not request a reset, you can ignore this email.</p>`,
    url,
    'Reset password',
  )
}
