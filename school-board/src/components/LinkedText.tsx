import type { ReactNode } from "react";

const URL_RE = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
const REPLY_MARKER_RE = /^\s*\[\[square-reply-to:[0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12}\]\]\s*/i;
const TRAILING_PUNCTUATION_RE = /[.,!?;:)\]}>"'’”]+$/;

function splitTrailingPunctuation(value: string) {
  const trailing = value.match(TRAILING_PUNCTUATION_RE)?.[0] ?? "";
  if (!trailing) return { urlText: value, trailing: "" };

  return {
    urlText: value.slice(0, -trailing.length),
    trailing,
  };
}

function toSafeHref(value: string) {
  const href = value.startsWith("www.") ? `https://${value}` : value;

  try {
    const url = new URL(href);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export default function LinkedText({ text }: { text: string | null | undefined }) {
  if (!text) return null;

  text = text.replace(REPLY_MARKER_RE, "");

  const nodes: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(URL_RE)) {
    const raw = match[0];
    const index = match.index ?? 0;

    if (index > lastIndex) {
      nodes.push(text.slice(lastIndex, index));
    }

    const { urlText, trailing } = splitTrailingPunctuation(raw);
    const href = toSafeHref(urlText);

    if (href) {
      nodes.push(
        <a
          key={`${index}-${urlText}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer nofollow ugc"
          className="linkified-url font-semibold transition-colors"
          style={{
            color: "#2563eb",
            textDecorationLine: "underline",
            textDecorationColor: "#2563eb",
            textDecorationThickness: "2px",
            textUnderlineOffset: "2px",
          }}
        >
          {urlText}
        </a>
      );
    } else {
      nodes.push(raw);
    }

    if (trailing) {
      nodes.push(trailing);
    }

    lastIndex = index + raw.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return <>{nodes}</>;
}
