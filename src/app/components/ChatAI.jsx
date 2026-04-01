'use client';
import { useState, useRef, useEffect } from 'react';
import { auth } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { listPortfolios, listenHoldings } from '../../lib/portfolioStore'; 

export default function ChatAI() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [userUid, setUserUid] = useState(null);
  const [portfolios, setPortfolios] = useState([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState("");
  const [currentHoldings, setCurrentHoldings] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    onAuthStateChanged(auth, (user) => setUserUid(user?.uid || null));
  }, []);

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

  const handleSend = async (customMsg, mode = 'audit') => {
    const userMsg = customMsg || input;
    if (!userMsg.trim() || loading) return;

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
      // Czyścimy tekst z ewentualnych znaczników markdown backticks
      const cleanText = data.text.replace(/```markdown|```/g, '');
      setMessages(prev => [...prev, { role: 'ai', content: cleanText }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', content: "BŁĄD POŁĄCZENIA." }]);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = (text) => {
    return text.split('\n').map((line, i) => {
      // Nagłówki
      if (line.startsWith('###') || line.match(/^[0-9]\./)) {
        return <h3 key={i} className="text-yellow-400 font-bold text-[14px] mt-4 mb-2 tracking-wide uppercase border-b border-zinc-800 pb-1">{line.replace('###', '')}</h3>;
      }
      // Tabele (bardzo uproszczone renderowanie)
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
      // Pogrubienia
      if (line.includes('**')) {
        const parts = line.split('**');
        return <p key={i} className="mb-2 text-[14px] text-zinc-300 leading-relaxed">
          {parts.map((p, j) => j % 2 === 1 ? <strong key={j} className="text-white font-bold">{p}</strong> : p)}
        </p>;
      }
      return line.trim() ? <p key={i} className="mb-2 text-[14px] text-zinc-400 leading-relaxed">{line}</p> : <div key={i} className="h-2" />;
    });
  };

  if (!userUid) return null;

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
          
          <div className="p-5 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]" />
                <span className="text-white font-black text-[12px] tracking-widest uppercase">Ekspert Finasfera</span>
              </div>
              <span className="text-zinc-500 text-[9px] font-bold uppercase tracking-[0.1em] mt-0.5">Analiza portfela live</span>
            </div>
            <select 
              value={selectedPortfolioId} 
              onChange={(e) => setSelectedPortfolioId(e.target.value)} 
              className="bg-black border-zinc-700 border text-[10px] px-3 py-1.5 outline-none text-yellow-400 font-bold uppercase tracking-tighter"
            >
              {portfolios.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-zinc-800">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-6">
                <button onClick={() => handleSend("Szybki briefing: dlaczego mój portfel dziś rośnie/spada?", 'news')} className="w-full py-4 border-2 border-zinc-800 text-zinc-400 text-[11px] font-black uppercase hover:border-yellow-400 hover:text-yellow-400 transition-all bg-zinc-900/20 tracking-widest">
                  ⚡ Szybki News Rynkowy
                </button>
                <button onClick={() => handleSend("Przeprowadź pełny audyt struktury moich pozycji.", 'audit')} className="w-full py-4 border-2 border-zinc-800 text-zinc-400 text-[11px] font-black uppercase hover:border-yellow-400 hover:text-yellow-400 transition-all bg-zinc-900/20 tracking-widest">
                  📊 Pełny Audyt Portfela
                </button>
              </div>
            ) : (
              <>
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`${m.role === 'user' ? 'bg-yellow-400 text-black px-4 py-2 font-black text-[12px] uppercase border-2 border-black' : 'w-full bg-zinc-900/30 p-5 border border-zinc-800/50'}`}>
                      {m.role === 'user' ? m.content : renderContent(m.content)}
                    </div>
                  </div>
                ))}
                {!loading && (
                   <div className="flex gap-2 pt-2 animate-in fade-in duration-500">
                      <button onClick={() => handleSend("Zrób szybki news rynkowy dla moich spółek.", 'news')} className="text-[10px] bg-zinc-900 border border-zinc-700 px-3 py-2 text-zinc-400 hover:text-yellow-400 transition-all font-bold uppercase">⚡ News</button>
                      <button onClick={() => handleSend("Wygeneruj pełną analizę ryzyka.", 'audit')} className="text-[10px] bg-zinc-900 border border-zinc-700 px-3 py-2 text-zinc-400 hover:text-yellow-400 transition-all font-bold uppercase">📊 Audyt</button>
                   </div>
                )}
              </>
            )}
            {loading && <div className="text-yellow-400 text-[10px] font-black animate-pulse uppercase tracking-[0.3em] pl-2 italic">Dekodowanie danych...</div>}
          </div>

          <div className="p-6 bg-zinc-900/50 border-t border-zinc-800">
            <div className="flex gap-4 items-center border-b-2 border-zinc-800 focus-within:border-yellow-400 transition-all pb-1">
              <span className="text-yellow-400 font-bold text-xs">//</span>
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} className="flex-1 bg-transparent text-white py-2 outline-none text-[13px] uppercase placeholder:text-zinc-800 font-bold" placeholder="ZAPYTAJ O SPÓŁKĘ..." />
              <button onClick={() => handleSend()} className="text-yellow-400 hover:text-white transition-colors">
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}