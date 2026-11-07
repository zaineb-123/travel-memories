'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '@/lib/api/admin';
import { AdminUser } from '@/types/admin';
import { DeleteConfirmModal } from '@/components/admin/DeleteConfirmModal';
import { UserTable } from '@/components/admin/UserTable';
import { useToast } from '@/hooks/useToast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Loader2, Search } from 'lucide-react';

const ALL_STATUSES = 'all';

export default function AdminUsersPage() {
  const { success, error: showError } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(ALL_STATUSES);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadUsers = useCallback(async (pageNum = 1) => {
    setIsLoading(true);
    try {
      const response = await adminApi.getUsers(
        pageNum,
        search,
        status === ALL_STATUSES ? '' : status,
      );

      if (response.success && response.data) {
        setUsers(response.data.users);
        setTotal(response.data.pagination?.total || 0);
        setTotalPages(response.data.pagination?.totalPages || 1);
        setPage(pageNum);
      }
    } catch {
      showError('Erreur lors du chargement des utilisateurs');
    } finally {
      setIsLoading(false);
    }
  }, [search, showError, status]);

  useEffect(() => {
    loadUsers(1);
  }, [loadUsers]);

  const handleStatusChange = async (userId: number, newStatus: string) => {
    try {
      await adminApi.updateUserStatus(userId, newStatus);
      success('Statut mis a jour');
      setUsers((current) =>
        current.map((user) =>
          user.id === userId
            ? { ...user, status: newStatus as AdminUser['status'] }
            : user,
        ),
      );
    } catch {
      showError('Erreur lors de la mise a jour du statut');
    }
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      await adminApi.updateUserRole(userId, newRole);
      success('Role mis a jour');
      setUsers((current) =>
        current.map((user) =>
          user.id === userId
            ? { ...user, role: newRole as AdminUser['role'] }
            : user,
        ),
      );
    } catch {
      showError('Erreur lors de la mise a jour du role');
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;

    setIsDeleting(true);
    try {
      await adminApi.deleteUser(selectedUser.id);
      success('Utilisateur supprime');
      setModalOpen(false);
      setSelectedUser(null);
      setUsers((current) => current.filter((user) => user.id !== selectedUser.id));
      setTotal((current) => Math.max(current - 1, 0));
    } catch {
      showError('Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Utilisateurs</h1>
        <p className="mt-1 text-gray-500">
          Gere les {total.toLocaleString('fr-FR')} utilisateurs, roles et statuts de la plateforme.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Filtres et recherche</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-[1fr_180px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Rechercher par nom, email ou username..."
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
                <SelectItem value="active">Actifs</SelectItem>
                <SelectItem value="inactive">Inactifs</SelectItem>
                <SelectItem value="banned">Bannis</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="flex h-32 items-center justify-center text-gray-500">
            Aucun utilisateur trouve
          </CardContent>
        </Card>
      ) : (
        <>
          <UserTable
            users={users}
            onStatusChange={handleStatusChange}
            onRoleChange={handleRoleChange}
            onDelete={(user) => {
              setSelectedUser(user);
              setModalOpen(true);
            }}
          />

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Page {page} sur {totalPages} - {total} utilisateurs au total
              </p>
              <div className="flex gap-2">
                <Button variant="outline" disabled={page === 1} onClick={() => loadUsers(page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" disabled={page === totalPages} onClick={() => loadUsers(page + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <DeleteConfirmModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        title="Supprimer l'utilisateur"
        description={`Confirmez la suppression definitive du compte de ${selectedUser?.full_name || 'cet utilisateur'}. Cette action est irreversible.`}
      />
    </div>
  );
}
