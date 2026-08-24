import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-heebo",
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
    <html lang="he" dir="rtl" className={`${heebo.variable}`}>
      <body className="min-h-full bg-ink-950 font-[family-name:var(--font-heebo)] antialiased">
        {children}
      </body>
    </html>
  );
}
