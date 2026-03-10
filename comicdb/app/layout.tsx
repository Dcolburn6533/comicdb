import type { Metadata } from "next";
import { Bangers, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const bangers = Bangers({
  variable: "--font-comic-display",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "ComicDB - Vintage Comic Book Database",
  description: "A searchable database of vintage comic books for sale. Add, search, and browse comic book listings with ease.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${bangers.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
