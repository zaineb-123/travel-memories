'use client';

import { MapPin, Users, Globe, Heart, Award, Camera, Shield, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const features = [
  { icon: MapPin, title: 'Carte interactive', description: 'Visualisez tous vos voyages sur une carte du monde' },
  { icon: Camera, title: 'Partage de photos', description: 'Ajoutez des photos à vos souvenirs de voyage' },
  { icon: Users, title: 'Communauté', description: 'Connectez-vous avec d\'autres voyageurs' },
  { icon: Heart, title: 'Likes et commentaires', description: 'Interagissez avec les aventures des autres' },
  { icon: Shield, title: 'Vie privée', description: 'Contrôlez qui voit vos souvenirs' },
  { icon: Zap, title: 'Performant', description: 'Application rapide et réactive' },
];

const stats = [
  { value: '10K+', label: 'Utilisateurs' },
  { value: '50K+', label: 'Mémoires partagées' },
  { value: '100+', label: 'Pays visités' },
  { value: '500K+', label: 'Photos uploadées' },
];

const team = [
  { name: 'Sarah Johnson', role: 'Fondatrice & CEO', avatar: 'https://randomuser.me/api/portraits/women/1.jpg' },
  { name: 'Michael Chen', role: 'CTO', avatar: 'https://randomuser.me/api/portraits/men/2.jpg' },
  { name: 'Emma Dubois', role: 'Designer', avatar: 'https://randomuser.me/api/portraits/women/3.jpg' },
  { name: 'Thomas Martin', role: 'Développeur', avatar: 'https://randomuser.me/api/portraits/men/4.jpg' },
];

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      {/* Hero Section */}
      <div className="mb-16 text-center">
        <h1 className="mb-4 text-4xl font-bold md:text-5xl">À propos de Travel Memories</h1>
        <p className="mx-auto max-w-2xl text-lg text-gray-600">
          Travel Memories est une plateforme qui permet aux voyageurs de documenter leurs aventures
          et de les partager avec une communauté passionnée.
        </p>
      </div>

      {/* Mission Section */}
      <div className="mb-16 grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="mb-4 text-2xl font-bold">Notre mission</h2>
          <p className="text-gray-600 leading-relaxed">
            Nous croyons que chaque voyage mérite d'être raconté. Notre mission est de créer un espace
            où les voyageurs peuvent préserver leurs souvenirs, s'inspirer mutuellement et découvrir
            de nouvelles destinations à travers les yeux d'une communauté authentique.
          </p>
        </div>
        <div className="rounded-lg bg-linear-to-r from-blue-500 to-purple-600 p-6 text-white">
          <div className="flex items-center gap-3 mb-3">
            <Globe className="h-8 w-8" />
            <h3 className="text-xl font-bold">Rejoignez l'aventure</h3>
          </div>
          <p>Plus de 10 000 voyageurs partagent déjà leurs expériences. À votre tour !</p>
        </div>
      </div>

      {/* Stats Section */}
      <div className="mb-16 grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6 text-center">
              <p className="text-2xl font-bold text-blue-600">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Features Section */}
      <div className="mb-16">
        <h2 className="mb-8 text-center text-2xl font-bold">Fonctionnalités</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title}>
                <CardHeader className="pb-2">
                  <Icon className="h-6 w-6 text-blue-500" />
                  <CardTitle className="mt-2 text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>



      {/* CTA Section */}
      <div className="text-center">
        <Card className="bg-linear-to-r from-blue-500 to-purple-600 text-white">
          <CardContent className="p-8">
            <h2 className="mb-4 text-2xl font-bold">Prêt à partager vos voyages ?</h2>
            <p className="mb-6">Rejoignez la communauté Travel Memories dès aujourd'hui</p>
            <button className="rounded-lg bg-white px-6 py-2 font-semibold text-blue-600 transition hover:bg-gray-100">
              Commencer maintenant
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}