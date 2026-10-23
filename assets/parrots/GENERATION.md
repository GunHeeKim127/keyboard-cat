# New parrot artwork provenance

Created with the built-in imagegen tool on 2026-10-22. No cat/dog sheet was used as an edit target. No third-party photo was downloaded or embedded.

Each transparent sheet contains forty complete bird poses in four columns and ten rows: IDLE 4, WALK 8, CHIRP 4, CLIMB 4, FLY 4, DISPLAY 4, SLEEP 4, CARRY 4, LAND 4. Whole silhouettes are extracted and packed into isolated 100×110 textures. Descending reuses CLIMB in reverse. No separate limb construction or body deformation is used.

Common generation direction: cute soft painterly chibi bird, big glossy eyes, rounded fluffy body, hooked beak, exactly two feet; connected whole bird in every pose; consistent head/body mass and colours; right-facing; clear transparent gutters; no text, icons, particles, hand, perch or branch; no cropped crest, wings, feet or tail. Walking uses eight alternating two-foot steps; climbing uses beak and feet on an invisible twig; flight uses four wing phases; sleep tucks head; carry balances on an invisible finger; landing folds wings and touches down.

Species direction:

- cockatoo: sulphur-crested, white body, yellow crest, charcoal beak, grey feet, no orange cheeks; display fans the crest with a head bob and modest open wings.
- macaw: blue-and-gold Ara ararauna, cobalt wings/back/tail, golden chest, green forehead, black beak/throat, white facial patch with fine dark lines; display fans blue wings and golden undersides with a bow.
- cockatiel: natural grey, yellow face, orange cheeks, slender crest, white wing panels, pointed tail; display raises crest and opens wings in a friendly stylised greeting.
- parrotlet: Pacific natural green male, tiny rounded body, short tail, ivory beak, blue behind eyes and on wings/rump; display stretches wings to show blue patches.
- lovebird: rosy/peach-faced green bird, pink face and orange-red forehead, ivory beak, blue rump, short tail, dark eyes without exaggerated white rings, no crest; display preens and bows.

Original generated files were copied, not moved, from the tool's generated-images directory. Final source files are the five `*-sheet.png` files in this folder. Runtime assets can be reproduced with `node scripts/parrot-sprites.cjs`.


## Sleep-only corrections, 1.3.20

The three `*-sleep-v2-sheet.png` files were edited with built-in imagegen from 2x2 contact sheets of the original full-resolution sleep silhouettes. Only macaw indices 2/3, parrotlet index 2, and lovebird index 3 are consumed. Good original poses remain byte-identical at runtime. Prompts required closed eyes, the same sleeping side orientation and colours, two visible feet, left-pointing tails, consistent rounded body and transparent gutters. The macaw prompt corrected flipped tails; parrotlet corrected a front-on ball with missing feet; lovebird corrected the raised awake-looking head. The original 40-pose sheets are untouched. Corrected whole poses are scaled to the existing good sleep pose height and baseline; speed and animation code are unchanged.

## Walk-only corrections, 1.3.21

Five `*-walk-v2-sheet.png` sources were edited with built-in imagegen on 2026-10-23. Only WALK consumes them. Original forty-pose sources and sleep overrides are untouched. Fifteen sheet candidates were generated across three review rounds; long stretched strides in early candidates were rejected. Final source files contain eight complete bird paintings, not assembled limb parts.

Final prompt set: preserve the original species identity, feather palette, cute proportions and illustration style; 4 columns by 2 rows, facing right, transparent gutters; short two-legged ground walk with alternating contact/closing/passing/opening poses, feet passing beneath the belly and a low curled-toe swing; small toes/short tarsi, stable body/head/tail, no high knees, giant feet, hopping, floating, wingflapping, shadows or text. Cockatoo used its original idle pose as identity reference. Other four used their own idle pose plus the corrected cockatoo sheet for gait only, explicitly excluding cockatoo appearance.

Complete alpha silhouettes are packed at a single common scale per species, capped by both previous WALK width and height. Feet align to the existing floor. Full source sheets remain available in this folder.
