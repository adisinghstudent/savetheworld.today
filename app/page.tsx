"use client";

import { useState } from "react";
import Image from "next/image";

interface SearchResult {
  title: string;
  url: string;
  text?: string;
  author?: string;
  publishedDate?: string;
}

interface SearchResponse {
  mode: "auto" | "fast";
  results: {
    results: SearchResult[];
  };
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"auto" | "fast">("auto");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/exa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, mode }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch results");
      }

      setResults(data.results?.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <main className="mx-auto max-w-4xl px-4 py-16">
        {/* Logo */}
        <div className="mb-12 flex justify-center">
          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Exa logo"
              width={32}
              height={32}
              className="h-8 w-auto"
            />
            <span className="text-[32px] font-semibold leading-none text-black dark:text-white">
              exa
            </span>
          </div>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative mb-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find anything..."
              className="w-full border border-gray-300 px-4 py-3 pr-12 text-base text-black outline-none transition-colors focus:border-blue-600 dark:border-gray-700 dark:bg-black dark:text-white"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 p-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setMode(mode === "auto" ? "fast" : "auto")}
              className="flex items-center gap-2 border border-gray-300 px-4 py-2 text-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              <span className="text-black dark:text-white">
                {mode === "fast" ? "Fast Search" : "Auto Search"}
              </span>
            </button>
          </div>
        </form>

        {/* Loading State */}
        {loading && (
          <div className="text-center text-gray-600 dark:text-gray-400">
            Searching...
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {error}
          </div>
        )}

        {/* Results */}
        {!loading && results.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-black dark:text-white">
              Results ({results.length})
            </h2>
            {results.map((result, idx) => (
              <div
                key={idx}
                className="border border-gray-200 p-4 transition-colors hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700"
              >
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group"
                >
                  <h3 className="mb-2 text-lg font-medium text-blue-600 group-hover:underline dark:text-blue-400">
                    {result.title}
                  </h3>
                  <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                    {result.url}
                  </p>
                  {result.text && (
                    <p className="text-sm text-gray-800 dark:text-gray-300">
                      {result.text.slice(0, 300)}
                      {result.text.length > 300 ? "..." : ""}
                    </p>
                  )}
                  {result.publishedDate && (
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                      {new Date(result.publishedDate).toLocaleDateString()}
                    </p>
                  )}
                </a>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && results.length === 0 && query && (
          <div className="text-center text-gray-600 dark:text-gray-400">
            No results found
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 dark:border-gray-800">
        <div className="mx-auto max-w-4xl px-4">
          <nav className="flex justify-center gap-8 text-sm text-gray-600 dark:text-gray-400">
            <a href="/" className="hover:text-black dark:hover:text-white">
              Home
            </a>
            <a
              href="https://docs.exa.ai"
              className="hover:text-black dark:hover:text-white"
            >
              API
            </a>
            <a
              href="https://exa.ai"
              className="hover:text-black dark:hover:text-white"
            >
              Websets
            </a>
            <a
              href="https://exa.ai/careers"
              className="hover:text-black dark:hover:text-white"
            >
              Careers
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
