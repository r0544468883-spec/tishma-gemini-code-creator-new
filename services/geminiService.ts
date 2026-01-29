
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { LegalAnalysis, UrgencyLevel } from "../types";
import { Language } from "../translations";

/**
 * Main Case Analysis: Uses Gemini 3 Pro with Thinking Budget for complex reasoning.
 * Emphasizes "First Legal Aid" and Nissim's identity.
 */
export const analyzeLegalDocument = async (text: string, imageData?: string, targetLang: Language = 'he'): Promise<LegalAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-pro-preview';
  
  const systemInstruction = `
    You are Nissim (ניסים), an expert AI assistant for Tishma (תשמע) providing FIRST LEGAL AID in Israel.
    Your goal is to simplify complex legal documents for the public.
    IMPORTANT: You are NOT a lawyer. Always include a subtle reminder that your analysis is for informational/first-aid purposes and not binding legal advice.
    OCR: If an image is provided, carefully extract all dates, names, and legal obligations.
    Language: Respond strictly in ${targetLang}.
    Goal: Summarize clearly and suggest professional legal representation for next steps.
    Output JSON format only.
  `;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      summary: { type: Type.STRING, description: "A high-level summary of the situation." },
      simplifiedHebrew: { type: Type.STRING, description: "A simplified explanation for a person with no legal background." },
      urgency: { type: Type.STRING, enum: Object.values(UrgencyLevel) },
      keyDates: { type: Type.ARRAY, items: { type: Type.STRING } },
      recommendedActions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            deadline: { type: Type.STRING }
          },
          required: ["title", "description"]
        }
      },
      legalTermsExplained: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            term: { type: Type.STRING },
            explanation: { type: Type.STRING }
          }
        }
      }
    },
    required: ["summary", "simplifiedHebrew", "urgency", "recommendedActions"]
  };

  const parts: any[] = [{ text: `First Legal Aid Analysis: ${text}` }];
  if (imageData) {
    const [mimePart, dataPart] = imageData.split(';base64,');
    parts.push({
      inlineData: {
        mimeType: mimePart.replace('data:', ''),
        data: dataPart
      }
    });
  }

  const result = await ai.models.generateContent({
    model,
    contents: { parts },
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema,
      thinkingConfig: { thinkingBudget: 24000 }
    }
  });

  return JSON.parse(result.text || '{}') as LegalAnalysis;
};

/**
 * Fast Response: Uses Gemini 2.5 Flash Lite for low-latency interactions.
 */
export const getQuickFlashResponse = async (query: string, lang: Language) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const result = await ai.models.generateContent({
    model: 'gemini-flash-lite-latest',
    contents: query,
    config: { systemInstruction: `You are Nissim. Respond quickly in ${lang}. Focus on being helpful for first legal aid.` }
  });
  return result.text;
};

/**
 * Generate Speech: Uses Gemini 2.5 Flash Preview TTS to transform text to audio.
 */
export const generateSpeech = async (text: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Say clearly in a professional voice: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });
  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || '';
};

/**
 * Audio Transcription: Uses Gemini 3 Flash for speech-to-text.
 */
export const transcribeMicrophoneInput = async (audioBase64: string, lang: Language) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const result = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: 'audio/wav', data: audioBase64 } },
        { text: `Transcribe this precisely in ${lang} for a legal context.` }
      ]
    }
  });
  return result.text;
};

/**
 * Nearby Search: Maps Grounding for lawyers.
 */
export const findNearbyLawyers = async (field: string, lat?: number, lng?: number) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `List 3 highly rated ${field} law firms in Israel nearby for professional consultation.`,
    config: {
      tools: [{ googleMaps: {} }],
      toolConfig: {
        retrievalConfig: {
          latLng: (lat !== undefined && lng !== undefined) ? { latitude: lat, longitude: lng } : undefined
        }
      }
    }
  });

  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  return chunks.filter(c => c.maps).map(c => ({
    title: c.maps?.title || "Law Firm",
    uri: c.maps?.uri || "#"
  }));
};

/**
 * Case Visualization: Uses Veo for high-quality video generation.
 */
export const generateCaseVisualization = async (prompt: string, aspectRatio: '16:9' | '9:16' = '16:9'): Promise<string> => {
  // Creating a new instance right before the call to ensure up-to-date API key from selection
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: `A cinematic visualization of the following legal case description: ${prompt}`,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: aspectRatio
    }
  });

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) throw new Error("Video generation failed");
  
  // The response body contains the MP4 bytes. Must append an API key when fetching from the download link.
  const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
  if (!response.ok) throw new Error("Failed to download video");
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};
