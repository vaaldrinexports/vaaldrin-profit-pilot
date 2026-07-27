import type { ReactNode } from "react";
import { safeHttpUrl } from "@/lib/safe-url";

/**
 * Renders an external link ONLY when the href is a valid http(s) URL.
 * Hostile schemes (javascript:, data:, vbscript:) fall back to plain text,
 * so scraped/AI-sourced URLs can never become a click-to-XSS vector.
 * Always opens with rel="noopener noreferrer" to block reverse-tabnabbing.
 */
export function SafeLink({
  href,
  className,
  title,
  children,
}: {
  href: unknown;
  className?: string;
  title?: string;
  children: ReactNode;
}) {
  const safe = safeHttpUrl(href);
  if (!safe) return <span className={className}>{children}</span>;
  return (
    <a href={safe} target="_blank" rel="noopener noreferrer nofollow" title={title} className={className}>
      {children}
    </a>
  );
}
