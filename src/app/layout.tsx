import type { Metadata } from "next";
import { Kanit, Oswald } from "next/font/google";
import "./globals.css";

const kanit = Kanit({
  variable: "--font-kanit",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ลงทะเบียนเสื้อ VIP · สพม.มุกดาหาร กีฬาศึกษาสัมพันธ์ 2569",
  description:
    "สั่งจองเสื้อกีฬา VIP ฟุตบอล กีฬาศึกษาสัมพันธ์ ประจำปี 2569 จังหวัดมุกดาหาร ตัวละ 250 บาท",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${kanit.variable} ${oswald.variable} h-full`}>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
