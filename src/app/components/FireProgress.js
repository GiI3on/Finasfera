"use client";

export default function FireProgress({ percent }) {
  const safePercent = Number.isFinite(percent)
    ? Math.max(0, Math.min(100, Number(percent)))
    : 0;

  // Idealnie dopasowane wymiary do viewBox="0 0 100 100"
  const radius = 46; 
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (safePercent / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center">
      {/* Większy kontener dla kółka */}
      <div className="relative w-28 h-28 flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full transform -rotate-90 overflow-visible">
          {/* Tło kółka */}
          <circle 
            cx="50" cy="50" r={radius} 
            stroke="#27272a" strokeWidth="8" fill="none" 
          />
          {/* Pasek postępu */}
          <circle 
            cx="50" cy="50" r={radius} 
            stroke="#facc15" strokeWidth="8" fill="none"
            strokeDasharray={circumference} 
            strokeDashoffset={strokeDashoffset} 
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out" 
          />
        </svg>
        
        {/* Procent w środku – teraz większy i bardziej czytelny */}
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-zinc-100">{safePercent}%</span>
        </div>
      </div>
    </div>
  );
}