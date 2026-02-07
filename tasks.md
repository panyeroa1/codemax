Task ID: T-0001
Title: Switch to Ollama Cloud
Status: DONE
Owner: Miles
Related repo or service: codemax
Branch: main
Created: 2026-02-07 19:54
Last updated: 2026-02-07 20:00

START LOG

Timestamp: 2026-02-07 19:54
Current behavior or state:
- Application uses Google Gemini API via `GoogleGenAI` SDK locally.
- Needs to switch to Ollama Cloud API to leverage cloud models without local GPU.

Plan and scope for this task:
- Analyze `services/gemini.ts` and replace Google GenAI with Ollama Cloud REST API.
- Update `MODELS` constant to use `gpt-oss:120b-cloud`.
- Ensure `VITE_OLLAMA_API_KEY` is used for authentication.
- Verify build functionality.

Files or modules expected to change:
- services/gemini.ts
- tsconfig.json (to fix types if needed)

Risks or things to watch out for:
- Dependency on `@google/genai` needs removal.
- TypeScript errors regarding `import.meta.env` might occur.

WORK CHECKLIST

- [x] Code changes implemented according to the defined scope
- [x] No unrelated refactors or drive-by changes
- [x] Configuration and environment variables verified
- [x] Logs and error handling reviewed

END LOG

Timestamp: 2026-02-07 20:05
Summary of what actually changed:
- Replaced `GoogleGenAI` implementation in `services/gemini.ts` with direct `fetch` calls to `https://ollama.com/api/chat`.
- Updated `MODELS` to use `gpt-oss:120b-cloud`.
- Added `vite/client` to `tsconfig.json` types to resolve `import.meta.env` errors.
- Removed `@google/genai` import.

Files actually modified:
- services/gemini.ts
- tsconfig.json

How it was tested:
- Ran `npm install` (with local cache workaround for permissions) and `npm run build`.
- Verify build success ensures type correctness and compilation.

Test result:
- PASS

Known limitations or follow-up tasks:
- None

------------------------------------------------------------
STANDARD TASK BLOCK
------------------------------------------------------------

Task ID: T-0002
Title: Fix tsconfig settings
Status: DONE
Owner: Miles
Related repo or service: codemax
Branch: main
Created: 2026-02-07 20:25
Last updated: 2026-02-07 20:25

START LOG

Timestamp: 2026-02-07 20:25
Current behavior or state:
- `tsconfig.json` is missing `strict` and `forceConsistentCasingInFileNames` options.
- IDE reports errors/warnings suggesting these should be enabled.

Plan and scope for this task:
- Enable `strict: true` in `compilerOptions`.
- Enable `forceConsistentCasingInFileNames: true` in `compilerOptions`.

Files or modules expected to change:
- tsconfig.json

Risks or things to watch out for:
- Enabling `strict` might expose existing type errors in the codebase.

WORK CHECKLIST

- [x] Code changes implemented according to the defined scope
- [x] No unrelated refactors or drive-by changes
- [x] Configuration and environment variables verified
- [x] Logs and error handling reviewed

END LOG

Timestamp: 2026-02-07 20:25
Summary of what actually changed:
- Enabled `strict` in `compilerOptions` in `tsconfig.json`.
- Enabled `forceConsistentCasingInFileNames` in `compilerOptions` in `tsconfig.json`.

Files actually modified:
- tsconfig.json

How it was tested:
- Ran `npm run build` which passed successfully.

Test result:
- PASS

Known limitations or follow-up tasks:
- None
