// Masking logic: turns "selfish" into ")@lf_+%" and progressively un-masks it.

const SYMBOLS = ["@", "#", "$", "%", "&", "+", "*", "!", ")", "(", "~", "?"];

function randInt(max) {
  return Math.floor(Math.random() * max);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Precompute stable mask data for a word so un-masking doesn't flicker.
// - symbolFor: a fixed symbol per character position
// - revealOrder: the order in which positions get revealed over time
// Spaces and non-letters are always shown.
export function buildMask(word, opts = {}) {
  const { keepFirst = false } = opts;
  const chars = [...word];
  const symbolFor = chars.map(() => SYMBOLS[randInt(SYMBOLS.length)]);
  const maskablePositions = chars
    .map((c, i) => (/[a-z0-9]/i.test(c) ? i : -1))
    .filter((i) => i >= 0);
  let revealOrder = shuffle(maskablePositions);
  // For names ("soft" style), always reveal the first letter first.
  if (keepFirst && maskablePositions.length) {
    const first = maskablePositions[0];
    revealOrder = [first, ...revealOrder.filter((i) => i !== first)];
  }
  return { symbolFor, revealOrder, length: chars.length };
}

// Render the masked word given how many positions should be revealed.
export function renderMask(word, mask, revealCount) {
  const chars = [...word];
  const revealed = new Set(mask.revealOrder.slice(0, revealCount));
  return chars
    .map((c, i) => {
      if (!/[a-z0-9]/i.test(c)) return c; // always show spaces/punctuation
      if (revealed.has(i)) return c;
      return mask.symbolFor[i] ?? "*";
    })
    .join("");
}

// How many positions to reveal given elapsed progress (0..1).
// Starts by showing ~30% of letters, climbs to ~70% by the end.
export function revealCountForProgress(mask, progress) {
  const maskable = mask.revealOrder.length;
  const start = 0.3;
  const end = 0.7;
  const ratio = start + (end - start) * Math.max(0, Math.min(1, progress));
  return Math.max(1, Math.round(maskable * ratio));
}
