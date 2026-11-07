'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { adminApi } from '@/lib/api/admin';
import { AdminMemory } from '@/types/admin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DeleteConfirmModal } from '@/components/admin/DeleteConfirmModal';
import { useToast } from '@/hooks/useToast';
import { Eye, FileText, Loader2, MoreHorizontal, Search, Star, Trash2 } from 'lucide-react';

const ALL_STATUSES = 'all';

export default function AdminMemoriesPage() {
  const { success, error: showError } = useToast();
  const [memories, setMemories] = useState<AdminMemory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(ALL_STATUSES);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<AdminMemory | null>(null);

  const loadMemories = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await adminApi.getMemories(
        page,
        search,
        status === ALL_STATUSES ? '' : status,
      );

      if (response.success && response.data) {
        setMemories(response.data.memories);
        setTotalPages(response.data.pagination?.totalPages || 1);
      }
    } catch {
      showError('Erreur lors du chargement des memoires');
    } finally {
      setIsLoading(false);
    }
  }, [page, search, showError, status]);

  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  const handleStatusChange = async (id: number, newStatus: AdminMemory['status']) => {
    try {
      await adminApi.updateMemoryStatus(id, newStatus);
      success('Statut de la memoire mis a jour');
      await loadMemories();
    } catch {
      showError('Erreur lors de la mise a jour du statut');
    }
  };

  const handleFeature = async (id: number, featured: boolean) => {
    try {
      await adminApi.featureMemory(id, featured);
      success(featured ? 'Memoire mise a la une' : 'Memoire retiree de la une');
      await loadMemories();
    } catch {
      showError('Erreur lors de la mise a jour de la mise en avant');
    }
  };

  const handleDelete = async () => {
    if (!selectedMemory) return;

    setIsDeleting(true);
    try {
      await adminApi.deleteMemory(selectedMemory.id);
      success('Memoire supprimee');
      setModalOpen(false);
      setSelectedMemory(null);
      await loadMemories();
    } catch {
      showError('Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Memoires</h1>
        <p className="mt-1 text-gray-500">Moderez les souvenirs, publications signalees et contenus a la une.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-[1fr_180px_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Rechercher par titre, ville ou pays..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_STATUSES}>Tous</SelectItem>
                <SelectItem value="published">Publiees</SelectItem>
                <SelectItem value="draft">Brouillons</SelectItem>
                <SelectItem value="reported">Signalees</SelectItem>
                <SelectItem value="deleted">Supprimees</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={loadMemories} className="gap-2">
              <Search className="h-4 w-4" />
              Rechercher
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : memories.length === 0 ? (
        <Card>
          <CardContent className="flex h-48 flex-col items-center justify-center text-center text-gray-500">
            <FileText className="mb-3 h-10 w-10" />
            <h3 className="font-medium text-gray-900">Aucune memoire trouvee</h3>
            <p className="mt-1 text-sm">Essayez un autre filtre ou une recherche plus large.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {memories.map((memory) => (
              <Card key={memory.id} className="overflow-hidden">
                <div className="relative aspect-video bg-gray-100">
                  {memory.cover_image ? (
                    <Image src={memory.cover_image} alt={memory.title} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-gray-400">
                      Pas d'image
                    </div>
                  )}
                </div>

                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="line-clamp-1 font-semibold">{memory.title}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-gray-500">{memory.description}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/memory/${memory.id}`} target="_blank">
                            <Eye className="mr-2 h-4 w-4" />
                            Voir
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleFeature(memory.id, !memory.is_featured)}>
                          <Star className="mr-2 h-4 w-4" />
                          {memory.is_featured ? 'Retirer de la une' : 'Mettre a la une'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(memory.id, 'reported')}>
                          <FileText className="mr-2 h-4 w-4" />
                          Marquer signalee
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedMemory(memory);
                            setModalOpen(true);
                          }}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {getStatusBadge(memory.status)}
                    {memory.is_featured && <Badge className="bg-yellow-500">A la une</Badge>}
                    <Badge variant="outline">{memory.visibility}</Badge>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-gray-500">
                    <span>{memory.likes_count} likes</span>
                    <span>{memory.comments_count} comm.</span>
                    <span>{memory.views_count} vues</span>
                  </div>
                  <p className="mt-3 text-xs text-gray-500">
                    {memory.country}{memory.city ? `, ${memory.city}` : ''} - par {memory.full_name || memory.username}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <Button variant="outline" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>
                Precedent
              </Button>
              <span className="text-sm text-gray-600">Page {page} sur {totalPages}</span>
              <Button
                variant="outline"
                disabled={page === totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                Suivant
              </Button>
            </div>
          )}
        </>
      )}

      <DeleteConfirmModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        title="Supprimer la memoire"
        description={`Confirmez la suppression definitive de "${selectedMemory?.title || 'cette memoire'}". Cette action est irreversible.`}
      />
    </div>
  );
}

function getStatusBadge(status: AdminMemory['status']) {
  switch (status) {
    case 'published':
      return <Badge className="bg-green-500">Publiee</Badge>;
    case 'draft':
      return <Badge variant="secondary">Brouillon</Badge>;
    case 'reported':
      return <Badge variant="destructive">Signalee</Badge>;
    case 'deleted':
      return <Badge variant="outline">Supprimee</Badge>;
  }
}
