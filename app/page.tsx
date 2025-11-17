"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import ChatPanel, { ChatProvider, ChatToggleButton } from "@/components/ChatPanel";

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

const LOADING_STATES = ["Tinkering", "Plotting", "Grounding", "Analyzing"];

export default function Home() {
  const [query, setQuery] = useState("");
  const [currentTopic, setCurrentTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GroupedResults>({});
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<[number, number]>([0, 30]);
  const [browserUrl, setBrowserUrl] = useState<string | null>(null);

  // Animated loading state
  const [loadingStateIndex, setLoadingStateIndex] = useState(0);

  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setLoadingStateIndex((prev) => (prev + 1) % LOADING_STATES.length);
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [loading]);

  // Handle search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setCurrentTopic(query.trim());

    try {
      const res = await fetch("/api/exa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          mode: "auto",
          resultTypes: ["youtube", "twitter", "news", "linkedin", "medium", "reddit", "github"],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch results");
      }

      setResults(data.results || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setResults({});
    } finally {
      setLoading(false);
    }
  };

  const getYouTubeVideoId = (url: string) => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/,
      /youtube\.com\/embed\/([^&\s]+)/,
      /youtube\.com\/v\/([^&\s]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const getYouTubeThumbnail = (url: string) => {
    const videoId = getYouTubeVideoId(url);
    if (!videoId) return null;
    return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
  };

  const getYouTubeEmbedUrl = (url: string) => {
    const videoId = getYouTubeVideoId(url);
    if (!videoId) return url;
    return `https://www.youtube.com/embed/${videoId}`;
  };

  const getEmbedUrl = (url: string) => {
    // Convert YouTube URLs to embed format
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      return getYouTubeEmbedUrl(url);
    }
    // Add other platform conversions here if needed
    return url;
  };

  const getFaviconUrl = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {
      return null;
    }
  };

  const getUniqueDomains = (results: SearchResult[]) => {
    const domains = new Set<string>();
    results.forEach((result) => {
      try {
        const domain = new URL(result.url).hostname;
        domains.add(domain);
      } catch {
        // Skip invalid URLs
      }
    });
    return Array.from(domains).slice(0, 3); // Limit to 3 icons
  };

  // Organize results into columns
  const youtubeResults = results["youtube"] || [];
  const twitterResults = results["twitter"] || [];
  const webResults = [
    ...(results["news"] || []),
    ...(results["linkedin"] || []),
    ...(results["medium"] || []),
    ...(results["reddit"] || []),
    ...(results["github"] || []),
  ];

  return (
    <ChatProvider>
      <div className="flex h-screen overflow-hidden bg-white dark:bg-black">
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <main className={`mx-auto h-full ${currentTopic ? 'max-w-full px-2 py-2' : 'max-w-7xl px-4 py-16'}`}>
        {/* Top Bar with Search - Only show after first search */}
        {currentTopic && (
          <div className="mb-4 flex items-center gap-2 px-2">
            <button
              onClick={() => {
                setCurrentTopic("");
                setResults({});
                setQuery("");
                setBrowserUrl(null);
              }}
              className="flex-shrink-0"
            >
              <Image
                src="/logo.png"
                alt="Exa logo"
                width={24}
                height={24}
                className="h-6 w-auto transition-opacity hover:opacity-80"
              />
            </button>
            {loading && (
              <AnimatePresence mode="wait">
                <motion.span
                  key={loadingStateIndex}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.3 }}
                  className="font-serif text-sm font-normal leading-none text-gray-600 dark:text-gray-400"
                >
                  {LOADING_STATES[loadingStateIndex]}...
                </motion.span>
              </AnimatePresence>
            )}
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={currentTopic}
                  className={`w-full border border-gray-300 px-4 py-2 pr-12 text-sm outline-none transition-colors focus:border-blue-600 dark:border-gray-700 dark:bg-black dark:text-white ${
                    query ? "" : "font-serif placeholder:font-serif"
                  }`}
                />
                <button
                  type="submit"
                  disabled={loading || !query.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 p-1.5 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  <svg
                    className="h-4 w-4"
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
            </form>
            <ChatToggleButton />
          </div>
        )}

        {/* Centered Logo - Only show before first search */}
        {!currentTopic && (
          <div className="mb-8 flex justify-center">
            <div className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="Exa logo"
                width={32}
                height={32}
                className="h-8 w-auto"
              />
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.span
                    key={loadingStateIndex}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.3 }}
                    className="font-serif text-[32px] font-normal leading-none text-black dark:text-white"
                  >
                    {LOADING_STATES[loadingStateIndex]}...
                  </motion.span>
                ) : (
                  <motion.span
                    key="static"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="font-serif text-[32px] font-normal leading-none text-black dark:text-white"
                  >
                    Exa Browser
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Search Bar - Only show before first search */}
        {!currentTopic && (
          <motion.form
            onSubmit={handleSearch}
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="relative mb-4">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for a person, company, or topic..."
                className={`w-full border border-gray-300 px-4 py-3 pr-12 text-base text-black outline-none transition-colors focus:border-blue-600 dark:border-gray-700 dark:bg-black dark:text-white ${
                  query ? "" : "font-serif placeholder:font-serif"
                }`}
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

            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
              >
                {error}
              </motion.div>
            )}
          </motion.form>
        )}

        {/* Results or Browser View */}
        <AnimatePresence mode="wait">
          {browserUrl ? (
            <motion.div
              key="browser"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="mb-2 flex h-[calc(100vh-70px)] flex-col"
            >
              {/* Browser Controls Bar */}
              <div className="flex items-center gap-2 bg-gray-50 p-2 dark:bg-gray-900">
                {/* Back to Results (double arrow left) */}
                <button
                  onClick={() => setBrowserUrl(null)}
                  className="flex items-center justify-center p-2 text-gray-600 transition-colors hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800"
                  aria-label="Back to results"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                    />
                  </svg>
                </button>

                {/* Back Arrow (browser navigation - single arrow) */}
                <button
                  onClick={() => window.history.back()}
                  className="flex items-center justify-center p-2 text-gray-600 transition-colors hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800"
                  aria-label="Go back in browser"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>

                {/* URL Display */}
                <div className="flex-1 bg-white px-3 py-1.5 dark:bg-black">
                  <p className="truncate text-sm text-gray-600 dark:text-gray-400">
                    {browserUrl}
                  </p>
                </div>

                {/* Open in Browser Button */}
                <a
                  href={browserUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center p-2 text-gray-600 transition-colors hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800"
                  aria-label="Open in browser"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              </div>

              {/* Browser Frame */}
              <div className="flex-1 overflow-hidden">
                <iframe
                  src={getEmbedUrl(browserUrl)}
                  className="h-full w-full"
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                  title="Browser"
                />
              </div>
            </motion.div>
          ) : !loading && Object.keys(results).length > 0 ? (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 gap-6 lg:grid-cols-3"
            >
              {/* Videos Column */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="font-serif text-lg font-normal text-black dark:text-white">
                    Videos ({youtubeResults.length})
                  </h2>
                  <div className="flex items-center gap-1">
                    {getUniqueDomains(youtubeResults).map((domain, idx) => {
                      const faviconUrl = getFaviconUrl(`https://${domain}`);
                      return faviconUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={idx}
                          src={faviconUrl}
                          alt={domain}
                          className="h-4 w-4"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : null;
                    })}
                  </div>
                </div>
                <div className="space-y-3">
                  {youtubeResults.map((result, idx) => {
                    const thumbnail = getYouTubeThumbnail(result.url);
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="border border-gray-200 p-3 transition-colors hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700"
                      >
                        <div
                          onClick={() => setBrowserUrl(result.url)}
                          className="group block cursor-pointer"
                        >
                          {thumbnail && (
                            <div className="mb-2 overflow-hidden">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={thumbnail}
                                alt={result.title}
                                className="w-full transition-transform group-hover:scale-105"
                              />
                            </div>
                          )}
                          <h3 className="font-serif mb-1 break-words text-sm font-normal text-blue-600 group-hover:underline dark:text-blue-400">
                            {result.title}
                          </h3>
                          {result.publishedDate && (
                            <p className="text-xs text-gray-500">
                              {new Date(
                                result.publishedDate
                              ).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Social Media Column */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="font-serif text-lg font-normal text-black dark:text-white">
                    Social Media ({twitterResults.length})
                  </h2>
                  <div className="flex items-center gap-1">
                    {getUniqueDomains(twitterResults).map((domain, idx) => {
                      const faviconUrl = getFaviconUrl(`https://${domain}`);
                      return faviconUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={idx}
                          src={faviconUrl}
                          alt={domain}
                          className="h-4 w-4"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : null;
                    })}
                  </div>
                </div>
                <div className="space-y-3">
                  {twitterResults.map((result, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="border border-gray-200 p-3 transition-colors hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700"
                    >
                      <div
                        onClick={() => setBrowserUrl(result.url)}
                        className="group block cursor-pointer"
                      >
                        <h3 className="font-serif mb-1 break-words text-sm font-normal text-blue-600 group-hover:underline dark:text-blue-400">
                          {result.title}
                        </h3>
                        {result.text && (
                          <p className="mb-2 break-words text-xs text-gray-800 dark:text-gray-300">
                            {result.text.slice(0, 150)}
                            {result.text.length > 150 ? "..." : ""}
                          </p>
                        )}
                        {result.publishedDate && (
                          <p className="text-xs text-gray-500">
                            {new Date(
                              result.publishedDate
                            ).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Articles Column */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="font-serif text-lg font-normal text-black dark:text-white">
                    Articles ({webResults.length})
                  </h2>
                  <div className="flex items-center gap-1">
                    {getUniqueDomains(webResults).map((domain, idx) => {
                      const faviconUrl = getFaviconUrl(`https://${domain}`);
                      return faviconUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={idx}
                          src={faviconUrl}
                          alt={domain}
                          className="h-4 w-4"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : null;
                    })}
                  </div>
                </div>
                <div className="space-y-3">
                  {webResults.map((result, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="border border-gray-200 p-3 transition-colors hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700"
                    >
                      <div
                        onClick={() => setBrowserUrl(result.url)}
                        className="group block cursor-pointer"
                      >
                        <h3 className="font-serif mb-1 break-words text-sm font-normal text-blue-600 group-hover:underline dark:text-blue-400">
                          {result.title}
                        </h3>
                        {result.text && (
                          <p className="mb-2 break-words text-xs text-gray-800 dark:text-gray-300">
                            {result.text.slice(0, 120)}
                            {result.text.length > 120 ? "..." : ""}
                          </p>
                        )}
                        {result.publishedDate && (
                          <p className="text-xs text-gray-500">
                            {new Date(
                              result.publishedDate
                            ).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
        </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Footer intentionally removed */}
      </main>
    </div>

        {/* Chat Panel */}
        <ChatPanel />
      </div>
    </ChatProvider>
  );
}
