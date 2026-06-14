# Plan: Map fixes + dummy data + full drop→walk→reveal loop

**Date:** 2026-06-14

## Context

User needs the map screen working end-to-end with dummy data before the backend is ready. Four concrete problems + one new requirement:

1. **Remove park blob + "PARK" label** — decorative hardcoded overlay on MapScreen, not real map data
2. **Remove lock icons from floating map pins** — MapPin renders a LockIcon inside each circle; remove it
3. **Fix location dot moving with pan** — `youDot` is a fixed-pixel screen overlay at `top: 276`. When the map pans the dot visually drifts relative to the street grid. Fix: embed `<UserLocation>` from `@maplibre/maplibre-react-native` inside `<Map>` so the dot is geo-anchored to the user's GPS coordinate and stays put during pan. Keep PulseRings as a decorative screen-center overlay (they don't need to be geo-anchored — they're ambient).
4. **Dummy drops with real GPS positions** — seed 3 drops at offsets from user's first GPS fix. Store in Zustand. When user drops a secret via Composer, add it to the store.
5. **Full walk→reveal loop** — walk screen uses real GPS distance (from `utils/geo.ts`) to advance beats automatically. RangeCard on MapHome appears when within 50 m of any drop. Entire Opening→Secret flow shows real secret body.

**User test scenario tonight:** walk 200 m, drop a secret, walk home (~200 m away from drop), see it in range, open it.

---

## Design reference

From `design-reference/project/dropped-screens.js` + `dropped.js`:
- Walk screen uses a **fixed decorative map** (routemap SVG + routeline SVG) — NOT a live MapLibre view. The map behind the walker is a hand-drawn illustration that doesn't pan.
- The `routemap` SVG (`ROUTEMAP` const) = McCarren Park area street grid at 346×780 viewport
- The `routeline` SVG = path `M252 664 Q 236 604 222 548 T 196 430 Q 184 360 173 292`
- Secret pin, unlock zone, walker, footsteps are all at fixed design-space coordinates (percentages of 346×780)
- Beat advancement in the design is tap-driven (for demo); we change it to GPS-driven

---

## What changes

### New file: `src/store/dropsStore.ts`

Zustand store with:
```ts
interface DropsState {
  drops: Secret[];
  seeded: boolean;
  seed(userCoord: Coordinate): void;  // called once on first GPS fix
  addDrop(secret: Secret): void;
}
```

`seed()` creates 3 dummy secrets at offsets from `userCoord`:
- Drop A: `+0.0009 lat, +0.0004 lng` (~100 m NE) — "I cried here once and nobody noticed."
- Drop B: `-0.0006 lat, +0.0010 lng` (~120 m SE) — "Left my old life at this corner."  
- Drop C: `+0.0015 lat, -0.0006 lng` (~170 m N) — "She said yes here. I said nothing."

### Modified: `src/app/navigation/types.ts`

Add `secretId: string` params to screens that need real data:
```ts
SecretDetail: { secretId: string };
Walk: { secretId: string; beat?: WalkBeat };
Opening: { secretId: string };
Secret: { secretId: string };
Dropped: { secretId: string };
```

### Modified: `src/services/maps/maplibreAdapter.tsx`

Add `children` passthrough to `MaplibreView` so `<Marker>` and `<UserLocation>` can render inside `<Map>`:
```tsx
// Change MaplibreView signature:
MaplibreView: React.ComponentType<{ style?: object; children?: React.ReactNode }>;

// Inside the Map component:
<Map ...>
  <Camera ... />
  {children}
</Map>
```

### Modified: `src/features/map/screens/MapScreen.tsx`

1. Remove `<View style={styles.park} />` and `<Text style={styles.parkLbl}>PARK</Text>`
2. Remove `styles.park` and `styles.parkLbl` from StyleSheet
3. Remove the PulseRing + `youDot` centered overlay (or keep PulseRings as ambient decoration, remove `youDot` since UserLocation replaces it)
4. Seed drops on first GPS fix:
   ```ts
   const { seed, drops, seeded } = useDropsStore();
   useEffect(() => {
     if (coord && !seeded) seed(coord);
   }, [coord, seeded, seed]);
   ```
5. Replace 4 hardcoded `<MapPin>` components with dynamic ones from store, rendered as `<Marker>` inside MaplibreView:
   ```tsx
   <MaplibreView>
     <UserLocation animated minDisplacement={2} />
     {drops.map(secret => (
       <Marker key={secret.id} lngLat={[secret.drop.coordinate.lng, secret.drop.coordinate.lat]}>
         <MapPin onPress={() => navigation.navigate('SecretDetail', { secretId: secret.id })} />
       </Marker>
     ))}
   </MaplibreView>
   ```
6. Show `RangeCard` only when `nearestInRange` exists (a drop within 50 m):
   ```ts
   const nearestInRange = coord
     ? drops.find(s => isWithin(coord, s.drop.coordinate))
     : null;
   ```
   Conditionally render: `{nearestInRange ? <RangeCard ... onPress={() => navigation.navigate('Opening', { secretId: nearestInRange.id })} /> : null}`
7. `LocChip` count = `drops.length`

### Modified: `src/features/map/components/MapPin.tsx`

Remove `<LockIcon>` from inside the pin button. The circle remains (FloatBob-animated, pressable). No icon inside:
```tsx
<Pressable onPress={onPress} hitSlop={8} style={...}>
  {/* no icon */}
</Pressable>
```
Also remove `position: 'absolute'` from `styles.wrap` — `Marker` controls positioning when used inside MaplibreView.

**Note:** MapPin will be used *inside* `<Marker>` on MapScreen, so it must not be `position: 'absolute'`. But the Walk screen uses its `SecretPin` internally, not MapPin. No conflict.

### Modified: `src/features/map/screens/WalkSequenceScreen.tsx`

1. Read `secretId` from `route.params`, get the `Secret` from store
2. Replace `useMaplibreAdapter` + `<MaplibreView />` with the static decorative map (routemap SVG already exists in `RouteLine.tsx` area — add a `RouteMap` component). **This matches the design exactly** — the walk screen shows a fixed illustrated street grid, not a live map.
3. Add `useDeviceLocation` coord watch; derive beat automatically from real distance:
   ```ts
   const distM = coord ? haversineMeters(coord, secret.drop.coordinate) : 999;
   const beat: WalkBeat =
     distM <= 0 ? 'arrived' :   // exactly 0 not realistic, use ≤5
     distM <= 50 ? 'arrived' :
     distM <= 150 ? 'range' :
     'approach';
   ```
   Beat updates automatically as GPS moves. No more tap-to-advance (remove the `Pressable` wrapper).  
   **Keep tap-to-advance as a dev shortcut** only in `__DEV__` builds — wrap in `{__DEV__ && <Pressable ... />}`.
4. Replace hardcoded "78 m" / "88 steps" with real distance: `Math.round(distM) + ' m'`
5. Pass `secretId` forward to `Opening` screen

### Modified: `src/features/nearby/screens/SecretDetailScreen.tsx`

1. Accept `{ secretId: string }` from `route.params`
2. Get `secret` from store via `useDropsStore`
3. Show real distance: `haversineMeters(coord, secret.drop.coordinate)`
4. Show real place label: `secret.drop.placeLabel`
5. Navigate to Walk with `secretId`

### Modified: `src/features/reveal/screens/OpeningScreen.tsx`

Accept `{ secretId: string }` param, pass it forward to `Secret` screen. Show real `placeLabel` in copy if currently hardcoded.

### Modified: `src/features/reveal/screens/SecretScreen.tsx`

Read `secretId`, get `secret` from store, show `secret.body` instead of hardcoded confession text.

### Modified: `src/features/drop/screens/ComposerScreen.tsx`

1. Add `useState` for `body: string` (currently hardcoded text in `WriteCard`)
2. Make `WriteCard` editable: swap `<Text>` → `<TextInput>` for the body line (add `value` + `onChangeText` props to `WriteCard`)
3. On "Drop here · forever":
   ```ts
   const newSecret: Secret = {
     id: Date.now().toString(),
     body,
     drop: {
       id: Date.now().toString(),
       coordinate: coord!,
       placeLabel: shortAddress ?? 'Here',
       createdAt: Date.now(),
     },
     createdAt: Date.now(),
   };
   addDrop(newSecret);
   navigation.replace('Dropped', { secretId: newSecret.id });
   ```

### Modified: `src/features/drop/screens/DroppedScreen.tsx`

Read `secretId` from params, get `secret` from store. Replace:
- `"Bedford & N 7th"` → `secret?.drop.placeLabel ?? 'Here'`
- hardcoded quote → `secret?.body ?? ''`

### Modified: `src/features/drop/components/WriteCard.tsx`

Change the body `<Text>` to `<TextInput>` accepting `value` + `onChangeText`. Remove the `<Caret>` component (TextInput has its own cursor). Keep all existing styling unchanged — just swap the element type and props.

---

## Utility import

`isWithin` from `src/utils/geo.ts` and `haversineMeters` are already implemented. Import them directly in MapScreen and WalkSequenceScreen.

---

## Files to create
- `src/store/dropsStore.ts`

## Files to modify (in order)
1. `src/app/navigation/types.ts`
2. `src/services/maps/maplibreAdapter.tsx`
3. `src/features/map/components/MapPin.tsx`
4. `src/features/drop/components/WriteCard.tsx`
5. `src/store/dropsStore.ts` (create)
6. `src/features/map/screens/MapScreen.tsx`
7. `src/features/nearby/screens/SecretDetailScreen.tsx`
8. `src/features/map/screens/WalkSequenceScreen.tsx`
9. `src/features/reveal/screens/OpeningScreen.tsx`
10. `src/features/reveal/screens/SecretScreen.tsx`
11. `src/features/drop/screens/ComposerScreen.tsx`
12. `src/features/drop/screens/DroppedScreen.tsx`

---

## Verification

1. **Park gone** — MapScreen shows no green blob, no "PARK" text
2. **Pins no lock icon** — floating map circles are plain (no LockIcon inside)
3. **Location dot geo-anchored** — pan the map, blue dot stays at GPS coordinate
4. **3 dummy drops appear** — after first GPS fix, 3 pins appear on map around current location
5. **Tap pin → SecretDetail** — shows real distance (big number, ~100–200 m), real place label
6. **Walk here → Walk screen** — shows real distance counting down as you move; beats advance automatically at 150 m (range) and 50 m (arrived); RangeCard appears at arrived state
7. **Break seal → Opening → Secret** — shows real secret body from store
8. **Composer → type text → drop** — saved to store with real GPS coord; DroppedScreen shows typed text
9. **Walk home, come within 50 m** — RangeCard appears on MapHome; tap → Opening → Secret with real body
10. **LocChip count** — shows correct number of nearby drops (3 seeds + user drops)
