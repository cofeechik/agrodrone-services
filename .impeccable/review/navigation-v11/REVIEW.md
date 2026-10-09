disposition: fix

## assessment

Fresh scoped v11 finish review, performed inline because no subagent tool is exposed. Read-only code and saved-image assessment; no runtime browser, server, new captures, detector rerun or implementation changes. All 16 named captures were opened, together with the rendered PDF page 11. Captures postdate the inspected implementation and show the named states; full-scene canvas captures are valid. No recapture disposition is needed. No separate QUALITY BAR card was supplied; the existing identity and explicit v11 contract govern this extension. No comp or concept seed is required by the user's code-led scope.

The navigation reconstruction, shared footprint/coverage logic, equipment order and nominal distant arrival satisfy their scoped implementation promises. Two mobile composition/flow defects remain. They require local fixes, not a replacement visual world.

## preserved world

Cold paper, slate ink, local Golos, flat controls and restrained red selection remain consistent with the incumbent. Navigation defaults to hardware; the selected radar/antennae remain solid while 194 other meshes are ghosted in both recorded sizes. One cover half reaches opacity .09; the gold array is visible in desktop/mobile hardware captures and corresponds to the visible antenna array in the supplied PDF render. Its 175 patches and dimensions remain an inferred reconstruction, not factory circuitry.

The runtime substitutes procedural hardware while loading the retained v08 GLB. Geography remains bounded to the supplied Kokshetau OSM/DEM region, with edge feathering and disclosed ×12 relief. Three .07 × .05 illustrative parcels replace larger demo fields. Road clearance and aerial parcel checks are supplied acquisition evidence, not independently re-certified here. RealTerra remains photographic mapping. Raster photographs, native model assets, legacy index and DESIGN.md are outside the fix list.

## material findings with priorities, evidence and exact fix

1. **[P2] Mobile overview still reads as a small terrain island surrounded by empty canvas.** Evidence: `mobile-overview-canvas.png` shows approximately 310 × 155 px of terrain in a 350 × 550 px viewer; the distant parcel labels are too small to read reliably. The desktop overview uses its scene more effectively. `prototype-navigation.js:66–70` fixes the overview to a low oblique angle and width-dominated distance; `:175` sizes labels in world units. This leaves the mobile part of the user's square-plus-void concern only partially resolved. **Exact fix:** give the narrow-screen overview a steeper viewing angle and fit the existing bounded terrain to the rectangle between the heading and controls; retain the low flight camera. Keep overview parcel markers at a readable fixed screen size (at least 24 px box / 14 px letter) using projection or distance compensation. Preserve bounds and feathering; add no outside geography. Confirm the three markers and lake/city context in the existing mobile overview capture pair.

2. **[P2] Mobile hardware/map switching disconnects the action from its visual result.** Evidence: `mobile-hardware.png` reaches the lower viewport edge at the panel heading, before the description and mode button. `prototype-ui.js:23–28` inserts the button after that description and changes mode without bringing the scene into view. `prototype.css:116,164` places the panel after the scene and grows the map scene to 550 px. The user must scroll down to switch, then back up to inspect the result; expansion also moves the control's location. QA clicks the control, then explicitly scrolls to `#machine` before its overview/flight screenshots, so those captures do not establish the actual post-click mobile viewport. **Exact fix:** at ≤700 px place the single mode button in a normal-flow toolbar immediately before the equipment scene, after the part selector, with a 44 px minimum target. Keep it outside the canvas so it cannot overlap map controls, retain its keyboard focus, and update its action label in place. Desktop may retain the current panel placement. Confirm hardware → map → hardware from the user's click position without a QA-only scroll reset.

## nonblock advisories

- Beam and accumulated ground share `footprint()` and parcel clipping; travel-arc sampling drives 576 persistent cells. Recorded results show 576/576 on all three parcels at both sizes and 186 intermediate cells, with no page errors. Cell-center quantization remains an illustrative coverage representation. The pale beam is visually subtle in stills; these captures cannot establish how clearly it reads in motion.
- Flight containment intentionally fits aircraft/beam, not the entire parcel. A foreground parcel edge leaving the canvas is consistent with the explicit flight contract and is not a new fix.
- Arrival evidence records 70 rendered samples at desktop only, nominal 2.3 seconds with capped progress, across roughly 90.1 seconds of software-renderer wall time. This verifies non-skipping progress, not actual 2.3-second device playback or mobile normal-motion arrival. Existing hero copy is hidden while `is-arriving`; that prolonged software-renderer state is a disclosed limit, not an FPS conclusion.
- The prior layout detector could not access layout; the preexisting white skip-link palette advisory remains nonblocking. No clean mechanical/a11y audit is asserted. DESIGN.md/history and pending-status documentation drift remain untouched.

## verdict scope

FIX for the scoped working prototype because the two named mobile findings remain material. No rebuild is warranted; supplied evidence is sufficient for this review. The next pass should score only these two fixes and any regressions they introduce. Approval would cover this v11 navigation refinement, not full-site launch, factory hardware accuracy, photorealism, real survey output or real-device FPS. Only this review record was written.

---

## verdict — targeted confirmation, 2026-10-09

Reopened the same 16 updated PNG paths and inspected only the two named fixes and their immediate regression evidence. All captures are valid and postdate the fix files. No runtime browser, detector rerun, implementation edits or new cosmetic audit. The updated QA script removes explicit scroll resets before overview/result/flight captures, asserts mobile button placement/height/return visibility, and records three 576-cell results with empty error lists at both sizes.

| Named finding | Status | Evidence |
| --- | --- | --- |
| P2 mobile overview island and unreadable parcel labels | **partial** | `mobile-overview-canvas.png` now shows roughly 300 × 275 px of terrain above the controls, with identifiable lake/city context; the excessive empty-space composition is corrected. However, the on-map Б and В labels remain faint/obscured and cannot be read confidently at native size; А is also weak against the northern terrain edge. `prototype-navigation.js:69–70,178` establishes constant nominal 28 px sprites, but code sizing alone does not satisfy the required visible labels. The recapture still fails that part of the named finding. |
| P2 mobile mode switch disconnected from its result | **resolved** | `mobile-hardware.png` and `mobile-overview.png` show the single action button directly above the viewer in normal flow. The same accessible control changes its action label, remains outside map controls, and is visible in result/flight captures. CSS reserves the row and ≥44 px height; responsive repositioning retains the existing DOM node and restores focus with `preventScroll`. The revised QA includes the return-to-hardware visibility assertion. |

No additional material regression identified in the supplied fix evidence. Desktop retains the prior oblique framing and panel control; recorded coverage/beam bounds and overflow/error assertions pass. Arrival and native Blend assets were not changed by this batch, as reported; this pass does not re-certify them.

## remaining

Only the label-readability portion of finding 1 remains open. Keep the corrected mobile framing and button placement. Make overview label sprites reliably render above the transparent terrain (explicit higher `renderOrder` and `depthWrite:false`, or projected DOM labels) with opaque paper backing and slate letters; retain the fixed screen size. The saved appearance is consistent with terrain transparency painting over parts of the sprites, but the precise compositing cause is a code-led inference, not a live-browser observation. Confirm that all three letters А/Б/В are plainly readable in the same mobile overview capture pair; constant-size configuration by itself is insufficient.

Disposition remains **fix** for the scoped working prototype because one named material finding is partial. This is a verdict on the original two fixes only, with no full-site launch, photorealism, factory-CAD or hardware-FPS approval.

disposition: fix

---

## verdict — final label-compositing confirmation, 2026-10-09

| Remaining named finding | Status | Evidence |
| --- | --- | --- |
| P2 overview parcel-label readability | **resolved** | Reopened current `mobile-overview-canvas.png`, `mobile-overview.png` and `desktop-overview-canvas.png`. All three letters А/Б/В are visibly readable on paper-backed markers above the terrain at native capture size. `prototype-navigation.js:178` sets `renderOrder=100`, `depthWrite:false` and `transparent:true`; the fixed nominal 28 px sizing is retained. These captures postdate the correction. |

## remaining

Clear. The other P2 was already resolved in the preceding verdict and was not re-audited. No material regression observed in this label correction's inspected overview evidence. Current saved QA results retain 576 covered cells on each of three parcels at both sizes and empty error lists. No runtime browser, new detector, new cosmetic hunt or implementation changes were performed; only this record was appended.

SHIP covers the original two named fixes in the scoped v11 working prototype. It does not extend to full-site public launch, factory hardware accuracy, photorealism, survey accuracy or hardware FPS. Earlier fix dispositions above are historical and superseded by this final scored verdict.

disposition: ship
