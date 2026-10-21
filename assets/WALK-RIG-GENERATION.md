# v1.3.10 보행 레이어 제작

## v1.3.12 애니메이션 수정

아래에 기록된 기존 이미지 레이어를 그대로 사용합니다. 새 16프레임 전체 이미지 생성 시안은 디딤 순서가 일정하지 않아 채택하지 않았습니다. 최종 자산은 `public/sprites/{cat,dog}-<breed>-WALK-frame-0.png`부터 `-15.png`와 대응 atlas입니다. `electron/walk-gait.json`의 실제 사족 보행 디딤 위상과 `scripts/walk-rig.cjs`의 고정 길이 관절·연속 메쉬로 재생성합니다. 몸통 크기는 고정하고 작은 체중 이동만 적용하며 발바닥은 접지면에 유지합니다. 앱의 이동 속도도 같은 보폭·주기에서 계산합니다.

참고 연구: https://pmc.ncbi.nlm.nih.gov/articles/PMC4044364/ , https://pmc.ncbi.nlm.nih.gov/articles/PMC4517757/

내장 image_gen 편집 모드를 사용했습니다. 기존 품종별 보행 시트를 얼굴·색·체형 참조로 사용했습니다. 최종 파일은 아래 10개이며, 몸통·앞다리·뒷다리 세 개의 독립된 투명 cutout을 포함합니다. 네 다리와 16개 자세는 scripts/walk-rig.cjs에서 생성하며 다른 모션은 변경하지 않습니다. 프레임 전체에서 동일한 몸통을 재사용해 얼굴·크기가 흔들리지 않습니다.

- `dogs/chihuahua-walk-rig.png` (reference: chihuahua-walk-v4-sheet.png)
- `dogs/jindo-walk-rig.png` (reference: jindo-walk-v4-sheet.png)
- `dogs/retriever-walk-rig.png` (reference: retriever-walk-v4-sheet.png)
- `dogs/shiba-walk-rig.png` (reference: shiba-walk-v4-sheet.png)
- `dogs/husky-walk-rig.png` (reference: husky-walk-v4-sheet.png)
- `cats/ragdoll-walk-rig.png` (reference: ragdoll-walk-v5-sheet.png)
- `cats/russian-blue-walk-rig.png` (reference: russian-blue-walk-v5-sheet.png)
- `cats/norwegian-forest-walk-rig.png` (reference: norwegian-forest-walk-v5-sheet.png)
- `cats/siamese-walk-rig.png` (reference: siamese-walk-v5-sheet.png)
- `cats/persian-walk-rig.png` (reference: persian-walk-v5-sheet.png)

## 최종 공통 프롬프트

Production cutout animation rig asset for this EXACT adorable reference character. Preserve its face, eyes, breed coat markings, compact short round torso, tail and existing cute outlined game-sprite style. NOT a walk sheet. Exactly THREE separate objects in ONE horizontal row, transparent background, very wide gaps. LEFT object: complete HEAD + TORSO + TAIL as ONE connected silhouette, side view facing right, but absolutely NO LEGS OR PAWS, smooth soft belly without stumps. CENTER object: ONE short FRONT LEG cutout, pointing straight down from shoulder to rounded paw, same coat markings and outline style, upper leg wide enough to overlap torso. RIGHT object: ONE short HIND LEG cutout, pointing straight down with subtle hock bend, rounded paw, same total length as front cutout. Three objects aligned with transparent margins. Main head-body-tail object about three times as wide as each limb is tall; big head and short kitten/puppy limbs. Each object one complete connected cutout. These will be assembled into four-legged animated walking, so LEFT body must have ZERO legs and the other two objects each exactly ONE limb. No text, labels, shadow, floor, grid or extra poses.

각 호출 마지막에 `Breed identity: <품종명>.`을 추가했습니다. 치와와는 동일한 3개 cutout 지시를 사용했고 큰 귀·크림색 발·검은 윤곽선 보존을 명시했습니다. 8프레임 통째 재생성 시안은 다리 겹침이 남아 채택하지 않았습니다.
