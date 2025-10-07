// utils/time.ts
export function formatBangkok(dt: Date | string, locale = "en-TH") {
  const d = typeof dt === "string" ? new Date(dt) : dt;
  const local = d.toLocaleString(locale, {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${local} (GMT+7)`;
}
