// Supabase Edge Function: support-notify
// Tetikleyici: support_messages tablosuna INSERT yapıldığında
// Database Webhook → POST https://<project>.supabase.co/functions/v1/support-notify
//
// Ortam değişkenleri (Supabase Dashboard → Edge Functions → support-notify → Secrets):
//   TELEGRAM_BOT_TOKEN  — @BotFather'dan aldığınız token  (örn. 123456:ABCDEF...)
//   TELEGRAM_CHAT_ID    — Mesajların geleceği chat/group ID (örn. -1001234567890)

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

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
  // Sadece POST isteklerini kabul et
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = Deno.env.get("TELEGRAM_CHAT_ID");

  if (!botToken || !chatId) {
    console.error("TELEGRAM_BOT_TOKEN veya TELEGRAM_CHAT_ID eksik");
    return new Response("Config missing", { status: 500 });
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  // Sadece INSERT olaylarında bildirim gönder
  if (payload.type !== "INSERT") {
    return new Response("OK — non-insert ignored", { status: 200 });
  }

  const msg = payload.record;
  const categoryLabel = CATEGORY_LABELS[msg.category] ?? "📌 " + msg.category;
  const date = new Date(msg.created_at).toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
  });

  const text = [
    `🔔 *Yeni Destek Mesajı — AyrisLegal*`,
    ``,
    `*Kategori:* ${categoryLabel}`,
    `*Konu:* ${escapeMarkdown(msg.subject)}`,
    ``,
    `*Mesaj:*`,
    escapeMarkdown(msg.message),
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
        text,
        parse_mode: "Markdown",
      }),
    }
  );

  if (!telegramRes.ok) {
    const err = await telegramRes.text();
    console.error("Telegram API error:", err);
    return new Response("Telegram error: " + err, { status: 502 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});

// Telegram Markdown v1 özel karakterlerini kaçır
function escapeMarkdown(text: string): string {
  return text.replace(/([_*`\[])/g, "\\$1");
}
