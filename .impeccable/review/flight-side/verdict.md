# Side flight and buyer features — 2026-10-08

Independent reviewer disposition: **ship — reviewed working-prototype changes only**.

User clarification supersedes the vertical departure and visible rotation controls. No aircraft geometry or new shipping bitmap assets were produced.

Reviewed changes: right-side exit clipped between headline/offer; left-side arrival in the machine viewer; six practical capability tabs with three feature rows each; qualified manufacturer/PDF figures; self-hosted Golos with stronger numerical hierarchy and 16px buyer prose; no visible stop/start controls; automatic reduced-motion and offscreen/hidden-tab handling retained.

| Finding | Outcome |
| --- | --- |
| A01: mobile arrival unfinished at header alignment | Resolved. Progress now follows the section heading, independent of viewer height. |
| Blank mobile usage capture | Resolved. Corrected capture shows decoded manufacturer photograph. |
| F01: context-loss fallback could ignore scroll | Resolved. DOM-only frames update pose, visibility and clipping; no lost-context GPU work or automatic loop. |
| F02: fallback status could cover CTA/value | Resolved. Status lives in normal flow after machine specifications. |

Two-size main QA (1440×1000, 390×844) passed side exit, left entry, no model in uses, six tabs × three features, absent stop controls, rotating nodes, reduced motion, no horizontal overflow or JS errors. Targeted fallback QA additionally passed aborted-GLB clipping, actual `WEBGL_lose_context` scrolling, in-flow status, decoded photograph and visible mid-entry captures at both sizes.

The first capture batch exposed an asynchronous test assertion; the settled confirm matrix then exposed A01. Corrections followed the bounded reviewer findings; final tests and verdict are recorded here, not inferred from the detector. No open-ended visual polish followed. Existing raster provenance remains unchanged.

Battery and navigation show the whole platform because the existing upper-cover tag is not a complete B141050 assembly. Spreading uses the real manufacturer photo rather than pretending the missing module is a tank. Numerical source/conditions: `EQUIPMENT-SOURCES.md`.

Approval is not a claim of factory CAD accuracy, photorealism, public-launch readiness, guaranteed field performance or measured real-device FPS. Earlier `motion` and v06 capture matrices are historical; current acceptance scripts are `tools/qa-side-flight.cjs` and `tools/qa-flight-fallback.cjs`.
