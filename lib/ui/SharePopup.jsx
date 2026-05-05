// eslint-disable-next-line no-unused-vars
import React, { useEffect, useMemo, useRef, useState } from "react";
import Styles from "../static/stylesheets/share-popup.module.scss";
import * as Icons from "../static/icons/Icons.js";
import {
  BuildEmbedCode,
  BuildShareUrl,
  ResolveChannelUrl,
  SHARE_CHANNELS,
} from "./share/channels.js";

const FormatTimestamp = (totalSeconds) => {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const pad = (n) => n.toString().padStart(2, "0");
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`;
};

// Parse "h:mm:ss", "mm:ss", "ss" or a bare number into seconds.
// Returns null when the input doesn't parse.
const ParseTimestamp = (text) => {
  if (typeof text !== "string") return null;
  const trimmed = text.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(":").map((p) => p.trim());
  if (parts.some((p) => p === "" || !/^\d+$/.test(p))) return null;
  const nums = parts.map(Number);
  let total = 0;
  if (nums.length === 1) total = nums[0];
  else if (nums.length === 2) total = nums[0] * 60 + nums[1];
  else if (nums.length === 3) total = nums[0] * 3600 + nums[1] * 60 + nums[2];
  else return null;
  return total >= 0 ? total : null;
};

const ChannelGlyph = ({ channelKey }) => {
  // Brand glyphs as inline SVG so the popup has no external asset dependencies.
  switch (channelKey) {
    case "embed":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      );
    case "facebook":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 22v-8h2.7l.4-3.1h-3.1V8.9c0-.9.3-1.5 1.6-1.5h1.7V4.6c-.3 0-1.3-.1-2.5-.1-2.4 0-4.1 1.5-4.1 4.2v2.3H7.5V14h2.7v8h3.3z" /></svg>
      );
    case "x":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.7 3h3.2l-7 8 8.2 10h-6.4l-5-6.5L4.8 21H1.6l7.5-8.6L1.2 3h6.6l4.5 6 5.4-6zm-1.1 16h1.8L7.5 4.9H5.6L16.6 19z" /></svg>
      );
    case "linkedin":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.5 8.3v11.5H3V8.3h3.5zM4.7 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM21 19.8h-3.5v-5.6c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9v5.7H10V8.3h3.4v1.6h.05a3.7 3.7 0 0 1 3.4-1.9c3.6 0 4.3 2.4 4.3 5.5v6.3z" /></svg>
      );
    case "whatsapp":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 3.5A10 10 0 0 0 3.6 16.7L2 22l5.5-1.5a10 10 0 0 0 13-15zm-8.4 15.3h-.1c-1.6 0-3.1-.4-4.5-1.2l-.3-.2-3.2.9.9-3.2-.2-.3a8.3 8.3 0 1 1 7.4 4zm4.6-6.2c-.3-.1-1.5-.7-1.7-.8s-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.6.1a6.8 6.8 0 0 1-3.4-3c-.3-.4.3-.4.7-1.4.1-.1 0-.3 0-.4l-.8-2c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.4c-.2.3-.9.9-.9 2.2s.9 2.6 1 2.7a9.5 9.5 0 0 0 4.7 4.2c.6.3 1.1.4 1.5.5.6.2 1.2.2 1.6.1.5-.1 1.5-.6 1.7-1.2s.2-1.1.2-1.2c-.1-.1-.3-.2-.6-.3z" /></svg>
      );
    case "email":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6c0-1.1.9-2 2-2zm0 4 8 5 8-5V6l-8 5-8-5v2z" /></svg>
      );
    default:
      return null;
  }
};

const SharePopup = ({ player, shareConfig, onClose }) => {
  const popupRef = useRef(null);
  const urlInputRef = useRef(null);
  const [startAt, setStartAt] = useState(false);
  const [startSeconds, setStartSeconds] = useState(() =>
    Math.floor(player?.video?.currentTime || 0)
  );
  const [startInput, setStartInput] = useState(() =>
    FormatTimestamp(Math.floor(player?.video?.currentTime || 0))
  );
  const [embedMode, setEmbedMode] = useState(false);
  const [copied, setCopied] = useState(false);

  const baseUrl =
    shareConfig?.baseUrl ||
    (typeof window !== "undefined" ? window.location.href : "");
  const title = shareConfig?.title;
  const embedSrc = shareConfig?.embedSrc;
  const templates = shareConfig?.templates;

  const currentStart = startAt ? startSeconds : 0;

  const shareUrl = useMemo(
    () => BuildShareUrl({ baseUrl, channel: "copy", startSeconds: currentStart }),
    [baseUrl, currentStart]
  );
  const embedCode = useMemo(
    () => BuildEmbedCode({ embedSrc, startSeconds: currentStart }),
    [embedSrc, currentStart]
  );

  const fieldValue = embedMode && embedCode ? embedCode : shareUrl;

  // Reset copied state on field change.
  useEffect(() => { setCopied(false); }, [fieldValue]);

  // Click outside / Escape to close.
  useEffect(() => {
    const onDocClick = (e) => {
      if (!popupRef.current) return;
      if (!popupRef.current.contains(e.target) && !e.target.closest("[data-share-trigger]")) {
        onClose();
      }
    };
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const handleChannel = (channel) => {
    if (channel.mode === "embed") {
      if (!embedSrc) return;
      setEmbedMode(true);
      // Select-all so the iframe code is easy to copy manually.
      requestAnimationFrame(() => {
        urlInputRef.current?.focus();
        urlInputRef.current?.select();
      });
      return;
    }
    const url = ResolveChannelUrl({
      channel: channel.key,
      baseUrl,
      title,
      startSeconds: currentStart,
      templates,
    });
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fieldValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback: select the field for manual copy.
      urlInputRef.current?.focus();
      urlInputRef.current?.select();
    }
  };

  const channels = embedSrc
    ? SHARE_CHANNELS
    : SHARE_CHANNELS.filter((c) => c.key !== "embed");

  return (
    <div
      ref={popupRef}
      className={Styles.popup}
      role="dialog"
      aria-label="Share"
      onClick={(e) => e.stopPropagation()}
    >
      <div className={Styles.header}>
        <h3>Share</h3>
        <button type="button" aria-label="Close" onClick={onClose}>
          <span dangerouslySetInnerHTML={{ __html: Icons.CloseIcon }} />
        </button>
      </div>

      <div className={Styles.channels}>
        {channels.map((c) => (
          <button
            key={c.key}
            type="button"
            className={`${Styles.channel} ${Styles[c.key] || ""}`}
            onClick={() => handleChannel(c)}
          >
            <span className={Styles.icon}>
              <ChannelGlyph channelKey={c.key} />
            </span>
            <span className={Styles.label}>{c.label}</span>
          </button>
        ))}
      </div>

      <div className={Styles.urlRow}>
        {embedMode ? (
          <textarea
            ref={urlInputRef}
            value={fieldValue}
            readOnly
            rows={2}
            onFocus={(e) => e.target.select()}
          />
        ) : (
          <input
            ref={urlInputRef}
            type="text"
            value={fieldValue}
            readOnly
            onFocus={(e) => e.target.select()}
          />
        )}
        <button
          type="button"
          className={`${Styles.copy} ${copied ? Styles.copied : ""}`}
          onClick={handleCopy}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <div className={Styles.startRow}>
        <input
          id="share-start-at"
          type="checkbox"
          checked={startAt}
          onChange={(e) => setStartAt(e.target.checked)}
        />
        <label htmlFor="share-start-at">Start at</label>
        <input
          type="text"
          inputMode="numeric"
          aria-label="Start time"
          className={Styles.timestamp}
          value={startInput}
          disabled={!startAt}
          onChange={(e) => setStartInput(e.target.value)}
          onBlur={() => {
            const parsed = ParseTimestamp(startInput);
            if (parsed == null) {
              setStartInput(FormatTimestamp(startSeconds));
            } else {
              setStartSeconds(parsed);
              setStartInput(FormatTimestamp(parsed));
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
      </div>
    </div>
  );
};

export default SharePopup;
