import { defineMode } from "./baseMode.js";

// Game 3 - "The Rug". Guess the ticker, caps mask, strip "$".
export default defineMode({
  id: "rugCoin",
  title: "The Rug",
  character: { name: "Liquidated Larry", emoji: "📉" },
  intro:
    "A degen trader, eyes twitching: \"I aped my life savings into a coin. Dev deleted everything in 4 minutes. Guess what I bought.\"",
  maskStyle: "caps",
  matchMode: "exact",
  puzzles: [
    {
      answer: "moonpig",
      hint: "A barnyard animal headed to space.",
      clues: [
        { type: "images", label: "The chart", payload: ["📈", "🟢", "🟢", "💥", "📉"] },
        { type: "images", label: "The logo", payload: ["🐷", "🕶️"] },
        { type: "text", label: "Deleted tweet", payload: "1000x guaranteed 🚀🐷 LP locked* (*for 4 mins)" },
      ],
    },
    {
      answer: "safemoon",
      hint: "Promised it was, in fact, NOT safe.",
      clues: [
        { type: "images", label: "The chart", payload: ["🚀", "📈", "😱", "📉", "🪦"] },
        { type: "images", label: "The logo", payload: ["🌕", "🛡️"] },
        { type: "text", label: "Deleted tweet", payload: "Reflections every transaction! HODL forever! 💎🙌" },
      ],
    },
    {
      answer: "doge",
      hint: "Such coin. Much rug.",
      clues: [
        { type: "images", label: "The chart", payload: ["🐕", "📈", "🎈", "💨", "📉"] },
        { type: "images", label: "The logo", payload: ["🐕", "🌟"] },
        { type: "text", label: "Deleted tweet", payload: "Elon tweeted... then silence. wow." },
      ],
    },
    {
      answer: "squid",
      hint: "Inspired by a deadly Netflix show.",
      clues: [
        { type: "images", label: "The chart", payload: ["🦑", "📈", "🟢", "💀", "📉"] },
        { type: "images", label: "The logo", payload: ["🦑", "🔴", "🟢"] },
        { type: "text", label: "Deleted tweet", payload: "Play to earn! You can't sell yet but trust 🦑" },
      ],
    },
  ],
});
