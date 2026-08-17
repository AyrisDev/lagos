# Destek Bildirimleri — Coolify (Self-Hosted) Kurulumu

Coolify üzerinde koşan self-hosted Supabase'de `supabase functions deploy` komutu buluttaki gibi çalışmaz. Edge Function'larınızı konteynerin içine manuel olarak koymanız veya Supabase Database Webhook'u direkt olarak kendi backend'inize yönlendirmeniz gerekir.

İşte en iyi 2 yöntem:

---

## Yöntem 1: Edge Function'ı Coolify Sunucusuna Koymak (Standart Yöntem)

Coolify, Supabase'i Docker Compose ile ayağa kaldırır ve Edge Function'lar için bir klasörü (volume) dışarı bağlar.

**1. Sunucuya Bağlanın**
Coolify'ın kurulu olduğu sunucuya SSH ile bağlanın.

**2. Supabase Klasörünü Bulun**
Coolify'ın Supabase için oluşturduğu klasöre gidin (genellikle `/data/coolify/services/<id>` gibi bir yoldadır).

**3. Dosyayı Kopyalayın**
`volumes/functions` klasörünün içine `support-notify` adında bir klasör açın ve yazdığımız `index.ts` dosyasını içine koyun.
Yol şöyle olmalı: `.../volumes/functions/support-notify/index.ts`

**4. Ortam Değişkenlerini (Secrets) Ekleyin**
Coolify Dashboard'a girin → Supabase servisinizi açın → **Environment Variables** (Çevre Değişkenleri) sekmesine gelin ve şunları ekleyin:
- `TELEGRAM_BOT_TOKEN=123456789:ABCDEF...`
- `TELEGRAM_CHAT_ID=-1001234567890`

**5. Konteyneri Yeniden Başlatın**
Coolify panelinden Supabase'i (veya sadece `edge-runtime` konteynerini) yeniden başlatın.

**6. Webhook'u Ayarlayın**
Supabase Studio (Dashboard) → Database → Webhooks → Yeni Hook oluşturun:
- Table: `support_messages`, Event: `INSERT`
- URL: `http://kong:8000/functions/v1/support-notify` (Konteyner içi ağ adresi)
- Method: `POST`

---

## Yöntem 2: Kendi Backend'inizi Kullanmak (ÖNERİLEN ve EN KOLAYI)

Madem `laawos-backend` adında kendi backend projeniz var, Deno (Edge Functions) ile uğraşmak yerine Supabase Webhook'u direkt **sizin backend'inize** yönlendirebiliriz.

**1. laawos-backend'e bir endpoint ekleyin:**
Backend'inize (Express/NestJS) şöyle bir POST endpoint'i ekleyin:

```typescript
// laawos-backend içinde bir route (örneğin Express.js)
app.post('/api/webhooks/support-notify', async (req, res) => {
  const payload = req.body;
  if (payload.type !== 'INSERT') return res.send('OK');

  const msg = payload.record;
  const text = `🔔 *Yeni Destek Mesajı* \nKonu: ${msg.subject}\nMesaj: ${msg.message}`;

  // Telegram API'ye istek atın
  await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    chat_id: process.env.TELEGRAM_CHAT_ID,
    text: text,
    parse_mode: 'Markdown'
  });

  res.send({ success: true });
});
```

**2. Supabase Webhook'u Yönlendirin:**
Supabase Studio → Database → Webhooks ekranından Webhook URL'sini kendi backend'inize yönlendirin:
`https://api.ayrislegal.com/api/webhooks/support-notify` (Kendi domaininiz)

---

### Hangisini Seçmeli?
- Sadece Supabase'in kendi altyapısında kalsın diyorsanız **Yöntem 1**.
- Sunucuya SSH ile girmek istemiyorum, zaten kendi Node.js backend'im var diyorsanız **Yöntem 2**.
