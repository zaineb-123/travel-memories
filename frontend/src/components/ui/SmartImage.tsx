/* eslint-disable @next/next/no-img-element */
'use client';

import { useState } from 'react';
import { ImageOff } from 'lucide-react';

interface SmartImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  fallbackClassName?: string;
}

/**
 * <img> simple pour les photos servies par l'API (autre hôte/port que le site).
 * Affiche un fond neutre si l'image est absente ou ne se charge pas.
 */
export function SmartImage({ src, alt = '', className = '', fallbackClassName = '', ...rest }: SmartImageProps) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`flex items-center justify-center bg-[#E3EDF2] text-[#1F5F7B]/60 ${className} ${fallbackClassName}`}>
        <ImageOff className="h-8 w-8" />
      </div>
    );
  }
  return <img src={src} alt={alt} className={className} loading="lazy" onError={() => setFailed(true)} {...rest} />;
}
