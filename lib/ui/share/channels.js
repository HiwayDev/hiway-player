// Share channel URL builders. Each builder returns the URL the social
// network expects when "share" is clicked, with a UTM-tagged shareUrl
// and (optionally) a prepopulated message.

const withUtm = (url, channel) => {
  try {
    const u = new URL(url, typeof window !== "undefined" ? window.location.href : "https://localhost");
    u.searchParams.set("utm_source", channel);
    u.searchParams.set("utm_medium", "share");
    u.searchParams.set("utm_campaign", "video");
    return u.toString();
  } catch {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}utm_source=${channel}&utm_medium=share&utm_campaign=video`;
  }
};

const appendStartAt = (url, startSeconds) => {
  if (!startSeconds || startSeconds < 1) return url;
  try {
    const u = new URL(url, typeof window !== "undefined" ? window.location.href : "https://localhost");
    u.searchParams.set("t", String(Math.floor(startSeconds)));
    return u.toString();
  } catch {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}t=${Math.floor(startSeconds)}`;
  }
};

export const BuildShareUrl = ({ baseUrl, channel, startSeconds }) => {
  const tagged = withUtm(baseUrl, channel);
  return appendStartAt(tagged, startSeconds);
};

const defaultTemplates = {
  facebook: ({ url }) =>
    `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  x: ({ url, title }) =>
    `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}${
      title ? `&text=${encodeURIComponent(title)}` : ""
    }`,
  linkedin: ({ url }) =>
    `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  whatsapp: ({ url, title }) =>
    `https://wa.me/?text=${encodeURIComponent(`${title ? title + " " : ""}${url}`)}`,
  email: ({ url, title }) =>
    `mailto:?subject=${encodeURIComponent(title || "Watch this")}&body=${encodeURIComponent(
      `${title ? title + "\n\n" : ""}${url}`
    )}`,
};

export const ResolveChannelUrl = ({ channel, baseUrl, title, startSeconds, templates }) => {
  const merged = { ...defaultTemplates, ...(templates || {}) };
  const builder = merged[channel];
  if (!builder) return null;
  const taggedUrl = BuildShareUrl({ baseUrl, channel, startSeconds });
  return builder({ url: taggedUrl, title });
};

export const BuildEmbedCode = ({ embedSrc, startSeconds }) => {
  if (!embedSrc) return null;
  const src = appendStartAt(embedSrc, startSeconds);
  return `<iframe src="${src}" width="560" height="315" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowfullscreen frameborder="0"></iframe>`;
};

// Channels rendered in order. `key` matches templates map; `label` is the
// visible name; `mode` is "social" (open in new tab) or "embed" (swap URL
// field for the iframe code).
export const SHARE_CHANNELS = [
  { key: "embed", label: "Embed", mode: "embed" },
  { key: "facebook", label: "Facebook", mode: "social" },
  { key: "x", label: "X", mode: "social" },
  { key: "linkedin", label: "LinkedIn", mode: "social" },
  { key: "whatsapp", label: "WhatsApp", mode: "social" },
  { key: "email", label: "Email", mode: "social" },
];
