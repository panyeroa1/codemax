/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
/// <reference types="vite/client" />

export interface Message {
  role: 'user' | 'model';
  parts: { text?: string }[];
}

export const MODELS = {
  DEEPSEEK_V3: 'deepseek-v3.1:671b-cloud',
  GPT_OSS_120B: 'gpt-oss:120b-cloud',
  GPT_OSS_20B: 'gpt-oss:20b-cloud',
  QWEN_CODER: 'qwen3-coder:480b-cloud',
  KIMI_K2: 'kimi-k2:1t-cloud'
} as const;

export type ModelType = typeof MODELS[keyof typeof MODELS] | string;

const SYSTEM_INSTRUCTION = `
You are CodeMax Alpha Architect — an elite, production-grade software engineering AI powered by Ollama Cloud.
Your sole job is to generate COMPLETE, correct, runnable code with excellent architecture and UI/UX.

ABSOLUTE OUTPUT RULES (NON-NEGOTIABLE):
1) CODE ONLY: Output ONLY source code. No explanations, no markdown, no backticks, no commentary, no reasoning.
2) FULL FILES ALWAYS: Return complete, standalone files. NEVER output partial snippets, diffs, or “only changed lines”.
3) NO PLACEHOLDERS: Everything must be fully implemented. No "TODO", "rest of code...", or "insert logic here".
4) PRODUCTION READY:
   - TypeScript (strict mode)
   - TailwindCSS (modern utility-first)
   - Lucide React (icons)
   - Proper error handling & edge case management
   - Accessible & responsive UI
5) BROWSER COMPATIBLE: Use standard Web APIs. No Node.js specific modules (fs, path) unless polyfilled.
6) FILE STRUCTURE:
   - React Components: functional, typed props, modular.
   - Styling: Tailwind utility classes ONLY.
   - State: React Hooks (useState, useEffect, useReducer).

CONTRACT:
By outputting code, you certify it is 100% complete, bug-free, and ready for deployment.
Any violation of these rules (e.g. adding markdown, text, or skipping code) triggers a SYSTEM FAILURE.
`.trim();

export async function* chatOllamaStream(model: string, messages: Message[], signal?: AbortSignal, baseUrl?: string): AsyncGenerator<string, void, unknown> {
  const url = baseUrl || 'http://localhost:11434'; // Default to local Ollama if not specified

  const response = await fetch(`${url}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model,
      messages: messages.map(m => ({
        role: m.role === 'model' ? 'assistant' : 'user', // Map internal roles to Ollama API
        content: m.parts.map(p => p.text).join('')
      })),
      stream: true,
      options: {
        temperature: 0.7, // Add some creativity
        num_predict: -1   // Generate as much as needed
      }
    }),
    signal
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('Response body is unavailable');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const data = JSON.parse(line);
        if (data.message?.content) {
          yield data.message.content;
        }
        if (data.done) break;
      } catch (e) {
        // Ignore JSON parse errors for incomplete chunks
      }
    }
  }
}

// Unified chat stream function - Defaults to Ollama Cloud
export async function* chatStream(model: ModelType, messages: Message[], apiKey?: string, signal?: AbortSignal, ollamaUrl?: string): AsyncGenerator<string, void, unknown> {
  // If specific Ollama URL provided (Local mode), use it
  if (ollamaUrl) {
    yield* chatOllamaStream(model, messages, signal, ollamaUrl);
    return;
  }

  // Otherwise, use Ollama Cloud 
  const cloudUrl = 'https://api.ollama.com/v1/chat/completions';
  const key = apiKey || import.meta.env.VITE_OLLAMA_API_KEY || process.env.OLLAMA_API_KEY;

  if (!key) {
    throw new Error("OLLAMA_API_KEY is missing for cloud models.");
  }

  const response = await fetch(cloudUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: SYSTEM_INSTRUCTION },
        ...messages.map(m => ({
          role: m.role === 'model' ? 'assistant' : 'user',
          content: m.parts.map(p => p.text).join('')
        }))
      ],
      stream: true
    }),
    signal
  });

  if (!response.ok) {
    // Try to get error details
    const errorText = await response.text();
    throw new Error(`Ollama Cloud API Error (${response.status}): ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('Response body is unavailable');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.trim() === 'data: [DONE]') return;
      if (!line.startsWith('data: ')) continue;

      try {
        const data = JSON.parse(line.slice(6));
        const content = data.choices?.[0]?.delta?.content;
        if (content) yield content;
      } catch (e) {
        console.error('Error parsing cloud stream chunk', e);
      }
    }
  }
}
