
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, GenerateContentResponse, Chat } from "@google/genai";

export const MODELS = {
  CODEMAX_PRO: 'gemini-3-pro-preview',
  CODEMAX_ULTRA: 'gemini-3-pro-preview',
  GEMMA_3_ELITE: 'gemini-3-flash-preview',
  FLASH_SPEED: 'gemini-3-flash-preview'
};

export interface Message {
  role: 'user' | 'model';
  parts: { text?: string; inlineData?: { data: string; mimeType: string } }[];
  modelName?: string;
}

const SYSTEM_INSTRUCTION = `You are the CodeMax Alpha Architect, the world's most advanced software engineering AI.
Your purpose is to generate flawless, production-ready code immediately.

STRICT RULES:
1. OUTPUT FORMAT: Return ONLY the source code. No preamble, no "Here is your code", no explanations, no reasoning, no closing remarks.
2. COMPLETENESS: Always return full, standalone files. If building a web app, provide the complete HTML with embedded CSS and JS unless specified otherwise.
3. QUALITY: Use elite architectural patterns. Focus on performance, security, and world-class UI/UX.
4. NO HESITATION: Do not ask for clarifications. Make high-level executive decisions based on the prompt's intent.
5. NO REASONING: Your internal chain of thought is private. The user only sees the final, perfect code.

If you violate these rules, the system integrity fails. Provide pure source code only.`;

export async function chatStream(
  modelName: string,
  history: Message[],
  onChunk: (text: string) => void
) {
  const aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const chat = aiClient.chats.create({
    model: modelName,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      thinkingConfig: { thinkingBudget: 0 } 
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

export async function chatOllamaStream(
  url: string,
  modelName: string,
  history: Message[],
  onChunk: (text: string) => void
) {
  const messages = history.map(msg => ({
    role: msg.role === 'model' ? 'assistant' : 'user',
    content: msg.parts.map(p => p.text).join('\n')
  }));

  const response = await fetch(`${url}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: 'system', content: SYSTEM_INSTRUCTION },
        ...messages
      ],
      stream: true
    })
  });

  if (!response.body) throw new Error("Ollama connection failed.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n');
    
    for (const line of lines) {
      if (!line) continue;
      try {
        const json = JSON.parse(line);
        if (json.message?.content) {
          fullText += json.message.content;
          onChunk(fullText);
        }
      } catch (e) {}
    }
  }
  return fullText;
}
