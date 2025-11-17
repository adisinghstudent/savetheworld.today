import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const arizonaFlare = localFont({
  src: "../public/fonts/ABCArizonaFlare.ttf",
  variable: "--font-arizona-flare",
  weight: "400",
});

export const metadata: Metadata = {
  title: "Exa Browser",
  description: "Search topics across social platforms",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${arizonaFlare.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
