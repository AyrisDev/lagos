# Destek Bildirimleri (SMTP E-Posta + Resend + Telegram)

`support-notify` Edge Function'ı; kurumsal e-posta adresiniz (**SMTP**), **Resend API** veya **Telegram** üzerinden anlık bildirim gönderecek şekilde esnek mimaride yapılandırıldı.

İstediğiniz yöntemi (veya hepsini) ortam değişkenlerine ekleyerek aktif edebilirsiniz.

---

## 🛠️ Ortam Değişkenleri (Secrets / Environment Variables)

Supabase Dashboard → **Edge Functions** → **support-notify** → **Secrets** (veya Coolify Environment Variables) alanına ekleyebileceğiniz parametreler:

### ✉️ Yöntem 1: Standart SMTP (Gmail, Yandex, Office365, Outlook, cPanel vb.)
Kendi kurumsal e-posta sunucunuzu kullanmak için:

- `SMTP_HOST`: E-posta sunucu adresi (Örn: `smtp.yandex.com`, `smtp.office365.com`, `mail.sirketiniz.com`, `smtp.gmail.com`)
- `SMTP_PORT`: `587` (TLS) veya `465` (SSL)
- `SMTP_USER`: Gönderici e-posta adresi / kullanıcı adı (Örn: `destek@sirketiniz.com`)
- `SMTP_PASS`: E-posta şifreniz (veya Gmail/Outlook uygulama şifreniz)
- `SMTP_SECURE`: `true` (465 SSL için) veya `false` (587 TLS için)
- `NOTIFICATION_EMAIL_TO`: Destek bildirimlerinin iletileceği e-posta adresi (Örn: `destek@sirketiniz.com`)
- `NOTIFICATION_EMAIL_FROM` *(Opsiyonel)*: Gönderici başlığı (Örn: `Ayris Destek <destek@sirketiniz.com>`)

### 📩 Yöntem 2: Resend API (Alternatif E-Posta Servisi)
SMTP yerine hazır e-posta API servisi kullanmak isterseniz:

- `RESEND_API_KEY`: Resend API Key (`re_123456789...`)
- `NOTIFICATION_EMAIL_TO`: Destek bildirimlerinin gideceği e-posta adresi
- `NOTIFICATION_EMAIL_FROM` *(Opsiyonel)*: Gönderici adresi

### 📱 Yöntem 3: Telegram Botu (Anlık Mesaj Bildirimi)
Telegram grubunuza/kanalınıza anlık bildirim düşmesi için:

- `TELEGRAM_BOT_TOKEN`: `@BotFather`'dan alınan bot tokenı (`123456789:ABCDEF...`)
- `TELEGRAM_CHAT_ID`: Mesajın gideceği Telegram Chat/Group ID'si (`-1001234567890`)

---

## 🚀 Dağıtım / Kurulum (Coolify & Supabase)

1. Updated [`supabase/functions/support-notify/index.ts`](file:///Users/mstfyldz/Github/laawos/supabase/functions/support-notify/index.ts) dosyasını Coolify sunucunuzdaki `volumes/functions/support-notify/index.ts` dizinine koyun.
2. Yukarıdaki değişkenlerden hangilerini kullanmak istiyorsanız Coolify / Supabase Secrets'a ekleyin.
3. Supabase Studio → **Database** → **Webhooks** sekmesinde `support_messages` tablosunun `INSERT` olayında `support-notify` webhook'unun tanımlı olduğunu doğrulayın.
