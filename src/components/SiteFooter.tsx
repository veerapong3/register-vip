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
            ลงทะเบียนเสื้อกีฬาฟุตบอล VIP กีฬาสัมพันธ์ประจำปี 2569
          </p>
        </div>

        <div className="site-footer-grid">
          <div>
            <p className="site-footer-label">ผู้ประสานงาน</p>
            <p className="site-footer-value">ผอ.บุญเลี่ยม บุญศรี</p>
            <p className="site-footer-value">รองฯ วีระพงศ์ ตะโกนอก</p>
          </div>
          <div>
            <p className="site-footer-label">ติดต่อ</p>
            <a className="site-footer-link" href="tel:0879463192">
              087-946-3192
            </a>
          </div>
          <div>
            <p className="site-footer-label">เมนู</p>
            <div className="site-footer-links">
              <Link href="/">ลงทะเบียน</Link>
              <Link href="/summary">สรุปออเดอร์</Link>
              <Link href="/admin">แอดมิน</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
