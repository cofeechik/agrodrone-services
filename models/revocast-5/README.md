# XAG RevoCast 5 / P5 — exterior model v01

Editable model: `revocast-5-v01.blend`. Web asset: `revocast-5-v01-web.glb`.
Five `preview-*.png` images are native Blender renders, not reference photographs.

## Sources and accuracy

Reconstructed from ten distinct references saved in `../../design-references/revocast-5/photos/`, including four genuine XAG Australia studio photographs. See that directory's README and provenance manifest for original URLs, image dimensions and hashes.

- [XAG P150 Max / RevoCast 5](https://www.xa.com/en/p150max)
- [XAG Australia P150 Max RevoCast P5, M4RCP115BH](https://shop.xag-au.com/products/revocastp5)
- [XAG RevoCast 5 user manual, V1.0 EN](https://static.wixstatic.com/ugd/984a86_2ebf2f8dd6bb4bb88c77c12649cd514b.pdf): PDF pages 6, 11 and 23 establish component relationships, underside layout and dimensions.
- User-supplied P150 MAX presentation: pages 9 and 17 cross-checked visually. It contains an installed/working module, not a complete white-background module photo set.

The assembled outer envelope is 1119 × 1012 × 743 mm. This is not the hopper size. Fine dimensions, molded contours and fasteners are inferred from images; this is an exterior reconstruction, **not manufacturer CAD or an engineering-accurate replica**. Nominal 115 L capacity is source metadata, not a measured internal model volume. Hidden auger geometry is intentionally not invented.

## Animation and mounting

`REVOCAST_ATTACHMENT_ROOT` is at the top alignment plane. Blender uses meters, Z up and front −Y. glTF uses Y up; the spreading disc spins about local −Z in glTF (Blender Y). Native materials distinguish HDPE, dark coated hardware, composite tubes and rubber; procedural microtexture is Blender-only, not fully reproduced in the exported PBR asset.

Two `LID_HINGE` nodes rotate the covers; gaskets travel with them. `DISC` contains the rotating disc/vanes, **not the stationary motor or cable**. Static meshes are joined only within a semantic parent and material to reduce draw calls without losing these pivots. No operational RPM simulation or animation is included yet.

This module includes its own landing gear. Integration replaces the existing spray/tank assembly and incompatible landing gear—not both assemblies stacked. The original v07 aircraft remains unchanged. `MOUNTING.md` and `mounting.json` describe the new assembled native file, raw mounting transform and configurable v08 aircraft export. Only a scoped exterior/AABB mount check has been performed; factory fit and complete operational clearance remain unverified. The website now uses these separate assets for application/equipment configurations.

References are retained for private reconstruction work; this collection does not grant commercial image-usage rights.
