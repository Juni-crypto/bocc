# Product

## Register

product

(BOCC ships two surfaces audited to the same bar: a marketing **landing** in the
`brand` register, and the **app** itself in the `product` register. The bare value
above is the default; pick the register per surface when running a command.)

## Users

Two roles at real-world events (weddings, parties, sports, trips, concerts):

- **Hosts** create an event from web or phone, set the rules (per-guest caps,
  geofence, privacy, AI features), and watch it fill up live.
- **Guests** scan a QR, join in one tap with consent, shoot the night from their own
  point of view, browse the pooled gallery, and pull the shots they are in.

Context of use: on a phone, in the moment, often in low light at a venue, sometimes on
flaky connectivity. Speed and zero friction matter more than configurability for guests.

## Product Purpose

Everyone at an event captures a sliver of the night from their own seat. BOCC pools
every guest's point of view into one shared gallery, so the host and guests relive the
whole event from every angle, not just their own. AI (self-hosted Immich engine) adds
face matching, semantic search, OCR, and auto-highlights on top. Success = a guest leaves
with the full night, not 40 photos from one chair, and a host runs the event instead of
chasing uploads.

## Brand Personality

Cinematic, energetic, in-the-moment. Voice is direct and warm, never corporate or
buzzwordy. Three words: **live, communal, cinematic**. The interface should feel like a
film crew working a live event: a blinking REC dot, viewfinder brackets, a pooled roll
that updates as the night runs. Emotional goal: the thrill of seeing a moment you missed
because you were busy living it.

## Anti-references

- Generic SaaS-cream / warm-paper landing pages. No beige, no parchment.
- AI-purple / blue glow gradients and gradient text.
- Google Photos' utilitarian library chrome. BOCC is event-scoped and expressive, not a
  filing cabinet.
- Face recognition as the headline. Face match is one feature; the pooled POV gallery is
  the product. Do not lead with "find your face".

## Design Principles

- **POV is the pitch.** Every surface reinforces "the whole night, from every point of
  view". Features serve that story; they do not replace it.
- **Guest friction is the enemy.** Join, shoot, and find-me must work in one tap with no
  account. Defend that ruthlessly.
- **Consent in the open.** Biometric consent is part of the join flow, visible, never
  buried. Trust is a feature.
- **Live, not static.** The product is happening now. Motion and the REC state mean
  "recording", not decoration.
- **Own the stack.** Self-hosted engine, your storage. Say so plainly; it is a real
  differentiator, not marketing.

## Accessibility & Inclusion

Target **WCAG 2.1 AA**. Body text >= 4.5:1 against its background (watch white/opacity
text on the near-black surface), large text >= 3:1, visible focus states on every
interactive element, all motion gated behind `prefers-reduced-motion`, touch targets
>= 44x44px on mobile (critical: guests are one-handed in low light). Dark theme is the
single locked theme.
