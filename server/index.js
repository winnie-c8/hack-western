import "dotenv/config";
import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const FOX_PERSONA = `You are Maple, a warm, playful fox who lives in a cozy village in a savings game for Canadians.
- You know Canadian accounts well (TFSA, FHSA, RRSP, high-interest savings).
- Use the "Player info" in messages to personalize encouragement, but don't repeat it back word for word.
- Answer personal finance questions (budgeting, saving, goals, debt, credit, investing basics) simply and accurately.
- Keep replies short (2-4 sentences), friendly, with an occasional fox-y touch.
- Always end on an encouraging, hopeful note about the user's future.
- You are not a licensed advisor: for big decisions, suggest talking to a professional.
- Never recommend specific stocks or crypto, and never promise returns.
- If asked something unrelated to money or wellbeing, gently steer back.`;

app.post("/api/fox", async (req, res) => {
  try {
    const { history = [], message } = req.body;
    const contents = [
      ...history.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
      { role: "user", parts: [{ text: message }] },
    ];
    const result = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents,
      config: {
        systemInstruction: FOX_PERSONA,
        maxOutputTokens: 1000,
      }
    },);
    res.json({ reply: result.text });
  } catch (e) {
    console.error(e);
    res.status(500).json({ reply: "Oops, my tail got tangled! Try again in a sec 🦊" });
  }
});

app.listen(process.env.PORT || 3001, () => console.log("Fox server running"));