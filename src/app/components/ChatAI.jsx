'use client';
import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { listPortfolios, listenHoldings } from '../../lib/portfolioStore'; 
import { faqData } from '../../lib/faqData';
import { useAuth } from './AuthProvider'; 

export default function ChatAI() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { user, signIn } = useAuth();
  const userUid = user?.uid || null;

  const [portfolios, setPortfolios] = useState([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState("");
  const [currentHoldings, setCurrentHoldings] = useState([]);
  const scrollRef = useRef(null);
  
  const pathname = usePathname();
  const currentFaq = faqData[pathname] || [];

  useEffect(() => {
    if (userUid && isOpen) {
      listPortfolios(userUid).then(data => {
          setPortfolios([{ id: "", name: "PORTFEL GŁÓWNY (SUMA)" }, ...data])
      });
    }
  }, [isOpen, userUid]);

  useEffect(() => {
    if (!userUid || !isOpen) return;
    const unsub = listenHoldings(userUid, selectedPortfolioId || null, (data) => setCurrentHoldings(data));
    return () => unsub();
  }, [selectedPortfolioId, isOpen, userUid]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const resetChat = () => {
    setMessages([]);
    setLoading(false);
  };

  const handleManualSend = (faq) => {
    setMessages(prev => [...prev, { role: 'user', content: faq.question }]);
    setLoading(true);
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'ai', content: faq.answer, isManual: true }]);
      setLoading(false);
    }, 600);
  };

  const handleSend = async (customMsg, mode = 'news') => {
    const userMsg = customMsg || input;
    if (!userMsg.trim() || loading) return;

    if (!userUid) {
      setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
      setInput('');
      setLoading(true);
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'ai', isLoginPrompt: true }]);
        setLoading(false);
      }, 600);
      return;
    }

    if (mode === 'news' && currentHoldings.length === 0) {
       setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
       setMessages(prev => [...prev, { role: 'ai', content: `Brak pozycji w portfelu "${portfolios.find(p => p.id === selectedPortfolioId)?.name || "Główny"}". Dodaj aktywa, aby Żuberek mógł wygenerować dla nich news.` }]);
       return;
    }

    const today = new Date().toLocaleDateString('pl-PL', { year: 'numeric', month: 'long', day: 'numeric' });
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMsg,
          portfolioName: portfolios.find(p => p.id === selectedPortfolioId)?.name || "Główny",
          holdings: currentHoldings,
          currentDate: today,
          mode: mode 
        }),
      });
      const data = await res.json();
      const cleanText = data.text.replace(/```markdown|```/g, '');
      setMessages(prev => [...prev, { role: 'ai', content: cleanText, isManual: false }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', content: "BŁĄD POŁĄCZENIA." }]);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = (m) => {
    if (m.isLoginPrompt) {
      return (
        <div className="text-[14px] text-zinc-300 leading-relaxed space-y-2">
          <p><b>Dostęp wymaga logowania</b></p>
          <p>Aby używać zaawansowanego Skanera AI i generować newsy rynkowe, musisz posiadać konto.</p>
          <button onClick={signIn} className="text-amber-400 font-bold hover:text-white transition-colors mt-2 inline-block text-left">
            Zaloguj się lub załóż darmowe konto →
          </button>
        </div>
      );
    }

    if (m.isManual) {
        return <div className="text-[14px] text-zinc-300 leading-relaxed space-y-2 prose-strong:text-amber-400" dangerouslySetInnerHTML={{ __html: m.content }} />;
    }
    
    return m.content.split('\n').map((line, i) => {
      if (line.startsWith('###') || line.match(/^[0-9]\./)) {
        return <h3 key={i} className="text-amber-400 font-bold text-[13px] mt-4 mb-2 tracking-wide uppercase border-b border-zinc-800 pb-1">{line.replace('###', '')}</h3>;
      }
      if (line.includes('|')) {
        const cells = line.split('|').filter(c => c.trim().length > 0);
        if (cells.length > 1 && !line.includes('---')) {
          return (
            <div key={i} className="flex justify-between border-b border-zinc-800/30 py-1.5 text-[13px]">
              <span className="text-zinc-400">{cells[0].trim()}</span>
              <span className="text-white font-mono">{cells[1].trim()}</span>
            </div>
          );
        }
        return null;
      }
      if (line.includes('**')) {
        const parts = line.split('**');
        return <p key={i} className="mb-2 text-[14px] text-zinc-300 leading-relaxed">
          {parts.map((p, j) => j % 2 === 1 ? <strong key={j} className="text-white font-bold">{p}</strong> : p)}
        </p>;
      }
      return line.trim() ? <p key={i} className="mb-2 text-[14px] text-zinc-400 leading-relaxed">{line}</p> : <div key={i} className="h-2" />;
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] font-sans selection:bg-amber-400 selection:text-black">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="bg-amber-400 hover:bg-white text-black px-6 py-3 font-black text-[12px] tracking-[0.2em] uppercase rounded-full shadow-[0_8px_16px_rgba(0,0,0,0.4)] transition-all active:scale-95"
      >
        {isOpen ? '✕ ZAMKNIJ' : 'ASYSTENT AI'}
      </button>

      {isOpen && (
        <div className="absolute bottom-16 right-0 w-[400px] sm:w-[420px] h-[680px] bg-[#0c0c0e] rounded-2xl border border-zinc-800 flex flex-col shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          
          <div className="p-5 bg-zinc-950 border-b border-zinc-800 flex flex-col gap-4 z-10">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-0.5">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${userUid ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-amber-500 shadow-[0_0_8px_#f59e0b]'}`} />
                  <span className="text-white font-black text-[13px] tracking-widest uppercase">Ekspert Finasfera</span>
                </div>
                <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.1em]">
                  {!userUid ? 'Darmowa Baza Wiedzy' : (currentFaq.length > 0 ? 'Tryb edukacyjny' : 'Analiza portfela live')}
                </span>
              </div>
            </div>

            {userUid && portfolios.length > 0 && (
              <div className="relative">
                <select 
                  value={selectedPortfolioId} 
                  onChange={(e) => setSelectedPortfolioId(e.target.value)} 
                  className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-[12px] font-semibold px-3 py-2 rounded-lg outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all uppercase tracking-wider appearance-none cursor-pointer"
                >
                  {portfolios.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                </div>
              </div>
            )}
          </div>
          
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-4">
                
                <div className="text-center mb-2">
                   {/* Zwiększona czcionka z 13px na 14px i mocniejszy kolor */}
                   <p className="text-zinc-300 text-[14px] leading-relaxed px-4">
                     {!userUid ? "Cześć! Wybierz poradnik z listy poniżej. Zaloguj się, aby odblokować pełną analizę AI." : "W czym mogę Ci pomóc? Wybierz temat z listy lub zadaj pytanie."}
                   </p>
                </div>

                {currentFaq.length > 0 && (
                    <div className="w-full space-y-2 mb-2">
                        {/* Zwiększona czcionka nagłówka z 9px na 10px */}
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] block text-center mb-3">Szybka pomoc merytoryczna:</span>
                        {currentFaq.map(faq => (
                            <button key={faq.id} onClick={() => handleManualSend(faq)} className="w-full py-3 px-4 bg-zinc-900/50 border border-zinc-800/80 rounded-xl text-zinc-300 text-[12px] font-bold uppercase hover:border-amber-400/50 hover:bg-amber-400/5 hover:text-amber-400 transition-all text-left flex items-center justify-between group">
                                {faq.question}
                                <span className="text-zinc-600 group-hover:text-amber-400 transition-colors">→</span>
                            </button>
                        ))}
                    </div>
                )}

                <div className="w-full h-px bg-zinc-800/50 my-2" />

                <button 
                  onClick={() => handleSend("Szybki briefing: dlaczego mój portfel dziś rośnie/spada?", 'news')} 
                  className="w-full py-4 bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-200 text-[12px] font-black uppercase hover:bg-amber-400 hover:border-amber-400 hover:text-black transition-all tracking-widest shadow-lg flex items-center justify-center gap-2"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h4l3-9 5 18 3-9h5"/></svg>
                  Szybki News Rynkowy
                </button>

              </div>
            ) : (
              <>
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] ${m.role === 'user' ? 'bg-amber-400 text-black px-4 py-3 font-bold text-[13px] uppercase rounded-2xl rounded-tr-sm shadow-sm' : 'bg-zinc-900 p-5 border border-zinc-800 rounded-2xl rounded-tl-sm shadow-sm'}`}>
                      {m.role === 'user' ? m.content : renderContent(m)}
                    </div>
                  </div>
                ))}
              </>
            )}
            {loading && <div className="flex gap-1.5 items-center pl-2 pt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{animationDelay: '0ms'}}/>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{animationDelay: '150ms'}}/>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{animationDelay: '300ms'}}/>
            </div>}
          </div>

          <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex flex-col gap-3">
            
            {!loading && messages.length > 0 && (
              <div className="flex justify-center pb-1">
                <button 
                  onClick={resetChat}
                  className="text-[11px] text-zinc-400 hover:text-amber-400 transition-colors uppercase tracking-widest font-bold flex items-center gap-1.5"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                  Wyczyść czat i zadaj nowe pytanie
                </button>
              </div>
            )}

            <div className="flex gap-3 items-center bg-zinc-900 rounded-xl px-4 py-1 border border-zinc-800 focus-within:border-amber-400 focus-within:ring-1 focus-within:ring-amber-400 transition-all">
              {userUid ? (
                <>
                  <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} className="flex-1 bg-transparent text-white py-2 outline-none text-[13px] uppercase placeholder:text-zinc-600 font-bold" placeholder="Zadaj pytanie..." />
                  <button onClick={() => handleSend()} className="text-zinc-500 hover:text-amber-400 transition-colors p-2">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                  </button>
                </>
              ) : (
                <div className="flex-1 text-center py-3 text-[12px] font-bold text-zinc-500 uppercase tracking-wider">
                   <button onClick={signIn} className="text-amber-400 hover:text-amber-300 transition-colors underline underline-offset-2">Zaloguj się</button>, aby pisać z AI
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}