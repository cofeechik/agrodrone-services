---
name: "AGRODRON — spatial flight prototype"
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

# Design System: AGRODRON prototype

## Overview

### Current application integration: v08

The aircraft now loads `models/revocast-5/xag-p150-max-v08-configurable-web.glb` (2,941,404 bytes). This semantically separates old landing gear and pump/hoses while preserving v07 geometry, contact colors, normals and four rotor pivots. RevoCast is a separate 1,102,860-byte asset attached at raw glTF `[0,0.48375,-0.075]` before the combined aircraft is recentered. Spray/spread configurations replace their payloads and gear, never stack completed assemblies. Source models are preserved. See `models/revocast-5/MOUNTING.md` for the deliberately limited exterior mount check.

The focal addition is payload exchange in dedicated application airspace, with honest illustrative spray/granule effects. Map and navigation show a schematic field and scan pass; cargo keeps real manufacturer photography. The 3D layer uses pointer-transparent z-index 4 and scissor clipping to its active airspace. Application caption is 14px; supporting caption, status and field note are 12px with 1.5–1.6 line-height. Equipment airspace reserves a 16px inset for its field explanation. Mobile selector is a bounded horizontal scroller, not an intrinsically wide flex item.

Readiness distinguishes the renderer from the module: an unavailable renderer cannot be restored merely by a late module download. Equipment status is based on section visibility, not GPU-stage visibility. Offscreen/background/reduced preferences stop continuous motion; reduced motion keeps stable visual meaning. Rotating-blade transparency is included in the common material state to avoid per-frame material invalidation. Existing v07 evidence below is historical baseline evidence, not a claim that this new runtime has been independently hardware-benchmarked.

**Creative North Star: "Riotters spatial flight"**

Cold paper and large, light Cyrillic typography give the aircraft its own airspace. Slate controls and restrained red details keep the interface legible around the reconstructed XAG rather than competing with it.

This is the approved visual world for `prototype.html`. The separate legacy `index.html` keeps its existing terracotta system; these prototype tokens do not replace it.

AGRODRON is the confirmed name shown in the prototype title, header and footer; XAG P150 MAX remains the aircraft name.

**Key Characteristics:**

- Open aircraft stages, full photographs and flat ruled controls.
- Self-hosted Golos, slate ink and restrained red interaction states.
- Explicit limits on reconstruction, motion and message preparation.

Evidence: current v07 runtime and native 1440×484 fallback are integrated. `.impeccable/review/equipment-v07/results.json` passes all seven views at 1440×1000, 960×768 and 390×844: each has three feature rows; panel/type containment, bank recovery, reduced motion and no model in applications pass, with empty error lists. Selected runtime meshes are spray 8, tank 5, battery 5, navigation 2, with other meshes ghosted; glTF combines authored assemblies by material, so these are rendered-mesh counts. Two-size `equipment-v07/fallback-results.json` passes context-loss scrolling, hero/machine clipping and status in flow. Main reports validator 0 errors/0 warnings, four decoded rotor tests and 26 shipping rasters with embedded provenance/0 missing. These functional results do not establish real-device FPS. Final `.impeccable/review/equipment-v07/verdict.md` disposition is SHIP FOR WORKING PROTOTYPE ONLY, with no remaining material findings. Reviewer checked 18 equipment captures at all three sizes and compared frame routing with actual XAG photos; 37 fresh QA images include fallback evidence. Earlier approvals remain historical. `EQUIPMENT-SOURCES.md` records current v07 exterior semantics and PDF indexes 7/11/14/17, all visually checked by main, with official product sourcing. No factory-CAD or photorealism guarantee.

## Colors

Primary accent is warm XAG red for hover, keyboard focus and selection markers; primary action surfaces use slate ink. Neutral cold paper is the page ground; muted slate supports labels and notes; pale lines divide chapters and controls. The filled grey-blue flight heading, photographic backing and machine backing use their separate frontmatter colors. There is no outline brand word behind the aircraft.

**The State Accent Rule.** Use red to mark interaction and selection; keep broad UI surfaces cold and neutral.

## Typography

Golos is loaded locally from `assets/golos-variable.ttf`, variable weights 100–900 with swap and a sans-serif fallback. Display is the decorative flight phrase; offer is the actual h1; headline is the section h2. Titles, body and labels follow the frontmatter roles. Numbers in specifications use tabular figures.

Body paragraphs cap at 70ch; the service explanation at 39ch (45ch on mobile). Mobile uses a 50px flight phrase, 32px offer and 16px service copy. Contact h2 is a separate observed clamp(46px,5vw,76px), overridden to 52px on mobile. Headings balance lines rather than imposing extra tracking.

Machine values use the new frontmatter role with tabular figures and unbroken value/unit lines; mobile value size is 64px. Units are subordinate at .32em. Feature prose remains 16px on desktop and mobile with a 45ch cap. Three ruled feature rows use 13px labels and 22px values, increasing values to 24px on mobile.

## Layout

Sticky header is 76px, changing to 64px at 700px; gutter follows the frontmatter. Sections use its desktop/mobile vertical spacing. At 1000px the service gap tightens and the machine side column becomes 230px; at 700px navigation links disappear while brand and contact CTA remain.

Prototype composition: flight → interactive applications → machine inspection → contact. The sticky flight viewport sits inside a 195svh chapter (160svh mobile; 100svh under reduced motion). Hero scroll moves the aircraft right at constant target y, clipped below the decorative heading and above the offer (12px clearances). Machine entry comes from the left, clipped to its viewer; progress follows the machine section top/heading approach to the header: zero at 45% of viewport height and complete at header height, independent of viewer height. Reduced motion places it at the completed entry position. Applications now have their own two-column copy/3D area: a minimum 480px desktop scene, minimum 330px mobile, and separate explanatory caption. A collapsible supporting photograph remains fully contained and credited. Mobile orders selector, scene, explanation, reference.

The machine has a minmax(290px,25%) explanation column and minimum-height max(440px,58svh) viewer; below 1000px the side column is 230px. Grid rows are auto/auto with start alignment. The panel occupies row 2, aligns to start, has min-width 0, padding 4px 0 20px and overflow-wrap anywhere so content determines row height. Mobile uses three auto rows, minimum-height max(300px,43svh) viewer and full-width panel. Seven machine choices scroll horizontally; each has three ruled buyer-feature rows, followed by existing platform specifications. Contact becomes one column on mobile; paired fields retain two columns.

## Elevation & Depth

UI is flat: borders, tonal fields and whitespace supply hierarchy, with no CSS box-shadow vocabulary. The aircraft supplies perspective and material depth. The current loader requests `xag-p150-max-v07-web.glb` and its v07 manifest, uses a perspective camera (32°), studio reflections, warm key/cool fill, soft self-shadowing and ACES tone mapping.

Current v07 loads `xag-p150-max-v07-web.glb`: 2,928,616 bytes (native Blend 27,308,964 bytes), 104 nodes, 87 meshes and 283,712 triangles, with four decoded local-Y rotor pivots. Native fallback is `preview-v07-browser.png` (1440×484), with embedded provenance. Continuous tank tooling and external forks/recesses remain; HDPE, carbon, graphite and rubber retain distinct studio surface response. These are exterior photo reconstructions, not verified factory internals.

v07 routes each landing shoulder locally from (±.17, ±.18, .535) around the front/rear tank to knee (±.19, ±.33, .495), then foot (±.34, ±.40, -.00775); lower ties sit at z .103. `landing-clearance-v07.json` records 10 segments sampled at 101 points against evaluated tank BVH, minimum surface clearance 43.23mm; not certified engineering clearance. Spray tags atomizers/exterior hoses; navigation tags antennas/radar; battery includes the actual Chassis battery and related external housing. Export/runtime integration is complete; final scoped review approves this working-prototype delta.

## Shapes

Controls and fields are square; thin straight dividers organise sections. Service selection uses a small circular red marker; part selection uses a red underline. These are control states, not standalone chips or cards. Direction arrows are line geometry. Rounded modeled plastic belongs to the aircraft, not a new UI radius scale.

## Components

- **Primary button:** slate/paper, 48px minimum height, frontmatter padding, weight 500; hover turns red in 180ms. Header/action versions shrink on mobile. Keyboard focus uses a red 2px outline offset 5px.
- **Input/select:** transparent, 1px pale border, square, 52px minimum height, 16px text. Focus changes the border to ink and retains the visible red outline; caret is red. Required fields use native validation; no custom error-card or disabled visual system is implemented.
- **Navigation:** muted text links with 12px vertical padding and 30px gaps (18px below 1000px); hover turns ink and underlines. A skip link appears on focus. Mobile retains the contact CTA, with no invented menu drawer.
- **Service selector:** four real tasks, pressed state in ink plus red dot, red hover. Changes explanation, manufacturer image/credit and form service. Spray and spread exchange modeled payloads; outgoing assembly lowers and fades, incoming assembly rises into the mount. Rapid input replaces the target rather than queues animations. Cargo remains genuine manufacturer photography because RevoSling has not been reconstructed. The mapping scene is an explicitly illustrative field, route and scan pass, not survey output or a LiDAR claim.
- **Machine feature selector:** seven choices: platform, spray, tank, rotors, battery, navigation, spreading. Platform is default; each has a numeric headline, explanation and three sourced rows. Spray, tank, rotors, battery and navigation isolate genuine exterior groups with a restore toggle; unrelated meshes ghost. Spreading now shows the actual RevoCast exterior reconstruction and rotating disc, with a manufacturer-photo fallback on failure. Navigation adds the same illustrative field beneath the highlighted antennas/radar without zooming the field outside its viewer. Perspective framing continuously mixes projected whole/selected bounds with current focus and fits to 94% of allocated airspace. No modeled-internals claim.
- **Buyer features:** spray separates flow, droplet size and swath from tank capacity and single-battery limits. Other tabs retain qualified platform, rotor, energy, navigation and spreading rows. Values describe configurations and test conditions, not guaranteed field productivity; charging remains a laboratory 30–95% measure and material/environment qualifications remain visible.
- **v07 banking:** scroll samples horizontal travel velocity before drawing. pendingBank preserves a new impulse until its first actual rendered frame, then holds 80ms and exponentially decays with a 140ms time constant; attitude follows at 8/sec. Bank clamps to ±.28rad, adds pitch .25 × abs(bank), reverses with travel and returns level on stop. Recorded opposite bank samples are approximately -.278 and +.229rad; recovery and reduced motion pass at all three sizes. Reduced/offscreen restrictions remain.
- **Automatic motion:** four visible rotors run at demonstration speed 58 rad/s with a transparent swept footprint and slight float under normal preference. Stop toolbar and override are removed; system reduced motion automatically stops rotation/float and spatial travel, with no opt-in. Loading/error status is actual DOM inside the machine section after the specification strip, in static flow with 20px top margin, 12px muted type and line-height 1.6; it does not overlay the viewer. Hidden/offscreen views stop continuous rendering and spread photo hides the 3D stage. HTTP is required for modules.
- **Scroll/shadow behavior:** hero pose follows scroll without trailing easing; machine x/y track their viewport anchor plus the authored left entry. Section changes reset pose/focus; machine rotation/scale and within-section focus can smooth. Shadow auto-update stays off: rotation/scale/focus/part changes request new depth. Blades do not cast shadows; aircraft/key light translate together. Each visible frame updates light/target world matrices and `keyLight.shadow.updateMatrices(keyLight)` for current sampling of cached depth. WebGL retains the high-performance hint. The fallback clip helper mirrors the same hero/viewer airspace and updates clipping on context loss. After context loss, requestFrame still schedules the DOM-only render branch: desiredPose and positionFallback update placement/clipping on scroll, without GPU rendering or an automatic loop. The preceding v06 two-size side-flight/fallback QA and prototype-only SHIP verdict are historical; v07 integration and QA are complete, and final scoped review confirms SHIP FOR WORKING PROTOTYPE ONLY. Earlier shadow invariance checks are historical evidence for the retained matrix mechanism, not a new FPS measurement.
- **Request form:** prepares a WhatsApp message for the named recipient, with a retry link and local status. Area/crop are required for spray/spread; service/location always required. Whitespace-only text is rejected; editing clears stale message links. Never show “sent” merely because a message was prepared.

## Do's and Don'ts

- Do preserve the approved spatial-flight direction and the separate legacy surface.
- Do keep photographs contained, credited and separate from machine airspace.
- Do keep platform default, visible focus and automatic system reduced motion without override.
- Don't describe functional QA as an independent visual approval or hardware FPS guarantee.
- Don't claim factory CAD, modeled internals, photorealism or guaranteed device FPS.
- Don't invent portfolio proof, prices, extra cards/chips or a sent-request state.
