'use client';

import { Pause, Play } from 'lucide-react';

interface MapTimelineProps {
  years: number[];
  /** Année affichée (les pays visités jusqu'à la fin de cette année sont coloriés). */
  year: number;
  playing: boolean;
  onSelect: (year: number) => void;
  onTogglePlay: () => void;
}

/** Frise des années : le bouton rond « rejoue mes voyages » et recolorie la carte pays après pays. */
export function MapTimeline({ years, year, playing, onSelect, onTogglePlay }: MapTimelineProps) {
  return (
    <div className="flex max-w-full items-center gap-1 rounded-full border border-[#E3E7EC] bg-white/95 p-1.5 shadow-[0_6px_20px_-10px_rgba(17,26,34,0.25)] backdrop-blur">
      <button
        type="button"
        onClick={onTogglePlay}
        aria-label={playing ? 'Mettre en pause' : 'Rejouer mes voyages'}
        title={playing ? 'Pause' : 'Rejouer mes voyages'}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#111A22] text-white transition hover:bg-[#2A3844]"
      >
        {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
      </button>
      <div className="no-scrollbar flex items-center gap-0.5 overflow-x-auto" role="group" aria-label="Année">
        {years.map((y) => (
          <button
            key={y}
            type="button"
            aria-pressed={y === year}
            onClick={() => onSelect(y)}
            className={`rounded-full px-3.5 py-2 font-mono text-[15px] transition ${
              y === year ? 'bg-[#111A22] text-white' : 'text-[#7A8794] hover:text-[#111A22]'
            }`}
          >
            {y}
          </button>
        ))}
      </div>
    </div>
  );
}
