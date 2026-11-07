import { passportNumber } from '@/lib/travel';

interface PassportCoverProps {
  name: string;
  userId?: number;
  className?: string;
}

/** Passeport fermé : couverture bleu nuit, globe doré, nom et numéro du voyageur. */
export function PassportCover({ name, userId, className = '' }: PassportCoverProps) {
  return (
    <div
      className={`relative flex aspect-[5/6] w-full flex-col items-center overflow-hidden rounded-[18px] px-6 pb-8 pt-9 text-center shadow-[0_24px_40px_-18px_rgba(7,26,36,0.55)] ${className}`}
      style={{ background: 'linear-gradient(160deg, #0F3342 0%, #0A2430 55%, #071B26 100%)' }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '6px 6px' }} />
      <p className="font-serif text-[22px] font-light uppercase tracking-[0.42em] text-[#C9A85C]">Passeport</p>
      <svg viewBox="0 0 120 120" className="my-auto h-auto w-[62%] max-w-[210px]" fill="none" stroke="#C9A85C" strokeWidth="1.5" aria-hidden>
        <circle cx="60" cy="60" r="56" strokeWidth="2.4" />
        <ellipse cx="60" cy="60" rx="56" ry="22" />
        <ellipse cx="60" cy="60" rx="56" ry="40" opacity=".7" />
        <ellipse cx="60" cy="60" rx="22" ry="56" />
        <ellipse cx="60" cy="60" rx="40" ry="56" opacity=".7" />
        <line x1="4" y1="60" x2="116" y2="60" />
        <line x1="60" y1="4" x2="60" y2="116" />
        <line x1="12" y1="34" x2="108" y2="34" opacity=".6" />
        <line x1="12" y1="86" x2="108" y2="86" opacity=".6" />
      </svg>
      <p className="font-serif text-[27px] font-normal leading-tight text-[#C9A85C]">{name}</p>
      <p className="mt-3 font-mono text-[12px] tracking-[0.14em] text-[#C9A85C]/70">{passportNumber(userId)}</p>
    </div>
  );
}
