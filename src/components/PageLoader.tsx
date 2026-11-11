type Props = {
  label?: string;
  fullScreen?: boolean;
};

export function PageLoader({
  label = "กำลังโหลดข้อมูล...",
  fullScreen = false,
}: Props) {
  return (
    <div
      className={`page-loader${fullScreen ? " is-fullscreen" : ""}`}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="page-loader-glow" aria-hidden />
      <div className="page-loader-stage">
        <div className="page-loader-ring" aria-hidden>
          <span />
          <span />
          <span />
        </div>
        <div className="page-loader-mark" aria-hidden>
          <strong>VIP</strong>
          <em>2569</em>
        </div>
      </div>
      <p className="page-loader-brand">SESAO MUK</p>
      <p className="page-loader-label">
        {label}
        <span className="page-loader-dots" aria-hidden>
          <i />
          <i />
          <i />
        </span>
      </p>
    </div>
  );
}
