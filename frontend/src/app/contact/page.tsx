'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Phone, MapPin, Send, Loader2, CheckCircle } from 'lucide-react';

const contactSchema = z.object({
  name: z.string().min(2, 'Nom trop court'),
  email: z.string().email('Email invalide'),
  subject: z.string().min(5, 'Sujet trop court'),
  message: z.string().min(10, 'Message trop court'),
});

type ContactForm = z.infer<typeof contactSchema>;

export default function ContactPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactForm) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        setIsSubmitted(true);
        reset();
        setTimeout(() => setIsSubmitted(false), 5000);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold">Contactez-nous</h1>
        <p className="text-gray-600">Une question ? Un problème ? Écrivez-nous !</p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {/* Contact Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5 text-blue-500" />Email</CardTitle>
            </CardHeader>
            <CardContent><a href="mailto:support@travel-memories.com" className="text-blue-600 hover:underline">support@travel-memories.com</a></CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Phone className="h-5 w-5 text-blue-500" />Téléphone</CardTitle>
            </CardHeader>
            <CardContent><a href="tel:+33123456789" className="text-blue-600 hover:underline">+33 1 23 45 67 89</a></CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-blue-500" />Adresse</CardTitle>
            </CardHeader>
            <CardContent>
              <p>123 Rue du Voyage</p>
              <p>75001 Paris, France</p>
            </CardContent>
          </Card>
        </div>

        {/* Contact Form */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Envoyez-nous un message</CardTitle>
              <CardDescription>Nous vous répondrons dans les plus brefs délais</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                {isSubmitted && (
                  <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-green-600">
                    <CheckCircle className="h-5 w-5" /> Message envoyé avec succès !
                  </div>
                )}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom complet</Label>
                    <Input id="name" placeholder="Jean Dupont" {...register('name')} />
                    {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="jean@exemple.com" {...register('email')} />
                    {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Sujet</Label>
                  <Input id="subject" placeholder="Question concernant..." {...register('subject')} />
                  {errors.subject && <p className="text-sm text-red-500">{errors.subject.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" rows={5} placeholder="Décrivez votre demande..." {...register('message')} />
                  {errors.message && <p className="text-sm text-red-500">{errors.message.message}</p>}
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Envoyer
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}