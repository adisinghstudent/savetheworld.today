"use client";

import { useState } from "react";
import Image from "next/image";

interface SocialProfile {
  platform: string;
  url: string;
  username?: string;
}

interface EntityData {
  name: string;
  description: string;
  website?: string;
  socialProfiles: SocialProfile[];
}

interface SearchResult {
  title: string;
  url: string;
  text?: string;
  author?: string;
  publishedDate?: string;
}

interface GroupedResults {
  [key: string]: SearchResult[];
}

type ViewMode = "socials" | "recents" | "summary";

interface ThemeData {
  theme: string;
  count: number;
  period: string;
}

interface SummaryData {
  hottestTopics: ThemeData[];
  keyQuotes: string[];
  themeTimeline: { period: string; themes: string[] }[];
}

export default function Home() {
  // Step 1: Entity Search
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [entityData, setEntityData] = useState<EntityData | null>(null);

  // Step 2: Results View
  const [viewMode, setViewMode] = useState<ViewMode>("socials");
  const [results, setResults] = useState<GroupedResults>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 3: Timeline & Summary
  const [dateRange, setDateRange] = useState<[number, number]>([0, 30]); // days ago
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Search for entity and show confirmation card
  const handleEntitySearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    setError(null);

    try {
      const res = await fetch("/api/entity/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to find entity");
      }

      setEntityData(data.entity);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSearching(false);
    }
  };

  // Confirm entity and fetch socials
  const handleConfirmEntity = async () => {
    if (!entityData) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/entity/socials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityName: entityData.name,
          socialProfiles: entityData.socialProfiles,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch socials");
      }

      setResults(data.results || {});
      setViewMode("socials");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Switch to Recents view (filtered)
  const handleRecentsView = async () => {
    if (!entityData || viewMode === "recents") return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/entity/recents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityName: entityData.name,
          socialProfiles: entityData.socialProfiles,
          dateRange,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch recents");
      }

      setResults(data.results || {});
      setViewMode("recents");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Generate AI Summary
  const handleSummaryView = async () => {
    if (viewMode === "summary") return;

    setSummaryLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          results,
          entityName: entityData?.name,
          dateRange,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate summary");
      }

      setSummaryData(data.summary);
      setViewMode("summary");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSummaryLoading(false);
    }
  };

  // Reset to search
  const handleReset = () => {
    setEntityData(null);
    setResults({});
    setViewMode("socials");
    setSummaryData(null);
    setQuery("");
  };

  const totalResults = Object.values(results).reduce(
    (sum, arr) => sum + arr.length,
    0
  );

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <main className="mx-auto max-w-6xl px-4 py-16">
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
              exa sentiment
            </span>
          </div>
        </div>

        {/* Step 1: Entity Search (No confirmation yet) */}
        {!entityData && Object.keys(results).length === 0 && (
          <form onSubmit={handleEntitySearch} className="mb-8">
            <div className="relative mb-4">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for a person, company, or topic..."
                className="w-full border border-gray-300 px-4 py-3 pr-12 text-base text-black outline-none transition-colors focus:border-blue-600 dark:border-gray-700 dark:bg-black dark:text-white"
              />
              <button
                type="submit"
                disabled={searching || !query.trim()}
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

            {searching && (
              <div className="text-center text-gray-600 dark:text-gray-400">
                Searching for entity...
              </div>
            )}

            {error && !entityData && (
              <div className="border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
                {error}
              </div>
            )}
          </form>
        )}

        {/* Step 2: Entity Confirmation Card */}
        {entityData && Object.keys(results).length === 0 && (
          <div className="mx-auto max-w-2xl">
            <div className="border border-gray-300 p-6 dark:border-gray-700">
              <h2 className="mb-4 text-2xl font-semibold text-black dark:text-white">
                Is this who you meant?
              </h2>

              <div className="mb-4">
                <h3 className="text-xl font-medium text-black dark:text-white">
                  {entityData.name}
                </h3>
                {entityData.description && (
                  <p className="mt-2 text-gray-700 dark:text-gray-300">
                    {entityData.description}
                  </p>
                )}
              </div>

              {entityData.website && (
                <div className="mb-4">
                  <a
                    href={entityData.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {entityData.website}
                  </a>
                </div>
              )}

              {entityData.socialProfiles.length > 0 && (
                <div className="mb-6">
                  <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Social Profiles:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {entityData.socialProfiles.map((profile, idx) => (
                      <a
                        key={idx}
                        href={profile.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900"
                      >
                        {profile.platform}
                        {profile.username && ` (@${profile.username})`}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleConfirmEntity}
                  disabled={loading}
                  className="border border-blue-600 bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Loading..." : "Confirm & Continue"}
                </button>
                <button
                  onClick={handleReset}
                  className="border border-gray-300 px-6 py-2 text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900"
                >
                  Search Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Results View with Three Buttons */}
        {entityData && Object.keys(results).length > 0 && (
          <div>
            {/* Header with entity name and reset */}
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-2xl font-semibold text-black dark:text-white">
                {entityData.name}
              </h1>
              <button
                onClick={handleReset}
                className="text-sm text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white"
              >
                ← New Search
              </button>
            </div>

            {/* Three Button Navigation */}
            <div className="mb-6 flex gap-3">
              <button
                onClick={() => viewMode !== "socials" && handleConfirmEntity()}
                className={`border px-6 py-2 transition-colors ${
                  viewMode === "socials"
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900"
                }`}
              >
                Socials {viewMode === "socials" && `(${totalResults})`}
              </button>
              <button
                onClick={handleRecentsView}
                disabled={loading}
                className={`border px-6 py-2 transition-colors disabled:opacity-50 ${
                  viewMode === "recents"
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900"
                }`}
              >
                Recents {viewMode === "recents" && `(${totalResults})`}
              </button>
              <button
                onClick={handleSummaryView}
                disabled={summaryLoading}
                className={`border px-6 py-2 transition-colors disabled:opacity-50 ${
                  viewMode === "summary"
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900"
                }`}
              >
                {summaryLoading ? "Analyzing..." : "AI Summary"}
              </button>
            </div>

            {/* Timeline Slider (for Recents and Summary) */}
            {(viewMode === "recents" || viewMode === "summary") && (
              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Date Range: Last {dateRange[1]} days
                </label>
                <input
                  type="range"
                  min="1"
                  max="90"
                  value={dateRange[1]}
                  onChange={(e) =>
                    setDateRange([0, parseInt(e.target.value)])
                  }
                  className="w-full"
                />
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="text-center text-gray-600 dark:text-gray-400">
                Loading {viewMode}...
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
                {error}
              </div>
            )}

            {/* Socials/Recents Results */}
            {!loading && viewMode !== "summary" && (
              <div className="space-y-8">
                {Object.entries(results).map(([typeId, typeResults]) => (
                  <div key={typeId} className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-gray-200 pb-2 dark:border-gray-800">
                      <h2 className="text-xl font-semibold text-black dark:text-white">
                        {typeId}
                      </h2>
                      <span className="text-sm text-gray-500">
                        ({typeResults.length} results)
                      </span>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      {typeResults.map((result, idx) => (
                        <div
                          key={idx}
                          className="border border-gray-200 p-4 transition-colors hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700"
                        >
                          <a
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group block"
                          >
                            <h3 className="mb-2 break-words font-medium text-blue-600 group-hover:underline dark:text-blue-400">
                              {result.title}
                            </h3>
                            <p className="mb-2 break-all text-xs text-gray-600 dark:text-gray-400">
                              {result.url}
                            </p>
                            {result.text && (
                              <p className="break-words text-sm text-gray-800 dark:text-gray-300">
                                {result.text.slice(0, 200)}
                                {result.text.length > 200 ? "..." : ""}
                              </p>
                            )}
                            {result.publishedDate && (
                              <p className="mt-2 text-xs text-gray-500">
                                {new Date(
                                  result.publishedDate
                                ).toLocaleDateString()}
                              </p>
                            )}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* AI Summary View */}
            {viewMode === "summary" && summaryData && (
              <div className="space-y-6">
                {/* Hottest Topics */}
                <div>
                  <h2 className="mb-4 text-xl font-semibold text-black dark:text-white">
                    🔥 Hottest Topics
                  </h2>
                  <div className="grid gap-3 md:grid-cols-3">
                    {summaryData.hottestTopics.map((topic, idx) => (
                      <div
                        key={idx}
                        className="border border-gray-200 p-4 dark:border-gray-800"
                      >
                        <div className="mb-1 text-lg font-medium text-black dark:text-white">
                          {topic.theme}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {topic.count} mentions · {topic.period}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Key Quotes */}
                <div>
                  <h2 className="mb-4 text-xl font-semibold text-black dark:text-white">
                    💬 Key Quotes
                  </h2>
                  <div className="space-y-3">
                    {summaryData.keyQuotes.map((quote, idx) => (
                      <div
                        key={idx}
                        className="border-l-4 border-blue-600 bg-gray-50 p-4 dark:bg-gray-900"
                      >
                        <p className="italic text-gray-800 dark:text-gray-300">
                          "{quote}"
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Theme Timeline */}
                <div>
                  <h2 className="mb-4 text-xl font-semibold text-black dark:text-white">
                    📊 Theme Evolution
                  </h2>
                  <div className="space-y-4">
                    {summaryData.themeTimeline.map((period, idx) => (
                      <div
                        key={idx}
                        className="border border-gray-200 p-4 dark:border-gray-800"
                      >
                        <div className="mb-2 font-medium text-black dark:text-white">
                          {period.period}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {period.themes.map((theme, themeIdx) => (
                            <span
                              key={themeIdx}
                              className="border border-gray-300 px-2 py-1 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300"
                            >
                              {theme}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 dark:border-gray-800">
        <div className="mx-auto max-w-6xl px-4">
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
