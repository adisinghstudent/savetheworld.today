"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

const PRESET_AMOUNTS = [5, 10, 25, 50];

// Stripe appearance matching site theme
const lightAppearance = {
  theme: "stripe" as const,
  variables: {
    colorPrimary: "rgb(234, 179, 8)",
    colorBackground: "#f8f7f4",
    colorText: "#171717",
    colorDanger: "#ef4444",
    borderRadius: "8px",
    fontFamily:
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  rules: {
    ".Input": {
      border: "1px solid #e5e7eb",
      boxShadow: "none",
    },
    ".Input:focus": {
      border: "1px solid rgb(234, 179, 8)",
      boxShadow: "0 0 0 1px rgb(234, 179, 8)",
    },
  },
};

const darkAppearance = {
  theme: "night" as const,
  variables: {
    colorPrimary: "rgb(234, 179, 8)",
    colorBackground: "#0a0a0a",
    colorText: "#ededed",
    colorDanger: "#ef4444",
    borderRadius: "8px",
    fontFamily:
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  rules: {
    ".Input": {
      border: "1px solid rgba(255,255,255,0.1)",
      boxShadow: "none",
    },
    ".Input:focus": {
      border: "1px solid rgb(234, 179, 8)",
      boxShadow: "0 0 0 1px rgb(234, 179, 8)",
    },
  },
};

function CheckoutForm({
  amount,
  onSuccess,
  onBack,
}: {
  amount: number;
  onSuccess: () => void;
  onBack: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
      redirect: "if_required",
    });

    if (submitError) {
      setError(submitError.message || "Payment failed");
      setLoading(false);
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md p-1 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
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
        <p className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Donating ${amount}
        </p>
      </div>

      <PaymentElement
        options={{
          layout: {
            type: "accordion",
            defaultCollapsed: false,
            spacedAccordionItems: true,
          },
          wallets: {
            applePay: "auto",
            googlePay: "auto",
          },
        }}
      />

      {error && (
        <p className="mt-3 text-xs text-red-500">{error}</p>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[rgb(234,179,8)] px-4 py-3 font-serif text-sm font-normal text-white transition-colors hover:bg-[rgb(202,138,4)] disabled:opacity-50"
      >
        {loading ? (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : (
          <>Donate ${amount}</>
        )}
      </button>

      <div className="mt-3 flex items-center justify-center gap-2">
        <svg
          className="h-3.5 w-3.5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          Secure payment via Stripe
        </span>
      </div>
    </form>
  );
}

type Step = "choose" | "pay" | "success";

export default function SupportButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<Step>("choose");
  const [amount, setAmount] = useState(5);
  const [customAmount, setCustomAmount] = useState("");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [creatingIntent, setCreatingIntent] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Detect dark mode
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  // Reset state when panel closes
  useEffect(() => {
    if (!isOpen) {
      // Small delay so exit animation finishes before resetting
      const t = setTimeout(() => {
        setStep("choose");
        setClientSecret(null);
        setCustomAmount("");
      }, 300);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const createPaymentIntent = useCallback(async (donationAmount: number) => {
    setCreatingIntent(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: donationAmount }),
      });
      const data = await res.json();
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        setAmount(donationAmount);
        setStep("pay");
      }
    } finally {
      setCreatingIntent(false);
    }
  }, []);

  const handlePresetClick = (preset: number) => {
    createPaymentIntent(preset);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(customAmount);
    if (val >= 1 && val <= 1000) {
      createPaymentIntent(val);
    }
  };

  return (
    <>
      {/* Floating Button — bottom left */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-5 left-5 z-50 flex items-center gap-2 rounded-full border border-gray-200 bg-white/90 px-4 py-2.5 shadow-lg backdrop-blur-sm transition-colors hover:border-[rgb(234,179,8)] hover:shadow-xl dark:border-gray-700 dark:bg-black/90 dark:hover:border-[rgb(234,179,8)]"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="text-lg">🌍</span>
        <span className="font-serif text-sm font-normal text-gray-800 dark:text-gray-200">
          Support!
        </span>
      </motion.button>

      {/* Overlay + Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
            />

            {/* Panel */}
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-20 left-5 z-50 w-[400px] overflow-hidden rounded-2xl border border-gray-200 bg-[#f8f7f4] shadow-2xl dark:border-gray-800 dark:bg-[#0a0a0a]"
            >
              {/* Header */}
              <div className="relative border-b border-gray-200 px-6 py-5 dark:border-gray-800">
                <button
                  onClick={() => setIsOpen(false)}
                  className="absolute right-4 top-4 rounded-md p-1 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
                <h2 className="font-serif text-xl font-normal text-black dark:text-white">
                  Your Support to Save&nbsp;the&nbsp;World
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                  All proceeds are donated to WWF to protect endangered species,
                  restore habitats, and combat climate change.
                </p>
              </div>

              {/* Body */}
              <div className="px-6 py-5">
                <AnimatePresence mode="wait">
                  {/* Step 1: Choose amount */}
                  {step === "choose" && (
                    <motion.div
                      key="choose"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                    >
                      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
                        Choose your amount
                      </p>

                      <div className="mb-4 grid grid-cols-4 gap-2">
                        {PRESET_AMOUNTS.map((preset) => (
                          <button
                            key={preset}
                            onClick={() => handlePresetClick(preset)}
                            disabled={creatingIntent}
                            className="flex items-center justify-center rounded-lg border border-gray-200 py-2.5 font-serif text-sm text-gray-700 transition-all hover:border-[rgb(234,179,8)] hover:bg-[rgb(234,179,8)]/10 hover:text-[rgb(234,179,8)] disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:border-[rgb(234,179,8)] dark:hover:text-[rgb(234,179,8)]"
                          >
                            ${preset}
                          </button>
                        ))}
                      </div>

                      <div className="relative mb-4">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                          <span className="text-sm text-gray-400">$</span>
                        </div>
                        <form onSubmit={handleCustomSubmit} className="flex gap-2">
                          <input
                            type="number"
                            min="1"
                            max="1000"
                            step="0.01"
                            placeholder="Custom amount"
                            value={customAmount}
                            onChange={(e) => setCustomAmount(e.target.value)}
                            className="flex-1 rounded-lg border border-gray-200 bg-transparent py-2.5 pl-7 pr-3 text-sm text-gray-700 outline-none transition-colors placeholder:text-gray-400 focus:border-[rgb(234,179,8)] dark:border-gray-700 dark:text-gray-300 dark:placeholder:text-gray-600"
                          />
                          <button
                            type="submit"
                            disabled={
                              creatingIntent ||
                              !customAmount ||
                              parseFloat(customAmount) < 1
                            }
                            className="rounded-lg bg-[rgb(234,179,8)] px-4 py-2.5 text-sm text-white transition-colors hover:bg-[rgb(202,138,4)] disabled:opacity-50"
                          >
                            {creatingIntent ? (
                              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            ) : (
                              "Go"
                            )}
                          </button>
                        </form>
                      </div>

                      <div className="flex items-center justify-center gap-2">
                        <svg
                          className="h-3.5 w-3.5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                        </svg>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          Secure payment via Stripe
                        </span>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 2: Embedded payment */}
                  {step === "pay" && clientSecret && (
                    <motion.div
                      key="pay"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Elements
                        stripe={stripePromise}
                        options={{
                          clientSecret,
                          appearance: isDark
                            ? darkAppearance
                            : lightAppearance,
                        }}
                      >
                        <CheckoutForm
                          amount={amount}
                          onSuccess={() => setStep("success")}
                          onBack={() => {
                            setStep("choose");
                            setClientSecret(null);
                          }}
                        />
                      </Elements>
                    </motion.div>
                  )}

                  {/* Step 3: Success */}
                  {step === "success" && (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="flex flex-col items-center py-4 text-center"
                    >
                      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                        <svg
                          className="h-7 w-7 text-green-600 dark:text-green-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                      <h3 className="font-serif text-lg text-black dark:text-white">
                        Thank you!
                      </h3>
                      <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                        Your ${amount} goes directly to WWF to protect
                        endangered species and restore habitats.
                      </p>
                      <button
                        onClick={() => setIsOpen(false)}
                        className="mt-4 rounded-lg border border-gray-200 px-6 py-2 text-sm text-gray-600 transition-colors hover:border-gray-300 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600"
                      >
                        Close
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
