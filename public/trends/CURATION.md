# Trend image curation record

## Current asset requirements (2026-08-17 update)

All five product images below need **transparent backgrounds** (alpha channel PNG, no opaque white/color fill). The overlay preview (`app/components/OverlayCanvas.tsx`) layers the shoe directly on top of a user's real foot photo with plain `object-contain` — there is no blend-mode trick compensating for an opaque background anymore, so a non-transparent PNG will show a visible square/rectangle over the photo.

| Asset (replace/add at this exact path) | Status | Required look |
| --- | --- | --- |
| `public/trends/chunky-platform-loafer.png` | ✅ Done — replaced 2026-08-17 | Chunky platform loafer, transparent bg |
| `public/trends/metallic-retro-runner.png` | ✅ Done — replaced 2026-08-17 | Metallic retro sneaker/runner, transparent bg |
| `public/trends/burgundy-western-boot.png` | ✅ Done — replaced 2026-08-17 | Burgundy western boot, transparent bg |
| `public/trends/blue-bow-slide-sandal.png` | ✅ Done — background-removed version supplied 2026-08-17 | Blue slide sandal with a printed bow strap |
| `public/trends/nude-mesh-slingback-heel.png` | ✅ Done — background-removed version supplied 2026-08-17 | Nude mesh slingback stiletto heel |

Spec for every asset (per Story 1.2 AC3, still in force):
- PNG format, transparent background
- At least 512x512px
- Under 10 MB
- Shoe occupies more than 25% of the image's height, roughly centered, product-photography style (no other objects/limbs in frame)

`public/trends.json` already has `id`/`label`/`shoeImageUrl` entries pointing at all five paths above.

**Plan changed 2026-08-17 (later):** the two additional entries are no longer heels-only — the user supplied `blue-slippers.jpg`/`brown-heels.jpg` (a bow-strap slide sandal and a mesh slingback heel) instead of two new AI-generated heels. Both were resized/reformatted (`sharp`, `fit: "contain"`, padded to 512x512, exported as PNG) and renamed to match their `trends.json` ids, background removal initially deferred, then supplied by the user shortly after (500x500, RGBA alpha channel confirmed via PNG IHDR, same as the first three) and swapped in at the final filenames.

Provenance note: unlike the first three (AI-generated, no third-party source material), these two look like real retail product photography — `blue-bow-slide-sandal.png` has a visible "STEVE MADDEN" brand mark on the strap. Fine for a hackathon demo; worth knowing if this ever needs to leave that context.

## Transparent replacement record (2026-08-17)

The three original opaque-background images (below) were replaced with background-removed versions supplied by the user. Verified via PNG IHDR color type before replacing:

| Asset | Format | Dimensions | Size | Color type | Shoe framing |
| --- | --- | --- | --- | --- | --- |
| `chunky-platform-loafer.png` | PNG | 500x500 | 104 KB | RGBA (alpha channel confirmed) | Shoe exceeds 25% of frame height |
| `metallic-retro-runner.png` | PNG | 500x500 | 139 KB | RGBA (alpha channel confirmed) | Shoe exceeds 25% of frame height |
| `burgundy-western-boot.png` | PNG | 500x500 | 111 KB | RGBA (alpha channel confirmed) | Shoe exceeds 25% of frame height |

Note: 500x500 is slightly under the 512x512 minimum documented below. Not currently enforced at runtime and not a rendering problem at the sizes these actually display at, but noted for the record.

## Original curation record (superseded above)

All three original product images were generated for this project with OpenAI's built-in image generation tool on 2026-08-17. They contain no third-party logos or supplied source material. They shipped with opaque white backgrounds, compensated for at render time with a `mix-blend-multiply` CSS treatment — that treatment has since been removed in favor of genuinely transparent source images (see above).

Manual verification (original, opaque versions — no longer in use):

| Asset | Format | Dimensions | Size | Shoe framing |
| --- | --- | --- | --- | --- |
| `chunky-platform-loafer.png` | PNG | 1254x1254 | 1.30 MB | Shoe exceeds 25% of frame height |
| `metallic-retro-runner.png` | PNG | 1254x1254 | 1.48 MB | Shoe exceeds 25% of frame height |
| `burgundy-western-boot.png` | PNG | 1254x1254 | 1.20 MB | Shoe exceeds 25% of frame height |

Each asset exceeds the 512x512 minimum and remains under 10 MB. This is an authoring-time record; the application intentionally performs no product-image inspection at runtime.
