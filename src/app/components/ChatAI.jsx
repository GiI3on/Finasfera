'use client';
import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { listPortfolios, listenHoldings } from '../../lib/portfolioStore'; 
import { faqData } from '../../lib/faqData';
import { useAuth } from './AuthProvider'; // ⬅️ IMPORTUJEMY TWÓJ PROVIDER

export default function ChatAI() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  // ⬅️ UŻYWAMY TWOJEGO GLOBALNEGO STANU LOGOWANIA
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
      listPortfolios(userUid).then(data => setPortfolios([{ id: "", name: "PORTFEL GŁÓWNY" }, ...data]));
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

    // JEŚLI NIEZALOGOWANY: Dodajemy specjalną wiadomość z przyciskiem logowania
    if (!userUid) {
      setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
      setInput('');
      setLoading(true);
      setTimeout(() => {
        setMessages(prev => [...prev, { 
          role: 'ai', 
          isLoginPrompt: true // Flaga do wyrenderowania Reactowego przycisku
        }]);
        setLoading(false);
      }, 600);
      return;
    }

    // JEŚLI ZALOGOWANY: Wykonujemy zapytanie do API
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
    // ⬅️ OBSŁUGA REACTOWEGO PRZYCISKU LOGOWANIA W CZACIE
    if (m.isLoginPrompt) {
      return (
        <div className="text-[14px] text-zinc-300 leading-relaxed space-y-2">
          <p><b>Dostęp wymaga logowania</b></p>
          <p>Aby używać zaawansowanego Skanera AI i generować newsy rynkowe, musisz posiadać konto.</p>
          <button 
            onClick={signIn} 
            className="text-yellow-400 font-bold hover:text-white transition-colors mt-2 inline-block text-left"
          >
            Zaloguj się lub załóż darmowe konto →
          </button>
        </div>
      );
    }

    if (m.isManual) {
        return <div className="text-[14px] text-zinc-300 leading-relaxed space-y-2 prose-strong:text-yellow-400" dangerouslySetInnerHTML={{ __html: m.content }} />;
    }
    
    return m.content.split('\n').map((line, i) => {
      if (line.startsWith('###') || line.match(/^[0-9]\./)) {
        return <h3 key={i} className="text-yellow-400 font-bold text-[14px] mt-4 mb-2 tracking-wide uppercase border-b border-zinc-800 pb-1">{line.replace('###', '')}</h3>;
      }
      if (line.includes('|')) {
        const cells = line.split('|').filter(c => c.trim().length > 0);
        if (cells.length > 1 && !line.includes('---')) {
          return (
            <div key={i} className="flex justify-between border-b border-zinc-800/50 py-1 text-[13px]">
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
    <div className="fixed bottom-6 right-6 z-[9999] font-sans selection:bg-yellow-400 selection:text-black">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="bg-yellow-400 hover:bg-white text-black px-6 py-3 font-black text-[12px] tracking-[0.2em] uppercase border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-x-1 active:translate-y-1 active:shadow-none"
      >
        {isOpen ? 'ZAMKNIJ ASYSTENTA' : 'ASYSTENT AI'}
      </button>

      {isOpen && (
        <div className="absolute bottom-20 right-0 w-[420px] h-[680px] bg-[#0c0c0e] border-2 border-zinc-800 flex flex-col shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
          
          <div className="p-5 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between z-10">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full animate-pulse ${userUid ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-yellow-500 shadow-[0_0_8px_#eab308]'}`} />
                <span className="text-white font-black text-[12px] tracking-widest uppercase">Ekspert Finasfera</span>
              </div>
              <span className="text-zinc-500 text-[9px] font-bold uppercase tracking-[0.1em] mt-0.5">
                {!userUid ? 'Darmowa Baza Wiedzy' : (currentFaq.length > 0 ? 'Tryb edukacyjny aktywny' : 'Analiza portfela live')}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {userUid && currentHoldings.length > 0 && (
                  <select 
                  value={selectedPortfolioId} 
                  onChange={(e) => setSelectedPortfolioId(e.target.value)} 
                  className="bg-black border-zinc-700 border text-[10px] px-3 py-1.5 outline-none text-yellow-400 font-bold uppercase tracking-tighter"
                  >
                  {portfolios.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
              )}
              {messages.length > 0 && (
                <button 
                  onClick={resetChat}
                  className="text-[10px] font-black text-zinc-500 hover:text-white border border-zinc-700 hover:border-zinc-500 px-2 py-1.5 rounded transition-colors uppercase tracking-tighter"
                  title="Wyczyść historię czatu"
                >
                  Wyczyść czat
                </button>
              )}
            </div>
          </div>
          
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-zinc-800">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-4">
                
                <div className="text-center mb-4">
                   <p className="text-zinc-400 text-[13px] leading-relaxed">
                     {!userUid ? "Cześć! Wybierz poradnik z listy poniżej. Zaloguj się, aby odblokować pełną analizę AI." : "W czym mogę Ci pomóc? Wybierz temat z listy poniżej lub zadaj własne pytanie."}
                   </p>
                </div>

                {currentFaq.length > 0 && (
                    <div className="w-full space-y-2 mb-4">
                        <span className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.2em] block text-center mb-2">Szybka pomoc merytoryczna:</span>
                        {currentFaq.map(faq => (
                            <button key={faq.id} onClick={() => handleManualSend(faq)} className="w-full py-3 px-4 border border-zinc-800 text-zinc-200 text-[11px] font-bold uppercase hover:border-yellow-400 hover:text-yellow-400 transition-all bg-zinc-900/40 text-left flex items-center justify-between group">
                                {faq.question}
                                <span className="text-zinc-600 group-hover:text-yellow-400">→</span>
                            </button>
                        ))}
                    </div>
                )}

                <div className="w-full h-px bg-zinc-800 my-2" />

                <button onClick={() => handleSend("Szybki briefing: dlaczego mój portfel dziś rośnie/spada?", 'news')} className="w-full py-4 border-2 border-zinc-800 text-zinc-400 text-[11px] font-black uppercase hover:border-yellow-400 hover:text-yellow-400 transition-all bg-zinc-900/20 tracking-widest">
                  Szybki News Rynkowy (AI)
                </button>

              </div>
            ) : (
              <>
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`${m.role === 'user' ? 'bg-yellow-400 text-black px-4 py-2 font-black text-[12px] uppercase border-2 border-black' : 'w-full bg-zinc-900/30 p-5 border border-zinc-800/50'}`}>
                      {m.role === 'user' ? m.content : renderContent(m)}
                    </div>
                  </div>
                ))}
              </>
            )}
            {loading && <div className="text-yellow-400 text-[10px] font-black animate-pulse uppercase tracking-[0.3em] pl-2 italic">Przetwarzanie danych...</div>}
          </div>

          <div className="p-5 bg-zinc-900/80 border-t border-zinc-800 flex flex-col gap-3 backdrop-blur-md">
            
            {!loading && messages.length > 0 && currentFaq.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pb-1">
                    {currentFaq.map(faq => (
                        <button 
                            key={`pill-${faq.id}`} 
                            onClick={() => handleManualSend(faq)} 
                            className="text-[9px] bg-zinc-900 border border-zinc-800 px-2 py-1 text-zinc-400 hover:text-yellow-400 hover:bg-zinc-800 transition-all font-bold uppercase rounded-sm"
                        >
                            {faq.question}
                        </button>
                    ))}
                </div>
            )}

            <div className="flex gap-4 items-center border-b-2 border-zinc-800 focus-within:border-yellow-400 transition-all pb-1">
              <span className="text-yellow-400 font-bold text-xs">//</span>
              {userUid ? (
                <>
                  <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} className="flex-1 bg-transparent text-white py-2 outline-none text-[13px] uppercase placeholder:text-zinc-800 font-bold" placeholder="ZAPYTAJ LUB WYBIERZ TEMAT..." />
                  <button onClick={() => handleSend()} className="text-yellow-400 hover:text-white transition-colors">
                    <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                  </button>
                </>
              ) : (
                <div className="flex-1 text-center py-2 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                   <button onClick={signIn} className="text-yellow-400 hover:text-white transition-colors">Zaloguj się</button>, aby pisać z AI
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}