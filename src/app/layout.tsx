import type { Metadata } from "next";
import { Noto_Sans_JP, Shippori_Mincho } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { ToastProvider } from "@/components/Toast";

const notoSans = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-noto-sans",
  display: "swap",
});

const shippori = Shippori_Mincho({
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-shippori",
  display: "swap",
});

export const metadata: Metadata = {
  title: "理想の自分 | 目標管理",
  description:
    "AIとの対話で5年後の理想像から毎日の行動までを接続する目標管理アプリ。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`h-full antialiased ${notoSans.variable} ${shippori.variable}`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
