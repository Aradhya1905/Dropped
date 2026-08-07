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
 *
 * Label fonts: MapLibre renders labels from SDF glyph .pbf files served at the
 * `glyphs` URL — the `text-font` stack name must exist there. By default we use
 * Protomaps' CDN, which only ships Noto Sans. To use the app's brand font (Geist),
 * generate Geist glyph .pbf files (e.g. via maps.protomaps.com/fonts), host them
 * statically (GitHub Pages), and pass that `{fontstack}/{range}.pbf` template as
 * `glyphsUrl` (wired to `Config.MAP_GLYPHS_URL`). When set, labels switch to Geist.
 * NOTE: Geist covers Latin only — see the romanized `name:en` coalesce below so
 * local-script place names (e.g. Kannada) don't render as missing-glyph boxes.
 */
const NOTO_GLYPHS =
  'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf';

/**
 * Every colour this style paints, in one object per cut.
 *
 * The night cut is **not** a generic dark basemap: it's the same paper, ink and
 * sage after dark. Protomaps' stock `dark` style is cool grey-blue and reads as
 * a different app — which is the whole reason this variant exists rather than
 * just pointing `droppedNight` at their CDN. Ground and ink swap roles; sage
 * stays sage, because it is the one colour the app is built around.
 *
 * Fills are pre-blended over the ground to opaque, same discipline as the day
 * cut: overlapping translucent polygons show triangulation seams.
 */
interface StylePalette {
  ground: string;
  water: string;
  waterEdge: string;
  green: string;
  building: string;
  buildingEdge: string;
  roadCasing: string;
  roadMajor: string;
  roadMinor: string;
  path: string;
  placeLabel: string;
  roadLabel: string;
  halo: string;
}

const DAY: StylePalette = {
  ground: '#F1EBDE', // paper
  water: '#C6CDBC', // accent @0.35 over paper
  waterEdge: 'rgba(86,110,91,0.4)', // accentDeep, faint
  green: '#DBDCCC', // accentTint @0.18 over paper
  building: '#E7E1D4', // ink @0.05 over paper
  buildingEdge: '#E2DBCB',
  roadCasing: 'rgba(33,29,23,0.10)',
  roadMajor: '#E8E0D0', // paperDeep
  roadMinor: 'rgba(33,29,23,0.07)',
  path: 'rgba(33,29,23,0.10)',
  placeLabel: '#A79D8D', // inkFaint
  roadLabel: '#6E655A', // inkSoft
  halo: 'rgba(241,235,222,0.88)', // paper
};

const NIGHT: StylePalette = {
  ground: '#171410', // ink, taken darker — still warm, never blue-black
  water: '#1E2620', // sage sunk into the dark ground
  waterEdge: 'rgba(118,149,124,0.34)', // accent, faint — shorelines still read
  green: '#1C2119',
  building: '#221E18', // paper @0.04 over the night ground
  buildingEdge: '#2A251D',
  roadCasing: 'rgba(241,235,222,0.06)',
  roadMajor: '#2E2921', // the night's paperDeep — roads stay the lighter figure
  roadMinor: 'rgba(241,235,222,0.055)',
  path: 'rgba(241,235,222,0.09)',
  placeLabel: '#8C8375',
  roadLabel: '#A79D8D',
  halo: 'rgba(23,20,16,0.9)',
};

export function droppedMapStyle(
  apiKey?: string,
  glyphsUrl?: string,
  options?: { labels?: boolean; dark?: boolean },
): object {
  const tilesUrl = apiKey
    ? `https://api.protomaps.com/tiles/v4/{z}/{x}/{y}.mvt?key=${apiKey}`
    : 'https://api.protomaps.com/tiles/v4/{z}/{x}/{y}.mvt';

  // When a custom (Geist) glyph host is configured, use the brand fonts; else
  // fall back to Noto Sans on the Protomaps CDN (the only stacks it serves).
  // The fontstack names must match the generated glyph folder names exactly.
  const useGeist = !!glyphsUrl;
  const placeFont = useGeist ? ['Geist Mono Regular'] : ['Noto Sans Regular'];
  const roadFont = useGeist ? ['Geist Regular'] : ['Noto Sans Regular'];
  // Prefer the Latin/romanized name (so Geist's Latin-only glyphs suffice),
  // falling back to the local name when no translation exists.
  const labelName = ['coalesce', ['get', 'name:en'], ['get', 'name']];
  // Omit label (symbol) layers entirely for the label-free "Quiet" style.
  const showLabels = options?.labels !== false;
  const c = options?.dark ? NIGHT : DAY;

  const style = {
    version: 8,
    glyphs: useGeist ? glyphsUrl : NOTO_GLYPHS,
    // No `sprite`: this style draws only fills, lines, and text labels — no
    // icon-image symbols — so a sprite sheet is unused. Including one just makes
    // MapLibre fetch it and log a load error when the host is unreachable.
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
        paint: { 'background-color': c.ground },
      },

      // --- Water ---
      // Protomaps v4 schema: the feature-type attribute is `kind` (not the old
      // `pmap:kind`).
      {
        id: 'water',
        type: 'fill',
        source: 'protomaps',
        'source-layer': 'water',
        // The water source-layer also carries stream/river LINE features; filling
        // those LineStrings produces degenerate triangle slivers across the map
        // (the "irregular lines"). Restrict the fill to polygon water bodies only.
        filter: ['==', '$type', 'Polygon'],
        paint: { 'fill-color': c.water },
      },
      {
        id: 'water-outline',
        type: 'line',
        source: 'protomaps',
        'source-layer': 'water',
        filter: ['==', '$type', 'Polygon'], // shorelines only, not streams
        paint: {
          'line-color': c.waterEdge,
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
        paint: { 'fill-color': c.green },
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
        paint: { 'fill-color': c.green },
      },

      // --- Buildings ---
      {
        id: 'buildings',
        type: 'fill',
        source: 'protomaps',
        'source-layer': 'buildings',
        filter: ['in', 'kind', 'building', 'building_part'], // skip address points
        paint: {
          'fill-color': c.building,
          'fill-outline-color': c.buildingEdge,
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
          'line-color': c.roadCasing,
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
          'line-color': c.roadMajor,
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
          'line-color': c.roadMinor,
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
          'line-color': c.path,
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
          'text-field': labelName,
          'text-font': placeFont,
          'text-size': ['interpolate', ['linear'], ['zoom'], 12, 9, 16, 12],
          'text-transform': 'uppercase',
          'text-letter-spacing': 0.15,
          'text-max-width': 6,
        },
        paint: {
          'text-color': c.placeLabel,
          'text-halo-color': c.halo,
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
          'text-field': labelName,
          'text-font': roadFont,
          'text-size': 9,
          'symbol-placement': 'line',
          'text-max-angle': 30,
        },
        paint: {
          'text-color': c.roadLabel,
          'text-halo-color': c.halo,
          'text-halo-width': 1.2,
        },
      },

      // POI labels intentionally omitted — too noisy for this app.
      // Transit lines intentionally omitted.
    ],
  };

  if (!showLabels) {
    style.layers = style.layers.filter(layer => layer.type !== 'symbol');
  }
  return style;
}
