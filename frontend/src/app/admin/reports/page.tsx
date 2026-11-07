"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api/admin";
import { Report } from "@/types/admin";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Flag,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Eye,
} from "lucide-react";

export default function AdminReportsPage() {
  const { success, error: showError } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [actionNote, setActionNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadReports();
  }, [statusFilter]);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const response = await adminApi.getReports(1, statusFilter);
      if (response.success && response.data) {
        setReports(response.data.reports);
      }
    } catch (err) {
      showError("Erreur lors du chargement des signalements");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolveReport = async (action: "dismiss" | "resolve") => {
    if (!selectedReport) return;

    setIsSubmitting(true);
    try {
      await adminApi.updateReportStatus(
        selectedReport.id,
        action === "resolve" ? "resolved" : "dismissed",
      );
      success(action === "resolve" ? "Contenu supprimé" : "Signalement ignoré");
      await loadReports();
      setModalOpen(false);
      setActionNote("");
    } catch (err) {
      showError("Erreur lors de la mise à jour du signalement");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-500">En attente</Badge>;
      case "reviewed":
        return <Badge className="bg-blue-500">En cours</Badge>;
      case "resolved":
        return <Badge className="bg-green-500">Résolu</Badge>;
      case "dismissed":
        return <Badge variant="secondary">Ignoré</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "memory":
        return <Flag className="h-4 w-4 text-red-500" />;
      case "user":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case "comment":
        return <Flag className="h-4 w-4 text-purple-500" />;
      default:
        return <Flag className="h-4 w-4" />;
    }
  };

  const pendingCount = reports.filter((r) => r.status === "pending").length;
  const resolvedCount = reports.filter((r) => r.status === "resolved").length;
  const dismissedCount = reports.filter((r) => r.status === "dismissed").length;

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Signalements</h1>
        <p className="text-gray-500 mt-1">
          Gérez les contenus signalés par les utilisateurs
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                En attente
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {pendingCount}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Résolus
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {resolvedCount}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-gray-500" />
                Ignorés
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-600">
              {dismissedCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Filtrer par statut:</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="reviewed">En cours</SelectItem>
                <SelectItem value="resolved">Résolus</SelectItem>
                <SelectItem value="dismissed">Ignorés</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <div className="space-y-4">
        {reports.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Flag className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                <h3 className="text-lg font-medium">Aucun signalement</h3>
                <p className="text-gray-500">
                  Tous les signalements ont été traités.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          reports.map((report) => (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex gap-3 flex-1">
                    <div className="mt-1">
                      {getTypeIcon(report.target_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">
                          {report.target_type === "memory" && "Mémoire"}
                          {report.target_type === "user" && "Utilisateur"}
                          {report.target_type === "comment" && "Commentaire"}
                        </h3>
                        <span className="text-sm text-gray-500">
                          #{report.target_id}
                        </span>
                        {getStatusBadge(report.status)}
                      </div>
                      <p className="mt-1 text-sm font-medium line-clamp-1">
                        {report.target_title}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        <span className="font-medium">Raison:</span>{" "}
                        {report.reason}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Signalé par {report.reporter_name} •{" "}
                        {new Date(report.created_at).toLocaleString("fr-FR")}
                      </p>
                    </div>
                  </div>

                  {report.status === "pending" && (
                    <Button
                      onClick={() => {
                        setSelectedReport(report);
                        setModalOpen(true);
                      }}
                      className="gap-2 whitespace-nowrap"
                    >
                      <Eye className="h-4 w-4" />
                      Examiner
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Review Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Examiner le signalement</DialogTitle>
            <DialogDescription>
              {selectedReport?.target_type === "memory" &&
                "Cette mémoire a été signalée pour:"}
              {selectedReport?.target_type === "user" &&
                "Cet utilisateur a été signalé pour:"}
              {selectedReport?.target_type === "comment" &&
                "Ce commentaire a été signalé pour:"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg bg-yellow-50 p-3">
              <p className="text-sm text-yellow-800 font-medium">
                {selectedReport?.reason}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Note d'action (optionnelle)
              </label>
              <Textarea
                placeholder="Expliquez la décision prise..."
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:space-x-0">
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleResolveReport("dismiss")}
              disabled={isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              Ignorer
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleResolveReport("resolve")}
              disabled={isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
