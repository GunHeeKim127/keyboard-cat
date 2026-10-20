# Dog sprite art

Generated with the built-in imagegen tool, transparent-background mode, on 2026-10-20. No external sprite packs were downloaded. Original cat sprites were preserved.

Sources: chihuahua-sheet.png, jindo-sheet.png, retriever-sheet.png, shiba-sheet.png, husky-sheet.png. Each sheet is 1024×1536, with 24 poses in a 4×6 grid. scripts/dog-sprites.cjs slices and packs these poses into flat public/sprites/dog-<breed>-<action>-atlas.png files.

## Common prompt

Use case: illustration-story. Asset: production pixel-art desktop pet sprite sheet, transparent PNG. Canvas portrait 1024x1536, EXACT regular grid 4 columns by 6 rows, 24 equal 256x256 cells. No grid lines, no text, no labels, no floor, no shadows, no decorative objects outside sprites. One consistent adorable small full-body dog per cell, chunky crisp pixel-art with dark warm outlines, tiny dot eyes and charming expressive face, right-facing side/three-quarter view except climbing poses. Same dog scale and identity in every cell, occupy central 70% of each cell, centered x=128, paws baseline y=224 for standing poses; keep generous transparent margins, never cross cell edges. Actual alpha transparency, no checkerboard. ROW 1: four subtle idle animation frames, tail and ears shift, gentle breathing. ROW 2: four sequential walk cycle frames with alternating leg positions. ROW 3: upward jump tuck, upward jump stretch, falling paws down, squat landing. ROW 4: two sequential fast running dash frames, two playful pounce/play-bow paw-swipe frames (cute, no violence). ROW 5: two curled sleeping breathing frames with closed eyes, two gentle lifted-by-human carried poses with dangling paws (no human drawn). ROW 6: four sequential back/side climbing frames holding the same small brown wooden ladder, alternating paws; ladder stays fixed and fully inside cell. No accessories, no collar, no lettering. Render ONLY the precisely aligned sprite sheet.

## Breed additions

- Chihuahua: honey tan and cream short fur, oversized upright butterfly ears, apple-shaped head, tiny compact body, dark eyes; lively quick steps and bouncing ears.
- Korean Jindo: ivory white fur, alert triangular upright ears, pointed muzzle, lean legs and curled fluffy tail; proud attentive posture, nimble walk and athletic dash.
- Golden Retriever: buttery golden fur, floppy ears, smiling broad muzzle, feathered wagging tail; bouncy floppy-ear walk, joyful play bow and paw offer.
- Shiba Inu: orange-red coat with cream urajiro cheeks/chest/belly, triangular ears and tightly curled tail; cheeky prance, tail wiggle and playful paw swipe.
- Siberian Husky: charcoal-gray and white coat, symmetrical face mask, blue eyes, upright ears and fluffy tail; energetic stride, powerful dash and playful pounce.

All prompts require the same individual dog across its sheet, actual alpha transparency, no text, no backdrop, no collars and no aggressive violence. Breed traits are playful visual interpretations, not statements about every individual dog's behavior.
