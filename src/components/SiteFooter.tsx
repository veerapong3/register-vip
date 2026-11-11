import Link from "next/link";

type Props = {
  compact?: boolean;
};

export function SiteFooter({ compact = false }: Props) {
  return (
    <footer className={`site-footer${compact ? " is-compact" : ""}`}>
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <p className="site-footer-kicker">VIP SESAO MUK 2569</p>
          <h3>โรงเรียนดอนตาลวิทยา × สพม.มุกดาหาร</h3>
          <p>
            ลงทะเบียนเสื้อกีฬาฟุตบอล VIP กีฬาศึกษาสัมพันธ์ประจำปี 2569
          </p>
        </div>

        <div className="site-footer-grid">
          <div className="site-footer-block site-footer-people">
            <p className="site-footer-label">ผู้ประสานงาน</p>
            <ul className="site-footer-people-list">
              <li>
                <span className="site-footer-role">ผู้อำนวยการ</span>
                <strong className="site-footer-value">บุญเลี่ยม บุญศรี</strong>
              </li>
              <li>
                <span className="site-footer-role">รองผู้อำนวยการ</span>
                <strong className="site-footer-value">วีระพงศ์ ตะโกนอก</strong>
              </li>
            </ul>
          </div>
          <div className="site-footer-block">
            <p className="site-footer-label">ติดต่อ</p>
            <a className="site-footer-link" href="tel:0879463192">
              087-946-3192
            </a>
          </div>
          <div className="site-footer-block">
            <p className="site-footer-label">เมนู</p>
            <div className="site-footer-links">
              <Link href="/">ลงทะเบียน</Link>
              <Link href="/summary">สรุปออเดอร์</Link>
              <Link href="/admin">แอดมิน</Link>
            </div>
          </div>
        </div>

        <div className="site-footer-meta">
          <span className="developer-badge" title="ผู้พัฒนา">
            <span className="developer-badge__ico" aria-hidden>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="8" r="3.2" />
                <path d="M5 19.2c.8-3.2 3.2-4.8 7-4.8s6.2 1.6 7 4.8" />
                <path d="M16.2 14.2 19 17l-1.2 1.2-2.8-2.8" />
              </svg>
            </span>
            <span className="developer-badge__label">ผู้พัฒนา</span>
            <span className="developer-badge__name">Dev V.tak</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
