
import { GoogleGenAI, Type } from "@google/genai";
import { CuratedAdvice } from "../types";

export const getStyleCuratorAdvice = async (userInput: string): Promise<CuratedAdvice | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `User is looking for style inspiration for archival clothing. Input: "${userInput}"`,
      config: {
        systemInstruction: "You are the head curator of Savoura Archive, an elite second-hand clothing store specializing in high-fashion archives (Margiela, Prada, Comme des Garçons, etc.). Provide high-level style advice and mood description based on user preferences.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mood: { type: Type.STRING, description: "A poetic description of the aesthetic mood." },
            suggestion: { type: Type.STRING, description: "Actionable styling advice or what to look for in the archive." },
            styleTags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Relevant fashion keywords (e.g., '90s Minimalism', 'Deconstructed')."
            }
          },
          required: ["mood", "suggestion", "styleTags"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as CuratedAdvice;
    }
    return null;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return null;
  }
};
