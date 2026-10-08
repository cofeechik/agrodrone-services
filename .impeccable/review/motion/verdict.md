# Animation correction — 2026-10-08

Independent reviewer disposition: **ship**, animation quickfix only.

User recording inspected as a 16-frame contact sheet. No model geometry, layout, imagery or copy was redesigned.

Hero position follows current scroll without a trailing pose tween. Screen anchors update directly; independent stages reset pose and focus. Part selection retains its bounded smooth transition. Expensive shadow rendering is cached; the world-to-shadow matrix follows light/aircraft translation each visible frame. Browser receives a high-performance GPU hint.

Reviewer initially accepted anchoring/reset but caught stale shadow matrices during translation. One bounded correction updates light/target world matrices and calls shadow.updateMatrices independently of the depth pass. The final reviewer confirmation approves that fix.

Final tests: 1556×1516 and 390×844; five reversals, zero pose-versus-target position lag, stage reset, part transitions, four rotors, pause, empty error lists. Shadow-space aircraft-center invariance during hover and machine scrolling passed within 1e-6. Four fresh screenshots captured in the same two-size matrix.

Scope excludes guaranteed hardware FPS or a guarantee of smoothness on the user's device. Refresh and inspect the actual page. The previous geometry/structure review is unchanged.
