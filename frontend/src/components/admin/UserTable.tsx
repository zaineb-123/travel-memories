import { AdminUser } from '@/types/admin';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FileText,
  Heart,
  MoreHorizontal,
  Shield,
  Trash2,
  UserCheck,
  Users,
  UserX,
} from 'lucide-react';

interface UserTableProps {
  users: AdminUser[];
  onStatusChange: (userId: number, status: string) => void;
  onRoleChange: (userId: number, role: string) => void;
  onDelete: (user: AdminUser) => void;
}

const getStatusBadge = (status: AdminUser['status']) => {
  switch (status) {
    case 'active':
      return <Badge className="bg-green-500">Actif</Badge>;
    case 'inactive':
      return <Badge variant="secondary">Inactif</Badge>;
    case 'banned':
      return <Badge variant="destructive">Banni</Badge>;
  }
};

const getRoleBadge = (role: AdminUser['role']) => {
  switch (role) {
    case 'admin':
      return <Badge className="bg-purple-500">Admin</Badge>;
    case 'moderator':
      return <Badge className="bg-blue-500">Moderateur</Badge>;
    case 'user':
      return <Badge variant="outline">Utilisateur</Badge>;
  }
};

export function UserTable({ users, onStatusChange, onRoleChange, onDelete }: UserTableProps) {
  return (
    <div className="rounded-lg border bg-white">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b bg-gray-50 dark:bg-gray-900">
            <tr className="text-left text-sm">
              <th className="p-4">Utilisateur</th>
              <th className="p-4">Email</th>
              <th className="p-4">Activite</th>
              <th className="p-4">Role</th>
              <th className="p-4">Statut</th>
              <th className="p-4">Inscription</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback>{user.full_name?.charAt(0) || user.username.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{user.full_name}</div>
                      <div className="text-xs text-gray-500">@{user.username}</div>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-sm">
                  <div>{user.email}</div>
                  <div className="mt-1 text-xs text-gray-500">
                    {user.email_verified ? 'Email verifie' : 'Email non verifie'}
                  </div>
                </td>
                <td className="p-4">
                  <div className="grid gap-1 text-xs text-gray-600">
                    <span className="inline-flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" />
                      {user.memories_count} memoires
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Heart className="h-3.5 w-3.5" />
                      {user.total_likes_received} likes recus
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {user.followers_count} abonnes
                    </span>
                  </div>
                </td>
                <td className="p-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-auto p-1">
                        {getRoleBadge(user.role)}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => onRoleChange(user.id, 'user')}>
                        <Shield className="mr-2 h-4 w-4" />
                        Utilisateur
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onRoleChange(user.id, 'moderator')}>
                        <Shield className="mr-2 h-4 w-4" />
                        Moderateur
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onRoleChange(user.id, 'admin')}>
                        <Shield className="mr-2 h-4 w-4" />
                        Admin
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
                <td className="p-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-auto p-1">
                        {getStatusBadge(user.status)}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => onStatusChange(user.id, 'active')}>
                        <UserCheck className="mr-2 h-4 w-4" />
                        Activer
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onStatusChange(user.id, 'inactive')}>
                        <UserCheck className="mr-2 h-4 w-4" />
                        Desactiver
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onStatusChange(user.id, 'banned')}>
                        <UserX className="mr-2 h-4 w-4" />
                        Bannir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
                <td className="p-4 text-sm">
                  <div>{new Date(user.created_at).toLocaleDateString('fr-FR')}</div>
                  <div className="mt-1 text-xs text-gray-500">
                    {user.last_login
                      ? `Derniere connexion ${new Date(user.last_login).toLocaleDateString('fr-FR')}`
                      : 'Jamais connecte'}
                  </div>
                </td>
                <td className="p-4 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onDelete(user)} className="text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
