// Supabase Edge Function: app-update
// Elektron uygulamasının otomatik güncelleme sistemi (bkz. electron/lib/updateService.js)
// için sürüm metadata'sı döner. Public, anonim GET — Electron hiçbir zaman
// service_role key görmez, o sadece bu fonksiyonun içinde (ortam değişkeni
// olarak) kullanılıyor.
//
// GET /functions/v1/app-update?platform=win32&arch=x64&current_version=1.0.0
//
// app_releases tablosu (bkz. sql/12_app_releases.sql) RLS ile client erişimine
// tamamen kapalı — sadece burada, service_role ile okunuyor.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

interface ReleaseRow {
  version: string;
  minimum_version: string;
  mandatory: boolean;
  release_notes: string[];
  published_at: string;
}

// "1.10.0" > "1.9.0" gibi karşılaştırmalar string olarak yanlış sonuç verir —
// PRD'nin istediği gibi semver (basit X.Y.Z) parça parça sayısal karşılaştırılıyor.
function compareVersions(a: string, b: string): number {
  const pa = String(a || "0").split(".").map((n) => parseInt(n, 10) || 0);
  const pb = String(b || "0").split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

serve(async (req) => {
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ success: false, error: "METHOD_NOT_ALLOWED" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const platform = url.searchParams.get("platform") || "";
  const currentVersion = url.searchParams.get("current_version") || "0.0.0";

  if (!["win32", "darwin", "linux"].includes(platform)) {
    return new Response(JSON.stringify({ success: false, error: "INVALID_PLATFORM" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("SUPABASE_URL veya SUPABASE_SERVICE_ROLE_KEY eksik");
    return new Response(JSON.stringify({ success: false, error: "SERVER_CONFIGURATION_ERROR" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let latest: ReleaseRow | undefined;
  try {
    const restUrl =
      `${SUPABASE_URL}/rest/v1/app_releases` +
      `?platform=eq.${encodeURIComponent(platform)}` +
      `&order=published_at.desc&limit=1` +
      `&select=version,minimum_version,mandatory,release_notes,published_at`;
    const res = await fetch(restUrl, {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
    });
    if (!res.ok) {
      console.error("app_releases sorgusu başarısız:", res.status, await res.text());
      return new Response(JSON.stringify({ success: false, error: "INTERNAL_SERVER_ERROR" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    const rows: ReleaseRow[] = await res.json();
    latest = rows[0];
  } catch (e) {
    console.error("app_releases isteği hata verdi:", e);
    return new Response(JSON.stringify({ success: false, error: "INTERNAL_SERVER_ERROR" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!latest) {
    return new Response(JSON.stringify({ success: true, update_available: false }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const updateAvailable = compareVersions(currentVersion, latest.version) < 0;
  const belowMinimum = compareVersions(currentVersion, latest.minimum_version || "0.0.0") < 0;

  return new Response(
    JSON.stringify({
      success: true,
      update_available: updateAvailable,
      version: latest.version,
      minimum_version: latest.minimum_version,
      mandatory: updateAvailable && (!!latest.mandatory || belowMinimum),
      release_notes: latest.release_notes || [],
      published_at: latest.published_at,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
