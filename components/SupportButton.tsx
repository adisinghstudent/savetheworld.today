"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const PAYMENT_LINK = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK || "https://donate.stripe.com/test_dRm9AU6JeeyK1Ku62SeAg00";

export default function SupportButton() {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node)
      ) {
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

            {/* Panel rising from bottom-left */}
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-20 left-5 z-50 w-[380px] overflow-hidden rounded-2xl border border-gray-200 bg-[#f8f7f4] shadow-2xl dark:border-gray-800 dark:bg-[#0a0a0a]"
            >
              {/* Header */}
              <div className="relative border-b border-gray-200 px-6 py-5 dark:border-gray-800">
                <button
                  onClick={() => setIsOpen(false)}
                  className="absolute right-4 top-4 rounded-md p-1 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <h2 className="font-serif text-xl font-normal text-black dark:text-white">
                  Your Support to Save&nbsp;the&nbsp;World
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                  Every contribution helps protect endangered species and build AI-powered conservation tools.
                </p>
              </div>

              {/* Stripe Checkout Embed */}
              <div className="px-6 py-5">
                {/* Preset amounts */}
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Choose your amount
                </p>

                <div className="mb-4 grid grid-cols-4 gap-2">
                  {[5, 10, 25, 50].map((amount) => (
                    <a
                      key={amount}
                      href={`${PAYMENT_LINK}?prefilled_amount=${amount * 100}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center rounded-lg border border-gray-200 py-2.5 font-serif text-sm text-gray-700 transition-all hover:border-[rgb(234,179,8)] hover:bg-[rgb(234,179,8)]/10 hover:text-[rgb(234,179,8)] dark:border-gray-700 dark:text-gray-300 dark:hover:border-[rgb(234,179,8)] dark:hover:text-[rgb(234,179,8)]"
                    >
                      ${amount}
                    </a>
                  ))}
                </div>

                {/* Custom amount link */}
                <a
                  href={PAYMENT_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex w-full items-center justify-center gap-2 rounded-lg bg-[rgb(234,179,8)] px-4 py-3 font-serif text-sm font-normal text-white transition-colors hover:bg-[rgb(202,138,4)]"
                >
                  Donate Custom Amount
                  <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </a>

                {/* Trust line */}
                <div className="mt-4 flex items-center justify-center gap-2">
                  <svg className="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    Secure payment via Stripe
                  </span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
