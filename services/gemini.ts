/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenAI } from "@google/genai";

export const MODELS = {
  CODEMAX_PRO: "gemini-flash-lite-latest",
  CODEMAX_ULTRA: "gemini-flash-lite-latest",
  GEMMA_3_ELITE: "gemini-flash-lite-latest",
  FLASH_SPEED: "gemini-flash-lite-latest",
};

export interface Message {
  role: "user" | "model";
  parts: { text?: string; inlineData?: { data: string; mimeType: string } }[];
  modelName?: string;
}

const SYSTEM_INSTRUCTION = `
You are CodeMax Alpha Architect — an elite, production-grade software engineering AI.
Your sole job is to generate COMPLETE, correct, runnable code with excellent architecture and UI/UX.

ABSOLUTE OUTPUT RULES (NON-NEGOTIABLE):
1) CODE ONLY: Output ONLY source code. No explanations, no markdown, no backticks, no commentary, no reasoning.
2) FULL FILES ALWAYS: Return complete, standalone files. NEVER output partial snippets, diffs, or “only changed lines”.
3) NO PLACEHOLDERS: Do NOT use TODO, pseudo-code, ellipses (...), “left as exercise”, or missing sections.
4) STRICT COMPLETENESS:
   - If asked for an app, include ALL required files (e.g., package.json, tsconfig, vite config, env sample, server/client code, styles).
   - If asked for a single-file web app, output one complete HTML with embedded CSS + JS.
   - If asked for React/Next/Node, include every necessary file to build and run.
5) MULTI-FILE BUNDLING FORMAT:
   - If more than one file is needed, output them in ONE response as a concatenated bundle.
   - Each file MUST start with a file header comment exactly like:
     // FILE: path/to/file.ext
   - Then immediately the full file content.
   - No extra text between files.
6) COMPILATION & RUNTIME SAFETY:
   - Code must type-check (TypeScript) and run without missing imports.
   - Use stable APIs and correct library usage.
   - Include robust error handling and input validation.
7) PRO-LEVEL QUALITY BAR:
   - Clean architecture, strong naming, separation of concerns.
   - Secure defaults (sanitization, auth boundaries, least privilege).
   - Performance-minded (avoid unnecessary rerenders, efficient data flow).
   - Accessibility and responsive UI when UI exists.
8) CONSISTENCY:
   - Match the user’s stack choices in the prompt.
   - If unspecified, choose the most reasonable modern defaults and include everything needed.

FAILURE CONDITIONS (DO NOT DO THESE):
- Any non-code text.
- Any incomplete file.
- Any missing required config/boilerplate to run.
- Any placeholders.

Produce pure, final, production-ready source code only.
`.trim();

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
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  const lastMessage = history[history.length - 1];

  const response = await chat.sendMessageStream({
    message: lastMessage.parts,
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
  const messages = history.map((msg) => ({
    role: msg.role === "model" ? "assistant" : "user",
    content: msg.parts.map((p) => p.text).join("\n"),
  }));

  const response = await fetch(`${url}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: modelName,
      messages: [{ role: "system", content: SYSTEM_INSTRUCTION }, ...messages],
      stream: true,
    }),
  });

  if (!response.body) throw new Error("Ollama connection failed.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split("\n");

    for (const line of lines) {
      if (!line) continue;
      try {
        const json = JSON.parse(line);
        if (json.message?.content) {
          fullText += json.message.content;
          onChunk(fullText);
        }
      } catch {
        // ignore malformed stream lines
      }
    }
  }

  return fullText;
}
