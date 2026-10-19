# macOS 사용 및 빌드

1.3.0에서 macOS용 소스와 빌드 설정을 추가했습니다. 지원 대상으로 설정한 시스템은 macOS 13 이상이며 Apple Silicon(arm64)과 Intel(x64)을 각각 패키징합니다. 현재 개발 환경은 Windows이므로 실제 macOS 컴파일·실행·권한 승인 검증을 완료한 버전은 아닙니다.

## 맥 없이 설치 파일 만들기

1. 변경된 소스와 `.github/workflows/build-macos.yml`을 저장소에 커밋하고 푸시합니다. 이 작업은 사용자가 직접 합니다.
2. GitHub 저장소 → **Actions** → **Build macOS** → **Run workflow**를 선택합니다.
3. 성공한 작업 아래 **Artifacts → keyboard-cat-macos**를 다운로드하고 압축을 풉니다.
4. `Keyboard-Cat-1.3.0-mac-arm64.dmg`는 Apple Silicon, `Keyboard-Cat-1.3.0-mac-x64.dmg`는 Intel용입니다. 앱 ZIP도 함께 생성합니다.
5. 일반 사용자에게 배포하려면 해당 DMG를 GitHub Releases에 별도로 첨부합니다. 이 workflow는 릴리스를 게시하지 않고 빌드 산출물만 저장합니다.

빌드 작업은 네이티브 보조 프로그램을 두 아키텍처로 컴파일하고, 분류 로직·공통 테스트·번들 구성·실행 권한·Info.plist를 검사합니다. 물리 키보드와 마우스, TCC 권한, Spaces의 실제 동작을 검증하는 작업은 아닙니다. 빌드 실패 시 Actions 로그를 확인하세요.

## 설치와 입력 권한

DMG를 열고 **Keyboard Cat.app**을 **Applications**로 옮긴 후 실행합니다. Node.js나 Xcode는 설치 파일을 사용하는 사람에게 필요하지 않습니다.

첫 실행 시 리모컨의 **입력 모니터링 권한 설정**을 누르세요. 시스템 설정 → 개인정보 보호 및 보안 → 입력 모니터링에서 Keyboard Cat을 허용하고 앱을 종료한 뒤 다시 실행합니다. macOS 버전과 권한 표시 방식에 따라 KeyCounter-mac 보조 프로그램이 표시될 수도 있습니다. 권한 변경 후 ‘입력 다시 연결’을 사용할 수 있지만, macOS가 앱 재시작을 요구하면 재시작하세요. 권한을 거부해도 고양이·리모컨·마우스 조작은 사용할 수 있으며 전역 타이핑 콤보는 동작하지 않습니다.

Apple Developer ID 인증서와 공증 자격 증명이 없어, 패키지는 로컬 ad-hoc 서명만 사용하고 Apple 공증은 하지 않습니다. 다운로드한 앱을 macOS가 차단하면 시스템 설정 → 개인정보 보호 및 보안의 해당 앱 열기 안내를 확인하세요. 신뢰할 수 있는 출처인지 확인한 뒤 허용하며, 시스템 전체의 보안 기능을 끄지 마세요. macOS 정책에 따라 미공증 앱 실행이 추가로 제한될 수 있습니다. 널리 배포하려면 Developer ID 서명·공증을 구성해야 합니다.

## 동작과 개인정보

맥은 CoreGraphics의 **listen-only 이벤트 탭**으로 키 누름 알림을 수신합니다. 이벤트의 키 코드, 문자, 수정 키 플래그는 읽지 않으며 입력을 변경하거나 억제하지 않습니다. 키 누름 횟수만 메모리에서 집계해 50ms 단위로 Electron에 전달합니다. 단독 Shift/Cmd 등의 modifier 변경은 집계하지 않고 일반 키의 keyDown/자동 반복을 집계합니다.

입력 내용과 횟수를 파일에 저장하거나 전송하지 않습니다. 권한 오류는 상태 문자열만 전달합니다. 일시정지는 보조 프로그램을 종료하며, 부모 앱이 종료되면 보조 프로그램도 종료됩니다. 비밀번호 입력 등 macOS의 보안 입력 상태에서는 전역 입력이 감지되지 않을 수 있습니다.

고양이, 리모컨, 품질 옵션, 수면 토글, 들기/놓기와 좌우 애니메이션은 Windows와 같은 소스를 사용합니다. 맥 메뉴 막대의 트레이 또는 Dock 아이콘으로 리모컨을 엽니다. 전체 화면 앱과 Spaces 위 표시, 여러 모니터 배율과 드래그는 실제 맥에서 확인이 필요합니다.

## 실제 맥에서 소스 실행

Node.js 22.12 이상과 Xcode Command Line Tools가 필요합니다.

```sh
xcode-select --install
npm ci
npm run build
npm test
npm start
```

설치 파일 생성:

```sh
npm run dist:mac
node scripts/check-mac-package.cjs
```

Windows에서는 `npm run dist:win` 또는 기존 `npm run dist`를 사용합니다. macOS DMG는 macOS 환경에서 생성해야 합니다.

참고: [Apple 이벤트 수신 권한](https://developer.apple.com/documentation/coregraphics/cgpreflightlisteneventaccess()), [Apple listen-only 이벤트 탭](https://developer.apple.com/documentation/coregraphics/cgevent/tapcreate(tap:place:options:eventsofinterest:callback:userinfo:)), [electron-builder macOS 설정](https://www.electron.build/v26/docs/mac/).
