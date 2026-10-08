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

Evidence: extracted from `prototype.html`, `prototype.css`, `prototype-ui.js`, `prototype-3d.js` and `prototype-studio.js`, with the approved surface brief. Final v06 `.impeccable/review/results.json` and 31 PNG captures replace the previous matrix at 1440×1000, 390×844 and 2869×1630. All three report approximately 58 rad/s, four rotors, working pause, no model in applications, no horizontal overflow, empty error lists, WhatsApp preparation and reduced-motion checks passed. Current source and fallback use v06; final compressed-model validation passed with 0 errors and 0 warnings. The final independent verdict and documentation-only confirmation, supplied by the main task, resolve R01 (continuous tank transition), R02 (external mechanical forks/openings and recesses within exterior-reconstruction scope; small details remain simplified), F01 (whole-drone containment at all three sizes) and D01 (documentation correctly records v06, 31 captures and all three sizes). All 31 captures are valid with no material regression. Confirmed disposition: SHIP FOR WORKING PROTOTYPE ONLY. This approval does not establish full photorealism, factory-CAD fidelity or guaranteed FPS on real devices.

## Colors

Primary accent is warm XAG red for hover, keyboard focus and selection markers; primary action surfaces use slate ink. Neutral cold paper is the page ground; muted slate supports labels and notes; pale lines divide chapters and controls. The filled grey-blue flight heading, photographic backing and machine backing use their separate frontmatter colors. There is no outline brand word behind the aircraft.

**The State Accent Rule.** Use red to mark interaction and selection; keep broad UI surfaces cold and neutral.

## Typography

Golos is loaded locally from `assets/golos-variable.ttf`, variable weights 100–900 with swap and a sans-serif fallback. Display is the decorative flight phrase; offer is the actual h1; headline is the section h2. Titles, body and labels follow the frontmatter roles. Numbers in specifications use tabular figures.

Body paragraphs cap at 70ch; the service explanation at 39ch (45ch on mobile). Mobile uses a 50px flight phrase, 32px offer and 16px service copy. Contact h2 is a separate observed clamp(46px,5vw,76px), overridden to 52px on mobile. Headings balance lines rather than imposing extra tracking.

## Layout

Sticky header is 76px, changing to 64px at 700px; gutter follows the frontmatter. Sections use its desktop/mobile vertical spacing. At 1000px the service gap tightens and the machine side column becomes 230px; at 700px navigation links disappear while brand and contact CTA remain.

Prototype composition: flight → photographic applications → machine inspection → contact. The sticky flight viewport sits inside a 195svh chapter (160svh mobile; 100svh under reduced motion). Scrolling authors a descending departure. Applications have their own two-column copy/photo area and no adjacent 3D model. Photographs use contain, centred, with attribution below; mobile orders selector, photograph, explanation.

The machine has a dedicated airspace and 270px explanation column, then three ruled specifications. Mobile stacks selector, minimum-300px/43svh airspace and explanation. Contact is two columns, becoming one; paired form fields retain two columns. Horizontal service and part selectors scroll on mobile. These compositions describe this prototype, not mandatory layouts for every future surface.

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
- **Part selector:** whole drone selected initially; tank, upper block and four rotor assemblies are optional views. Pressed state has red underline; other assemblies ghost toward opacity .025 with depthWrite off. Whole-machine framing fits actual perspective-projected model corners and full rotor sweeps to 94% of the allocated frame; .95 is only the initial zoom estimate. Detail framing may crop ghost arms, and rendering is clipped to machine airspace. The upper block is an external enclosure, not modeled internals. The separate toggle restores the rest of the drone.
- **Motion toolbar:** normal preference enables four rotors at demonstration speed 58 rad/s plus a transparent shader swept footprint and slight float. Pause stops rotation/float; reduced motion defaults them off and shortens flight, with explicit rotation opt-in. Reduced-motion scrolling stays discrete/static even after rotation opt-in. Hidden/offscreen views stop continuous rendering. A saved render/status handles unavailable WebGL/GLB; HTTP is required for modules.
- **Request form:** prepares a WhatsApp message for the named recipient, with a retry link and local status. Area/crop are required for spray/spread; service/location always required. Whitespace-only text is rejected; editing clears stale message links. Never show “sent” merely because a message was prepared.

## Do's and Don'ts

- Do preserve the approved spatial-flight direction and the separate legacy surface.
- Do keep photographs contained, credited and separate from machine airspace.
- Do keep whole-drone default, visible focus, pause and reduced-motion opt-in.
- Don't describe functional QA as an independent visual approval or hardware FPS guarantee.
- Don't claim factory CAD, modeled internals, photorealism or guaranteed device FPS.
- Don't invent portfolio proof, prices, extra cards/chips or a sent-request state.
