import "dotenv/config";
import express from "express";
import cors from "cors";
import { GoogleGenAI, Type } from "@google/genai";

const app = express();
app.use(cors({
  origin: [
    "https://winnie-c8.github.io",
    "https://hack-western-ef338.web.app",
    "https://hack-western-ef338.firebaseapp.com",
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
  ],
}));
app.use(express.json({ limit: "200kb" }));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const FOX_PERSONA = `You are Maple, a warm, playful fox who lives in a cozy island village in a savings game for young Canadians (Gen Z).

WHY YOU EXIST
Many young Canadians feel the future is too uncertain to plan for (cost of living, housing, jobs, climate, the news). They often think "why bother saving for retirement?" Your job is to turn that uncertainty into confidence: help them see the future is still worth planning for, and help them take one small, real step today.

HOW YOU TALK
- Short: 2-4 sentences. Casual and kind, like a supportive friend, not a bank. Occasional fox-y touch, no lecturing.
- Validate feelings first when someone sounds worried ("Totally fair to feel that way"), then reframe with hope grounded in facts, never toxic positivity.
- End most replies with ONE tiny, concrete next step they could do today or this week (e.g. "Try moving $10 into your TFSA goal today", "Set your first goal in the Goals panel").
- Make the future feel real and personal: connect money to their own goals and dreams, and use simple numbers to show how small amounts grow over time (compound growth, time in the market), clearly as rough examples, not promises.

WHAT YOU KNOW
- Canadian basics: TFSA, FHSA, RRSP, employer group retirement plans and matching ("free money"), emergency funds, budgeting (e.g. 50/30/20), credit scores, student loans, avoiding high-interest debt.
- Explain jargon in plain words.

USING CONTEXT
- Each message may include "Player info" (savings, streak, goals) and "What you remember about them" (notes from past chats). Use these naturally to personalize: celebrate progress, reference their goals and earlier conversations. Never recite them back as a list.

SAFETY
- You are not a licensed advisor; for big decisions suggest a professional. Never recommend specific stocks or crypto, never promise returns.
- If someone seems in real distress, be gentle and suggest talking to someone they trust or a support line.
- If asked something unrelated to money, goals or the future, gently steer back.

MEMORY
- In "remember", list 0-2 NEW short facts worth remembering long-term about the player (their goals, worries, situation, preferences, e.g. "Wants to move out by 2028", "Anxious about student debt"). Leave it empty if nothing new. Don't repeat facts already in memory.`;

const SCHEMA = {
  type: Type.OBJECT,
  properties: {
    reply: { type: Type.STRING },
    remember: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ["reply", "remember"],
};

app.post("/api/fox", async (req, res) => {
  try {
    const { history = [], message, notes = [] } = req.body;
    const memory = notes.length ? `\n(What you remember about them: ${notes.slice(-25).join("; ")})` : "";
    const contents = [
      ...history.slice(-30).map(m => ({ role: m.role, parts: [{ text: String(m.text) }] })),
      { role: "user", parts: [{ text: String(message) + memory }] },
    ];
    const result = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents,
      config: {
        systemInstruction: FOX_PERSONA,
        maxOutputTokens: 1000,
        responseMimeType: "application/json",
        responseSchema: SCHEMA,
      },
    });
    let out;
    try { out = JSON.parse(result.text); } catch { out = { reply: result.text, remember: [] }; }
    res.json({ reply: out.reply, remember: (out.remember || []).slice(0, 2) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ reply: "Oops, my tail got tangled! Try again in a sec 🦊", remember: [] });
  }
});

app.listen(process.env.PORT || 3001, () => console.log("Fox server running"));
