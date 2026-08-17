// Supabase Edge Function: crash-report
// AyrisLegal Electron uygulamasının merkezi hata/crash raporlama uç noktası.
// Public, anonim POST — auth'a bağımlı DEĞİL (PRD §38: "crash reporting
// authentication'a bağımlı hale getirilmemeli", çünkü uygulama tamamen
// açılmadan/login olmadan da çökebilir). user_id/license_id opsiyonel.
//
// Güvenlik/gizlilik: schema'da olmayan hiçbir alan kabul edilmiyor, sanitize
// EDİLMİŞ olması beklenen error_message/stack_trace burada TEKRAR temizleniyor
// (client'a güvenilmiyor — defense in depth), fingerprint client'tan değil
// sunucuda hesaplanıyor.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const ALLOWED_PROCESS = ["main", "renderer"];
const ALLOWED_EVENT_TYPES = [
  "crash", "uncaught_exception", "unhandled_rejection", "renderer_crash",
  "ipc_error", "license_error", "update_error", "backup_error", "oauth_error", "network_error",
];
const ALLOWED_SEVERITY = ["fatal", "error", "warning", "info"];

const RATE_LIMIT_PER_MINUTE = 10;

function sanitize(text: unknown): string {
  if (typeof text !== "string") return "";
  let out = text.slice(0, 8000);
  // "Authorization: Bearer xxx", "password: xxx" gibi kalıpları maskele.
  out = out.replace(/(authorization|bearer|token|api[_-]?key|password|secret|cookie)\s*[:=]\s*\S+/gi, "$1: [REDACTED]");
  // Olası e-posta adreslerini maskele.
  out = out.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[REDACTED_EMAIL]");
  // Ev dizini kalıplarını maskele (macOS/Windows/Linux).
  out = out.replace(/\/Users\/[^/\s]+/g, "<USER_HOME>");
  out = out.replace(/C:\\Users\\[^\\\s]+/gi, "<USER_HOME>");
  out = out.replace(/\/home\/[^/\s]+/g, "<USER_HOME>");
  return out;
}

async function computeFingerprint(errorName: string, message: string, module: string, appVersion: string): Promise<string> {
  const base = `${errorName}|${message.slice(0, 200)}|${module}|${appVersion}`;
  const data = new TextEncoder().encode(base);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false }), { status: 405, headers: { "Content-Type": "application/json" } });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ success: false }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  // Schema validation — beklenmeyen/eksik alanlar kabul edilmiyor (PRD §37).
  const process_ = ALLOWED_PROCESS.includes(body.process as string) ? (body.process as string) : null;
  const eventType = ALLOWED_EVENT_TYPES.includes(body.event_type as string) ? (body.event_type as string) : null;
  const severity = ALLOWED_SEVERITY.includes(body.severity as string) ? (body.severity as string) : "error";
  const appVersion = typeof body.app_version === "string" ? body.app_version.slice(0, 30) : null;
  const errorObj = (body.error && typeof body.error === "object" ? body.error : {}) as Record<string, unknown>;

  if (!process_ || !eventType || !appVersion) {
    return new Response(JSON.stringify({ success: false }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("SUPABASE_URL veya SUPABASE_SERVICE_ROLE_KEY eksik");
    return new Response(JSON.stringify({ success: false }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  const deviceId = typeof body.device_id === "string" ? body.device_id.slice(0, 100) : null;
  const restHeaders = { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}`, "Content-Type": "application/json" };

  // PRD §34: cihaz başına dakikada 10 istek — crash loop'ların backend'i
  // (ve storage'ı) doldurmasını engeller.
  if (deviceId) {
    const since = new Date(Date.now() - 60_000).toISOString();
    const countRes = await fetch(
      `${SUPABASE_URL}/rest/v1/crash_reports?device_id=eq.${encodeURIComponent(deviceId)}&created_at=gte.${since}&select=id`,
      { headers: { ...restHeaders, Prefer: "count=exact" } }
    );
    const countHeader = countRes.headers.get("content-range"); // "0-9/23" gibi
    const total = countHeader ? parseInt(countHeader.split("/")[1] || "0", 10) : 0;
    if (total >= RATE_LIMIT_PER_MINUTE) {
      return new Response(JSON.stringify({ success: false }), { status: 429, headers: { "Content-Type": "application/json" } });
    }
  }

  const errorName = typeof errorObj.name === "string" ? errorObj.name.slice(0, 200) : "Error";
  const errorMessage = sanitize(errorObj.message);
  const stackTrace = sanitize(errorObj.stack);
  const module_ = typeof body.module === "string" ? body.module.slice(0, 50) : null;
  const eventId = crypto.randomUUID();

  const row = {
    event_id: eventId,
    user_id: typeof body.user_id === "string" ? body.user_id : null,
    license_id: typeof body.license_id === "string" ? body.license_id : null,
    device_id: deviceId,
    app_version: appVersion,
    environment: body.environment === "development" ? "development" : "production",
    electron_version: typeof body.electron_version === "string" ? body.electron_version.slice(0, 30) : null,
    os: typeof body.os === "string" ? body.os.slice(0, 30) : null,
    os_version: typeof body.os_version === "string" ? body.os_version.slice(0, 50) : null,
    architecture: typeof body.architecture === "string" ? body.architecture.slice(0, 20) : null,
    process: process_,
    event_type: eventType,
    severity,
    error_name: errorName,
    error_message: errorMessage,
    stack_trace: stackTrace,
    module: module_,
    fingerprint: await computeFingerprint(errorName, errorMessage, module_ || "", appVersion),
  };

  const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/crash_reports`, {
    method: "POST",
    headers: restHeaders,
    body: JSON.stringify(row),
  });

  if (!insertRes.ok) {
    console.error("crash_reports insert başarısız:", insertRes.status, await insertRes.text());
    return new Response(JSON.stringify({ success: false }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ success: true, event_id: eventId }), { headers: { "Content-Type": "application/json" } });
});
