"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import ChatPanel from "@/components/ChatPanel";

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
    <div className="min-h-screen bg-white dark:bg-black">
      <main className="mx-auto max-w-7xl px-4 py-16">
        {/* Animated Logo */}
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

        {/* Current Topic */}
        {currentTopic && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 text-center"
          >
            <h1 className="font-serif text-xl font-normal text-gray-700 dark:text-gray-300">
              {currentTopic}
          </h1>
          </motion.div>
        )}

        {/* Search Bar */}
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

        {/* Results or Browser View */}
        <AnimatePresence mode="wait">
          {browserUrl ? (
            <motion.div
              key="browser"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Back Button */}
              <button
                onClick={() => setBrowserUrl(null)}
                className="mb-4 flex items-center gap-2 border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900"
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
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                Back to Results
              </button>

              {/* Browser Frame */}
              <div className="border border-gray-300 dark:border-gray-700">
                {/* URL Bar */}
                <div className="border-b border-gray-300 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
                  <p className="truncate text-sm text-gray-600 dark:text-gray-400">
                    {browserUrl}
          </p>
        </div>
                {/* iframe */}
                <div className="h-[calc(100vh-300px)]">
                  <iframe
                    src={browserUrl}
                    className="h-full w-full"
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                    title="Browser"
                  />
                </div>
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
              {/* YouTube Column */}
              <div className="space-y-3">
                <h2 className="font-serif text-lg font-normal text-black dark:text-white">
                  📺 YouTube ({youtubeResults.length})
                </h2>
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

              {/* Twitter/X Column */}
              <div className="space-y-3">
                <h2 className="font-serif text-lg font-normal text-black dark:text-white">
                  🐦 Twitter/X ({twitterResults.length})
                </h2>
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

              {/* Web/Other Column */}
              <div className="space-y-3">
                <h2 className="font-serif text-lg font-normal text-black dark:text-white">
                  🌐 Web ({webResults.length})
                </h2>
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
      </main>

      {/* Footer shown before user searches */}
      {!currentTopic && (
        <footer className="border-t border-gray-200 py-8 dark:border-gray-800">
          <div className="mx-auto max-w-7xl px-4">
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
      )}

      {/* Chat Panel */}
      <ChatPanel />
    </div>
  );
}
