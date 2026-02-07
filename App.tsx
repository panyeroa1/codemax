
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useRef } from 'react';
import { Logo } from './components/Logo';
import { LivePreview } from './components/LivePreview';
import { Creation } from './components/CreationHistory';
import { MODELS, Message, chatStream, chatOllamaStream } from './services/gemini';
import { 
  PaperAirplaneIcon, 
  CommandLineIcon, 
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
  ArrowPathIcon,
  PhotoIcon,
  SignalIcon,
  ChevronDownIcon,
  AdjustmentsHorizontalIcon,
  ArchiveBoxIcon,
  UserCircleIcon,
  PaperClipIcon
} from '@heroicons/react/24/outline';

declare const marked: any;
declare const hljs: any;

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [activeModel, setActiveModel] = useState(MODELS.CODEMAX_PRO);
  const [isGenerating, setIsGenerating] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [pendingImage, setPendingImage] = useState<{ data: string; mimeType: string } | null>(null);
  const [activeCreation, setActiveCreation] = useState<Creation | null>(null);
  const [creationHistory, setCreationHistory] = useState<Creation[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  // Admin / Ollama States
  const [showAdmin, setShowAdmin] = useState(false);
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [isSyncingOllama, setIsSyncingOllama] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isGenerating]);

  // Initial Ollama probe
  useEffect(() => {
    syncOllama();
  }, []);

  const syncOllama = async () => {
    setIsSyncingOllama(true);
    try {
      const response = await fetch(`${ollamaUrl}/api/tags`);
      const data = await response.json();
      if (data.models) {
        setOllamaModels(data.models.map((m: any) => m.name));
      }
    } catch (err) {
      console.warn("Ollama not reachable at:", ollamaUrl);
    } finally {
      setIsSyncingOllama(false);
    }
  };

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

      const isOllama = ollamaModels.includes(activeModel);
      
      if (isOllama) {
        await chatOllamaStream(ollamaUrl, activeModel, [...messages, userMessage], (chunk) => {
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1].parts[0].text = chunk;
            return updated;
          });
          aiText = chunk;
        });
      } else {
        await chatStream(activeModel, [...messages, userMessage], (chunk) => {
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1].parts[0].text = chunk;
            return updated;
          });
          aiText = chunk;
        });
      }

      const html = extractHtml(aiText);
      if (html) {
        const newCreation = { id: crypto.randomUUID(), name: promptText.slice(0, 30) + '...', html, timestamp: new Date() };
        setCreationHistory(prev => [newCreation, ...prev]);
        setActiveCreation(newCreation);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: "System execution failure. Output interrupted." }] }]);
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

  return (
    <div className="flex h-[100dvh] bg-white dark:bg-[#0e0e11] text-zinc-900 dark:text-[#d1d1d1] font-sans transition-colors duration-300">
      
      {/* DeepSeek-style Sidebar */}
      <aside className={`flex flex-col border-r border-zinc-200 dark:border-zinc-800 transition-all duration-300 bg-[#f7f7f8] dark:bg-[#0e0e11] ${sidebarOpen ? 'w-72' : 'w-0 overflow-hidden'}`}>
        <div className="p-4 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex flex-col">
              <div className="flex items-center space-x-2">
                <Logo className="w-5 h-5" />
                <span className="font-extrabold text-base tracking-tight text-zinc-900 dark:text-white uppercase">Eburon AI</span>
              </div>
              <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest ml-7 -mt-1.5">CodeMax</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-6 transition-all">
              <ArchiveBoxIcon className="w-4 h-4" />
            </button>
          </div>

          <button 
            onClick={() => { setMessages([]); setActiveCreation(null); }}
            className="w-full py-2.5 px-4 bg-white dark:bg-[#1c1c1f] hover:bg-zinc-50 dark:hover:bg-[#252529] rounded-6 border border-zinc-200 dark:border-zinc-800 flex items-center justify-start space-x-2 transition-all mb-8 shadow-sm"
          >
            <PlusIcon className="w-4 h-4" />
            <span className="text-sm font-semibold">New chat</span>
          </button>

          <div className="flex-1 overflow-y-auto space-y-6 scrollbar-hide">
            <div className="space-y-1">
              <h3 className="px-2 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-4">7 Days</h3>
              {creationHistory.map(item => (
                <button 
                  key={item.id} 
                  onClick={() => setActiveCreation(item)}
                  className="w-full text-left px-3 py-2 text-sm rounded-6 hover:bg-zinc-200 dark:hover:bg-[#1c1c1f] truncate transition-colors font-medium text-zinc-600 dark:text-zinc-400"
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 space-y-1 mt-auto">
          <button 
            onClick={() => setShowAdmin(true)}
            className="w-full flex items-center space-x-3 px-3 py-2.5 text-sm rounded-6 hover:bg-zinc-200 dark:hover:bg-[#1c1c1f] transition-colors"
          >
            <AdjustmentsHorizontalIcon className="w-4 h-4" />
            <span className="font-medium">Admin Settings</span>
          </button>
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-full flex items-center space-x-3 px-3 py-2.5 text-sm rounded-6 hover:bg-zinc-200 dark:hover:bg-[#1c1c1f] transition-colors"
          >
            {theme === 'dark' ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
            <span className="font-medium">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          </button>
          <div className="flex items-center space-x-3 px-3 py-4 mt-2 border-t border-zinc-200 dark:border-zinc-800/50">
            <div className="w-8 h-8 rounded-full bg-zinc-900 dark:bg-[#34343a] flex items-center justify-center shadow-lg">
                <UserCircleIcon className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-zinc-900 dark:text-white">Emil Alvaro</span>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">Verified Dev</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#0e0e11] relative">
        {!sidebarOpen && (
          <button 
            onClick={() => setSidebarOpen(true)}
            className="absolute left-4 top-4 z-50 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-6 border border-zinc-200 dark:border-zinc-800 shadow-md bg-white dark:bg-[#1c1c1f]"
          >
            <ChatBubbleLeftRightIcon className="w-5 h-5" />
          </button>
        )}

        <header className="h-14 border-b border-zinc-100 dark:border-zinc-800/50 flex items-center px-6 shrink-0 z-30 justify-between">
          <div className="flex items-center space-x-4">
             <div className="relative group">
                <button className="flex items-center space-x-2 px-3 py-1.5 rounded-6 bg-white dark:bg-[#1c1c1f] border border-zinc-200 dark:border-zinc-800 text-[11px] font-bold uppercase tracking-tight hover:border-zinc-400 dark:hover:border-zinc-600 transition-all shadow-sm">
                  <span className="truncate max-w-[120px]">{Object.entries(MODELS).find(([_,v]) => v === activeModel)?.[0] || activeModel}</span>
                  <ChevronDownIcon className="w-3 h-3" />
                </button>
                <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-[#1c1c1f] border border-zinc-200 dark:border-zinc-800 rounded-6 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 py-1 max-h-[400px] overflow-y-auto scrollbar-hide">
                  <div className="px-3 py-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-100 dark:border-zinc-800 mb-1">Elite Core</div>
                  {Object.entries(MODELS).map(([k, v]) => (
                    <button key={k} onClick={() => setActiveModel(v)} className={`w-full text-left px-3 py-2.5 text-[11px] font-medium transition-colors ${activeModel === v ? 'bg-zinc-100 dark:bg-zinc-800 text-blue-500' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}>
                      {k.replace(/_/g, ' ')}
                    </button>
                  ))}
                  {ollamaModels.length > 0 && (
                    <>
                      <div className="px-3 py-2 text-[10px] font-bold text-blue-500 uppercase tracking-widest border-b border-zinc-100 dark:border-zinc-800 my-1 flex items-center space-x-2">
                        <SignalIcon className="w-3 h-3" />
                        <span>Ollama Local</span>
                      </div>
                      {ollamaModels.map(m => (
                        <button key={m} onClick={() => setActiveModel(m)} className={`w-full text-left px-3 py-2.5 text-[11px] font-medium transition-colors flex items-center justify-between ${activeModel === m ? 'bg-zinc-100 dark:bg-zinc-800 text-emerald-500' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}>
                          <span>{m}</span>
                        </button>
                      ))}
                    </>
                  )}
                </div>
             </div>
          </div>
          
          <div className="flex-1 text-center">
            <h2 className="text-[11px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.3em] truncate max-w-sm mx-auto">
              {activeCreation ? activeCreation.name : 'CodeMax Software Architect'}
            </h2>
          </div>

          <div className="flex items-center space-x-2">
            <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-6 transition-all text-zinc-500">
              <ShareIcon className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Messaging Interface */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-12 space-y-12 scrollbar-hide max-w-4xl mx-auto w-full">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center py-20 animate-in fade-in duration-1000">
              <Logo className="w-14 h-14 mb-8 opacity-40" />
              <h2 className="text-5xl font-extrabold tracking-tighter text-zinc-900 dark:text-white mb-6">Build Beyond Limits.</h2>
              <div className="grid grid-cols-2 gap-4 w-full max-w-xl mt-12">
                {["Create a high-performance CRM dashboard", "Build a neural network visualizer", "Architect a verified landing page", "Deep code audit v1.3"].map(item => (
                  <button key={item} onClick={() => setInput(item)} className="p-5 bg-[#f7f7f8] dark:bg-[#1c1c1f] border border-zinc-200 dark:border-zinc-800 rounded-6 text-[11px] font-bold text-left hover:border-zinc-400 dark:hover:border-zinc-500 transition-all shadow-sm uppercase tracking-tighter">
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-500`}>
              <div className={`max-w-[95%] sm:max-w-[85%] space-y-4`}>
                <div className={`relative ${msg.role === 'user' ? 'bg-[#f0f0f2] dark:bg-[#1c1c1f] border border-zinc-200 dark:border-zinc-800 px-6 py-4 rounded-6 shadow-sm' : 'bg-transparent'}`}>
                  {msg.parts.map((part, pi) => (
                    <div key={pi} className="space-y-4">
                      {part.text && (
                        <div className="font-sans relative">
                           <div className={`prose prose-sm max-w-none ${theme === 'dark' ? 'prose-invert' : 'prose-zinc'} leading-relaxed text-[14px]`} dangerouslySetInnerHTML={{ __html: typeof marked !== 'undefined' ? marked.parse(part.text) : part.text }} />
                           
                           {msg.role === 'model' && extractHtml(part.text) && (
                             <div className="mt-8 flex items-center justify-between p-6 bg-[#f7f7f8] dark:bg-[#1c1c1f] border border-zinc-200 dark:border-zinc-800 rounded-6 shadow-xl">
                                <div className="flex items-center space-x-4">
                                    <div className="p-4 bg-zinc-900 dark:bg-white rounded-6 text-white dark:text-zinc-900 shadow-lg">
                                      <CodeBracketSquareIcon className="w-6 h-6" />
                                    </div>
                                    <div>
                                      <h4 className="text-[11px] font-black uppercase tracking-widest text-zinc-900 dark:text-white">Synthesized Architecture</h4>
                                      <p className="text-[10px] text-zinc-500 uppercase font-mono tracking-tighter mt-1">Status: Integrity Verified [v1.3]</p>
                                    </div>
                                </div>
                                <button onClick={() => { const h = extractHtml(part.text!); if (h) setActiveCreation({ id: 'temp', name: 'Verified Build', html: h, timestamp: new Date() }); }} className="px-8 py-3.5 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-6 font-black text-[11px] uppercase tracking-widest hover:opacity-90 transition-all shadow-2xl active:scale-95">Open Preview</button>
                             </div>
                           )}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {msg.role === 'model' && !isGenerating && (
                    <div className="flex items-center space-x-6 mt-10 text-zinc-400 border-t border-zinc-100 dark:border-zinc-800/50 pt-6">
                      <button onClick={() => handleCopyCode(msg.parts[0].text!, i)} className="flex items-center space-x-2 hover:text-zinc-900 dark:hover:text-white transition-colors">
                        {copiedIndex === i ? <CheckIcon className="w-4 h-4 text-emerald-500" /> : <ClipboardIcon className="w-4 h-4" />}
                        <span className="text-[10px] font-black uppercase tracking-widest">Copy</span>
                      </button>
                      <button onClick={() => handleSend(messages[messages.length-2].parts[0].text)} className="flex items-center space-x-2 hover:text-zinc-900 dark:hover:text-white transition-colors">
                        <ArrowPathIcon className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Rebuild</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isGenerating && (
            <div className="flex justify-start">
              <div className="flex items-center space-x-4 px-6 py-4 bg-[#f7f7f8] dark:bg-[#1c1c1f] rounded-6 border border-zinc-200 dark:border-zinc-800 shadow-xl">
                <div className="flex space-x-1.5">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 ml-2">Synthesizing Core Architecture</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Dock */}
        <div className="px-8 pb-10 shrink-0">
          <div className="max-w-4xl mx-auto">
            <div className="relative bg-[#f7f7f8] dark:bg-[#1c1c1f] border border-zinc-200 dark:border-zinc-800 rounded-[28px] p-5 shadow-[0_10px_60px_rgba(0,0,0,0.05)] dark:shadow-none transition-all focus-within:ring-1 focus-within:ring-zinc-400 dark:focus-within:ring-zinc-600 focus-within:bg-white dark:focus-within:bg-[#202024] focus-within:shadow-2xl">
              <textarea 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Message CodeMax Architect..."
                className="w-full bg-transparent border-none focus:ring-0 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 py-2 px-3 resize-none min-h-[50px] max-h-60 text-[16px] font-medium tracking-tight leading-relaxed scrollbar-hide"
                rows={1}
              />
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800/30">
                <div className="flex items-center space-x-3">
                  <button className="flex items-center space-x-2 px-4 py-2 rounded-full border border-zinc-200 dark:border-zinc-800 text-zinc-500 text-[10px] font-black uppercase tracking-widest hover:border-zinc-400 hover:bg-white dark:hover:bg-[#2a2a2e] transition-all">
                    <CommandLineIcon className="w-4 h-4" />
                    <span>DeepThink</span>
                  </button>
                  <button className="flex items-center space-x-2 px-4 py-2 rounded-full border border-zinc-200 dark:border-zinc-800 text-zinc-500 text-[10px] font-black uppercase tracking-widest hover:border-zinc-400 hover:bg-white dark:hover:bg-[#2a2a2e] transition-all">
                    <MagnifyingGlassIcon className="w-4 h-4" />
                    <span>Search</span>
                  </button>
                </div>
                <div className="flex items-center space-x-3">
                  <button onClick={() => fileInputRef.current?.click()} className="p-2.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                    <PaperClipIcon className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleSend()}
                    disabled={isGenerating || !input.trim()}
                    className="p-3 bg-zinc-900 dark:bg-zinc-800 text-white disabled:opacity-20 rounded-full transition-all shadow-xl active:scale-90"
                  >
                    <ArrowUpIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
            <div className="text-center mt-4">
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.4em] opacity-40">Architect Core Alpha v1.3 • AI-generated for reference only</p>
            </div>
          </div>
        </div>
      </main>

      {/* Admin Settings Modal */}
      {showAdmin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
           <div className="w-full max-w-lg bg-white dark:bg-[#1c1c1f] border border-zinc-200 dark:border-zinc-800 rounded-6 p-10 shadow-[0_32px_128px_rgba(0,0,0,0.6)]">
              <div className="flex items-center justify-between mb-10">
                <div>
                   <h2 className="text-2xl font-black tracking-tighter text-zinc-900 dark:text-white uppercase">Engine Controller</h2>
                   <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Local Ollama Connectivity</p>
                </div>
                <button onClick={() => setShowAdmin(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-6 transition-all"><XMarkIcon className="w-6 h-6"/></button>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                   <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">API Gateway URL</label>
                   <input 
                    type="text" 
                    value={ollamaUrl} 
                    onChange={(e) => setOllamaUrl(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-6 px-5 py-4 text-sm font-medium focus:ring-1 focus:ring-blue-500 transition-all placeholder-zinc-400"
                    placeholder="http://localhost:11434"
                   />
                </div>

                <button 
                  onClick={syncOllama}
                  disabled={isSyncingOllama}
                  className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-6 font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl transition-all flex items-center justify-center space-x-3 active:scale-[0.98] disabled:opacity-50"
                >
                  {isSyncingOllama ? (
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  ) : (
                    <SignalIcon className="w-4 h-4" />
                  )}
                  <span>{isSyncingOllama ? 'Probing Gateway...' : 'Synchronize Local Assets'}</span>
                </button>

                <div className="p-5 bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-6">
                   <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Detected Models</h3>
                        <span className="text-[10px] font-bold text-emerald-500 uppercase">{ollamaModels.length} Found</span>
                   </div>
                   {ollamaModels.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {ollamaModels.map(m => (
                          <span key={m} className="px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-6 text-[10px] font-bold text-zinc-600 dark:text-zinc-400 shadow-sm uppercase tracking-tighter">
                            {m}
                          </span>
                        ))}
                      </div>
                   ) : (
                      <p className="text-[10px] text-zinc-400 italic">Initiate sync to detect local Ollama instances.</p>
                   )}
                </div>
              </div>

              <div className="mt-12 pt-8 border-t border-zinc-100 dark:border-zinc-800">
                <button onClick={() => setShowAdmin(false)} className="w-full py-4 bg-zinc-100 dark:bg-zinc-800/50 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white rounded-6 font-black text-[11px] uppercase tracking-widest transition-all">Exit Controller</button>
              </div>
           </div>
        </div>
      )}

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
        onVerify={() => handleSend(`CodeMax Alpha: Deep architectural audit required. Analyze the existing codebase for logic optimization, UI fluidity, and performance bottlenecks. Refactor and fix all identified issues immediately.\n\nSOURCE CODE:\n${activeCreation?.html}`)}
      />
    </div>
  );
};

export default App;
