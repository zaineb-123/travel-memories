import { geoMercator, geoPath, type GeoPermissibleObjects } from 'd3-geo';
import { feature, neighbors as topoNeighbors } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Feature, Geometry } from 'geojson';

/** Dimensions du monde projeté (unités SVG). La carte s'adapte ensuite à son conteneur. */
export const WORLD_W = 1000;
export const WORLD_H = 580;

export interface WorldCountry {
  /** Code numérique ISO 3166-1 sur 3 chiffres, ex. « 250 » (« "" » si le territoire n'en a pas). */
  id: string;
  name: string;
  d: string;
  centroid: [number, number];
  bounds: [[number, number], [number, number]];
  neighbors: string[];
}

export interface World {
  countries: WorldCountry[];
  byId: Map<string, WorldCountry>;
  project: (lng: number, lat: number) => [number, number];
}

let cache: Promise<World> | null = null;

/** Charge (une seule fois) le fond de carte et prépare chemins SVG + pays voisins. Les données sont chargées à la demande. */
export function loadWorld(): Promise<World> {
  cache ??= (async () => {
    const topo = ((await import('world-atlas/countries-110m.json')) as unknown as { default: Topology }).default;
    const geoms = (topo.objects.countries as GeometryCollection).geometries;
    const fc = feature(topo, topo.objects.countries as GeometryCollection) as unknown as { features: Feature<Geometry, { name: string }>[] };
    const nb = topoNeighbors(geoms);

    // Mercator : x = longitude, y = latitude coupée entre ~ -56° et 80° (pas d'Antarctique).
    const scale = WORLD_W / (2 * Math.PI);
    const projection = geoMercator().scale(scale).translate([WORLD_W / 2, 0]);
    const y80 = projection([0, 80])![1];
    projection.translate([WORLD_W / 2, -y80 + 4]);
    const path = geoPath(projection);

    const ids = fc.features.map((f) => (f.id != null ? String(f.id).padStart(3, '0') : ''));
    const countries: WorldCountry[] = [];
    fc.features.forEach((f, i) => {
      if (String(f.id) === '010') return; // Antarctique
      const d = path(f as GeoPermissibleObjects);
      if (!d) return;
      countries.push({
        id: ids[i],
        name: f.properties?.name ?? '',
        d,
        centroid: path.centroid(f as GeoPermissibleObjects) as [number, number],
        bounds: path.bounds(f as GeoPermissibleObjects) as [[number, number], [number, number]],
        neighbors: nb[i].map((j) => ids[j]).filter(Boolean),
      });
    });
    return {
      countries,
      byId: new Map(countries.filter((c) => c.id).map((c) => [c.id, c])),
      project: (lng, lat) => projection([lng, lat]) as [number, number],
    };
  })();
  return cache;
}
