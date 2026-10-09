# Kokshetau demonstration — 2026-10-08

## Current v11 parcels and coverage — 2026-10-09

v11 retains the bounded regional inputs described in the v10 baseline below: bounds [69.26, 53.245, 69.58, 53.43] in west/south/east/north order, four zoom-11 Terrarium tiles, 129 × 129 DEM samples, approximately 166 m spacing, elevations 206–349 m and 696 OSM ways. Heights remain exaggerated ×12. A lower oblique overview and alpha feather over 0.18 local units soften the bounded edge; no geography outside the source region is invented.

The reviewer correction changes mobile overview only: camera pitch coefficient .96, depth .28, fitted to available height; desktop framing remains unchanged. Parcel labels are 28 px screen sprites with sizeAttenuation=false and a resize scale formula. On mobile the single map/hardware toggle moves into normal flow immediately before the viewer, at least 44 px high; on desktop it stays after the description. Focus is preserved on resize. These presentation changes do not alter geographic inputs or their accuracy.

`assets/kokschetau/demo-fields.json` holds three invented parcels, each 0.07 × 0.05 world units, approximately 370 × 257 m / 9.5 ha. Centres are longitude/latitude: A [69.298, 53.423], Б [69.304, 53.394], В [69.521, 53.337]. Placement was checked against OSM roads, water and settlements and a research-only aerial reference. Main reports road clearance of at least 0.13 local units at each centre versus a parcel half-diagonal of about 0.043. This is a bounded placement check against mapped features, not cadastral verification, survey accuracy or proof of current crop/vegetation.

Research-only reference: Esri World Imagery aerial export, actual returned bbox [69.26, 53.2175, 69.58, 53.4575], acquired for placement research on 2026-10-09 and downloaded to `../tmp/kokshetau-field-reference.jpg`. The returned export extent differs from the terrain bounds and must not be described as identical. The reference image is NEVER shipped, used as the runtime map texture or claimed as newly acquired survey imagery. Runtime retains local OSM vector rendering and DEM; no satellite image is distributed with this extension.

Four serpentine passes use curved connections at terrain height +0.027 local units. The illustrative aircraft scale is 0.006; the following camera sits 0.14 behind and 0.062 above it. These are display values, not operational flight specifications. A single rectangular footprint clipped to the parcel supplies both the beam geometry and persistent coverage. Travel-path sampling between rendered positions bridges frame gaps and marks the 576 cells; no independent row-fill timer runs. Reduced motion evaluates the whole route directly to a 576-cell result. Coverage does not measure vegetation, invent new terrain or constitute a real scan, LiDAR or photogrammetric output.

Parcel outlines follow terrain through 128 dense perimeter points at ground +0.0015; the prior +0.008 offset caused apparent mismatch. Cells sit at ground +0.001. These rendering offsets do not improve the coarse DEM. RealTerra is image-based mapping, not LiDAR; equipment references are in EQUIPMENT-SOURCES.md.

QA status: prior full confirmation and evidence recapture PASS as reported by main, with results.json and 16 PNGs including full-canvas overview/result/flight. Arrival check PASS: 70 rendered frames, ratio 24.086, nominal 2.3 seconds; wall-clock 90.115 seconds on parallel-loaded SwiftShader software CPU rendering. This is an environment constraint, not hardware FPS or a device timing promise. Independent review returned FIX for two P2 findings: tiny mobile map and the mobile toggle outside the view below the description. Two correction batches address mobile overview/button placement, then final sprite compositing. Reviewer resolved the button finding and noted partially corrected labels behind transparent terrain. Final sprite compositing uses renderOrder=100, depthWrite=false and transparent=true with the same opaque drawn paper backing. Confirmation via `tools/qa-navigation-v11.cjs` after this correction is PASS as reported by main, and the same 16 PNGs have been recaptured. QA omits manual pre-capture scrolling for overview/result/flight and asserts the mobile return toggle is visible. Main inspected desktop/mobile overview-canvas and confirmed readable A/Б/В labels. Final independent verdict from Laplace: SHIP for scoped working prototype v11 (REVIEW.md: disposition: ship). Both original P2 findings are resolved; no named findings remain open. Final QA and JavaScript check PASS as reported by main, with current results.json and the same 16 recaptured PNGs. The verdict covers only the two named fixes, not a full-site public launch, factory hardware accuracy, photorealism, survey accuracy or hardware FPS.

## Historical v10 regional viewer baseline

The shipped viewer now uses `region-terrain.json` and `region-features.json`: bounds 69.26–69.58 E, 53.245–53.43 N (roughly 21 × 21 km), four bounded Terrarium zoom-11 tiles, 129 × 129 DEM samples (about 166 m grid interval), heights 206–349 m. This replaces the insufficient northern close-up; older input files remain historical, not current viewer data. Sources and transformations are recorded in the acquisition script and JSON. Approximate regional heights are not centimetre-level RTK or new scan data.

696 actual OSM vector features include the mapped Lake Kopa shoreline, roads, residential areas, farmland and woods. Field A/Б/В boundaries remain invented demo mission areas at different places outside the city. Map labels use local coordinates: Kopa around 53.309 N / 69.344 E, Kokshetau around 53.283 N / 69.397 E. No positions of individual trees or real survey results are inferred. Data acquisition used one bounded Overpass request after failed endpoints; fallback code supports bounded OSM API partitions. No OSM raster tiles are archived.

Approach now travels from the left side of the regional overview to the selected field, then follows the aircraft from behind/above. Controls become a small upper strip during approach/flight rather than covering the scan below. Credits remain visible. Heights still exaggerated ×12. Original data attribution and demo limits below remain applicable.

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
