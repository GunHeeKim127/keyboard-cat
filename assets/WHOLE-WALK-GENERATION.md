# v1.3.13 완성 이미지 보행 제작

## v1.3.14 비율 수정

v1.3.13의 `*-walk-v6-sheet.png`를 편집 대상으로 사용해 10품종 모두 `*-walk-v7-sheet.png`를 만들었습니다. 발걸음은 개선됐으나 다른 모션보다 다리가 길고 몸통이 가늘어 보인다는 사용자 피드백을 반영했습니다. 다리를 잘라 붙이거나 전체 그림을 눌러 줄이지 않고, 매 자세의 몸통·배·어깨·허벅지·다리를 전체 그림 안에서 다시 그렸습니다. 머리·눈·귀 크기와 품종 정체성, 발의 디딤/되돌림 순서, 4열×2행·8자세는 보존하도록 지시했습니다.

수정 공통 지시의 핵심: “PROPORTION CORRECTION ONLY. The current legs are visibly too long and thin compared with the character's other game motions. Redraw ALL EIGHT animals with cute shorter, chubbier legs: reduce visible belly-to-paw clearance by about 30 percent, make torso deeper and rounder by lowering the belly, add a little soft thigh/shoulder fullness. Keep the back/top of torso, head size, ear size, facial identity, tail, total body width, and ground line nearly unchanged. Do NOT just resize the whole sprite. Head and eyes must not grow. Paw endpoints must retain each frame's distinct forward/backward support and low swing positions.”

30%는 이미지 편집의 목표 지시이며 해부학적으로 측정된 일률적인 단축률을 뜻하지 않습니다. 품종·털 길이·자세에 따라 실제 표현이 다릅니다. 털이 긴 고양이는 발끝이 털에 완전히 가려지지 않도록 추가 지시했고, 시바견은 과도하게 비만한 몸통을 피하도록 했습니다. 시안 원본 → 앱 프레임 80개 → 기존 대기/점프/착지·이전 보행과 나란히 비교하는 순서로 검토했습니다. `scripts/review-proportions.cjs`가 이 비교 그림을 재생성합니다.

아래 v1.3.13 기록은 보행 순서를 개선했던 이전 단계의 이력입니다.

## 최종 방식

v1.3.9의 8프레임 전체 이미지 처리로 복원했습니다. 몸통·다리 분리 이미지와 관절·메쉬 생성은 사용하지 않습니다. 각 원본은 4열 × 2행, 8개의 완성된 동물 자세와 투명 여백을 포함합니다. 새 원본은 `cats/<breed>-walk-v6-sheet.png`, `dogs/<breed>-walk-v6-sheet.png`입니다. 기존 v4/v5 시트는 비교·복원을 위해 보존합니다. Original과 보행 외 원본은 바꾸지 않습니다.

내장 image_gen으로 기존 품종 이미지를 얼굴·색·비율 참조로 편집했습니다. 최초 시트와 한 자세씩 만든 시안은 앞발 방향 반복·가려짐·스타일 차이 때문에 제외했습니다. 이후 발 디딤 위치가 다른 8자세 참고 그림과 품종 참조를 함께 사용했습니다. 허스키·랙돌·러시안 블루는 원본 시트를 복사하듯 반복하는 문제가 있어 단일 완성 자세를 참조로 다시 만들었습니다. 생성 참고 그림은 최종 앱 이미지가 아니며 런타임에서 그 그림의 다리나 관절을 사용하지 않습니다.

## 최종 공통 지시

Image1 is the EXACT EIGHT-POSE PAW POSITION guide. Image2 is the existing pet's identity/style. Redraw image1 into eight complete cute pets matching image2's FACE, eyes, coat pattern, head-to-body ratio, small SHORT-legged cute body, tail, outlines and art style. Keep image1's eight distinct four-foot positions and sequential order, particularly backward supporting FRONT leg in lower left frames. Do not copy image2's repeated leg poses. Whole anatomically shaped furred animals, NO sticks, NO cutout pieces. Four columns two rows, all eight animals full body facing RIGHT side view, same scale and baseline, wide empty transparent gutters and margins. Far legs a darker shade but visible. Small low steps, real slow four-beat quadruped walk, no high-knee human marching, no hopping or trot. No glow/shadows/floor/words. Preserve cute compact proportions and don't lengthen legs to match the guide; guide supplies pose only. Breed: <breed>.

고양이는 위 지시에 feline anatomy, low supple walk, original feline head/muzzle/tail 보존을 추가했습니다. 재생성 시 단일 자세는 identity only, 앞발의 뒤쪽 지지 자세가 필수이며 네 발이 구분되어야 한다고 명시했습니다. 치와와는 같은 원리로 원본 v4 시트의 얼굴·색·체형 보존을 지정했습니다.

## 검토와 한계

원본 80자세를 확인한 뒤 앱에 쓰는 100×110 프레임으로 변환해 다시 비교했습니다. `scripts/walk-frames.cjs`는 전체 자세에 동일 비율을 적용하고 얼굴과 바닥을 정렬합니다. 다리 조립·회전·늘이기·보간 이미지는 생성하지 않습니다. 표시 크기 차이는 공통 확대 비율로 처리하며 고양이의 이전 크기 제한을 유지합니다.

`scripts/review-walks.cjs`는 모든 자세의 비교 그림과 프레임별 크기·머리 위치·반복 경계의 픽셀 차이를 기록합니다. `scripts/preview-motions.cjs`는 200ms/프레임의 GIF와 다른 동작 비교 그림을 만듭니다. 단일 픽셀 지표나 서로 다른 이미지라는 사실만으로 실제 네 발 디딤 순서와 자연스러움이 증명되지는 않습니다. 그림을 직접 확인하는 절차를 함께 수행합니다. 털이 긴 품종은 다리 윗부분이 털에 가려지는 특성이 남습니다. 스타일화된 8자세이며 실사 동작 캡처와 같은 정밀도는 보장하지 않습니다.

보행 자세 참고: 고양이 lateral sequence 연구 https://pmc.ncbi.nlm.nih.gov/articles/PMC4044364/ 와 개 보행 운동학 https://pmc.ncbi.nlm.nih.gov/articles/PMC4517757/ . 생물학적 걷기의 참고 자료로 사용하며 그림의 정확성을 검증한 자료라는 뜻은 아닙니다.
