'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrivacyPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">Politique de confidentialité</h1>
        <p className="mt-2 text-gray-500">Dernière mise à jour : 15 mai 2026</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>1. Collecte des informations</CardTitle></CardHeader>
          <CardContent>
            <p>Nous collectons les informations que vous nous fournissez directement, notamment :</p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>Informations de compte (nom, email, nom d'utilisateur)</li>
              <li>Contenu partagé (photos, descriptions, localisations)</li>
              <li>Données de profil (bio, avatar, pays)</li>
              <li>Interactions (likes, commentaires, follows)</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>2. Utilisation des données</CardTitle></CardHeader>
          <CardContent>
            <p>Vos données sont utilisées pour :</p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>Fournir et améliorer nos services</li>
              <li>Personnaliser votre expérience</li>
              <li>Communiquer avec vous</li>
              <li>Analyser l'utilisation de la plateforme</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>3. Protection des données</CardTitle></CardHeader>
          <CardContent>
            <p>Nous mettons en œuvre des mesures de sécurité pour protéger vos informations, notamment :</p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>Chiffrement des données sensibles</li>
              <li>Authentification sécurisée (JWT)</li>
              <li>Accès restreint aux données personnelles</li>
              <li>Surveillance régulière de la sécurité</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>4. Partage des informations</CardTitle></CardHeader>
          <CardContent>
            <p>Nous ne vendons pas vos données personnelles. Vos informations peuvent être partagées dans les cas suivants :</p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>Avec votre consentement explicite</li>
              <li>Pour respecter une obligation légale</li>
              <li>Avec les mémoires publics que vous choisissez de partager</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>5. Vos droits</CardTitle></CardHeader>
          <CardContent>
            <p>Conformément au RGPD, vous disposez des droits suivants :</p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>Droit d'accès à vos données</li>
              <li>Droit de rectification</li>
              <li>Droit à l'effacement ("droit à l'oubli")</li>
              <li>Droit à la limitation du traitement</li>
              <li>Droit à la portabilité des données</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>6. Cookies</CardTitle></CardHeader>
          <CardContent>
            <p>Nous utilisons des cookies pour :</p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>Maintenir votre session connectée</li>
              <li>Mémoriser vos préférences</li>
              <li>Analyser le trafic du site</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>7. Contact</CardTitle></CardHeader>
          <CardContent>
            <p>Pour toute question concernant cette politique, contactez-nous à :</p>
            <p className="mt-2 font-medium">support@travel-memories.com</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}