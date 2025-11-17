"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import ChatPanel, { ChatProvider, ChatToggleButton, useChatPanel } from "@/components/ChatPanel";
import RotatingEarth from "@/components/ui/wireframe-dotted-globe";

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
const SEARCH_SUGGESTIONS = [
  "Barack Obama",
  "Green Seaweed in Malaysia",
  "Fifa World Cup 2026",
  "Transformer Architecture explained"
];

function HomeContent({
  browserUrl,
  setBrowserUrl
}: {
  browserUrl: string | null;
  setBrowserUrl: (url: string | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [currentTopic, setCurrentTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GroupedResults>({});
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<[number, number]>([0, 30]);
  const [useProxy, setUseProxy] = useState(true);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const { isOpen } = useChatPanel();

  // Animated loading state
  const [loadingStateIndex, setLoadingStateIndex] = useState(0);

  // Known domains that block iframe embedding
  const isLikelyBlocked = (url: string | null) => {
    if (!url) return false;
    const blockedDomains = [
      'bbc.com', 'bbc.co.uk',
      'cnn.com', 'nytimes.com',
      'twitter.com', 'x.com',
      'facebook.com', 'instagram.com',
      'linkedin.com',
      'reddit.com',
      'github.com'
    ];
    return blockedDomains.some(domain => url.includes(domain));
  };

  // Check if URL is a video
  const isVideoUrl = (url: string | null) => {
    if (!url) return false;

    // Video streaming platforms
    const videoDomains = [
      'youtube.com', 'youtu.be',
      'vimeo.com',
      'twitch.tv',
      'dailymotion.com',
      'streamable.com',
      'tiktok.com'
    ];

    // Video file extensions
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.m4v'];

    const lowerUrl = url.toLowerCase();
    return videoDomains.some(domain => lowerUrl.includes(domain)) ||
           videoExtensions.some(ext => lowerUrl.endsWith(ext));
  };

  // Auto-enable proxy for known blocked sites, disable for videos
  useEffect(() => {
    if (browserUrl && isVideoUrl(browserUrl)) {
      // Never proxy videos
      setUseProxy(false);
      setIframeLoaded(false);
    } else if (browserUrl && isLikelyBlocked(browserUrl)) {
      setUseProxy(true);
      setIframeLoaded(false);
    } else {
      // Keep proxy on by default, user can toggle off if needed
      setUseProxy(true);
      setIframeLoaded(false);
    }
  }, [browserUrl]);

  // Typewriter effect for placeholder
  const [placeholderText, setPlaceholderText] = useState("");
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setLoadingStateIndex((prev) => (prev + 1) % LOADING_STATES.length);
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [loading]);

  // Typewriter effect
  useEffect(() => {
    if (currentTopic) return; // Don't run if already searched

    const currentSuggestion = SEARCH_SUGGESTIONS[suggestionIndex];

    if (isTyping) {
      if (placeholderText.length < currentSuggestion.length) {
        const timeout = setTimeout(() => {
          setPlaceholderText(currentSuggestion.slice(0, placeholderText.length + 1));
        }, 60);
        return () => clearTimeout(timeout);
      } else {
        const timeout = setTimeout(() => {
          setIsTyping(false);
        }, 2000);
        return () => clearTimeout(timeout);
      }
    } else {
      if (placeholderText.length > 0) {
        const timeout = setTimeout(() => {
          setPlaceholderText(placeholderText.slice(0, -1));
        }, 20);
        return () => clearTimeout(timeout);
      } else {
        setSuggestionIndex((prev) => (prev + 1) % SEARCH_SUGGESTIONS.length);
        setIsTyping(true);
      }
    }
  }, [placeholderText, suggestionIndex, isTyping, currentTopic]);

  // Handle search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const searchQuery = query.trim() || placeholderText || currentTopic;
    if (!searchQuery) return;

    setLoading(true);
    setError(null);
    setCurrentTopic(searchQuery);

    try {
      const res = await fetch("/api/exa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery,
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
            <motion.form
              onSubmit={handleSearch}
              className="flex-1"
              animate={{
                width: isOpen ? 'calc(100% - 384px)' : '100%'
              }}
              transition={{
                type: "spring",
                damping: 25,
                stiffness: 200
              }}
            >
              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={currentTopic}
                  className={`w-full border border-gray-300 px-4 py-2 pr-12 text-sm outline-none transition-colors focus:border-[rgb(18,40,190)] dark:border-gray-700 dark:bg-black dark:text-white ${
                    query ? "" : "font-serif placeholder:font-serif"
                  }`}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-[rgb(18,40,190)] p-1.5 text-white transition-colors hover:bg-[rgb(14,30,150)]"
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
            </motion.form>
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
                    className="font-serif text-[48px] font-normal leading-none text-[rgb(18,40,190)]"
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
                placeholder={placeholderText}
                className={`w-full border border-gray-300 px-4 py-3 pr-12 text-base text-black outline-none transition-colors focus:border-[rgb(18,40,190)] dark:border-gray-700 dark:bg-black dark:text-white ${
                  query ? "" : "font-serif placeholder:font-serif"
                }`}
              />
              <button
                type="submit"
                disabled={loading}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-[rgb(18,40,190)] p-2 text-white transition-colors hover:bg-[rgb(14,30,150)]"
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

        {/* Globe - Only show before first search */}
        <AnimatePresence>
          {!currentTopic && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="mx-auto max-w-3xl"
            >
              <RotatingEarth width={800} height={500} />
            </motion.div>
          )}
        </AnimatePresence>

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
                <div className="flex flex-1 items-center gap-2 bg-white px-3 py-1.5 dark:bg-black">
                  <p className="flex-1 truncate text-sm text-gray-600 dark:text-gray-400">
                    {browserUrl}
                  </p>
                  {useProxy && (
                    <span className="text-xs text-gray-500 dark:text-gray-500">
                      (Proxied)
                    </span>
                  )}
                </div>

                {/* Proxy Toggle Button */}
                <button
                  onClick={() => setUseProxy(!useProxy)}
                  className="flex items-center justify-center p-2 text-sm text-gray-600 transition-colors hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800"
                  aria-label="Toggle proxy mode"
                  title={useProxy ? 'Switch to direct mode' : 'Switch to proxy mode'}
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
                      d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </button>

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
                {useProxy ? (
                  <iframe
                    key={`proxy-${browserUrl}`}
                    src={`/api/proxy?url=${encodeURIComponent(browserUrl)}`}
                    className="h-full w-full"
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                    title="Browser (Proxied)"
                  />
                ) : (
                  <iframe
                    key={`direct-${browserUrl}`}
                    src={getEmbedUrl(browserUrl)}
                    className="h-full w-full"
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                    title="Browser"
                  />
                )}
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
                          <h3 className="font-serif mb-1 break-words text-sm font-normal text-[rgb(18,40,190)] group-hover:underline dark:text-[rgb(18,40,190)]">
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
                        <h3 className="font-serif mb-1 break-words text-sm font-normal text-[rgb(18,40,190)] group-hover:underline dark:text-[rgb(18,40,190)]">
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
                        <h3 className="font-serif mb-1 break-words text-sm font-normal text-[rgb(18,40,190)] group-hover:underline dark:text-[rgb(18,40,190)]">
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
  );
}

export default function Home() {
  const [browserUrl, setBrowserUrl] = useState<string | null>(null);

  return (
    <ChatProvider browserUrl={browserUrl}>
      <HomeContent browserUrl={browserUrl} setBrowserUrl={setBrowserUrl} />
    </ChatProvider>
  );
}
