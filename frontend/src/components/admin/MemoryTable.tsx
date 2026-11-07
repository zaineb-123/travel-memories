'use client';

import Image from 'next/image';
import { AdminMemory } from '@/types/admin';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MoreHorizontal, Eye, Star, Flag, Trash2, CheckCircle, XCircle } from 'lucide-react';

interface MemoryTableProps {
  memories: AdminMemory[];
  onStatusChange: (id: number, status: string) => void;
  onFeature: (id: number, featured: boolean) => void;
  onDelete: (memory: AdminMemory) => void;
  onView: (memory: AdminMemory) => void;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'published':
      return <Badge className="bg-green-500">Publié</Badge>;
    case 'draft':
      return <Badge variant="secondary">Brouillon</Badge>;
    case 'reported':
      return <Badge variant="destructive">Signalé</Badge>;
    case 'deleted':
      return <Badge variant="outline">Supprimé</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const getVisibilityBadge = (visibility: string) => {
  switch (visibility) {
    case 'public':
      return <Badge className="bg-blue-500">Public</Badge>;
    case 'private':
      return <Badge className="bg-gray-500">Privé</Badge>;
    case 'followers':
      return <Badge className="bg-purple-500">Abonnés</Badge>;
    default:
      return <Badge variant="outline">{visibility}</Badge>;
  }
};

export function MemoryTable({
  memories,
  onStatusChange,
  onFeature,
  onDelete,
  onView,
}: MemoryTableProps) {
  return (
    <div className="rounded-lg border">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mémoire</TableHead>
              <TableHead>Auteur</TableHead>
              <TableHead>Localisation</TableHead>
              <TableHead>Statistiques</TableHead>
              <TableHead>Visibilité</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {memories.map((memory) => (
              <TableRow key={memory.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 overflow-hidden rounded-md">
                      {memory.cover_image ? (
                        <Image
                          src={memory.cover_image}
                          alt={memory.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-gray-200">
                          <span className="text-xs text-gray-400">No img</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-medium line-clamp-1">{memory.title}</div>
                      <div className="text-xs text-gray-500 line-clamp-1">
                        {memory.description.substring(0, 50)}...
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={memory.avatar_url} />
                      <AvatarFallback>{memory.full_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm">{memory.full_name}</div>
                      <div className="text-xs text-gray-500">@{memory.username}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">{memory.country}</div>
                  <div className="text-xs text-gray-500">{memory.city}</div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1 text-xs">
                    <div>❤️ {memory.likes_count} likes</div>
                    <div>💬 {memory.comments_count} commentaires</div>
                    <div>👁️ {memory.views_count} vues</div>
                  </div>
                </TableCell>
                <TableCell>{getVisibilityBadge(memory.visibility)}</TableCell>
                <TableCell>{getStatusBadge(memory.status)}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    {new Date(memory.created_at).toLocaleDateString('fr-FR')}
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onView(memory)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Voir les détails
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onFeature(memory.id, !memory.is_featured)}>
                        <Star className="mr-2 h-4 w-4" />
                        {memory.is_featured ? 'Retirer à la une' : 'Mettre à la une'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onStatusChange(memory.id, 'published')}>
                        <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                        Publier
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onStatusChange(memory.id, 'draft')}>
                        <XCircle className="mr-2 h-4 w-4 text-yellow-500" />
                        Passer en brouillon
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onStatusChange(memory.id, 'reported')}>
                        <Flag className="mr-2 h-4 w-4 text-red-500" />
                        Signaler
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onDelete(memory)} className="text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}