import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

const CATEGORY_LABELS: Record<string, string> = {
  hata: '🐛 Hata Bildirimi',
  geri_bildirim: '💬 Geri Bildirim',
  soru: '❓ Soru',
  diger: '📌 Diğer',
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { category, subject, message, userId, attachmentName } = body;

    if (!subject || !message) {
      return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 });
    }

    const categoryLabel = CATEGORY_LABELS[category] || category || '📌 Destek';
    const dateStr = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = Number(process.env.SMTP_PORT || '587');
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpSecure = process.env.SMTP_SECURE === 'true';
    const emailTo = process.env.NOTIFICATION_EMAIL_TO || process.env.SMTP_USER;
    const emailFrom = process.env.NOTIFICATION_EMAIL_FROM || process.env.SMTP_USER || 'destek@ayrislegal.com';

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    let emailSent = false;
    let telegramSent = false;

    // 1. Send via SMTP if credentials exist
    if (smtpHost && smtpUser && smtpPass && emailTo) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; background-color: #f8fafc; padding: 20px; }
            .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
            .header { background: #1e2a42; color: #ffffff; padding: 24px; text-align: center; }
            .header h2 { margin: 0; font-size: 20px; font-weight: 700; }
            .content { padding: 24px; }
            .field { margin-bottom: 16px; }
            .label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 4px; }
            .value { font-size: 15px; font-weight: 600; color: #0f172a; }
            .message-box { background: #f1f5f9; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 0 8px 8px 0; font-size: 14px; line-height: 1.6; white-space: pre-wrap; margin-top: 8px; }
            .footer { background: #f8fafc; padding: 16px 24px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; }
            .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; background: #e0f2fe; color: #0369a1; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h2>🔔 Yeni Destek Bildirimi</h2>
            </div>
            <div class="content">
              <div class="field">
                <div class="label">Kategori</div>
                <div class="value"><span class="badge">${categoryLabel}</span></div>
              </div>
              <div class="field">
                <div class="label">Konu</div>
                <div class="value">${subject}</div>
              </div>
              <div class="field">
                <div class="label">Mesaj</div>
                <div class="message-box">${message}</div>
              </div>
              ${attachmentName ? `
              <div class="field">
                <div class="label">Ekli Dosya</div>
                <div class="value">📎 ${attachmentName}</div>
              </div>
              ` : ''}
              ${userId ? `
              <div class="field" style="margin-top: 20px;">
                <div class="label">Kullanıcı ID</div>
                <div class="value" style="font-family: monospace; font-size: 13px;">${userId}</div>
              </div>
              ` : ''}
            </div>
            <div class="footer">
              Tarih: ${dateStr} • AyrisLegal Destek Sistemi Otomatik Bildirimidir
            </div>
          </div>
        </body>
        </html>
      `;

      await transporter.sendMail({
        from: emailFrom,
        to: emailTo,
        subject: `[AyrisLegal Destek] ${categoryLabel}: ${subject}`,
        html: emailHtml,
        text: `Yeni Destek Mesajı\n\nKategori: ${categoryLabel}\nKonu: ${subject}\nMesaj: ${message}\nKullanıcı: ${userId || '—'}\nTarih: ${dateStr}`,
      });

      emailSent = true;
    }

    // 2. Send via Telegram if credentials exist
    if (botToken && chatId) {
      const telegramText = [
        `🔔 *Yeni Destek Mesajı — AyrisLegal*`,
        ``,
        `*Kategori:* ${categoryLabel}`,
        `*Konu:* ${subject.replace(/([_*`\[])/g, '\\$1')}`,
        ``,
        `*Mesaj:*`,
        message.replace(/([_*`\[])/g, '\\$1'),
        ...(attachmentName ? [``, `📎 *Ek Dosya:* ${attachmentName.replace(/([_*`\[])/g, '\\$1')}`] : []),
        ``,
        `📅 ${dateStr}`,
        ...(userId ? [`🆔 Kullanıcı: \`${userId}\``] : []),
      ].join('\n');

      const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: telegramText,
          parse_mode: 'Markdown',
        }),
      });

      if (tgRes.ok) {
        telegramSent = true;
      }
    }

    return NextResponse.json({ success: true, emailSent, telegramSent });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Support API Route Error:', errMsg);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
