import { defineMode } from "./baseMode.js";

// Game 6 - "Wrong Number". Guess who the mystery texter thinks you are.
export default defineMode({
  id: "wrongNumber",
  title: "Wrong Number",
  character: { name: "Unknown Number", emoji: "📱" },
  intro:
    "\"Someone's been texting me for a week thinking I'm someone else. Read the messages — guess who they think I am.\"",
  maskStyle: "soft",
  matchMode: "fuzzy",
  puzzles: [
    {
      answer: "landlord",
      hint: "You owe them every month.",
      clues: [
        { type: "text", label: "Text 1", payload: "“Rent's late again. That's the third time.”" },
        { type: "text", label: "Text 2", payload: "“I still have a spare key, you know.”" },
        { type: "text", label: "Text 3", payload: "“The lease is up next month — renewing?”" },
      ],
    },
    {
      answer: "doctor",
      hint: "White coat, bad news.",
      clues: [
        { type: "text", label: "Text 1", payload: "“Your results came back this morning.”" },
        { type: "text", label: "Text 2", payload: "“We should schedule the procedure soon.”" },
        { type: "text", label: "Text 3", payload: "“Please don't skip the medication again.”" },
      ],
    },
    {
      answer: "ex",
      hint: "Two letters of regret.",
      clues: [
        { type: "text", label: "Text 1", payload: "“I still have your hoodie btw.”" },
        { type: "text", label: "Text 2", payload: "“Can we talk? I miss us.”" },
        { type: "text", label: "Text 3", payload: "“Saw you with someone new… cool.”" },
      ],
    },
    {
      answer: "mom",
      hint: "Has always got your back.",
      clues: [
        { type: "text", label: "Text 1", payload: "“Did you eat anything today??”" },
        { type: "text", label: "Text 2", payload: "“Text me the SECOND you land.”" },
        { type: "text", label: "Text 3", payload: "“I'm not mad, just disappointed.”" },
      ],
    },
  ],
});
