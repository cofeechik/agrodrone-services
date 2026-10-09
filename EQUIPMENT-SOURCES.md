# Equipment specifications — checked 2026-10-08

## v11 visible navigation reconstruction — 2026-10-09

Reference supplied by the user: `F:/Downloads/XAG_P150_MAX_презентация.pdf`, PDF page 11 (slide 10), showing the radar antenna array under a transparent radome. Manufacturer context: [XAG P150 Max](https://www.xa.com/en/p150max). This records the implementation handoff and its supplied visual evidence; it does not assert a new independent factory-internal inspection.

`prototype-navigation-hardware.js` reconstructs visible exterior antennas, radar housing and the gold antenna-patch array. Its 175 visible patches are merged into one geometry; their count, layout, small dimensions and proportions are authored approximations to the reference, not a manufacturer-confirmed element count, exposed processor chips or undisclosed circuitry. Old navigation groups are removed only from the runtime scene. Native Blender files and existing GLBs remain unchanged.

Only selected navigation inspection fades one cover half to opacity 0.09 while the rest of the aircraft is ghosted. Navigation defaults to hardware; one button “Посмотреть сканирование” opens the map, with “Вернуться к датчикам” returning to inspection. Desktop keeps it after the description in the part panel. Mobile moves the same button to a direct machine-layout child before the airspace, in normal-flow row 2 at least 44 px high; viewer row 3/panel row 4 apply only while it is visible. Resize preserves focus. Mobile map overview uses pitch .96/depth .28 fitted to available height, with 28 px screen labels; desktop framing is preserved. Current equipment order: all → spread → spray → tank → rotors → battery → navigation. RealTerra is image-based mapping, NOT LiDAR; neither the radar illustration nor the simulated field coverage is a real sensing result.

Prior full v11 confirmation and 16-image evidence recapture PASS are reported by main. Arrival QA also PASS: 70 rendered frames, ratio 24.086, nominal 2.3 seconds but wall-clock 90.115 seconds under parallel-loaded SwiftShader software CPU rendering; this does not establish hardware FPS or device timing. Independent review returned FIX for tiny mobile map and an off-view mobile toggle, both P2. Two correction batches address mobile framing/button placement, then final sprite compositing. Reviewer resolved the button finding, then noted partially corrected labels behind transparent terrain. Final label sprites use renderOrder=100, depthWrite=false, transparent=true and the same opaque drawn paper backing. New `tools/qa-navigation-v11.cjs` confirmation after this correction is PASS as reported by main; the same 16 PNGs were recaptured and main confirmed readable desktop/mobile overview labels. Final independent verdict from Laplace is SHIP for scoped working prototype v11 (navigation-v11/REVIEW.md: disposition: ship): both original P2 findings resolved, no open named findings. Final QA and JavaScript check PASS as reported by main; current results.json and the same 16 recaptured PNGs remain the evidence. This approval covers the two named fixes only, not full-site public launch, factory hardware accuracy, photorealism, survey accuracy or hardware FPS.

## Historical specification and v07 presentation baseline

Primary manufacturer: https://xa.com/en/p150max (P150 **Max**, not earlier P150). Official introduction: https://xa.com/en/news/official/xag/P150-max.

User PDF: `F:/Downloads/XAG_P150_MAX_презентация.pdf`; pages 7 (spraying), 11 (navigation), 14 (energy), 17 (full specification). The PDF's Cyrillic text extraction is incomplete; all four relevant pages were also rendered and inspected visually. Page numbers are PDF indexes, not printed slide numbers.

| Area | Published specifications used | Qualifications |
| --- | --- | --- |
| Platform | Max payload 80kg; top speed 20m/s; RevoSling 13.8m/s; IPX6K | Payload depends on configuration; terrain/environment may reduce speeds. |
| RevoSpray 5 | 80L; 32L/min with two nozzles; 46L/min with four-nozzle kit; 5–10m width; 60–500µm droplets | 46L/min is optional kit, not standard two-nozzle flow. Width/flow depend on operation. |
| Propellers | Four carbon folding propellers, 63in / nominal 1600mm | 80kg and 20m/s refer to the platform, not a single propeller. No operational rotor RPM claim. |
| B141050 | 1050Wh; ~7min parallel or ~12min single CM13600S; 1500 cycles | Lab charging 30–95%, not empty-to-full. Warranty is 1500 cycles or 12 months, whichever comes first. Single-battery spray capacity is 50L, spreading payload 40kg. |
| Navigation | RTK ±10cm; 4D radar 1.5–100m; RealTerra up to 20ha/flight | Radar performance and mapping area depend on conditions. PPP-AR availability is not asserted. |
| RevoCast 5 | 115L; up to 300kg/min; 5–9m; 1–10mm particles | Flow tested with compound fertilizer; actual material properties matter. Module is shown in manufacturer photo, not an invented 3D replacement. |

The v07 GLB separates tank, spraying, battery and navigation. Battery includes the exterior battery body and cooling cover; navigation selects the observed exterior antennae and front radar. Spraying selects the two rear atomizers and their exterior feed hoses, not the tank. These are photo-reconstructed exterior shapes, not verified factory internals. RevoCast still uses the real manufacturer photograph.
