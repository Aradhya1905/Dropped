/**
 * MapLibre style JSON for the Dropped app.
 *
 * Tile source: Protomaps CDN (v4 basemap).
 * Palette matches the Dropped paper/ink/sage design tokens exactly.
 *
 * Pass your Protomaps API key via the `apiKey` parameter. In production,
 * load it from an env variable (react-native-config: `Config.PROTOMAPS_API_KEY`).
 * For dev, pass a hardcoded key or leave as empty string to get a watermarked
 * demo response.
 */
export function droppedMapStyle(apiKey?: string): object {
  const tilesUrl = apiKey
    ? `https://api.protomaps.com/tiles/v4/{z}/{x}/{y}.mvt?key=${apiKey}`
    : 'https://api.protomaps.com/tiles/v4/{z}/{x}/{y}.mvt';

  return {
    version: 8,
    glyphs: 'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
    sprite: 'https://protomaps.github.io/basemaps-assets/sprites/v4/light',
    sources: {
      protomaps: {
        type: 'vector',
        tiles: [tilesUrl],
        minzoom: 0,
        maxzoom: 15,
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      },
    },
    layers: [
      // --- Ground ---
      {
        id: 'background',
        type: 'background',
        paint: { 'background-color': '#F1EBDE' }, // paper
      },

      // --- Water ---
      // Protomaps v4 schema: the feature-type attribute is `kind` (not the old
      // `pmap:kind`). Fills are pre-blended over paper (#F1EBDE) to opaque so
      // overlapping translucent polygons can't show triangulation seams.
      {
        id: 'water',
        type: 'fill',
        source: 'protomaps',
        'source-layer': 'water',
        // The water source-layer also carries stream/river LINE features; filling
        // those LineStrings produces degenerate triangle slivers across the map
        // (the "irregular lines"). Restrict the fill to polygon water bodies only.
        filter: ['==', '$type', 'Polygon'],
        paint: { 'fill-color': '#C6CDBC' }, // accent @0.35 over paper
      },
      {
        id: 'water-outline',
        type: 'line',
        source: 'protomaps',
        'source-layer': 'water',
        filter: ['==', '$type', 'Polygon'], // shorelines only, not streams
        paint: {
          'line-color': 'rgba(86,110,91,0.4)', // accentDeep, faint
          'line-width': 0.8,
        },
      },

      // --- Natural land cover (forest / grassland / scrub) ---
      {
        id: 'landcover',
        type: 'fill',
        source: 'protomaps',
        'source-layer': 'landcover',
        filter: ['in', 'kind', 'forest', 'grassland', 'scrub'],
        paint: { 'fill-color': '#DBDCCC' }, // accentTint @0.18 over paper
      },

      // --- Parks / green areas ---
      {
        id: 'parks',
        type: 'fill',
        source: 'protomaps',
        'source-layer': 'landuse',
        filter: [
          'in',
          'kind',
          'park',
          'forest',
          'wood',
          'grass',
          'meadow',
          'nature_reserve',
          'national_park',
          'protected_area',
          'recreation_ground',
          'golf_course',
          'garden',
          'scrub',
          'cemetery',
        ],
        paint: { 'fill-color': '#DBDCCC' }, // accentTint @0.18 over paper
      },

      // --- Buildings ---
      {
        id: 'buildings',
        type: 'fill',
        source: 'protomaps',
        'source-layer': 'buildings',
        filter: ['in', 'kind', 'building', 'building_part'], // skip address points
        paint: {
          'fill-color': '#E7E1D4', // ink @0.05 over paper
          'fill-outline-color': '#E2DBCB',
        },
      },

      // --- Roads (major: highways + major roads) ---
      {
        id: 'roads-major-casing',
        type: 'line',
        source: 'protomaps',
        'source-layer': 'roads',
        filter: ['in', 'kind', 'highway', 'major_road'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': 'rgba(33,29,23,0.10)',
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2.5, 16, 8],
        },
      },
      {
        id: 'roads-major',
        type: 'line',
        source: 'protomaps',
        'source-layer': 'roads',
        filter: ['in', 'kind', 'highway', 'major_road'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#E8E0D0', // paperDeep
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1.5, 16, 6],
        },
      },

      // --- Roads (minor: residential / service) ---
      {
        id: 'roads-minor',
        type: 'line',
        source: 'protomaps',
        'source-layer': 'roads',
        filter: ['in', 'kind', 'minor_road'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': 'rgba(33,29,23,0.07)',
          'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.5, 16, 3],
        },
      },

      // --- Footpaths / pedestrian ---
      {
        id: 'roads-path',
        type: 'line',
        source: 'protomaps',
        'source-layer': 'roads',
        filter: ['in', 'kind', 'path'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': 'rgba(33,29,23,0.10)',
          'line-width': 0.8,
          'line-dasharray': [2, 2],
        },
      },

      // --- Place labels (neighbourhoods, localities) ---
      {
        id: 'labels-place',
        type: 'symbol',
        source: 'protomaps',
        'source-layer': 'places',
        filter: ['in', 'kind', 'neighbourhood', 'locality', 'macrohood'],
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 12, 9, 16, 12],
          'text-transform': 'uppercase',
          'text-letter-spacing': 0.15,
          'text-max-width': 6,
        },
        paint: {
          'text-color': '#A79D8D', // inkFaint
          'text-halo-color': 'rgba(241,235,222,0.85)', // paper
          'text-halo-width': 1.5,
        },
      },

      // --- Road labels (street names) ---
      {
        id: 'labels-road',
        type: 'symbol',
        source: 'protomaps',
        'source-layer': 'roads',
        filter: ['in', 'kind', 'highway', 'major_road', 'minor_road'],
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-size': 9,
          'symbol-placement': 'line',
          'text-max-angle': 30,
        },
        paint: {
          'text-color': '#6E655A', // inkSoft
          'text-halo-color': 'rgba(241,235,222,0.9)',
          'text-halo-width': 1.2,
        },
      },

      // POI labels intentionally omitted — too noisy for this app.
      // Transit lines intentionally omitted.
    ],
  };
}
