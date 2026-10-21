# v1.3.13 완성 이미지 보행 제작

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
