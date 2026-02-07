
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, GenerateContentResponse, Chat } from "@google/genai";

export const MODELS = {
  CODEMAX_13: 'gemini-3-flash-preview',
  CODEMAX_PRO: 'gemini-3-pro-preview',
  CODEMAX_BETA: 'gemini-3-pro-preview'
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface Message {
  role: 'user' | 'model';
  parts: { text?: string; inlineData?: { data: string; mimeType: string } }[];
  modelName?: string;
}

export async function chatStream(
  modelName: string,
  history: Message[],
  onChunk: (text: string) => void
) {
  const aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const getSystemInstruction = (model: string) => {
    const base = "You are Eburon CodeMax, a world-class software engineer. You provide complete, production-ready source code in a single HTML block (CSS and JS included).";
    const verification = `
CRITICAL VERIFICATION PROTOCOL:
1. Every code output must be self-documenting.
2. Include a hidden 'Verification Block' in comments at the start of the code summarizing the architecture.
3. If the user reports an error or asks for verification, perform a 'Step-by-Step' logic audit before recreating the code.
4. Ensure all JS handles errors gracefully to facilitate easier debugging.
`;
    
    let variant = "v1.3 stable";
    if (model === MODELS.CODEMAX_PRO) variant = "PRO Architect";
    if (model === MODELS.CODEMAX_BETA) variant = "BETA Experimental";

    return `${base} You are the ${variant} variant. ${verification}`;
  };

  const chat = aiClient.chats.create({
    model: modelName,
    config: {
      systemInstruction: getSystemInstruction(modelName),
    }
  });

  const lastMessage = history[history.length - 1];
  
  const response = await chat.sendMessageStream({
    message: lastMessage.parts
  });

  let fullText = "";
  for await (const chunk of response) {
    const chunkText = chunk.text || "";
    fullText += chunkText;
    onChunk(fullText);
  }
  return fullText;
}
