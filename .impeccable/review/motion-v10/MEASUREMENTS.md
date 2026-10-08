# v10 verification notes

Desktop 1440 × 1000; mobile 390 × 844; Chrome with software WebGL. `tools/qa-motion-v10.cjs` confirmation passed hero/bank, application configuration travel, moving hook and crate, region map, normal scan, reduced-motion results, no horizontal overflow or page errors, desktop wheel selection and map/end release.

The original broad batch was corrected for sanitized glTF node names, authored bank visibility, map sizing, and labels obscuring coverage. Test harness also needed to reposition after reduced-motion changes page height and disambiguate a button from a viewer carrying the same data attribute. Current captures are the corrected confirmation, not the incomplete first runs.

Battery profiling (`tools/profile-battery.cjs`): before, first battery/all/repeated battery 1500 / 2697 / 795 ms; after shadow-update throttling during focus transition, 991 / 1033 / 416 ms. Both final runs kept 21 GPU programs without new compilation on selection. An intermediate attempted global shadow disable introduced new programs and was reverted. These variable synthetic action timings do not establish hardware FPS or a guaranteed lag-free first selection.

One Impeccable detector invocation returned an existing skip-link white-text palette advisory. It also warned that the requested `layout` argument could not be accessed; do not claim a clean all-category detector. No second detector or design-system migration performed.

Actual regional data: 696 OSM ways/outlines, four zoom-11 elevation tiles resampled to 129². Field boundaries, hoist movement and scan coverage are demonstrations. No manufacturer inside electronics, operational winch capability, tree inventory or measured scan results claimed. Existing native Blender files were not altered.

Fresh independent review requested two fixes: first-render wall time skipped the approach, and the following camera cropped the scan footprint. The actual scene now precompiles before the intro, with progress capped to 1/30 second per rendered frame. Targeted confirmation records 26 timestamped rendered frames at both sizes, each progress increment ≤0.04; under this slow software renderer the sequence takes roughly 10–11 seconds, not a guaranteed 850 ms wall time. Scroll cancellation still passes.

Projected cone vertices and a conservative aircraft radius bound are now fit into the area below controls, with 20px bottom clearance. Targeted bounds: desktop top/bottom 251.9/503.1 inside 195/560; mobile 251.5/489.5 inside 211/530. `tools/qa-motion-finish.cjs` passed; full-canvas captures supplied. Independent verdict pass confirmed both fixes resolved and returned SHIP for working prototype. Scope: the two named fixes, not hardware FPS or a new whole-surface cosmetic review.
