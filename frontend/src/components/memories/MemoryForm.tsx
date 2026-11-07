"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  memorySchema,
  MemoryInput,
  validateImageFile,
  VALIDATION_LIMITS,
} from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/useToast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MapPin, Loader2, Upload, X, AlertCircle } from "lucide-react";

interface MemoryFormProps {
  initialData?: Partial<MemoryInput>;
  onSubmit: (data: MemoryInput) => Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
}

/**
 * Enhanced Memory Form with proper file handling and error management
 */
export function MemoryForm({
  initialData,
  onSubmit,
  isLoading = false,
  submitLabel = "Publier",
}: MemoryFormProps) {
  const { error: showError, warning: showWarning } = useToast();
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    initialData?.latitude && initialData?.longitude
      ? { lat: initialData.latitude, lng: initialData.longitude }
      : null,
  );
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [totalPhotoSize, setTotalPhotoSize] = useState(0);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<MemoryInput>({
    resolver: zodResolver(memorySchema),
    defaultValues: {
      title: initialData?.title || "",
      description: initialData?.description || "",
      country: initialData?.country || "",
      city: initialData?.city || "",
      travel_date:
        initialData?.travel_date || new Date().toISOString().split("T")[0],
      latitude: initialData?.latitude,
      longitude: initialData?.longitude,
      visibility: initialData?.visibility || "public",
    },
  });

  const visibility = watch("visibility");

  /**
   * Cleanup object URLs on unmount
   */
  useEffect(() => {
    return () => {
      photoPreviews.forEach((preview) => {
        URL.revokeObjectURL(preview);
      });
    };
  }, [photoPreviews]);

  /**
   * Get geolocation with proper error handling
   */
  const getCurrentLocation = useCallback(() => {
    setIsGettingLocation(true);

    if (!navigator.geolocation) {
      showError("Géolocalisation non supportée par votre navigateur");
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLocation({ lat, lng });
        setValue("latitude", lat);
        setValue("longitude", lng);
        setIsGettingLocation(false);
      },
      (error) => {
        const errorMessages: Record<number, string> = {
          1: "Permission de géolocalisation refusée",
          2: "Position non disponible",
          3: "Délai d'attente dépassé",
        };
        showError(errorMessages[error.code] || "Erreur de géolocalisation");
        setIsGettingLocation(false);
      },
    );
  }, [setValue, showError]);

  /**
   * Handle photo upload with validation and cleanup
   */
  const handlePhotoUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newFiles = Array.from(e.target.files || []);

      // Validate number of photos
      if (photos.length + newFiles.length > VALIDATION_LIMITS.MAX_PHOTOS) {
        showError(`Maximum ${VALIDATION_LIMITS.MAX_PHOTOS} photos autorisées`);
        return;
      }

      let totalSize = totalPhotoSize;
      const validFiles: File[] = [];
      const newPreviews: string[] = [];

      // Validate each file
      for (const file of newFiles) {
        const validation = validateImageFile(file);

        if (!validation.valid) {
          showError(`${file.name}: ${validation.error}`);
          continue;
        }

        totalSize += file.size;
        if (totalSize > VALIDATION_LIMITS.MAX_PHOTOS_SIZE) {
          showError(
            `Taille totale des photos dépasse ${VALIDATION_LIMITS.MAX_PHOTOS_SIZE / 1024 / 1024}MB`,
          );
          break;
        }

        validFiles.push(file);
        newPreviews.push(URL.createObjectURL(file));
      }

      if (validFiles.length > 0) {
        setPhotos([...photos, ...validFiles]);
        setPhotoPreviews([...photoPreviews, ...newPreviews]);
        setTotalPhotoSize(totalSize);
      }

      // Reset input
      e.target.value = "";
    },
    [photos, photoPreviews, totalPhotoSize, showError],
  );

  /**
   * Remove photo with proper cleanup
   */
  const removePhoto = useCallback(
    (index: number) => {
      // Revoke URL to free memory
      URL.revokeObjectURL(photoPreviews[index]);

      const newPhotos = photos.filter((_, i) => i !== index);
      const newPreviews = photoPreviews.filter((_, i) => i !== index);
      const removedSize = photos[index].size;

      setPhotos(newPhotos);
      setPhotoPreviews(newPreviews);
      setTotalPhotoSize((prev) => prev - removedSize);
    },
    [photos, photoPreviews],
  );

  const formSubmit = async (data: MemoryInput) => {
    await onSubmit(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Partager un souvenir</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(formSubmit)}>
        <CardContent className="space-y-6">
          {/* Titre */}
          <div className="space-y-2">
            <Label htmlFor="title">Titre *</Label>
            <Input
              id="title"
              placeholder="Mon voyage inoubliable..."
              {...register("title")}
            />
            {errors.title && (
              <p className="flex items-center gap-1 text-sm text-red-500">
                <AlertCircle className="h-4 w-4" />
                {errors.title.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Racontez votre expérience..."
              rows={5}
              {...register("description")}
            />
            {errors.description && (
              <p className="flex items-center gap-1 text-sm text-red-500">
                <AlertCircle className="h-4 w-4" />
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Photos */}
          <div className="space-y-2">
            <Label>
              Photos ({photos.length}/{VALIDATION_LIMITS.MAX_PHOTOS})
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {photoPreviews.map((preview, index) => (
                <div
                  key={`preview-${index}`}
                  className="relative aspect-square"
                >
                  <img
                    src={preview}
                    alt={`Aperçu ${index + 1}`}
                    className="h-full w-full rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute -right-1 -top-1 rounded-full bg-red-500 p-0.5 text-white hover:bg-red-600 transition"
                    aria-label="Supprimer la photo"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {photos.length < VALIDATION_LIMITS.MAX_PHOTOS && (
                <label className="flex aspect-square cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-500 transition">
                  <Upload className="h-6 w-6 text-gray-400" />
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Localisation */}
          <div className="space-y-2">
            <Label>Localisation *</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Pays"
                {...register("country")}
                className="flex-1"
              />
              <Input
                placeholder="Ville"
                {...register("city")}
                className="flex-1"
              />
            </div>
            {errors.country && (
              <p className="flex items-center gap-1 text-sm text-red-500">
                <AlertCircle className="h-4 w-4" />
                {errors.country.message}
              </p>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={getCurrentLocation}
              disabled={isGettingLocation}
              className="w-full"
            >
              {isGettingLocation ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <MapPin className="mr-2 h-4 w-4" />
              )}
              {location
                ? "✓ Position mise à jour"
                : "Ajouter ma position actuelle"}
            </Button>

            {location && (
              <p className="text-xs text-green-600">
                Coordonnées: {location.lat.toFixed(4)},{" "}
                {location.lng.toFixed(4)}
              </p>
            )}
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="travel_date">Date du voyage *</Label>
            <Input type="date" id="travel_date" {...register("travel_date")} />
            {errors.travel_date && (
              <p className="flex items-center gap-1 text-sm text-red-500">
                <AlertCircle className="h-4 w-4" />
                {errors.travel_date.message}
              </p>
            )}
          </div>

          {/* Visibilité */}
          <div className="space-y-2">
            <Label>Visibilité</Label>
            <Select
              value={visibility}
              onValueChange={(value: "public" | "private" | "followers") =>
                setValue("visibility", value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">
                  🌍 Public - Tout le monde peut voir
                </SelectItem>
                <SelectItem value="private">
                  🔒 Privé - Seulement moi
                </SelectItem>
                <SelectItem value="followers">
                  👥 Abonnés - Mes abonnés uniquement
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>

        <CardFooter className="flex justify-end gap-3">
          <Button type="button" variant="outline">
            Annuler
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {submitLabel}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
