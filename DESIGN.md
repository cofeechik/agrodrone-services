---
name: "АГРОДРОН — spatial flight prototype"
description: "Cold paper, slate typography and dedicated airspace for the XAG reconstruction."
colors:
  paper: "#f7fafb"
  ink: "#243640"
  muted: "#576972"
  line: "#c9d3d8"
  accent: "#bc351e"
  flight-heading: "#778a94"
  photo-surface: "#edf1f2"
  machine-surface: "#edf2f4"
typography:
  display:
    fontFamily: "Golos, sans-serif"
    fontSize: "clamp(50px,6.5vw,94px)"
    fontWeight: 400
    lineHeight: 1.04
    letterSpacing: "-.035em"
  headline:
    fontFamily: "Golos, sans-serif"
    fontSize: "clamp(48px,6.7vw,96px)"
    fontWeight: 450
    lineHeight: 1.06
    letterSpacing: "-.035em"
  offer:
    fontFamily: "Golos, sans-serif"
    fontSize: "clamp(30px,3vw,46px)"
    fontWeight: 450
    lineHeight: 1.06
    letterSpacing: "-.035em"
  title:
    fontFamily: "Golos, sans-serif"
    fontSize: "28px"
    fontWeight: 450
    lineHeight: 1.06
    letterSpacing: "-.035em"
  body:
    fontFamily: "Golos, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Golos, sans-serif"
    fontSize: "13px"
    fontWeight: 400
  machine-value:
    fontFamily: "Golos, sans-serif"
    fontSize: "clamp(52px,5.7vw,82px)"
    fontWeight: 550
    lineHeight: 1
    letterSpacing: "-.04em"
  machine-unit:
    fontFamily: "Golos, sans-serif"
    fontSize: ".32em"
    fontWeight: 450
    letterSpacing: "0"
  feature-body:
    fontFamily: "Golos, sans-serif"
    fontSize: "16px"
    lineHeight: 1.6
  feature-label:
    fontFamily: "Golos, sans-serif"
    fontSize: "13px"
    lineHeight: 1.5
  feature-value:
    fontFamily: "Golos, sans-serif"
    fontSize: "22px"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "-.02em"
rounded:
  square: "0"
spacing:
  gutter: "clamp(24px,4vw,72px)"
  gutter-mobile: "20px"
  section: "80px"
  section-mobile: "52px"
  form-gap: "10px"
  control-gap: "24px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    padding: "13px 22px"
  button-primary-hover:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.paper}"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "12px 14px"
  service-selector:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    padding: "10px 0"
  service-selector-selected:
    textColor: "{colors.ink}"
  part-selector:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    padding: "12px 0"
  part-selector-selected:
    textColor: "{colors.ink}"
---

# Design System: АГРОДРОН prototype

## Overview

**Creative North Star: "Riotters spatial flight"**

Cold paper and large, light Cyrillic typography give the aircraft its own airspace. Slate controls and restrained red details keep the interface legible around the reconstructed XAG rather than competing with it.

This is the approved visual world for `prototype.html`. The separate legacy `index.html` keeps its existing terracotta system; these prototype tokens do not replace it.

**Key Characteristics:**

- Open aircraft stages, full photographs and flat ruled controls.
- Self-hosted Golos, slate ink and restrained red interaction states.
- Explicit limits on reconstruction, motion and message preparation.

Evidence: current behavior is extracted from `prototype.html`, `prototype.css`, `prototype-ui.js` and `prototype-3d.js`; the model/studio remain v06. Earlier `.impeccable/review/results.json` (31 captures, three sizes) and `motion/results.json` approvals are historical. Current `.impeccable/review/flight-side/results.json` confirms completed QA at 1440×1000 and 390×844: side exit, left entry, no model in applications, six views with three feature rows each, no stop control, visible spinning and automatic reduced motion all pass; neither size has horizontal overflow or recorded errors. A01 entry uses the section-top/heading approach to header height, independent of viewer height. Targeted `flight-side/fallback-results.json` now passes hero/machine fallback clipping, intermediate entry capture, decoded photo, context-loss scrolling and status-in-flow at both sizes. Final reviewer confirmation supplied by the main task: SHIP FOR WORKING PROTOTYPE ONLY for this current delta. A01, F01 and F02 are resolved; buyer features, typography and usage photographs passed review. Context-loss fallback follows position/clipping without a GPU loop, and static status remains unobstructed. No new shipping rasters are introduced. `EQUIPMENT-SOURCES.md` records exact manufacturer sources and qualifications: PDF indexes 17 (technical), 14 (energy), 7 (spray), 11 (navigation), with all four indexes visually checked by the main task, plus https://xa.com/en/p150max. It explains why battery/navigation retain the full aircraft. This documents supplied sourcing, not a new independent specification audit. No full-photorealism, factory-CAD or real-device FPS guarantee is made.

## Colors

Primary accent is warm XAG red for hover, keyboard focus and selection markers; primary action surfaces use slate ink. Neutral cold paper is the page ground; muted slate supports labels and notes; pale lines divide chapters and controls. The filled grey-blue flight heading, photographic backing and machine backing use their separate frontmatter colors. There is no outline brand word behind the aircraft.

**The State Accent Rule.** Use red to mark interaction and selection; keep broad UI surfaces cold and neutral.

## Typography

Golos is loaded locally from `assets/golos-variable.ttf`, variable weights 100–900 with swap and a sans-serif fallback. Display is the decorative flight phrase; offer is the actual h1; headline is the section h2. Titles, body and labels follow the frontmatter roles. Numbers in specifications use tabular figures.

Body paragraphs cap at 70ch; the service explanation at 39ch (45ch on mobile). Mobile uses a 50px flight phrase, 32px offer and 16px service copy. Contact h2 is a separate observed clamp(46px,5vw,76px), overridden to 52px on mobile. Headings balance lines rather than imposing extra tracking.

Machine values use the new frontmatter role with tabular figures and unbroken value/unit lines; mobile value size is 64px. Units are subordinate at .32em. Feature prose remains 16px on desktop and mobile with a 45ch cap. Three ruled feature rows use 13px labels and 22px values, increasing values to 24px on mobile.

## Layout

Sticky header is 76px, changing to 64px at 700px; gutter follows the frontmatter. Sections use its desktop/mobile vertical spacing. At 1000px the service gap tightens and the machine side column becomes 230px; at 700px navigation links disappear while brand and contact CTA remain.

Prototype composition: flight → photographic applications → machine inspection → contact. The sticky flight viewport sits inside a 195svh chapter (160svh mobile; 100svh under reduced motion). Hero scroll moves the aircraft right at constant target y, clipped below the decorative heading and above the offer (12px clearances). Machine entry comes from the left, clipped to its viewer; progress follows the machine section top/heading approach to the header: zero at 45% of viewport height and complete at header height, independent of viewer height. Reduced motion places it at the completed entry position. Applications have their own two-column copy/photo area and no adjacent 3D model. Photographs use contain, centred, with attribution below; mobile orders selector, photograph, explanation.

The machine has dedicated airspace with a minmax(290px,25%) explanation column and a minimum-440px/58svh viewer; the existing 1000px breakpoint narrows the side column to 230px. Mobile stacks selector, minimum-300px/43svh viewer and full-width feature panel. Six machine choices can scroll horizontally at every size; each explanation carries three ruled buyer-feature rows, followed by the existing three platform specifications. Contact is two columns, becoming one; paired form fields retain two columns. These compositions describe this prototype, not mandatory layouts for every future surface.

## Elevation & Depth

UI is flat: borders, tonal fields and whitespace supply hierarchy, with no CSS box-shadow vocabulary. The aircraft supplies perspective and material depth. The current loader requests `xag-p150-max-v06-web.glb` and its v06 manifest, uses a perspective camera (32°), studio reflections, warm key/cool fill, soft self-shadowing and ACES tone mapping.

v06 source corrects the continuous molded tank surface, actual motor-fork and hinge-cheek openings, recessed service-panel faces and cover-fastener seats. The final compressed model is 3,096,320 bytes, 93 nodes, 76 meshes and 297,648 triangles; motor diagonal is approximately 2335mm, height 768.249mm, with four local-Y rotor pivots. Surface response distinguishes HDPE, carbon, graphite and rubber, with subtle procedural microfinish. This is a photographic external reconstruction, not factory CAD or a photorealism guarantee.

## Shapes

Controls and fields are square; thin straight dividers organise sections. Service selection uses a small circular red marker; part selection uses a red underline. These are control states, not standalone chips or cards. Direction arrows are line geometry. Rounded modeled plastic belongs to the aircraft, not a new UI radius scale.

## Components

- **Primary button:** slate/paper, 48px minimum height, frontmatter padding, weight 500; hover turns red in 180ms. Header/action versions shrink on mobile. Keyboard focus uses a red 2px outline offset 5px.
- **Input/select:** transparent, 1px pale border, square, 52px minimum height, 16px text. Focus changes the border to ink and retains the visible red outline; caret is red. Required fields use native validation; no custom error-card or disabled visual system is implemented.
- **Navigation:** muted text links with 12px vertical padding and 30px gaps (18px below 1000px); hover turns ink and underlines. A skip link appears on focus. Mobile retains the contact CTA, with no invented menu drawer.
- **Service selector:** four real tasks, pressed state in ink plus red dot, red hover. Changes explanation, manufacturer image/credit and form service. Photograph failure keeps the previous image with an honest status. It does not swap the RevoSpray 3D module.
- **Machine feature selector:** six pressed-state choices, in order: platform, spraying/tank, rotors, battery, navigation, spreading. Platform is the default; each view has a numeric headline, short explanation and three sourced feature rows. Tank/rotors alone enable ghost isolation and the restore toggle. Battery shows the full platform without isolation: the existing semantic battery group is actually an upper cover, so it must not be presented as a battery highlight. Navigation also shows the full platform without claiming modeled internal sensors. Spreading shows contained `assets/service-spread.jpg` manufacturer photography and hides 3D; it does not substitute a fictional modeled hopper. Platform/navigation framing fits perspective corners and full rotor sweeps to 94% of the allocated frame. Detail views remain clipped to viewer airspace.
- **Buyer features:** platform pairs load with platform/RevoSling speed and water protection; spraying pairs tank volume with flow, swath and droplet range; rotors pair diameter with count and platform limits; battery pairs energy with charging times/cycle limits and the single-battery load restriction; navigation pairs RTK accuracy with radar range/mapping/station; spreading pairs hopper volume with feed/swath/granule size. Values describe manufacturer configurations and test conditions, not guaranteed field productivity. The visible note qualifies laboratory 30–95% charging, swath conditions and granule-dependent feed.
- **Automatic motion:** four visible rotors run at demonstration speed 58 rad/s with a transparent swept footprint and slight float under normal preference. Stop toolbar and override are removed; system reduced motion automatically stops rotation/float and spatial travel, with no opt-in. Loading/error status is actual DOM inside the machine section after the specification strip, in static flow with 20px top margin, 12px muted type and line-height 1.6; it does not overlay the viewer. Hidden/offscreen views stop continuous rendering and spread photo hides the 3D stage. HTTP is required for modules.
- **Scroll/shadow behavior:** hero pose follows scroll without trailing easing; machine x/y track their viewport anchor plus the authored left entry. Section changes reset pose/focus; machine rotation/scale and within-section focus can smooth. Shadow auto-update stays off: rotation/scale/focus/part changes request new depth. Blades do not cast shadows; aircraft/key light translate together. Each visible frame updates light/target world matrices and `keyLight.shadow.updateMatrices(keyLight)` for current sampling of cached depth. WebGL retains the high-performance hint. The fallback clip helper mirrors the same hero/viewer airspace and updates clipping on context loss. After context loss, requestFrame still schedules the DOM-only render branch: desiredPose and positionFallback update placement/clipping on scroll, without GPU rendering or an automatic loop. Two-size side-flight and targeted fallback QA are complete; final scoped review confirms SHIP FOR WORKING PROTOTYPE ONLY. Earlier shadow invariance checks are historical evidence for the retained matrix mechanism, not a new FPS measurement.
- **Request form:** prepares a WhatsApp message for the named recipient, with a retry link and local status. Area/crop are required for spray/spread; service/location always required. Whitespace-only text is rejected; editing clears stale message links. Never show “sent” merely because a message was prepared.

## Do's and Don'ts

- Do preserve the approved spatial-flight direction and the separate legacy surface.
- Do keep photographs contained, credited and separate from machine airspace.
- Do keep platform default, visible focus and automatic system reduced motion without override.
- Don't describe functional QA as an independent visual approval or hardware FPS guarantee.
- Don't claim factory CAD, modeled internals, photorealism or guaranteed device FPS.
- Don't invent portfolio proof, prices, extra cards/chips or a sent-request state.
