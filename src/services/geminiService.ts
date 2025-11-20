import { GoogleGenAI, Type } from "@google/genai";
import { Player, GeneratedTeams } from "../types";

// Note: API Key is injected via vite.config.ts define
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateBalancedTeams = async (players: Player[]): Promise<GeneratedTeams> => {
  if (players.length < 2) throw new Error("Not enough players to generate teams.");

  const playerNames = players.map(p => `${p.name} (Tier ${p.tier})`).join(", ");

  const prompt = `
    Here is a list of basketball players for a pickup game: ${playerNames}.
    Please divide them into two balanced teams (Team A and Team B).
    Consider the Tiers as a rough proxy for reliability/skill (Tier 1 being highest).
    Try to distribute Tiers evenly if possible.
    Also provide a short 1-sentence strategy or "hype" description for the matchup.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            teamA: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of player names for Team A" },
            teamB: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of player names for Team B" },
            strategy: { type: Type.STRING, description: "A short hype description of the matchup" }
          },
          required: ["teamA", "teamB", "strategy"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text) as GeneratedTeams;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to generate teams. Please try again.");
  }
};

export const generateInviteMessage = async (nextGameDate: string): Promise<string> => {
  const prompt = `
    Write a short, energetic, funny 1-sentence text message inviting a group of friends to basketball this Monday (${nextGameDate}).
    Include a basketball emoji.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    return response.text || "Ball is life! Who is in for Monday?";
  } catch (error) {
    return "Monday Hoops! Who's in?";
  }
};