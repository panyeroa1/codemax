
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useRef } from 'react';
import { Logo } from './components/Logo';
import { LivePreview } from './components/LivePreview';
import { Creation } from './components/CreationHistory';
import { MODELS, Message, chatStream } from './services/gemini';
import { 
  PaperAirplaneIcon, 
  MicrophoneIcon, 
  PhotoIcon, 
  CommandLineIcon, 
  SparklesIcon,
  XMarkIcon,
  CodeBracketSquareIcon,
  ClipboardIcon,
  CheckIcon,
  CpuChipIcon,
  Cog6ToothIcon,
  SunIcon,
  MoonIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowUpIcon,
  ChatBubbleLeftRightIcon,
  ShareIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

declare const marked: any;
declare const hljs: any;

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [activeModel, setActiveModel] = useState(MODELS.CODEMAX_PRO);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [pendingImage, setPendingImage] = useState<{ data: string; mimeType: string } | null>(null);
  const [activeCreation, setActiveCreation] = useState<Creation | null>(null);
  const [creationHistory, setCreationHistory] = useState<Creation[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [deepThink, setDeepThink] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isGenerating]);

  useEffect(() => {
    if (typeof marked !== 'undefined' && typeof hljs !== 'undefined') {
      marked.setOptions({
        highlight: (code: string, lang: string) => {
          const language = hljs.getLanguage(lang) ? lang : 'plaintext';
          return hljs.highlight(code, { language }).value;
        },
        langPrefix: 'hljs language-',
        breaks: true,
        gfm: true
      });
    }
  }, []);

  const handleSend = async (overridePrompt?: string) => {
    const promptText = overridePrompt || input;
    if (!promptText.trim() && !pendingImage) return;

    const userMessage: Message = {
      role: 'user',
      parts: [{ text: promptText }, ...(pendingImage ? [{ inlineData: pendingImage }] : [])]
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setPendingImage(null);
    setIsGenerating(true);

    try {
      let aiText = "";
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: "" }], modelName: activeModel }]);

      await chatStream(activeModel, [...messages, userMessage], (chunk) => {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1].parts[0].text = chunk;
          return updated;
        });
        aiText = chunk;
      });

      const html = extractHtml(aiText);
      if (html) {
        const newCreation = { id: crypto.randomUUID(), name: promptText.slice(0, 30) + '...', html, timestamp: new Date() };
        setCreationHistory(prev => [newCreation, ...prev]);
        setActiveCreation(newCreation);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: "System error. Please retry." }] }]);
    } finally {
      setIsGenerating(false);
    }
  };

  const extractHtml = (text: string) => {
    const match = text.match(/<!DOCTYPE html>[\s\S]*?<\/html>|<html[\s\S]*?<\/html>/i);
    return match ? match[0] : null;
  };

  const handleCopyCode = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const startNewChat = () => {
    setMessages([]);
    setActiveCreation(null);
  };

  return (
    <div className="flex h-[100dvh] bg-white dark:bg-[#0e0e11] text-zinc-900 dark:text-[#d1d1d1] font-sans transition-colors duration-300">
      
      {/* Sidebar */}
      <aside className={`flex flex-col border-r border-zinc-200 dark:border-zinc-800 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}`}>
        <div className="p-4 flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <Logo className="w-5 h-5" />
              <span className="font-bold text-sm tracking-tight text-zinc-900 dark:text-white uppercase">Eburon AI</span>
            </div>
            <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-widest ml-7 -mt-1">CodeMax</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-[6px]">
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 mb-6">
          <button 
            onClick={startNewChat}
            className="w-full py-2.5 px-4 bg-zinc-100 dark:bg-[#1c1c1f] hover:bg-zinc-200 dark:hover:bg-[#252529] rounded-[6px] border border-zinc-200 dark:border-zinc-800 flex items-center justify-center space-x-2 transition-all"
          >
            <PlusIcon className="w-4 h-4" />
            <span className="text-sm font-medium">New chat</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 space-y-6 scrollbar-hide">
          <div className="space-y-1">
            <h3 className="px-2 text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Recent</h3>
            {creationHistory.map(item => (
              <button 
                key={item.id} 
                onClick={() => setActiveCreation(item)}
                className="w-full text-left px-3 py-2 text-sm rounded-[6px] hover:bg-zinc-100 dark:hover:bg-[#1c1c1f] truncate transition-colors"
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-full flex items-center space-x-3 px-3 py-2 text-sm rounded-[6px] hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            {theme === 'dark' ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
            <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          </button>
          <div className="flex items-center space-x-3 px-3 py-2">
            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white">E</div>
            <span className="text-sm font-medium">Operator</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#0e0e11] relative">
        {!sidebarOpen && (
          <button 
            onClick={() => setSidebarOpen(true)}
            className="absolute left-4 top-4 z-50 p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-[6px] border border-zinc-200 dark:border-zinc-800 shadow-sm"
          >
            <ChatBubbleLeftRightIcon className="w-5 h-5" />
          </button>
        )}

        {/* Top Header */}
        <header className="h-14 border-b border-zinc-100 dark:border-zinc-800/50 flex items-center justify-between px-6 shrink-0">
          <div className="flex-1 text-center">
            <h2 className="text-sm font-semibold truncate max-w-md mx-auto">
              {messages.length > 0 ? messages[0].parts[0].text?.slice(0, 50) + '...' : 'CodeMax Intelligence'}
            </h2>
          </div>
          <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-[6px]">
            <ShareIcon className="w-4 h-4" />
          </button>
        </header>

        {/* Chat Feed */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-8 space-y-10 scrollbar-hide max-w-4xl mx-auto w-full">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center py-20 animate-in fade-in duration-1000">
              <Logo className="w-12 h-12 mb-8 opacity-20 grayscale" />
              <h2 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white mb-4">How can CodeMax help you today?</h2>
              <div className="grid grid-cols-2 gap-3 w-full max-w-lg mt-10">
                {["Build a logic gate visualizer", "Explain the Eburon architecture", "Design a minimalist CRM", "Verify my React code"].map(item => (
                  <button key={item} onClick={() => setInput(item)} className="p-4 bg-zinc-50 dark:bg-[#1c1c1f] border border-zinc-200 dark:border-zinc-800 rounded-[6px] text-xs text-left hover:border-zinc-400 dark:hover:border-zinc-600 transition-all">
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-500`}>
              <div className={`max-w-[90%] sm:max-w-[85%] space-y-4`}>
                {msg.role === 'model' && (
                  <div className="flex items-center space-x-2 text-[10px] font-bold text-blue-500 uppercase tracking-widest px-1">
                    <CpuChipIcon className="w-3 h-3" />
                    <span>CodeMax v1.3</span>
                  </div>
                )}
                <div className={`relative px-6 py-4 rounded-[6px] border transition-all ${msg.role === 'user' ? 'bg-zinc-100 dark:bg-[#1c1c1f] border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white' : 'bg-transparent border-transparent'}`}>
                  {msg.parts.map((part, pi) => (
                    <div key={pi} className="space-y-4">
                      {part.text && (
                        <div className="font-sans relative">
                           <div className={`prose prose-sm max-w-none ${theme === 'dark' ? 'prose-invert' : 'prose-zinc'}`} dangerouslySetInnerHTML={{ __html: typeof marked !== 'undefined' ? marked.parse(part.text) : part.text }} />
                           
                           {msg.role === 'model' && extractHtml(part.text) && (
                             <div className="mt-6 flex items-center justify-between p-4 bg-zinc-50 dark:bg-[#1c1c1f] border border-zinc-200 dark:border-zinc-800 rounded-[6px]">
                                <div className="flex items-center space-x-3">
                                    <CodeBracketSquareIcon className="w-5 h-5 text-blue-500" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Architecture Built</span>
                                </div>
                                <button onClick={() => { const h = extractHtml(part.text!); if (h) setActiveCreation({ id: 'temp', name: 'Preview', html: h, timestamp: new Date() }); }} className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-[4px] font-bold text-[10px] uppercase">Preview</button>
                             </div>
                           )}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {msg.role === 'model' && !isGenerating && (
                    <div className="flex items-center space-x-4 mt-6 text-zinc-400">
                      <button onClick={() => handleCopyCode(msg.parts[0].text!, i)} className="hover:text-zinc-900 dark:hover:text-white transition-colors">
                        {copiedIndex === i ? <CheckIcon className="w-4 h-4 text-emerald-500" /> : <ClipboardIcon className="w-4 h-4" />}
                      </button>
                      <button className="hover:text-zinc-900 dark:hover:text-white transition-colors"><ArrowPathIcon className="w-4 h-4" /></button>
                      <button className="hover:text-zinc-900 dark:hover:text-white transition-colors"><ShareIcon className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isGenerating && (
            <div className="flex justify-start">
              <div className="flex items-center space-x-2 px-4 py-2 bg-zinc-50 dark:bg-[#1c1c1f] rounded-[6px] animate-pulse">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Processing...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="px-6 pb-10 shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="relative bg-zinc-50 dark:bg-[#1c1c1f] border border-zinc-200 dark:border-zinc-800 rounded-[24px] p-4 shadow-xl transition-all focus-within:ring-1 focus-within:ring-zinc-400 dark:focus-within:ring-zinc-600">
              <textarea 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Message CodeMax..."
                className="w-full bg-transparent border-none focus:ring-0 text-zinc-900 dark:text-white placeholder-zinc-500 py-2 px-2 resize-none min-h-[50px] max-h-60 text-base font-light"
                rows={1}
              />
              <div className="flex items-center justify-between mt-2 pt-2">
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => setDeepThink(!deepThink)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full border text-[11px] font-bold transition-all ${deepThink ? 'bg-blue-600 border-blue-600 text-white' : 'bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-400'}`}
                  >
                    <CommandLineIcon className="w-3.5 h-3.5" />
                    <span>DeepThink</span>
                  </button>
                  <button className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 text-zinc-500 text-[11px] font-bold hover:border-zinc-400 transition-all">
                    <MagnifyingGlassIcon className="w-3.5 h-3.5" />
                    <span>Search</span>
                  </button>
                </div>
                <div className="flex items-center space-x-2">
                  <button onClick={() => fileInputRef.current?.click()} className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
                    <PhotoIcon className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleSend()}
                    disabled={isGenerating || !input.trim()}
                    className="p-2 bg-zinc-900 dark:bg-[#34343a] text-white disabled:opacity-30 rounded-full transition-all"
                  >
                    <ArrowUpIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
            <div className="text-center mt-3">
              <p className="text-[10px] text-zinc-500 font-medium">CodeMax can make mistakes. Check important info.</p>
            </div>
          </div>
        </div>
      </main>

      <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf" onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            setPendingImage({ data: base64, mimeType: file.type });
          };
          reader.readAsDataURL(file);
        }
      }} />

      <LivePreview 
        creation={activeCreation}
        isLoading={isGenerating}
        isFocused={!!activeCreation}
        onReset={() => setActiveCreation(null)}
        onVerify={() => handleSend(`Verify and fix this code for any potential issues:\n\n${activeCreation?.html}`)}
      />
    </div>
  );
};

export default App;
