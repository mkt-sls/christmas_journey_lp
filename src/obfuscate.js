// Anti-casual-curiosity encoding for the per-day deposit links: XOR with a per-day keystream, then base64.
// The plain source of truth stays in data/links.json; vite.config.js encodes it at build time (virtual:links-enc),
// config.js decodes one day's link only when it is asked for. Not security (the brand makes each code valid for one day).
const key = (day, i) => (day * 131 + i * 17 + 89) & 255;

export function encodeLink(day, text) {
  let out = '';
  for (let i = 0; i < text.length; i++) out += String.fromCharCode(text.charCodeAt(i) ^ key(day, i));
  return btoa(out);
}

export function decodeLink(day, b64) {
  const raw = atob(b64);
  let out = '';
  for (let i = 0; i < raw.length; i++) out += String.fromCharCode(raw.charCodeAt(i) ^ key(day, i));
  return out;
}
