'use client';

import Link from 'next/link';
import { Globe, Send, MapPin, Heart } from 'lucide-react';


export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-[#F4F5F7]">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              <span className="text-lg font-bold">Travel Memories</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Partagez vos voyages et découvrez le monde à travers les yeux d'autres aventuriers.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-3 font-semibold">Découvrir</h3>
            <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
              <li><Link href="/explore" className="hover:text-blue-600">Explorer</Link></li>
              <li><Link href="/my-map" className="hover:text-blue-600">Carte interactive</Link></li>
              <li><Link href="/create" className="hover:text-blue-600">Partager un voyage</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="mb-3 font-semibold">Support</h3>
            <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
              <li><Link href="/about" className="hover:text-blue-600">À propos</Link></li>
              <li><Link href="/contact" className="hover:text-blue-600">Contact</Link></li>
              <li><Link href="/privacy" className="hover:text-blue-600">Confidentialité</Link></li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h3 className="mb-3 font-semibold">Suivez-nous</h3>
            <div className="flex gap-4">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" 
                 className="text-gray-500 hover:text-blue-600">
                <Globe className="h-5 w-5" />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer"
                 className="text-gray-500 hover:text-blue-600">
                <Send className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t pt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <p className="flex items-center justify-center gap-1">
            Made with <Heart className="h-3 w-3 text-red-500" /> for travelers
          </p>
          <p>© {currentYear} Travel Memories. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
}