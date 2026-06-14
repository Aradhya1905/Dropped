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
      {
        id: 'water',
        type: 'fill',
        source: 'protomaps',
        'source-layer': 'water',
        paint: { 'fill-color': 'rgba(118,149,124,0.35)' }, // accent, semi-transparent
      },
      {
        id: 'water-outline',
        type: 'line',
        source: 'protomaps',
        'source-layer': 'water',
        paint: {
          'line-color': 'rgba(86,110,91,0.4)', // accentDeep, faint
          'line-width': 0.8,
        },
      },

      // --- Parks / green areas ---
      {
        id: 'parks',
        type: 'fill',
        source: 'protomaps',
        'source-layer': 'landuse',
        filter: ['in', 'pmap:kind', 'park', 'nature_reserve', 'forest', 'grass', 'meadow'],
        paint: { 'fill-color': 'rgba(118,149,124,0.18)' }, // accentTint
      },

      // --- Buildings ---
      {
        id: 'buildings',
        type: 'fill',
        source: 'protomaps',
        'source-layer': 'buildings',
        paint: {
          'fill-color': 'rgba(33,29,23,0.05)', // ink at very low opacity
          'fill-outline-color': 'rgba(33,29,23,0.08)',
        },
      },

      // --- Roads (major: motorway, primary, secondary, tertiary) ---
      {
        id: 'roads-major-casing',
        type: 'line',
        source: 'protomaps',
        'source-layer': 'roads',
        filter: ['in', 'pmap:kind', 'motorway', 'trunk', 'primary', 'secondary', 'tertiary'],
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
        filter: ['in', 'pmap:kind', 'motorway', 'trunk', 'primary', 'secondary', 'tertiary'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#E8E0D0', // paperDeep
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1.5, 16, 6],
        },
      },

      // --- Roads (minor: residential, service, path) ---
      {
        id: 'roads-minor',
        type: 'line',
        source: 'protomaps',
        'source-layer': 'roads',
        filter: ['!in', 'pmap:kind', 'motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'path', 'track'],
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
        filter: ['in', 'pmap:kind', 'path', 'pedestrian', 'footway'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': 'rgba(33,29,23,0.10)',
          'line-width': 0.8,
          'line-dasharray': [2, 2],
        },
      },

      // --- Place labels (cities, neighbourhoods) ---
      {
        id: 'labels-place',
        type: 'symbol',
        source: 'protomaps',
        'source-layer': 'places',
        filter: ['in', 'pmap:kind', 'neighbourhood', 'suburb', 'locality'],
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Geist Regular'],
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
        filter: ['in', 'pmap:kind', 'primary', 'secondary', 'tertiary', 'residential'],
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Geist Regular'],
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
