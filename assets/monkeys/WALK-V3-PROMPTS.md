# 원숭이 보행 v3 수정 프롬프트

내장 image_gen으로 전체 몸 자세를 다시 그렸습니다. 뒷발이 고정된 기존 카푸친 시트의 일괄 수정 결과는 채택하지 않았으며, 카푸친은 여덟 개의 개별 전체 몸 자세를 제작했습니다. 다리 분리·런타임 변형은 사용하지 않습니다.

## loris

Use case: precise-object-edit. Production WALK sprite animation correction, not a concept picture.
Input image 1 is the existing character identity/color/style reference ONLY. Its walk is WRONG because a hind foot stays frozen. Do NOT copy the limb poses from it.
Input image 2 is an eight-frame gait timing/foot-position guide ONLY, not a style reference. Create EIGHT finished whole-body painted sprites following its different leg positions. Preserve character slow loris, big round dark eye masks, cream stripe, round tawny grey body, almost invisible tail exactly: same cute head, same fur, same torso length, limb lengths and tail proportions. Side profile facing RIGHT.
Output exactly 4 columns x 2 rows, chronological order left to right top row then bottom row. Genuine transparent background with very generous gutters and no cropping. No text, lines, diagrams or colored limb markers in output. Every cell contains one complete monkey, same scale and centerline. Crisp cute shaded pixel art.
CRITICAL CORRECTION: BOTH hind legs must visibly move through ground contact, push off, airborne swing, forward reach and new contact. It must NOT be the same bent rear leg in all eight frames. Four individually readable limbs, far legs shaded darker. Three limbs support body while the fourth swings. All feet move backward under the body during stance, swing forward in a low arc. No limping, dragging, bipedal motion, pogo bouncing, body stretching, sitting, or human marching. Body/head stay almost level with only tiny weight shift. No foot glued in one x position for the entire cycle.
Use NH=near hind, FH=far hind, NF=near fore, FF=far fore. The GUIDE encodes this sequence:
Frame1: NH clearly lifted above the ground, knee folded under belly, other three limbs planted at DIFFERENT longitudinal positions.
Frame2: NH reaches forward and lowers, toes just above ground, not a repeated frame1. Other planted feet slide slightly backward relative to torso.
Frame3: NH planted FORWARD under hip. FF lifted with elbow bent, other feet planted.
Frame4: FF reaches forward and lowers. NH has moved backward a little under body during its stance.
Frame5: FF planted forward. FH now lifted with folded knee and visible GAP below far hind toes. NH continues its ground stance farther backward.
Frame6: FH reaches FORWARD and lowers, with unmistakably different hind-leg silhouette from frame2. Far and near hind legs must not merge.
Frame7: FH planted forward. NF lifted with bent elbow, visibly off ground. NH now near the rear end of its stance.
Frame8: NF reaches forward and lowers. NH pushes off behind, about to repeat frame1. Frame8-to-frame1 must be a small continuous movement with matching head/tail.
Make the same four-limb cycle deliberate and careful with body low, curled gripping fingers and no jump; no visible long tail.
Illustrate ENTIRE monkey in every frame. Never output separate limb pieces. The guide is only a drawing reference; final sprites will be swapped as complete images. All other animal artwork and all non-WALK actions are outside this request.

## tamarin

Use case: precise-object-edit. Production WALK sprite animation correction, not a concept picture.
Input image 1 is the existing character identity/color/style reference ONLY. Its walk is WRONG because a hind foot stays frozen. Do NOT copy the limb poses from it.
Input image 2 is an eight-frame gait timing/foot-position guide ONLY, not a style reference. Create EIGHT finished whole-body painted sprites following its different leg positions. Preserve character cotton-top tamarin, fluffy bright white crest, grey little face, russet back, white chest and legs, long thin tail exactly: same cute head, same fur, same torso length, limb lengths and tail proportions. Side profile facing RIGHT.
Output exactly 4 columns x 2 rows, chronological order left to right top row then bottom row. Genuine transparent background with very generous gutters and no cropping. No text, lines, diagrams or colored limb markers in output. Every cell contains one complete monkey, same scale and centerline. Crisp cute shaded pixel art.
CRITICAL CORRECTION: BOTH hind legs must visibly move through ground contact, push off, airborne swing, forward reach and new contact. It must NOT be the same bent rear leg in all eight frames. Four individually readable limbs, far legs shaded darker. Three limbs support body while the fourth swings. All feet move backward under the body during stance, swing forward in a low arc. No limping, dragging, bipedal motion, pogo bouncing, body stretching, sitting, or human marching. Body/head stay almost level with only tiny weight shift. No foot glued in one x position for the entire cycle.
Use NH=near hind, FH=far hind, NF=near fore, FF=far fore. The GUIDE encodes this sequence:
Frame1: NH clearly lifted above the ground, knee folded under belly, other three limbs planted at DIFFERENT longitudinal positions.
Frame2: NH reaches forward and lowers, toes just above ground, not a repeated frame1. Other planted feet slide slightly backward relative to torso.
Frame3: NH planted FORWARD under hip. FF lifted with elbow bent, other feet planted.
Frame4: FF reaches forward and lowers. NH has moved backward a little under body during its stance.
Frame5: FF planted forward. FH now lifted with folded knee and visible GAP below far hind toes. NH continues its ground stance farther backward.
Frame6: FH reaches FORWARD and lowers, with unmistakably different hind-leg silhouette from frame2. Far and near hind legs must not merge.
Frame7: FH planted forward. NF lifted with bent elbow, visibly off ground. NH now near the rear end of its stance.
Frame8: NF reaches forward and lowers. NH pushes off behind, about to repeat frame1. Frame8-to-frame1 must be a small continuous movement with matching head/tail.
Natural compact primate four-limb walk, low elbows/knees, short smooth steps.
Illustrate ENTIRE monkey in every frame. Never output separate limb pieces. The guide is only a drawing reference; final sprites will be swapped as complete images. All other animal artwork and all non-WALK actions are outside this request.

## macaque

Use case: precise-object-edit. Production WALK sprite animation correction, not a concept picture.
Input image 1 is the existing character identity/color/style reference ONLY. Its walk is WRONG because a hind foot stays frozen. Do NOT copy the limb poses from it.
Input image 2 is an eight-frame gait timing/foot-position guide ONLY, not a style reference. Create EIGHT finished whole-body painted sprites following its different leg positions. Preserve character BABY pig-tailed macaque, very cute big peach ears and face, brown baby fur, SHORT curled tail exactly: same cute head, same fur, same torso length, limb lengths and tail proportions. Side profile facing RIGHT.
Output exactly 4 columns x 2 rows, chronological order left to right top row then bottom row. Genuine transparent background with very generous gutters and no cropping. No text, lines, diagrams or colored limb markers in output. Every cell contains one complete monkey, same scale and centerline. Crisp cute shaded pixel art.
CRITICAL CORRECTION: BOTH hind legs must visibly move through ground contact, push off, airborne swing, forward reach and new contact. It must NOT be the same bent rear leg in all eight frames. Four individually readable limbs, far legs shaded darker. Three limbs support body while the fourth swings. All feet move backward under the body during stance, swing forward in a low arc. No limping, dragging, bipedal motion, pogo bouncing, body stretching, sitting, or human marching. Body/head stay almost level with only tiny weight shift. No foot glued in one x position for the entire cycle.
Use NH=near hind, FH=far hind, NF=near fore, FF=far fore. The GUIDE encodes this sequence:
Frame1: NH clearly lifted above the ground, knee folded under belly, other three limbs planted at DIFFERENT longitudinal positions.
Frame2: NH reaches forward and lowers, toes just above ground, not a repeated frame1. Other planted feet slide slightly backward relative to torso.
Frame3: NH planted FORWARD under hip. FF lifted with elbow bent, other feet planted.
Frame4: FF reaches forward and lowers. NH has moved backward a little under body during its stance.
Frame5: FF planted forward. FH now lifted with folded knee and visible GAP below far hind toes. NH continues its ground stance farther backward.
Frame6: FH reaches FORWARD and lowers, with unmistakably different hind-leg silhouette from frame2. Far and near hind legs must not merge.
Frame7: FH planted forward. NF lifted with bent elbow, visibly off ground. NH now near the rear end of its stance.
Frame8: NF reaches forward and lowers. NH pushes off behind, about to repeat frame1. Frame8-to-frame1 must be a small continuous movement with matching head/tail.
Natural compact primate four-limb walk, low elbows/knees, short smooth steps.
Illustrate ENTIRE monkey in every frame. Never output separate limb pieces. The guide is only a drawing reference; final sprites will be swapped as complete images. All other animal artwork and all non-WALK actions are outside this request.

## langur

Use case: precise-object-edit. Production WALK sprite animation correction, not a concept picture.
Input image 1 is the existing character identity/color/style reference ONLY. Its walk is WRONG because a hind foot stays frozen. Do NOT copy the limb poses from it.
Input image 2 is an eight-frame gait timing/foot-position guide ONLY, not a style reference. Create EIGHT finished whole-body painted sprites following its different leg positions. Preserve character dusky leaf langur, charcoal grey coat, white spectacles and mouth, long thin tail, small upright head tuft exactly: same cute head, same fur, same torso length, limb lengths and tail proportions. Side profile facing RIGHT.
Output exactly 4 columns x 2 rows, chronological order left to right top row then bottom row. Genuine transparent background with very generous gutters and no cropping. No text, lines, diagrams or colored limb markers in output. Every cell contains one complete monkey, same scale and centerline. Crisp cute shaded pixel art.
CRITICAL CORRECTION: BOTH hind legs must visibly move through ground contact, push off, airborne swing, forward reach and new contact. It must NOT be the same bent rear leg in all eight frames. Four individually readable limbs, far legs shaded darker. Three limbs support body while the fourth swings. All feet move backward under the body during stance, swing forward in a low arc. No limping, dragging, bipedal motion, pogo bouncing, body stretching, sitting, or human marching. Body/head stay almost level with only tiny weight shift. No foot glued in one x position for the entire cycle.
Use NH=near hind, FH=far hind, NF=near fore, FF=far fore. The GUIDE encodes this sequence:
Frame1: NH clearly lifted above the ground, knee folded under belly, other three limbs planted at DIFFERENT longitudinal positions.
Frame2: NH reaches forward and lowers, toes just above ground, not a repeated frame1. Other planted feet slide slightly backward relative to torso.
Frame3: NH planted FORWARD under hip. FF lifted with elbow bent, other feet planted.
Frame4: FF reaches forward and lowers. NH has moved backward a little under body during its stance.
Frame5: FF planted forward. FH now lifted with folded knee and visible GAP below far hind toes. NH continues its ground stance farther backward.
Frame6: FH reaches FORWARD and lowers, with unmistakably different hind-leg silhouette from frame2. Far and near hind legs must not merge.
Frame7: FH planted forward. NF lifted with bent elbow, visibly off ground. NH now near the rear end of its stance.
Frame8: NF reaches forward and lowers. NH pushes off behind, about to repeat frame1. Frame8-to-frame1 must be a small continuous movement with matching head/tail.
Natural compact primate four-limb walk, low elbows/knees, short smooth steps.
Illustrate ENTIRE monkey in every frame. Never output separate limb pieces. The guide is only a drawing reference; final sprites will be swapped as complete images. All other animal artwork and all non-WALK actions are outside this request.

## capuchin frame 1

Use case: precise-object-edit. Produce ONE single full-body pixel-art sprite, not a sheet, of the SAME white-fronted capuchin character from image1. Image1 is identity/style only; image2 is the required body/foot POSE. Preserve cream face, head size, honey brown fur, long curled tail and cute compact torso. Facing RIGHT in a natural low four-limb walk, not sitting.
Lift the NEAR hind foot (the leg on the viewer side, light brown and fully visible). Fold its knee FORWARD under the belly, with the whole near hind foot clearly suspended above the floor at belly height. The FAR hind foot (darker, partly behind torso) is planted and visible. Both front hands are planted at differing x positions. There must be a large visible transparent GAP under the NEAR hind toes. Do NOT leave the near hind foot on the floor.
Follow image2 joint and foot positions. Translate guide's ORANGE hind limb to the near visible brown fur leg, BROWN hind limb to far darker leg. BLUE front limbs are just pose cues; final all legs have the character's actual fur colors. Exactly four limbs, connected anatomically, no extra paws. Keep all planted hands/feet on a single invisible floor and the lifted foot visibly higher. Keep entire torso, head, tail, toes inside canvas with generous empty margin. No ground, shadow, branch, guide lines, text, arrows, numbers, colored markers or background. True transparency. Whole painted animal, never separated parts.

## capuchin frame 2

Use case: precise-object-edit. ONE full-body sprite for frame 2 of an eight-frame four-limbed capuchin walking cycle. Image1 and image2 are identity/body/style references of the SAME cute monkey. Image3 is this frame's foot-position guide. Redraw the WHOLE animal in exactly the image3 pose while keeping the head, cream face, fur palette, torso length, tail proportions and limb lengths from image1. Right-facing side profile, head/body nearly level, compact chibi monkey, no sitting.
THIS FRAME'S REQUIRED POSE: NEAR hind foot is reaching FORWARD, toes just above floor, lowering toward a forward placement. Its knee is less folded than image1. Far hind and BOTH front hands planted.
Show exactly four anatomically connected limbs, near ones lighter and far ones darker. Every planted foot touches the same invisible ground, with a visible transparent gap below the lifted hand/foot. All four feet are at distinct fore-aft positions; no limb stays permanently stuck. Do not repeat image1's leg placement when the guide differs. Never lift the wrong near/far limb. No human walk, two-leg pose, jumping, dragging toes or missing leg.
Match the SAME framing, perspective, head size, torso length and limb thickness as image1. Entire tail, toes and ears fit on canvas with generous margins. Crisp shaded pixel art matching image1. No labels, colored guide marks, ground, shadows, props or opaque backdrop. True transparency. One complete painted whole-body animal only.

## capuchin frame 3

Use case: precise-object-edit. ONE full-body sprite for frame 3 of an eight-frame four-limbed capuchin walking cycle. Image1 and image2 are identity/body/style references of the SAME cute monkey. Image3 is this frame's foot-position guide. Redraw the WHOLE animal in exactly the image3 pose while keeping the head, cream face, fur palette, torso length, tail proportions and limb lengths from image1. Right-facing side profile, head/body nearly level, compact chibi monkey, no sitting.
THIS FRAME'S REQUIRED POSE: NEAR hind foot planted FORWARD under belly. FAR front hand (darker, behind near forearm) is lifted, elbow bent, whole hand clearly above floor. Near front hand and far hind foot planted.
Show exactly four anatomically connected limbs, near ones lighter and far ones darker. Every planted foot touches the same invisible ground, with a visible transparent gap below the lifted hand/foot. All four feet are at distinct fore-aft positions; no limb stays permanently stuck. Do not repeat image1's leg placement when the guide differs. Never lift the wrong near/far limb. No human walk, two-leg pose, jumping, dragging toes or missing leg.
Match the SAME framing, perspective, head size, torso length and limb thickness as image1. Entire tail, toes and ears fit on canvas with generous margins. Crisp shaded pixel art matching image1. No labels, colored guide marks, ground, shadows, props or opaque backdrop. True transparency. One complete painted whole-body animal only.

## capuchin frame 4

Use case: precise-object-edit. ONE full-body sprite for frame 4 of an eight-frame four-limbed capuchin walking cycle. Image1 and image2 are identity/body/style references of the SAME cute monkey. Image3 is this frame's foot-position guide. Redraw the WHOLE animal in exactly the image3 pose while keeping the head, cream face, fur palette, torso length, tail proportions and limb lengths from image1. Right-facing side profile, head/body nearly level, compact chibi monkey, no sitting.
THIS FRAME'S REQUIRED POSE: FAR front hand reaches FORWARD just above the floor and is about to touch down; near front hand is farther back in stance. Both hind feet planted, at different x positions.
Show exactly four anatomically connected limbs, near ones lighter and far ones darker. Every planted foot touches the same invisible ground, with a visible transparent gap below the lifted hand/foot. All four feet are at distinct fore-aft positions; no limb stays permanently stuck. Do not repeat image1's leg placement when the guide differs. Never lift the wrong near/far limb. No human walk, two-leg pose, jumping, dragging toes or missing leg.
Match the SAME framing, perspective, head size, torso length and limb thickness as image1. Entire tail, toes and ears fit on canvas with generous margins. Crisp shaded pixel art matching image1. No labels, colored guide marks, ground, shadows, props or opaque backdrop. True transparency. One complete painted whole-body animal only.

## capuchin frame 5

Use case: precise-object-edit. Produce ONE single full-body pixel-art sprite, not a sheet, of the SAME white-fronted capuchin character from image1. Image1 is identity/style only; image2 is the required body/foot POSE. Preserve cream face, head size, honey brown fur, long curled tail and cute compact torso. Facing RIGHT in a natural low four-limb walk, not sitting.
Lift the FAR hind foot (darker leg behind torso). Fold its knee FORWARD and clearly lift its toes; the NEAR hind foot (light brown, fully visible) is planted to support weight. Both front hands planted at differing positions. There must be visible transparent GAP under the FAR hind foot, and near hind foot on floor.
Follow image2 joint and foot positions. Translate guide's ORANGE hind limb to the near visible brown fur leg, BROWN hind limb to far darker leg. BLUE front limbs are just pose cues; final all legs have the character's actual fur colors. Exactly four limbs, connected anatomically, no extra paws. Keep all planted hands/feet on a single invisible floor and the lifted foot visibly higher. Keep entire torso, head, tail, toes inside canvas with generous empty margin. No ground, shadow, branch, guide lines, text, arrows, numbers, colored markers or background. True transparency. Whole painted animal, never separated parts.

## capuchin frame 6

Use case: precise-object-edit. ONE full-body sprite for frame 6 of an eight-frame four-limbed capuchin walking cycle. Image1 and image2 are identity/body/style references of the SAME cute monkey. Image3 is this frame's foot-position guide. Redraw the WHOLE animal in exactly the image3 pose while keeping the head, cream face, fur palette, torso length, tail proportions and limb lengths from image1. Right-facing side profile, head/body nearly level, compact chibi monkey, no sitting.
THIS FRAME'S REQUIRED POSE: FAR hind foot reaches FORWARD under belly just above floor, clearly in front of its previous rearward position. NEAR hind foot is planted farther back. BOTH front hands planted.
Show exactly four anatomically connected limbs, near ones lighter and far ones darker. Every planted foot touches the same invisible ground, with a visible transparent gap below the lifted hand/foot. All four feet are at distinct fore-aft positions; no limb stays permanently stuck. Do not repeat image1's leg placement when the guide differs. Never lift the wrong near/far limb. No human walk, two-leg pose, jumping, dragging toes or missing leg.
Match the SAME framing, perspective, head size, torso length and limb thickness as image1. Entire tail, toes and ears fit on canvas with generous margins. Crisp shaded pixel art matching image1. No labels, colored guide marks, ground, shadows, props or opaque backdrop. True transparency. One complete painted whole-body animal only.

## capuchin frame 7

Use case: precise-object-edit. ONE full-body sprite for frame 7 of an eight-frame four-limbed capuchin walking cycle. Image1 and image2 are identity/body/style references of the SAME cute monkey. Image3 is this frame's foot-position guide. Redraw the WHOLE animal in exactly the image3 pose while keeping the head, cream face, fur palette, torso length, tail proportions and limb lengths from image1. Right-facing side profile, head/body nearly level, compact chibi monkey, no sitting.
THIS FRAME'S REQUIRED POSE: FAR hind foot planted forward. NEAR front hand (in front of body, lighter brown fur) is visibly lifted, elbow bent with hand suspended under neck. Far front hand and near hind foot planted.
Show exactly four anatomically connected limbs, near ones lighter and far ones darker. Every planted foot touches the same invisible ground, with a visible transparent gap below the lifted hand/foot. All four feet are at distinct fore-aft positions; no limb stays permanently stuck. Do not repeat image1's leg placement when the guide differs. Never lift the wrong near/far limb. No human walk, two-leg pose, jumping, dragging toes or missing leg.
Match the SAME framing, perspective, head size, torso length and limb thickness as image1. Entire tail, toes and ears fit on canvas with generous margins. Crisp shaded pixel art matching image1. No labels, colored guide marks, ground, shadows, props or opaque backdrop. True transparency. One complete painted whole-body animal only.

## capuchin frame 8

Use case: precise-object-edit. ONE full-body sprite for frame 8 of an eight-frame four-limbed capuchin walking cycle. Image1 and image2 are identity/body/style references of the SAME cute monkey. Image3 is this frame's foot-position guide. Redraw the WHOLE animal in exactly the image3 pose while keeping the head, cream face, fur palette, torso length, tail proportions and limb lengths from image1. Right-facing side profile, head/body nearly level, compact chibi monkey, no sitting.
THIS FRAME'S REQUIRED POSE: NEAR front hand is reaching FORWARD just above the floor, about to land. NEAR hind foot is now far back in its ground stance, heel lifting to push off and begin the next near-hind swing. Far hind and far front are planted.
Show exactly four anatomically connected limbs, near ones lighter and far ones darker. Every planted foot touches the same invisible ground, with a visible transparent gap below the lifted hand/foot. All four feet are at distinct fore-aft positions; no limb stays permanently stuck. Do not repeat image1's leg placement when the guide differs. Never lift the wrong near/far limb. No human walk, two-leg pose, jumping, dragging toes or missing leg.
Match the SAME framing, perspective, head size, torso length and limb thickness as image1. Entire tail, toes and ears fit on canvas with generous margins. Crisp shaded pixel art matching image1. No labels, colored guide marks, ground, shadows, props or opaque backdrop. True transparency. One complete painted whole-body animal only.
