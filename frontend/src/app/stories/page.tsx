'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { 
  MapPin, 
  Heart, 
  MessageCircle, 
  Bookmark, 
  Share2, 
  Search,
  Filter,
  Calendar,
  Clock,
  ChevronRight,
  Users
} from 'lucide-react';

const stories = [
  {
    id: 1,
    title: "Aventure à travers les Alpes Suisses",
    author: "Marie Laurent",
    username: "@marie_travels",
    avatar: "https://randomuser.me/api/portraits/women/1.jpg",
    cover: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800&h=500&fit=crop",
    description: "Un voyage inoubliable à travers les montagnes suisses, entre lacs cristallins et sommets enneigés...",
    location: "Suisse",
    date: "15 Mai 2024",
    readTime: "8 min",
    likes: 234,
    comments: 45,
    category: "Aventure",
    featured: true
  },
  {
    id: 2,
    title: "Les temples cachés du Cambodge",
    author: "Thomas Dubois",
    username: "@thomas_explorer",
    avatar: "https://randomuser.me/api/portraits/men/2.jpg",
    cover: "https://images.unsplash.com/photo-1528127269322-539801943592?w=800&h=500&fit=crop",
    description: "Découverte des temples ancestraux d'Angkor et des trésors cachés de la jungle cambodgienne...",
    location: "Cambodge",
    date: "3 Avril 2024",
    readTime: "12 min",
    likes: 567,
    comments: 89,
    category: "Culture",
    featured: false
  },
  {
    id: 3,
    title: "Road trip en Islande - La terre de glace et de feu",
    author: "Sophie Martin",
    username: "@sophie_wanderlust",
    avatar: "https://randomuser.me/api/portraits/women/3.jpg",
    cover: "https://images.unsplash.com/photo-1504893524553-b855bce32c7c?w=800&h=500&fit=crop",
    description: "14 jours sur la route pour explorer les cascades, geysers et paysages lunaires islandais...",
    location: "Islande",
    date: "22 Février 2024",
    readTime: "15 min",
    likes: 892,
    comments: 156,
    category: "Road Trip",
    featured: true
  },
  {
    id: 4,
    title: "Safari au Kenya - À la rencontre de la faune sauvage",
    author: "Lucas Bernard",
    username: "@lucas_safari",
    avatar: "https://randomuser.me/api/portraits/men/4.jpg",
    cover: "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&h=500&fit=crop",
    description: "Une immersion totale dans la savane kenyane à la découverte des Big Five...",
    location: "Kenya",
    date: "10 Janvier 2024",
    readTime: "10 min",
    likes: 445,
    comments: 67,
    category: "Safari",
    featured: false
  },
  {
    id: 5,
    title: "Venise - La cité des amoureux",
    author: "Claire Rousseau",
    username: "@claire_romantic",
    avatar: "https://randomuser.me/api/portraits/women/5.jpg",
    cover: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=800&h=500&fit=crop",
    description: "Déambulation dans les canaux vénitiens et découverte des trésors cachés de la Sérénissime...",
    location: "Italie",
    date: "5 Décembre 2023",
    readTime: "7 min",
    likes: 678,
    comments: 112,
    category: "Romantique",
    featured: false
  },
  {
    id: 6,
    title: "Randonnée au Népal - Le camp de base de l'Everest",
    author: "Julien Moreau",
    username: "@julien_hiking",
    avatar: "https://randomuser.me/api/portraits/men/6.jpg",
    cover: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800&h=500&fit=crop",
    description: "L'aventure d'une vie : 12 jours de trek jusqu'au camp de base de l'Everest...",
    location: "Népal",
    date: "18 Novembre 2023",
    readTime: "20 min",
    likes: 1234,
    comments: 234,
    category: "Aventure",
    featured: true
  }
];

const categories = ["Toutes", "Aventure", "Culture", "Road Trip", "Safari", "Romantique"];

export default function StoriesPage() {
  const [selectedCategory, setSelectedCategory] = useState("Toutes");
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredStory, setHoveredStory] = useState<number | null>(null);

  const filteredStories = stories.filter(story => {
    const matchesCategory = selectedCategory === "Toutes" || story.category === selectedCategory;
    const matchesSearch = story.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          story.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          story.author.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const featuredStories = filteredStories.filter(s => s.featured);
  const regularStories = filteredStories.filter(s => !s.featured);

  return (
    <div className="min-h-screen bg-[#F4F5F7]">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 bg-[#E3EDF2]">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-[#111A22] mb-6">
              Histoires de voyages
            </h1>
            <p className="text-xl text-[#46525E] mb-8">
              Découvrez les aventures inspirantes de notre communauté de voyageurs
            </p>
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#7A8794]" />
              <Input
                placeholder="Rechercher une histoire..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 py-6 bg-white border-[#B9C3CC] rounded-full shadow-md"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-8 bg-white border-b border-[#E3E7EC] sticky top-16 z-30">
        <div className="container mx-auto px-6">
          <div className="flex flex-wrap justify-center gap-3">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-5 py-2 rounded-full transition-all duration-300 ${
                  selectedCategory === category
                    ? "bg-[#111A22] text-white shadow-md"
                    : "bg-[#F4F5F7] text-[#46525E] hover:bg-[#E3EDF2]"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Stories */}
      {featuredStories.length > 0 && (
        <section className="py-16 bg-[#F4F5F7]">
          <div className="container mx-auto px-6">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-[#111A22] mb-2">À la une</h2>
                <p className="text-[#7A8794]">Les histoires les plus populaires du moment</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredStories.map((story) => (
                <Card key={story.id} className="group overflow-hidden border-0 shadow-lg bg-white rounded-xl hover:shadow-xl transition-all duration-300">
                  <div className="relative h-56 overflow-hidden">
                    <Image
                      src={story.cover}
                      alt={story.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent"></div>
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 bg-[#E3EDF2] text-[#111A22] text-xs rounded-full">
                        {story.category}
                      </span>
                    </div>
                  </div>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={story.avatar} />
                        <AvatarFallback>{story.author[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-[#111A22] text-sm">{story.author}</p>
                        <p className="text-xs text-[#7A8794]">{story.username}</p>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-[#111A22] mb-2 line-clamp-1">{story.title}</h3>
                    <p className="text-[#46525E] text-sm mb-3 line-clamp-2">{story.description}</p>
                    <div className="flex items-center justify-between text-sm text-[#7A8794]">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>{story.location}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{story.readTime}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#EEF1F4]">
                      <div className="flex items-center gap-3">
                        <button className="flex items-center gap-1 text-[#7A8794] hover:text-red-500 transition">
                          <Heart className="h-4 w-4" />
                          <span className="text-xs">{story.likes}</span>
                        </button>
                        <button className="flex items-center gap-1 text-[#7A8794] hover:text-blue-500 transition">
                          <MessageCircle className="h-4 w-4" />
                          <span className="text-xs">{story.comments}</span>
                        </button>
                      </div>
                      <Link href={`/stories/${story.id}`}>
                        <Button variant="ghost" size="sm" className="text-[#1F5F7B] hover:text-[#174B62]">
                          Lire <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* All Stories Grid */}
      <section className="py-16 bg-[#F4F5F7]">
        <div className="container mx-auto px-6">
          <h2 className="text-2xl font-bold text-[#111A22] mb-8">Toutes les histoires</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {regularStories.map((story) => (
              <Card key={story.id} className="group overflow-hidden border-0 shadow-md bg-white rounded-xl hover:shadow-lg transition-all duration-300">
                <div className="relative h-48 overflow-hidden">
                  <Image
                    src={story.cover}
                    alt={story.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent"></div>
                  <div className="absolute top-3 left-3">
                    <span className="px-2 py-0.5 bg-[#E3EDF2] text-[#111A22] text-xs rounded-full">
                      {story.category}
                    </span>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={story.avatar} />
                      <AvatarFallback>{story.author[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-[#7A8794]">{story.author}</span>
                  </div>
                  <h3 className="font-bold text-[#111A22] mb-1 line-clamp-1">{story.title}</h3>
                  <p className="text-[#46525E] text-xs mb-2 line-clamp-2">{story.description}</p>
                  <div className="flex items-center justify-between text-xs text-[#7A8794]">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span>{story.location}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{story.date}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}