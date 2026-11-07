/**
 * Géocodage via Nominatim (OpenStreetMap) : transforme « Djerba, Tunisie » en coordonnées
 * pour que le souvenir apparaisse sur la carte même sans « position actuelle ».
 * Échec silencieux : renvoie null (réseau coupé, lieu inconnu, délai dépassé).
 */
export async function geocodePlace(city: string | undefined, country: string): Promise<{ lat: number; lng: number } | null> {
  const q = [city, country].filter((s) => s && s.trim()).join(', ');
  if (!q) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as { lat: string; lon: string }[];
    if (!rows.length) return null;
    const lat = parseFloat(rows[0].lat);
    const lng = parseFloat(rows[0].lon);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
