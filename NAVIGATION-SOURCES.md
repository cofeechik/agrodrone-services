# Kokshetau demonstration — 2026-10-08

This is a local extension of the existing prototype, not an actual aircraft mission or an operational navigation system.

## Actual geographic inputs

- Bounds: west 69.3896484375, south 53.38332836757154, east 69.43359375, north 53.409531853086435. A roughly 2.9 × 2.9 km area north of Kokshetau.
- `assets/kokschetau/terrain.json`: 65 × 65 samples decoded from a single Mapzen Terrarium tile. Elevations 240–259 metres. Sampling interval about 46 m; interpolation does not increase source accuracy. Heights rendered at ×12 exaggeration, disclosed in the viewer.
- Terrarium endpoint is recorded in the JSON. Encoding: `(R * 256 + G + B / 256) - 32768`. Documentation: https://github.com/tilezen/joerd/blob/master/docs/formats.md.
- Terrain attribution/licences: https://registry.opendata.aws/terrain-tiles/ and https://github.com/tilezen/joerd/blob/master/docs/attribution.md. Global open elevation composites include SRTM and other sources; this prototype does not assert a per-pixel source or survey accuracy.
- `assets/kokschetau/features.json`: 17 real OSM ways from a bounded OpenStreetMap API 0.6 map request, with original IDs/tags/coordinates. Local cartographic rendering; no OSM raster tile archive or scraping. OpenStreetMap data is ODbL: https://www.openstreetmap.org/copyright.
- OSM returned roads and a residential polygon, not surveyed tree locations. No individual trees or measured vegetation have been invented. This is not a satellite orthophoto.

## Demonstration inputs

SRTM / GMTED2010 terrain data courtesy of the U.S. Geological Survey. The local derived elevation grid is resampled and vertically exaggerated for display; these changes are not endorsed by USGS.

Three invented rectangular mission areas A/Б/В, a four-pass flight path, exaggerated aircraft scale, voxel coverage and the scanning footprint are demonstration geometry, explicitly disclosed alongside visible data attribution. A completed pass reveals the **existing open terrain and simulated coverage**, not a newly reconstructed field or measured scan. Real photogrammetric results, tree inventory and cadastral boundaries require supplied survey data.

The React Bits Pro catalogue (https://pro.reactbits.dev/docs/components?category=Backgrounds) describes Voxel Arc as a decorative curved voxel horizon. Its deep-link could not be fetched by the browsing tool. No paid component source, login bypass, React dependency or copied proprietary shader is used. The viewer uses original Three.js instancing for a footprint tied to mission progress instead of a looping background unrelated to scanning.

## Runtime and verification

`prototype-navigation.js` uses one lazy, shared navigation viewer moved between applications and equipment. Initial selection starts approach → following flight → completed coverage. Choosing another field replaces the current mission. A mode button in equipment switches to the actual exterior antenna/radar inspection. Continuous work stops offscreen/background; reduced motion shows the selected result without camera flight. Controls remain keyboard-operable; geodata are served locally, with no visitor geolocation or remote map query.

`.impeccable/review/navigation-v09/results.json` and captures document desktop/mobile functional checks and one normal-motion mission. They do not establish hardware FPS or photorealism. The first battery selection originally created five additional GPU programs; transparent inspection variants are now precompiled off the live model. Repeat profiling showed no new programs on selection, but software-renderer latency remained variable; no measured real-device speed-up is claimed.
