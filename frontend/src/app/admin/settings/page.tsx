"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api/admin";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, RotateCcw } from "lucide-react";

interface AdminSettings {
  site_name: string;
  site_url: string;
  maintenance_mode: boolean;
  maintenance_message: string;
  max_file_size: number;
  max_photos_per_memory: number;
  enable_registrations: boolean;
  enable_comments: boolean;
  require_email_verification: boolean;
  daily_email_limit: number;
  memory_moderation_required: boolean;
  auto_delete_reports_after_days: number;
}

export default function AdminSettingsPage() {
  const { success, error: showError } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [originalSettings, setOriginalSettings] =
    useState<AdminSettings | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const response = await adminApi.getSettings();
      if (response.success && response.data) {
        setSettings(response.data as AdminSettings);
        setOriginalSettings(response.data as AdminSettings);
      }
    } catch (err) {
      showError("Erreur lors du chargement des paramètres");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (key: keyof AdminSettings, value: any) => {
    const newSettings = { ...settings!, [key]: value };
    setSettings(newSettings);
    setHasChanges(
      JSON.stringify(newSettings) !== JSON.stringify(originalSettings),
    );
  };

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      await adminApi.updateSettings(settings);
      success("Paramètres sauvegardés");
      setOriginalSettings(settings);
      setHasChanges(false);
    } catch (err) {
      showError("Erreur lors de la sauvegarde");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (originalSettings) {
      setSettings(originalSettings);
      setHasChanges(false);
    }
  };

  if (isLoading || !settings) {
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
        <h1 className="text-3xl font-bold">Paramètres</h1>
        <p className="text-gray-500 mt-1">
          Configurez les paramètres globaux de la plateforme
        </p>
      </div>

      {/* Site Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration du site</CardTitle>
          <CardDescription>
            Paramètres généraux de la plateforme
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="site_name">Nom du site</Label>
              <Input
                id="site_name"
                value={settings.site_name}
                onChange={(e) => handleChange("site_name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="site_url">URL du site</Label>
              <Input
                id="site_url"
                value={settings.site_url}
                onChange={(e) => handleChange("site_url", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="daily_email_limit">Limite d'emails par jour</Label>
            <Input
              id="daily_email_limit"
              type="number"
              value={settings.daily_email_limit}
              onChange={(e) =>
                handleChange("daily_email_limit", parseInt(e.target.value))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Maintenance Mode */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Mode maintenance
            <Switch
              checked={settings.maintenance_mode}
              onCheckedChange={(checked) =>
                handleChange("maintenance_mode", checked)
              }
            />
          </CardTitle>
          <CardDescription>
            Activez le mode maintenance pour la maintenance du site
          </CardDescription>
        </CardHeader>
        {settings.maintenance_mode && (
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="maintenance_message">
                Message de maintenance
              </Label>
              <Textarea
                id="maintenance_message"
                value={settings.maintenance_message}
                onChange={(e) =>
                  handleChange("maintenance_message", e.target.value)
                }
                placeholder="Message affiché aux utilisateurs..."
                rows={3}
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Upload Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration des uploads</CardTitle>
          <CardDescription>
            Limites pour les fichiers et les mémoires
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="max_file_size">Taille max par fichier (MB)</Label>
              <Input
                id="max_file_size"
                type="number"
                value={settings.max_file_size}
                onChange={(e) =>
                  handleChange("max_file_size", parseInt(e.target.value))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_photos_per_memory">
                Nombre max de photos par mémoire
              </Label>
              <Input
                id="max_photos_per_memory"
                type="number"
                value={settings.max_photos_per_memory}
                onChange={(e) =>
                  handleChange(
                    "max_photos_per_memory",
                    parseInt(e.target.value),
                  )
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle>Fonctionnalités</CardTitle>
          <CardDescription>
            Activez ou désactivez les fonctionnalités de la plateforme
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enable_registrations">
                Permettre les inscriptions
              </Label>
              <p className="text-xs text-gray-500 mt-1">
                Les nouveaux utilisateurs peuvent s'inscrire
              </p>
            </div>
            <Switch
              id="enable_registrations"
              checked={settings.enable_registrations}
              onCheckedChange={(checked) =>
                handleChange("enable_registrations", checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enable_comments">
                Permettre les commentaires
              </Label>
              <p className="text-xs text-gray-500 mt-1">
                Les utilisateurs peuvent commenter les mémoires
              </p>
            </div>
            <Switch
              id="enable_comments"
              checked={settings.enable_comments}
              onCheckedChange={(checked) =>
                handleChange("enable_comments", checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="require_email_verification">
                Vérification d'email requise
              </Label>
              <p className="text-xs text-gray-500 mt-1">
                Les utilisateurs doivent vérifier leur email
              </p>
            </div>
            <Switch
              id="require_email_verification"
              checked={settings.require_email_verification}
              onCheckedChange={(checked) =>
                handleChange("require_email_verification", checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="memory_moderation_required">
                Modération des mémoires requise
              </Label>
              <p className="text-xs text-gray-500 mt-1">
                Les mémoires doivent être approuvées avant publication
              </p>
            </div>
            <Switch
              id="memory_moderation_required"
              checked={settings.memory_moderation_required}
              onCheckedChange={(checked) =>
                handleChange("memory_moderation_required", checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Moderation */}
      <Card>
        <CardHeader>
          <CardTitle>Modération</CardTitle>
          <CardDescription>
            Paramètres de modération et de suppression automatique
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="auto_delete_reports_after_days">
              Supprimer les signalements résolus après (jours)
            </Label>
            <Input
              id="auto_delete_reports_after_days"
              type="number"
              value={settings.auto_delete_reports_after_days}
              onChange={(e) =>
                handleChange(
                  "auto_delete_reports_after_days",
                  parseInt(e.target.value),
                )
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={!hasChanges || isSaving}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Réinitialiser
        </Button>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="gap-2 bg-blue-600 hover:bg-blue-700"
        >
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          <Save className="h-4 w-4" />
          Enregistrer
        </Button>
      </div>

      {hasChanges && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
          Vous avez des modifications non sauvegardées
        </div>
      )}
    </div>
  );
}
