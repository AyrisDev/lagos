// Supabase Edge Function: support-notify
// Tetikleyici: support_messages tablosuna INSERT yapıldığında
// Database Webhook → POST https://<project>.supabase.co/functions/v1/support-notify
//
// Desteklenen Gönderim Kanalları (İstediğinizi veya hepsini tanımlayabilirsiniz):
//
// 1. SMTP (Örn. Gmail, Yandex, Office365, Outlook, cPanel Kurumsal Mail):
//   SMTP_HOST               — Örn: smtp.yandex.com veya smtp.office365.com veya smtp.gmail.com
//   SMTP_PORT               — Örn: 465 (SSL) veya 587 (TLS)
//   SMTP_USER               — Örn: destek@ayrislegal.com
//   SMTP_PASS               — E-posta şifreniz veya uygulama şifreniz
//   SMTP_SECURE             — "true" (SSL 465 için) veya "false" (TLS 587 için, varsayılan false)
//   NOTIFICATION_EMAIL_TO   — Bildirimin gideceği e-posta (Örn: destek@ayrislegal.com)
//
// 2. RESEND API (Alternatif E-posta API Servisi):
//   RESEND_API_KEY          — Resend API Key (re_123456789...)
//   NOTIFICATION_EMAIL_TO   — Bildirimin gideceği e-posta
//
// 3. TELEGRAM BOT (Anlık Mesaj Bildirimi):
//   TELEGRAM_BOT_TOKEN      — @BotFather tokenı
//   TELEGRAM_CHAT_ID        — Chat / Grup ID
//

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import nodemailer from "npm:nodemailer@6.9.7";

interface SupportMessage {
  id: string;
  user_id: string;
  category: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  attachment_path?: string | null;
  attachment_name?: string | null;
  attachment_size?: number | null;
}

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: SupportMessage;
  schema: string;
  old_record: SupportMessage | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  hata: "🐛 Hata Bildirimi",
  geri_bildirim: "💬 Geri Bildirim",
  soru: "❓ Soru",
  diger: "📌 Diğer",
};

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // Environment variables
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = Deno.env.get("TELEGRAM_CHAT_ID");
  
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  
  const smtpHost = Deno.env.get("SMTP_HOST");
  const smtpPort = Deno.env.get("SMTP_PORT") || "587";
  const smtpUser = Deno.env.get("SMTP_USER");
  const smtpPass = Deno.env.get("SMTP_PASS");
  const smtpSecure = Deno.env.get("SMTP_SECURE") === "true";
  
  const emailTo = Deno.env.get("NOTIFICATION_EMAIL_TO");
  const emailFrom = Deno.env.get("NOTIFICATION_EMAIL_FROM") || Deno.env.get("SMTP_USER") || "Ayris Destek <destek@ayrislegal.com>";

  if (!botToken && !resendApiKey && !smtpHost) {
    console.error("Hiçbir bildirim servisi (SMTP_HOST, RESEND_API_KEY veya TELEGRAM_BOT_TOKEN) tanımlanmamış.");
    return new Response("No notification service configured", { status: 500 });
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (payload.type !== "INSERT") {
    return new Response("OK — non-insert ignored", { status: 200 });
  }

  const msg = payload.record;
  const categoryLabel = CATEGORY_LABELS[msg.category] ?? "📌 " + msg.category;
  const date = new Date(msg.created_at).toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
  });

  const results: { telegram?: boolean; resend?: boolean; smtp?: boolean; errors: string[] } = { errors: [] };

  // 1. TELEGRAM BİLDİRİMİ
  if (botToken && chatId) {
    try {
      const telegramText = [
        `🔔 *Yeni Destek Mesajı — AyrisLegal*`,
        ``,
        `*Kategori:* ${categoryLabel}`,
        `*Konu:* ${escapeMarkdown(msg.subject)}`,
        ``,
        `*Mesaj:*`,
        escapeMarkdown(msg.message),
        ...(msg.attachment_name ? [``, `📎 *Ek Dosya:* ${escapeMarkdown(msg.attachment_name)}`] : []),
        ``,
        `📅 ${date}`,
        `🆔 Kullanıcı: \`${msg.user_id}\``,
      ].join("\n");

      const telegramRes = await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: telegramText,
            parse_mode: "Markdown",
          }),
        }
      );

      if (!telegramRes.ok) {
        const errText = await telegramRes.text();
        results.errors.push("Telegram error: " + errText);
      } else {
        results.telegram = true;
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      results.errors.push("Telegram exception: " + errMsg);
    }
  }

  // HTML ve Düz Metin E-posta Şablonu
  const emailSubject = `[AyrisLegal Destek] ${categoryLabel}: ${msg.subject}`;
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
            <div class="value"><span class="badge">${escapeHtml(categoryLabel)}</span></div>
          </div>
          <div class="field">
            <div class="label">Konu</div>
            <div class="value">${escapeHtml(msg.subject)}</div>
          </div>
          <div class="field">
            <div class="label">Mesaj</div>
            <div class="message-box">${escapeHtml(msg.message)}</div>
          </div>
          ${msg.attachment_name ? `
          <div class="field">
            <div class="label">Ekli Dosya</div>
            <div class="value">📎 ${escapeHtml(msg.attachment_name)} (${msg.attachment_size ? Math.round(msg.attachment_size / 1024) + ' KB' : ''})</div>
          </div>
          ` : ''}
          <div class="field" style="margin-top: 20px;">
            <div class="label">Kullanıcı ID</div>
            <div class="value" style="font-family: monospace; font-size: 13px;">${escapeHtml(msg.user_id)}</div>
          </div>
        </div>
        <div class="footer">
          Tarih: ${date} • AyrisLegal Destek Sistemi Otomatik Bildirimidir
        </div>
      </div>
    </body>
    </html>
  `;

  // 2. SMTP İLE E-POSTA BİLDİRİMİ (Gmail, Yandex, Office365, cPanel, vs.)
  if (smtpHost && smtpUser && smtpPass && emailTo) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(smtpPort),
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from: emailFrom,
        to: emailTo,
        subject: emailSubject,
        html: emailHtml,
        text: `Yeni Destek Mesajı\n\nKategori: ${categoryLabel}\nKonu: ${msg.subject}\nMesaj: ${msg.message}\nKullanıcı: ${msg.user_id}\nTarih: ${date}`
      });

      results.smtp = true;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("SMTP Mail error:", errMsg);
      results.errors.push("SMTP error: " + errMsg);
    }
  }

  // 3. RESEND API İLE E-POSTA BİLDİRİMİ (Eğer SMTP tanımlanmamışsa fallback)
  if (resendApiKey && emailTo && !results.smtp) {
    try {
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: emailFrom,
          to: emailTo.split(",").map(e => e.trim()),
          subject: emailSubject,
          html: emailHtml
        })
      });

      if (!resendRes.ok) {
        const errText = await resendRes.text();
        results.errors.push("Resend error: " + errText);
      } else {
        results.resend = true;
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      results.errors.push("Resend exception: " + errMsg);
    }
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { "Content-Type": "application/json" },
  });
});

function escapeMarkdown(text: string): string {
  return text.replace(/([_*`\[])/g, "\\$1");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
