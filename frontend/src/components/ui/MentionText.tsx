'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

/** Affiche un texte en transformant les @pseudo en liens vers le profil. */
export function MentionText({ text, className }: { text: string; className?: string }) {
  const parts: ReactNode[] = [];
  const re = /(?<![\w@])@([A-Za-z0-9_]{3,50})/g;
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <Link
        key={key++}
        href={`/profile/${m[1]}`}
        className="font-medium text-[#1F5F7B] hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        @{m[1]}
      </Link>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <span className={className}>{parts}</span>;
}
