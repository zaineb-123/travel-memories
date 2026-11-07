'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  ChevronDown, 
  ChevronRight, 
  Search, 
  Mail, 
  MessageCircle,
  Users,
  MapPin,
  Camera,
  Lock,
  Globe,
  HelpCircle
} from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQItem[] = [
  {
    question: "Comment créer un compte sur Travel Memories ?",
    answer: "Pour créer un compte, cliquez sur le bouton 'Commencer' ou 'S'inscrire' en haut à droite de la page. Remplissez le formulaire avec vos informations (nom, email, mot de passe) et validez. Vous recevrez un email de confirmation pour activer votre compte.",
    category: "Compte"
  },
  {
    question: "Comment ajouter un souvenir de voyage ?",
    answer: "Une fois connecté, rendez-vous sur votre tableau de bord et cliquez sur 'Ajouter un souvenir'. Remplissez les informations : titre, description, date, localisation, ajoutez des photos, puis publiez. Votre souvenir apparaîtra sur la carte et dans le fil d'actualité.",
    category: "Souvenirs"
  },
  {
    question: "Puis-je modifier ou supprimer un souvenir ?",
    answer: "Oui, vous pouvez modifier ou supprimer vos souvenirs à tout moment. Rendez-vous sur votre profil, sélectionnez le souvenir concerné, puis cliquez sur les trois points pour accéder aux options de modification ou suppression.",
    category: "Souvenirs"
  },
  {
    question: "Comment fonctionne la carte interactive ?",
    answer: "La carte interactive affiche tous les souvenirs publics partagés par la communauté. Chaque point sur la carte représente un souvenir. Cliquez sur un point pour voir un aperçu, puis sur 'Voir les détails' pour accéder à l'histoire complète.",
    category: "Carte"
  },
  {
    question: "Mes photos sont-elles privées ?",
    answer: "Vous contrôlez la visibilité de chaque souvenir. Vous pouvez choisir entre : Public (visible par tous), Privé (visible seulement par vous), ou Abonnés (visible par vos followers).",
    category: "Confidentialité"
  },
  {
    question: "Comment interagir avec les autres voyageurs ?",
    answer: "Vous pouvez liker, commenter et partager les souvenirs des autres membres. Vous pouvez également suivre les voyageurs dont les aventures vous inspirent pour voir leurs nouveaux souvenirs dans votre fil d'actualité.",
    category: "Communauté"
  },
  {
    question: "Puis-je importer des photos depuis Instagram ?",
    answer: "Actuellement, vous pouvez télécharger des photos directement depuis votre ordinateur ou appareil mobile. L'intégration avec Instagram est prévue dans une future mise à jour.",
    category: "Photos"
  },
  {
    question: "Y a-t-il une limite de photos par souvenir ?",
    answer: "Vous pouvez ajouter jusqu'à 10 photos par souvenir. Chaque photo ne doit pas dépasser 5MB. Les formats acceptés sont JPG, PNG et WebP.",
    category: "Photos"
  },
  {
    question: "Comment supprimer mon compte ?",
    answer: "Pour supprimer définitivement votre compte, allez dans Paramètres > Compte > Supprimer mon compte. Cette action est irréversible et supprimera tous vos souvenirs et données.",
    category: "Compte"
  },
  {
    question: "L'application est-elle gratuite ?",
    answer: "Oui, Travel Memories est entièrement gratuit ! Aucun abonnement ni paiement caché. Nous souhaitons rendre le partage de voyages accessible à tous.",
    category: "Général"
  },
  {
    question: "Comment signaler un contenu inapproprié ?",
    answer: "Si vous voyez un contenu qui ne respecte pas nos règles, cliquez sur les trois points à côté du souvenir et sélectionnez 'Signaler'. Notre équipe examinera le signalement dans les plus brefs délais.",
    category: "Modération"
  },
  {
    question: "Puis-je exporter mes souvenirs ?",
    answer: "Oui, vous pouvez exporter tous vos souvenirs au format JSON ou PDF depuis la page des paramètres. Cette fonctionnalité vous permet de garder une sauvegarde de vos voyages.",
    category: "Données"
  }
];

const categories = ["Toutes", "Compte", "Souvenirs", "Carte", "Confidentialité", "Communauté", "Photos", "Général"];

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Toutes");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const filteredFaqs = faqs.filter(faq => {
    const matchesCategory = selectedCategory === "Toutes" || faq.category === selectedCategory;
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleQuestion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const categoryIcons: Record<string, React.ReactNode> = {
    Compte: <Users className="h-5 w-5" />,
    Souvenirs: <MapPin className="h-5 w-5" />,
    Carte: <Globe className="h-5 w-5" />,
    Confidentialité: <Lock className="h-5 w-5" />,
    Communauté: <MessageCircle className="h-5 w-5" />,
    Photos: <Camera className="h-5 w-5" />,
    Général: <HelpCircle className="h-5 w-5" />,
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7]">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 bg-[#E3EDF2]">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-[#111A22] mb-6">
              Foire aux questions
            </h1>
            <p className="text-xl text-[#46525E] mb-8">
              Trouvez rapidement des réponses à vos questions sur Travel Memories
            </p>
            <div className="relative max-w-lg mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#7A8794]" />
              <Input
                placeholder="Rechercher une question..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 py-6 bg-white border-[#B9C3CC] rounded-full shadow-md"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-6 bg-white border-b border-[#E3E7EC] sticky top-16 z-30">
        <div className="container mx-auto px-6">
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full transition-all duration-300 text-sm ${
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

      {/* FAQ List */}
      <section className="py-16">
        <div className="container mx-auto px-6 max-w-4xl">
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-12">
              <HelpCircle className="h-16 w-16 text-[#B9C3CC] mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-[#111A22] mb-2">Aucun résultat trouvé</h3>
              <p className="text-[#7A8794]">Essayez avec d'autres mots-clés</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFaqs.map((faq, index) => (
                <Card key={index} className="border-0 shadow-md overflow-hidden">
                  <button
                    onClick={() => toggleQuestion(index)}
                    className="w-full text-left p-5 flex items-center justify-between hover:bg-[#FAFAF6] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#E3EDF2] flex items-center justify-center text-[#1F5F7B]">
                        {categoryIcons[faq.category] || <HelpCircle className="h-4 w-4" />}
                      </div>
                      <span className="font-semibold text-[#111A22]">{faq.question}</span>
                    </div>
                    {openIndex === index ? (
                      <ChevronDown className="h-5 w-5 text-[#7A8794]" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-[#7A8794]" />
                    )}
                  </button>
                  {openIndex === index && (
                    <div className="px-5 pb-5 pt-0 border-t border-[#EEF1F4]">
                      <div className="pl-11">
                        <p className="text-[#46525E] leading-relaxed">{faq.answer}</p>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* Still Have Questions */}
          <div className="mt-12 text-center">
            <Card className="border-0 bg-[#E3EDF2] shadow-md">
              <CardContent className="p-8">
                <h3 className="text-xl font-semibold text-[#111A22] mb-2">Vous n'avez pas trouvé votre réponse ?</h3>
                <p className="text-[#46525E] mb-4">Notre équipe est là pour vous aider</p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Link href="/contact">
                    <Button className="bg-[#111A22] hover:bg-[#2A3844] text-white">
                      <Mail className="h-4 w-4 mr-2" />
                      Nous contacter
                    </Button>
                  </Link>
                  <Link href="/community">
                    <Button variant="outline" className="border-[#B9C3CC] text-[#111A22]">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Forum communautaire
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}