# Keyboard Cat 1.2.1

1.2.1은 놓을 때 고양이의 표시 위치가 튀던 좌표 계산과 화면 가장자리 제한을 수정했습니다. 리모컨을 열어도 고양이 위치를 바꾸지 않습니다. 드래그·자동 이동·위치 조정 방향에 따라 고양이와 모든 스프라이트를 좌우로 뒤집으며, 대시·공격 효과도 같은 방향으로 움직입니다. 실행 검증은 임시 설정 폴더를 사용해 사용자의 저장 위치를 변경하지 않습니다. 최신 배포 EXE 이름의 버전은 1.2.1입니다.

Windows용 흰색 고양이 데스크톱 펫입니다. Electron + React + TypeScript로 만들었습니다. 기존에 사용자가 제공한 스프라이트로 IDLE/WALK/JUMP/DASH/ATTACK/SLEEP을 재생하며, ImageGen으로 같은 고양이의 목덜미가 잡혀 매달린 자세를 추가했습니다.

## 바로 실행

`Start Keyboard Cat.cmd`를 더블클릭하세요. `release/win-unpacked/Keyboard Cat.exe`를 실행하며 Node.js 설치가 필요하지 않습니다. `release/Keyboard Cat 1.2.1.exe`는 휴대용, `release/Keyboard Cat Setup 1.2.1.exe`는 설치형입니다. 코드 서명은 설정하지 않았습니다.

## 리모컨과 조작

실행하면 화면 오른쪽 아래에 리모컨이 나타납니다. 리모컨을 닫거나 ‘숨기기’를 누르면 고양이는 계속 동작합니다. 트레이 고양이를 더블클릭하거나 EXE를 다시 실행하면 리모컨을 다시 엽니다. 리모컨 창을 닫을 때 해당 창의 리소스를 해제합니다.

| 품질 | 크기 | 재생 속도 | 자동 이동 | 특수 효과 | 대기 반복 | 수면 반복 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 저 · 기본 | 75% | 5 FPS | 끔 | 끔 | 끔 | 끔 |
| 중 | 100% | 8 FPS | 끔 | 켬 | 끔 | 켬 |
| 고 | 130% | 12 FPS | 켬 | 켬 | 켬 | 켬 |

원본 픽셀 해상도는 같으며 품질 프리셋은 표시 크기·프레임·효과를 바꿉니다. 각 기능은 개별 토글로 바꿀 수 있고, 그러면 ‘사용자 설정’으로 표시합니다. ‘더보기’에서 크기·FPS·위치 초기화·입력 재연결을 조정합니다. 수면 반복은 켠 경우 2.5 FPS로 재생합니다. 설정은 다음 실행에도 유지합니다.

‘수면 애니메이션’은 ‘대기 애니메이션’과 독립된 스위치입니다. 저품질에서도 수면 모션만 다시 켤 수 있습니다. 끄면 원본 수면 자세 한 프레임을 표시하며 모션 이미지 자체는 삭제하지 않습니다.

- ‘마우스로 집어 들기’를 켜면 고양이 영역에서만 클릭을 받습니다. 주변 투명 영역은 아래 앱으로 클릭을 통과시킵니다.
- 고양이를 왼쪽 버튼으로 누른 채 이동하면 목덜미가 커서 끝에 걸린 자세로 들립니다. 놓으면 착지하고 위치를 저장합니다. 저품질에서는 흔들림을 생략하고 드래그 중 위치 갱신을 약 15 FPS, 그 외에는 약 30 FPS로 제한합니다.
- 완전한 클릭 통과가 필요하면 ‘마우스로 집어 들기’를 끄세요.
- ‘고양이 위치 조정’은 이전 방식의 드래그 영역을 표시합니다. 위치를 고정하면 일반 모드로 돌아옵니다.
- 1.5초 미만 간격으로 키를 누르면 콤보가 이어집니다. 효과가 켜져 있으면 10콤보 JUMP, 30콤보 DASH, 50콤보 ATTACK 효과가 한 번씩 발생합니다.
- 입력이 없으면 4초 후 WALK, 30초 후 SLEEP입니다. 자동 이동이 꺼져 있으면 제자리에서 걷습니다.
- 일시정지는 입력 감지 보조 프로그램을 종료하고 콤보를 초기화합니다. 앱 종료는 리모컨 또는 트레이에서 선택하세요.

## 타이핑 지연과 개인정보

1.2.0부터 전역 키보드 훅(WH_KEYBOARD_LL)을 완전히 제거했습니다. 다른 앱의 입력을 통과시켜야 하는 콜백 대신 별도 메시지 창에서 Windows Raw Input 알림을 받습니다. RIDEV_INPUTSINK로 키보드 알림만 등록하며 RIDEV_NOLEGACY 같은 기존 앱 입력 억제 옵션은 사용하지 않습니다. 이 구조는 다른 앱의 키 처리 경로를 가로채지 않습니다. 모든 PC의 지연 해소를 보장하는 측정 결과는 아니므로 실제 사용감을 확인하세요.

`native/KeyCounter.cs`는 RAWINPUT 버퍼에서 장치 유형과 누름/뗌 메시지 유형만 해석합니다. VKey·MakeCode·입력 문자·키 이름·창 제목을 읽거나 변환하지 않습니다. Windows가 복사한 임시 버퍼는 매 이벤트 처리 후 지우고 재사용합니다. 키 누름 횟수만 50ms 단위로 표준 출력 파이프를 통해 앱에 전달합니다. 키 자동 반복도 횟수에 포함합니다. 합성 키보드 이벤트나 일부 원격/가상 키보드는 물리 Raw Input과 다르게 감지될 수 있습니다.

입력 내용과 횟수는 파일에 기록·저장하거나 외부로 전송하지 않습니다. 실행 중 콤보와 마지막 입력 시각만 메모리에 유지합니다. 저장하는 것은 고양이 위치와 사용자가 선택한 옵션뿐입니다. 설정 파일은 `%APPDATA%/keyboard-cat/settings.json`입니다. 원격 네트워크 요청은 차단합니다.

화면 상태가 바뀔 때만 React를 갱신하고, 타이핑 중 표시는 최대 초당 10회로 묶습니다. 애니메이션은 상태별 PNG 아틀라스 6개를 이용합니다. 저품질 대기/수면 상태는 애니메이션을 멈춥니다. Electron과 리모컨의 기본 메모리 사용량은 남습니다.

## 개발 및 EXE 빌드

Windows 10/11 x64, Node.js 22.12 이상(24 LTS 권장), npm, Windows 기본 .NET Framework 4.x가 필요합니다. 현재 PC 기본 Node.js 20.9는 개발 요구 버전보다 낮으며 이번 검증은 제공된 24.19.0 런타임을 사용했습니다. Visual Studio나 Python은 필요하지 않습니다.

```powershell
npm install
npm run build
npm test
npm start
npm run dist
```

`npm run dev`는 빌드 후 앱을 실행합니다. 프레임 재추출은 `npm run sprites`입니다. EXE는 `release/`에 생성됩니다. 보조 프로그램도 패키지의 resources에 포함합니다. Git 커밋·푸시는 자동으로 수행하지 않습니다.

## 검증

```powershell
npx electron . --smoke-test
node scripts/check-native.cjs
```

스모크 검증은 실제 고양이·리모컨 창 로딩, 프리셋 버튼, 토글 존재, 대기 중 중복 갱신 제거, 들기 이미지·놓기·착지 상태 전환을 확인한 뒤 종료합니다. 닫힌 창에 늦게 도착한 이벤트를 보내는 종료 경합도 검사합니다. 이 모드는 실제 입력 감지를 켜지 않습니다.

네이티브 검증은 Raw Input 등록 성공과 누름/뗌 메시지 분류를 확인합니다. 주입된 키 이벤트를 실제 물리 키 입력 검증으로 취급하지 않습니다. 실제 키보드 입력, 마우스로 집어 들기·클릭 통과, 다중 모니터·절전 복귀는 사용자 환경에서 직접 확인해야 합니다.

## 파일과 이미지

`electron/` 메인·IPC·옵션·콤보 로직, `src/` 고양이와 리모컨 UI, `native/` Raw Input 횟수 감지, `scripts/` 빌드·프레임 추출, `tests/` 경계값 검증입니다. renderer는 contextIsolation·sandbox를 사용하고 Node 접근은 없습니다. 설정 IPC는 허용한 값만 적용합니다.

원본 시트는 `public/sprites/source.png`, 원본에서 분리한 투명 프레임은 40개, 런타임 아틀라스는 6개입니다. 생성한 들린 자세는 `public/sprites/carry-source.png`, 실행용 100×110 텍스처는 `public/sprites/carry.png`입니다. 내장 ImageGen을 사용했으며 프롬프트와 커서 기준점은 `public/sprites/carry-prompt.txt`에 기록했습니다.

참고: [Electron BrowserWindow](https://www.electronjs.org/docs/latest/api/browser-window), [Microsoft Raw Input](https://learn.microsoft.com/en-us/windows/win32/inputdev/about-raw-input), [RAWKEYBOARD](https://learn.microsoft.com/en-us/windows/win32/api/winuser/ns-winuser-rawkeyboard).
