import type { Metadata } from "next";
import { Bebas_Neue, Sarabun } from "next/font/google";
import "./globals.css";

const sarabun = Sarabun({
  variable: "--font-sarabun",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
});

const bebas = Bebas_Neue({
  variable: "--font-bebas",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "ลงทะเบียนเสื้อ VIP · สพม.มุกดาหาร กีฬาสัมพันธ์ 2569",
  description:
    "ระบบลงทะเบียนสั่งจองเสื้อกีฬา VIP ฟุตบอล กีฬาสัมพันธ์ ประจำปี 2569 จังหวัดมุกดาหาร",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${sarabun.variable} ${bebas.variable} h-full`}>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
