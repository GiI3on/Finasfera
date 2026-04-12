export default function IkeJar() {
  return (
    <div className="w-full flex flex-col items-center my-12">
      {/* Słoik narysowany w CSS/Tailwind */}
      <div className="relative w-48 h-64 border-4 border-zinc-600 rounded-b-3xl rounded-t-xl flex flex-col justify-end p-1.5 shadow-2xl bg-zinc-900/30">
        {/* Przykrywka */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-52 h-4 bg-zinc-500 rounded-sm shadow-md" />
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-48 h-2 bg-zinc-600 rounded-t-sm" />
        
        {/* Miarka z boku */}
        <div className="absolute left-full ml-4 h-full flex flex-col justify-between py-4 text-xs text-zinc-500 font-mono">
          <span>28 260 zł (Limit)</span>
          <span>20 000 zł</span>
          <span>10 000 zł</span>
          <span>0 zł</span>
        </div>

        {/* Warstwy wpłat */}
        <div className="w-full h-[15%] bg-yellow-600/80 rounded-b-2xl border-t border-yellow-500 flex items-center justify-center">
          <span className="text-black text-xs font-bold">500 zł</span>
        </div>
        <div className="w-full h-[25%] bg-yellow-500/80 border-t border-yellow-400 flex items-center justify-center mt-1">
          <span className="text-black text-xs font-bold">Premia</span>
        </div>
        <div className="w-full h-[10%] bg-yellow-400/90 border-t border-yellow-300 flex items-center justify-center mt-1">
          <span className="text-black text-xs font-bold">500 zł</span>
        </div>
        
        {/* Pusta przestrzeń z napisem */}
        <div className="absolute top-1/4 left-0 w-full text-center">
          <span className="text-zinc-500 text-sm italic font-medium">Wolne miejsce</span>
        </div>
      </div>
      
      <span className="text-sm text-zinc-400 mt-8 italic text-center max-w-md">
        Limit 28 260 PLN to maksymalna pojemność, a nie obowiązek. Wypełniaj go we własnym tempie!
      </span>
    </div>
  );
}