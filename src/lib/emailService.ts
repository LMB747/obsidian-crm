/**
 * Email Service — envoie des documents via Resend API
 * La clé API est stockée dans les paramètres de l'agence (côté client).
 * Pour une app solo/interne, c'est acceptable.
 */

export interface SendEmailParams {
  resendApiKey: string;
  from: string;
  to: string;
  cc?: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendEmailViaResend(params: SendEmailParams): Promise<SendEmailResult> {
  const { resendApiKey, from, to, cc, subject, htmlBody, textBody } = params;

  if (!resendApiKey) {
    return { success: false, error: 'Clé API Resend manquante. Configure-la dans Paramètres > Intégrations.' };
  }
  if (!to) {
    return { success: false, error: 'Adresse email destinataire manquante.' };
  }

  try {
    const payload: Record<string, any> = {
      from,
      to: [to],
      subject,
      html: htmlBody,
    };
    if (cc) payload.cc = [cc];
    if (textBody) payload.text = textBody;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, error: data.message ?? `Erreur Resend: ${res.status}` };
    }

    return { success: true, messageId: data.id };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Erreur réseau lors de l\'envoi.' };
  }
}

/**
 * Construit un HTML email propre depuis le contenu d'un iframe document
 */
export function buildEmailHtml(opts: {
  agencyName: string;
  docType: string;
  docNumero: string;
  clientNom: string;
  montantTTC?: number;
  message: string;
  iframeDoc?: Document | null;
}): string {
  const { agencyName, docType, docNumero, clientNom, montantTTC, message } = opts;
  const montantStr = montantTTC != null
    ? `<p style="font-size:24px;font-weight:bold;color:#7c3aed;margin:16px 0">${montantTTC.toLocaleString('fr-FR')} € TTC</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0e0e22 0%,#1a1a3e 100%);padding:32px 40px">
            <h1 style="color:#ffffff;font-size:22px;margin:0;font-weight:700">${agencyName}</h1>
            <p style="color:#a78bfa;margin:4px 0 0;font-size:14px">${docType} ${docNumero}</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px">
            <p style="color:#1e293b;font-size:16px;margin:0 0 8px">Bonjour ${clientNom},</p>
            <div style="color:#475569;font-size:15px;line-height:1.6;white-space:pre-line;margin:16px 0">${message}</div>
            ${montantStr}
            <div style="background:#f1f5f9;border-radius:12px;padding:20px;margin:24px 0">
              <p style="color:#64748b;font-size:13px;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.05em;font-weight:600">Document joint</p>
              <p style="color:#1e293b;font-size:15px;font-weight:600;margin:0">${docType} ${docNumero}</p>
            </div>
            <p style="color:#94a3b8;font-size:13px;margin:24px 0 0">Pour toute question, répondez directement à cet email.</p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0">
            <p style="color:#94a3b8;font-size:12px;margin:0;text-align:center">${agencyName} · Envoyé via Obsidian CRM</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
