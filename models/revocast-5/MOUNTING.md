# RevoCast 5 mounting handoff

Use `xag-p150-max-v08-configurable-web.glb` as the aircraft and the unchanged `revocast-5-v01-web.glb` as the module. This v08 is a **semantic regrouping of v07**, not a redesigned aircraft. Both original native models are unchanged (SHA-256 verified).

## Raw glTF transform

At scene level, before any website normalization:

```json
{"position":[0,0.48375,-0.075],"quaternion":[0,0,0,1],"scale":[1,1,1]}
```

Metres, Y up, quaternion XYZW. If attached directly beneath `v08 web | P150_V03_ROOT`, use position `[0,0.449,-0.075]` instead because the aircraft root already adds `0.03475` to Y. Apply any subsequent recenter/scale transform to the **combined aircraft and module**, not separately. The module's own top-plane root is already at zero; do not centre it on its bounding box.

The module is centred on the chassis rail span with 75 mm rearward offset. Its alignment bosses nominally meet the lower equipment-tray underside at Blender world Z=0.48375. Frame rail centres X=±0.174 are near aircraft mounting rail centres X=±0.170. Scale is unchanged.

## Replacement, not stacking

For spread mode, hide aircraft mesh components `tank`, `spray`, and `landing`. Keep structure, battery, navigation and all four rotor subtrees. Show the complete RevoCast module, which includes its own landing gear. For spray mode, hide the module and restore all three aircraft groups.

The original v07 has **no independent leg nodes**: material merging mixes them with retained geometry in `v07 web | structure | 0`, `3`, `8`, and `10`. Do not hide those original nodes wholesale. Pumps and inner supply hoses were also incorrectly included in `structure` for this purpose. The new v08 separates those exact original geometry spans, preserving custom normals, vertex contact-occlusion and hierarchy.

New dedicated old-leg nodes:

- `v08 web | landing | 0` — four struts and two lower ties.
- `v08 web | landing | 8` — four rubber feet.
- `v08 web | landing | 10` — shoulders, split clamps, pins and pivots.

New pump/hose nodes all have `extras.component: spray`: `v08 web | spray | 0`, `3`, `8`, and `10`. Existing outer spray hoses remain in `v08 web | spray | 44` and `76`. The eight original spray nodes and five tank nodes remain separately tagged. `mounting.json` lists **every native object replaced** and the exact mixed-node partitions; none of the retained arms/chassis/handles should be removed.

## Artifacts and checks

- `xag-p150-max-revocast-5-mounted-v01.blend` — new native mounted assembly, with retained aircraft and complete module in a dedicated scene; no old tank, pumps, hoses or aircraft legs stacked beneath it. Includes the separate source-versus-mounted comparison scene and an independent assembly camera/light setup.
- `mounting-compare-oblique.png` — one 900×560 background-Blender comparison: original spray configuration left, mounted spread configuration right. Comparison copies are ground-aligned for presentation; that offset is not the raw mounting transform.
- `mounting.json` — transform, exact replacement map, original hashes and exterior-support bounds check.
- `mounting-web-validation.json` — compressed model decoding and hierarchy/semantic checks.
- `xag-p150-max-v08-configurable-uncompressed.glb` — source for the compressed web export.

Web export: **2,941,404 bytes, 111 nodes, 94 meshes, 283,712 triangles**. Components: structure 67, spray 12, battery 5, tank 5, landing 3, navigation 2 mesh nodes. Validator: zero errors/warnings. Four decoded rotor pivots retain directions and source world matrices within 1e-6. The full original-aircraft envelope differs by at most 0.0183 mm after compression. The validator cannot itself inspect the meshopt extension; decoded geometry/hierarchy checks supplement it.

Exterior frame/landing-support AABB broad phase found only the four nominal alignment-boss/tray contacts, with zero positive overlap depth at the alignment plane. Mounted overall height is approximately **1029.5 mm**. This is not a full mesh/interior, lid-opening, arm-folding or swept-rotor collision test. Actual sockets, latch engagement, load transfer and factory tolerances are not reconstructed or certified: this is a consistent photo-reconstructed exterior mount, **not factory CAD or an engineering fit guarantee**.

No RevoSling/cargo geometry was invented. Cargo remains manufacturer-photo-only. No UI, JavaScript, existing asset or open MCP scene was changed. Helper scripts in this folder are mounting-only and never invoke the original builders.
