"use client";

import { useState } from "react";

interface Decision {
  documentId?: string;
  birimAdi?: string;
  kararTarihiStr?: string;
  esasNo?: string;
  kararNo?: string;
  [key: string]: unknown;
}

export default function SearchPage() {
  const [phrase, setPhrase] = useState("");
  const [results, setResults] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [totalRecords, setTotalRecords] = useState(0);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phrase) return;

    setLoading(true);
    setError("");
    setResults([]);
    setTotalRecords(0);

    try {
      const backendUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/+$/, '').replace(/\/api$/, '');
      const res = await fetch(`${backendUrl}/api/search-precedents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phrase,
          court_types: ["YARGITAYKARARI", "DANISTAYKARAR"],
          page_number: 1,
        }),
      });

      if (!res.ok) {
        throw new Error("Arama yapılırken bir hata oluştu.");
      }

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setResults(data.decisions || []);
      setTotalRecords(data.total_records || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Emsal Karar Arama
          </h1>
          <p className="mt-4 text-lg text-gray-500">
            Yargıtay ve Danıştay kararlarında anahtar kelimeye göre arama yapın.
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-4">
            <input
              type="text"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder="Örn: mülkiyet hakkı..."
              className="flex-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-3 border"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? "Aranıyor..." : "Ara"}
            </button>
          </div>
        </form>

        {/* Error Message */}
        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-8 border border-red-200">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {/* Results */}
        {!loading && results.length > 0 && (
          <div className="space-y-6">
            <p className="text-sm text-gray-600 font-medium">
              Toplam {totalRecords} sonuç bulundu.
            </p>
            {results.map((decision, idx) => (
              <div
                key={idx}
                className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200"
              >
                <div className="px-4 py-5 sm:px-6 flex justify-between items-center border-b border-gray-200 bg-gray-50">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    {decision.birimAdi || "Bilinmeyen Mahkeme"}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {decision.kararTarihiStr || "Tarih Yok"}
                  </span>
                </div>
                <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
                  <span className="text-xs text-gray-500">
                    Esas No: {decision.esasNo || "-"} | Karar No: {decision.kararNo || "-"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && results.length === 0 && !error && (
          <div className="text-center text-gray-500 mt-10">
            Arama yapmak için yukarıdaki kutuyu kullanın.
          </div>
        )}
      </div>
    </div>
  );
}
