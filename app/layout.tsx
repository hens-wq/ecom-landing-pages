import type { Metadata } from "next";
import { Assistant } from "next/font/google";
import "./globals.css";

const assistant = Assistant({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-assistant",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "מכללת איקום",
    template: "%s | מכללת איקום",
  },
  description: "מכללת איקום — עמודי נחיתה לקמפיינים ממומנים.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="he" dir="rtl" className={assistant.variable}>
      <body className="min-h-full bg-ink-950 antialiased">{children}</body>
    </html>
  );
}
