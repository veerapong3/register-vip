import { RegistrationForm } from "@/components/RegistrationForm";

export default function Home() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-4 pb-16 pt-4 sm:px-6">
      <header className="site-header animate-rise">
        <p className="brand-mark">VIP SESAO MUK</p>
        <p className="brand-sub">
          สพม.มุกดาหาร · กีฬาสัมพันธ์ประจำปี 2569 · เสื้อกีฬาฟุตบอล VIP
        </p>
      </header>

      <main className="mt-4 flex-1">
        <RegistrationForm />
      </main>

      <footer className="mt-10 border-t border-[var(--line)] pt-5 text-center text-xs text-[var(--muted)]">
        สอบถามข้อมูล · academic@dontanwit.ac.th · YO SPORT × สพม.มุกดาหาร
      </footer>
    </div>
  );
}
