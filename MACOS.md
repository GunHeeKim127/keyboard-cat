# macOS 설치·실행·업데이트 매뉴얼

## 1.3.11에서 업데이트 받기와 이전 권한 기록 확인

1. 리모컨 아래의 **업데이트 확인**을 누릅니다. 새 정식 Release가 있으면 변경 내용과 **새 버전 다운로드**가 나옵니다. M 시리즈는 arm64 파일, Intel은 x64 파일을 자동으로 선택합니다. 기존 앱에 이 버튼이 없다면 새 버전을 처음 한 번 직접 내려받으세요.
2. 파일을 받으면 기존 앱을 완전히 종료합니다. 새 앱을 **응용 프로그램** 폴더의 앱과 교체한 뒤 그 위치에서 실행합니다. 다운로드한 디스크 창 안에서 동시에 실행하지 마세요. 이름·품종·표시 설정은 보통 그대로 유지됩니다.
3. 키보드 반응이 없으면 리모컨의 **입력 모니터링 권한 설정**을 누릅니다. 현재 설치한 앱의 권한을 허용하고 리모컨으로 돌아오세요. 새 버전은 연결에 실패했으면 다시 확인합니다. 앱을 완전히 종료하라는 macOS 안내가 나오면 종료한 뒤 다시 여세요.
4. 권한을 켰는데도 계속 실패하면 앱을 완전히 종료한 뒤 입력 모니터링의 이전 Keyboard Cat 항목을 제거하고, **응용 프로그램의 현재 Keyboard Cat**을 다시 추가해 허용합니다. 앱을 다시 열고 **입력 다시 연결**을 누릅니다. 계속 실패하면 아래의 진단·앱별 권한 초기화 절차를 확인하세요.

앱 설정 파일과 macOS 권한 기록은 서로 다릅니다. 앱 설정을 지우거나 다시 내려받는 것만으로 권한 기록이 초기화되지는 않습니다. 1.3.11은 앱에 오래된 승인 결과를 저장하지 않고 새 보조 프로그램으로 재시도하지만, macOS가 실제로 거부한 권한을 대신 허용할 수는 없습니다. 입력 권한 없이도 캐릭터·리모컨·설정·업데이트는 사용할 수 있으며 키보드 반응과 콤보에는 승인이 필요합니다. TCC.db나 Library 상위 폴더를 삭제하지 마세요.

대상: Keyboard Cat 1.3.5 · **보행·프레임 수정 3 · 이름 표시 설정**. macOS 13 이상용이며 일반 사용자는 Node.js, Xcode, npm을 설치할 필요가 없습니다. 아래 명령은 Mac의 터미널에서만 사용합니다.

## 1. 내 Mac에 맞는 파일 받기

 메뉴 → **이 Mac에 관하여**에서 칩/프로세서를 확인하세요.

| 내 Mac | 다운로드 | Actions 산출물 이름 |
| --- | --- | --- |
| Apple M1 / M1 Pro / M1 Max / M1 Ultra 및 M2·M3·M4·M5 계열 | `Keyboard-Cat-1.3.5-mac-arm64.dmg` | AppleSilicon-DMG-Unnotarized |
| Intel 프로세서 | `Keyboard-Cat-1.3.5-mac-x64.dmg` | Intel-DMG-Unnotarized |

**M1 Pro는 Apple Silicon이며 arm64를 선택합니다.** macOS 버전 번호로 CPU 종류를 선택하지 않습니다.

앞다리·독립 프레임·이름 표시 설정이 포함된 확인된 빌드는 [4355c1a의 성공한 작업](https://github.com/GunHeeKim127/keyboard-cat/actions/runs/39439641219)입니다.

- [Apple Silicon / M1 Pro용 다운로드](https://github.com/GunHeeKim127/keyboard-cat/actions/runs/39439641219/artifacts/12271974796)
- [Intel용 다운로드](https://github.com/GunHeeKim127/keyboard-cat/actions/runs/39439641219/artifacts/12271719940)

GitHub 로그인이 필요할 수 있습니다. Actions 아래 **Artifacts**에서 해당 항목을 받으면 먼저 ZIP이 내려옵니다. ZIP을 풀어 안의 DMG를 여세요. 산출물은 14일 보관되며 위 파일은 2026-11-03 UTC에 만료 예정입니다. 링크가 만료되면 [Build macOS 작업 목록](https://github.com/GunHeeKim127/keyboard-cat/actions/workflows/build-macos.yml)에서 원하는 수정 커밋의 **성공한** 작업을 확인합니다. 이전 작업을 다시 실행해도 새 코드가 들어가는 것은 아닙니다.

기존 GitHub Releases 파일은 이번 수정본과 다를 수 있습니다. 같은 1.3.5라도 리모컨의 수정 빌드 문구까지 확인하세요. Unnotarized는 Apple 공증을 받지 않은 테스트 배포본이라는 뜻입니다.

## 2. 처음 설치하기

1. 받은 ZIP을 풀고 CPU에 맞는 DMG를 더블클릭합니다.
2. 열린 디스크의 **Keyboard Cat.app**을 **응용 프로그램(Applications)** 폴더로 드래그합니다. 최종 위치는 `/Applications/Keyboard Cat.app`입니다.
3. 복사가 끝나면 Finder 왼쪽에서 Keyboard Cat 디스크의 꺼내기 버튼을 누릅니다. **DMG 안의 앱을 직접 실행하지 않습니다.**
4. **Finder → 응용 프로그램 → Keyboard Cat.app**을 더블클릭합니다. 검색 결과나 예전 Dock 바로가기가 헷갈리면 먼저 이 경로로 실행하세요.
5. 리모컨 상단에서 **v1.3.5 · 보행·프레임 수정 3 · 이름 표시 설정**을 확인합니다.

처음 열 때 개발자를 확인할 수 없다는 알림이 나오면, 다운로드 출처와 앱 이름을 확인한 뒤 **시스템 설정 → 개인정보 보호 및 보안 → 보안 → 확인 없이 열기(Open Anyway)**에서 이 앱에 대한 예외를 선택합니다. 이 항목은 앱 실행을 한 번 시도한 뒤 나타날 수 있으며 OS 버전에 따라 문구가 다릅니다. 회사/학교 관리 정책으로 제한된 Mac은 관리자에게 문의하세요. 악성 소프트웨어 경고나 손상 알림이 나오면 반복해서 강제 실행하지 말고 공식 다운로드에서 다시 받아 확인합니다. [Apple의 앱 열기 안내](https://support.apple.com/102445)

앱 실행 허용과 다음의 **입력 모니터링 허용은 서로 다른 설정**입니다.

## 3. 입력 모니터링 권한 주기

입력 모니터링은 다른 프로그램을 사용하면서 키보드를 눌렀다는 알림을 받기 위한 macOS 권한입니다. 이 앱은 키 코드·문자·입력 내용 대신 누른 횟수만 처리합니다.

1. 앱 리모컨의 **입력 모니터링 권한 설정**을 클릭합니다.
2. **시스템 설정 → 개인정보 보호 및 보안 → 입력 모니터링**으로 이동합니다.
3. 현재 Applications에 설치한 **Keyboard Cat**을 켭니다. 목록에 없다면 `+`를 누르고 `/Applications/Keyboard Cat.app`을 선택합니다. OS가 KeyCounter-mac 보조 프로그램을 별도 항목으로 표시하면 현재 앱에 포함된 보조 프로그램인지 확인합니다.
4. macOS가 종료·다시 열기를 요구하면 따릅니다. 그렇지 않아도 리모컨의 **앱 종료** 또는 메뉴 막대 아이콘 메뉴의 **종료**로 완전히 종료한 뒤 Finder의 Applications에서 다시 실행하세요. 창만 닫거나 리모컨을 숨기는 것은 종료가 아닙니다.
5. 리모컨의 상태가 **입력 감지 준비 완료**인지 확인합니다. 일시정지를 해제한 뒤 TextEdit 같은 일반 편집기에서 실제 키를 눌러 콤보가 올라가는지 확인합니다.

설치본을 쓰기 위해 터미널 앱에 입력 모니터링 권한을 줄 필요는 없습니다. 손쉬운 사용·전체 디스크 접근·화면 기록을 일괄 허용하는 절차도 필요하지 않습니다. `KeyCounter-mac`을 터미널에서 직접 실행하는 방법은 일반 사용자 실행 절차가 아닙니다. [Apple의 입력 모니터링 설명](https://support.apple.com/guide/mac-help/mchl4cedafb6/mac)

자동 재연결은 약 5초 간격이지만, OS가 요구하는 완전한 앱 재시작을 대신하지 않습니다. 비밀번호 입력 등 보안 입력 상태에서는 감지가 제한될 수 있습니다.

## 4. 평소 실행·리모컨 열기·이름 표시

- 실행: **Finder → 응용 프로그램 → Keyboard Cat.app**. 설치 경로를 확정한 뒤 원하면 해당 앱으로 Dock 바로가기를 다시 만드세요.
- 리모컨 열기: 메뉴 막대 Keyboard Cat 아이콘 메뉴의 **리모컨 열기**. 이미 실행 중인 설치 앱을 다시 열어도 리모컨을 엽니다.
- 이름: 리모컨의 **이름 표시 → 항상 표시 / 마우스를 올릴 때만 표시 / 숨기기**. 고양이와 강아지 모두 적용되며 재실행 후에도 저장됩니다.
- 반려동물/견종: 리모컨의 마우스 버튼·견종 메뉴. Tab 단축키는 없습니다.
- 종료: 리모컨의 **앱 종료** 또는 메뉴 막대 아이콘 메뉴의 **종료**.

## 5. 업그레이드: 보통은 전부 지우지 않습니다

1. 새 DMG가 내 CPU에 맞는지 확인합니다. 같은 1.3.5라도 수정 빌드 문구/소스 커밋이 최신인지 확인합니다.
2. **기존 앱을 완전히 종료**합니다. 교체가 안 되면 활성 상태 보기에서 Keyboard Cat과 KeyCounter-mac이 종료됐는지 확인합니다.
3. 새 DMG를 열고 **Keyboard Cat.app → Applications**로 복사한 뒤 **대치/교체**를 선택합니다.
4. 복사가 끝나면 DMG를 꺼냅니다. `/Applications/Keyboard Cat.app`을 Finder에서 엽니다.
5. 리모컨 버전·수정 빌드 문구를 확인합니다. 이전 이름·견종·표시 옵션은 일반 업데이트에서 유지됩니다.
6. 입력이 동작하면 끝입니다. 업데이트마다 터미널 명령을 실행하거나 설정을 삭제할 필요는 없습니다.
7. 입력 권한 오류가 남으면 다음 절차를 적용합니다. 새 앱이 정상 실행되고 입력도 확인된 뒤에만 필요 없는 이전 DMG/다운로드 복사본을 정리하세요.

임시 서명(ad hoc) 빌드는 교체 뒤 macOS가 예전 권한과 동일 앱으로 연결하지 못할 수 있습니다. 권한 재승인이 필요한 경우가 있으며, 앱 삭제가 권한 기록 삭제를 의미하지 않습니다.

## 6. 권한을 켰는데도 인식하지 않을 때

먼저 **입력 진단 · 이전 앱 확인 → 상태 확인**을 누릅니다.

| 진단/현상 | 확인할 일 |
| --- | --- |
| 실행 위치 `/Volumes/...` | DMG의 앱입니다. 종료 → Applications로 복사 → DMG 꺼내기 → Finder에서 설치 앱 실행 |
| 경로에 `AppTranslocation` | 설치 위치와 실행 복사본을 재확인하고 Applications의 앱으로 다시 실행 |
| `permission` 또는 `access: denied`와 탭 실패/종료 코드 77 | 입력 모니터링의 현재 설치본 항목과 재승인 절차 확인 |
| 보조 프로그램 존재 `false` / 실행 실패 | 다운로드·설치가 불완전할 수 있습니다. 새 DMG의 앱 전체를 다시 복사 |
| 탭 실패 / 종료 코드 78 | 권한·보안 입력·OS 제한 등을 진단. 설정 삭제로 해결된다고 단정하지 않음 |
| 준비 완료인데 콤보가 안 오름 | 일시정지 여부, 일반 편집기에서 실제 타이핑, 보안 입력 상태 확인 |

사전 권한 조회 결과 하나만으로 연결 실패를 단정하지 않습니다. 실제 이벤트 탭 연결과 준비 완료 상태도 함께 봅니다. 앱 복사본이나 설정 폴더가 있다는 사실만으로 오류 원인이라고 판단하지 않습니다.

다음 순서대로 진행합니다.

1. 앱을 완전히 종료합니다.
2. 입력 모니터링 목록에서 **Keyboard Cat 항목만** 제거하고, Applications의 새 앱을 다시 추가해 켭니다. 다른 앱 항목은 변경하지 않습니다.
3. Finder에서 새 앱을 열고 승인·종료·재실행 후 실제 입력을 확인합니다.
4. 여전히 실패할 때만 아래의 앱 전용 권한 초기화를 한 번 시도합니다.

### 터미널에서 이 앱의 입력 권한만 초기화

**앱을 종료한 상태**에서 Spotlight(⌘+Space)에 **터미널**을 검색해 엽니다. 다음 전체를 **한 줄로** 복사하고 Return을 누르세요.

```sh
tccutil reset ListenEvent local.keyboardcat.pet
```

`local.keyboardcat.pet`만 따로 실행하는 것이 아닙니다. 앱 이름이나 파일 경로가 아닌 이 앱의 식별자입니다. 이 명령은 입력 권한을 **허용**하는 명령이 아니라 해당 권한 결정을 **초기화**하는 명령입니다. 이름·견종 설정 파일은 지우지 않습니다. `sudo`는 붙이지 않습니다. [Apple의 앱별 권한 초기화 설명](https://developer.apple.com/documentation/xcode/resetting-access-to-protected-resources-in-macos)

성공하면 아래 순서로 새 권한을 받습니다.

1. **Finder → 응용 프로그램 → Keyboard Cat.app**을 실행합니다.
2. 입력 모니터링 설정에서 현재 앱을 허용합니다. 필요하면 기존 항목을 제거하고 현재 설치본을 다시 추가합니다.
3. 앱을 완전히 종료하고 같은 Finder 경로에서 다시 실행합니다.
4. 준비 완료와 실제 타이핑을 확인합니다.

`Failed to reset`, 앱 식별자를 찾을 수 없다는 오류, 관리 정책 관련 오류 등이 나오면 메시지를 기록하고 설치 경로·식별자를 확인합니다. 오류를 무시하고 전체 앱 권한 초기화나 TCC.db 삭제로 확대하지 않습니다. 이 명령이 모든 macOS 환경의 권한 문제를 해결한다고 보장하지 않습니다.

## 7. 완전히 새로 설치하고 싶을 때: 백업 후 앱 전용 데이터만

이 절차는 **견종·이름·위치·표시 설정도 초기화하고 싶을 때**의 선택 사항입니다. 단순 업데이트에는 필요하지 않고, 설정 초기화만으로 TCC 권한이 고쳐지는 것도 아닙니다.

1. 먼저 앱을 완전히 종료합니다.
2. Finder에서 `/Applications/Keyboard Cat.app`을 휴지통으로 옮깁니다. 다른 앱과 프로젝트 소스 폴더는 건드리지 않습니다.
3. Finder → **이동 → 폴더로 이동(⇧⌘G)**에 아래 경로를 하나씩 붙여 넣습니다. 실제로 존재하는 항목만 확인하세요. 경로가 `.plist` 파일로 끝나면 상위 `~/Library/Preferences` 폴더를 연 뒤 해당 파일만 선택합니다.

| 항목 | 처리 |
| --- | --- |
| `~/Library/Application Support/keyboard-cat` | 현재 사용자 설정·앱 데이터. 기본은 유지. 초기화하려면 폴더를 바탕화면 백업 폴더로 옮김 |
| `~/Library/Application Support/Keyboard Cat` | 이전 이름의 데이터가 실제 존재하는 경우만 확인·백업 |
| `~/Library/Caches/local.keyboardcat.pet` | 존재할 때만 앱 전용 캐시로 확인·백업 |
| `~/Library/Saved Application State/local.keyboardcat.pet.savedState` | 존재할 때만 저장 상태 확인·백업 |
| `~/Library/Preferences/local.keyboardcat.pet.plist` | 존재할 때만 앱 전용 환경설정 확인·백업 |

4. 위 폴더/파일만 구별해 백업합니다. 상위 `Application Support`, `Library`, `Preferences` 폴더 전체를 지우지 않습니다. 일반 설정 초기화에 사용자 홈 폴더를 검색·재귀 삭제하는 터미널 명령은 필요하지 않습니다.
5. Downloads·Desktop·`~/Applications`에 **Keyboard Cat.app** 복사본이 실제 있는지 확인합니다. 이름만으로 구버전이라고 단정하지 말고 경로·버전·실행 여부를 봅니다. DMG 마운트본은 Finder에서 꺼냅니다. 잘못된 Dock 바로가기는 제거하고 새 설치본으로 다시 만듭니다.
6. CPU에 맞는 최신 파일을 다시 다운로드하고 2장의 설치 절차대로 Applications에 복사합니다.
7. 입력 모니터링을 승인하고 완전히 종료·재실행합니다. 권한 문제가 계속될 때만 6장의 `tccutil` 절차를 적용합니다.
8. 정상 작동을 확인하기 전에는 백업을 버리지 않습니다. 원래 설정을 되돌리려면 앱 종료 후 백업한 해당 항목만 원래 위치로 복원합니다.

재설치해도 macOS가 관리하는 권한 기록은 따로 남을 수 있습니다. 앱 파일·앱 설정·권한 기록을 구분하세요.

## 8. 확인용 터미널 명령: 읽기 전용

정상 설치·업데이트에서는 실행할 필요가 없습니다. 경로나 버전을 확인할 때만 사용합니다. 각 코드 블록은 별도 한 줄입니다.

Applications 폴더를 Finder로 열기:

```sh
open /Applications
```

설치 앱 버전 확인:

```sh
/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' '/Applications/Keyboard Cat.app/Contents/Info.plist'
```

앱 식별자 확인(예상값 `local.keyboardcat.pet`):

```sh
/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' '/Applications/Keyboard Cat.app/Contents/Info.plist'
```

입력 보조 프로그램의 존재와 실행 권한 확인(`-rwx...` 형태인지 확인):

```sh
ls -l '/Applications/Keyboard Cat.app/Contents/MacOS/KeyCounter-mac'
```

앱 서명 무결성 확인(다운로드 출처나 Apple 공증까지 보증하는 검사는 아님):

```sh
codesign --verify --deep --strict --verbose=2 '/Applications/Keyboard Cat.app'
```

서명 검증이 실패하면 임의로 재서명하거나 `chmod`로 덮지 말고 앱 전체를 다시 받아 설치합니다. 통과하더라도 실제 입력 권한 승인은 별도로 필요합니다.

## 9. 계속 실패하면 전달할 진단

리모컨 → **입력 진단 · 이전 앱 확인 → 상태 확인 → 진단 복사**를 사용합니다. 앱 버전과 수정 빌드, OS/CPU, 실제 실행 위치, 보조 프로그램 존재 여부, 연결 상태와 오류 코드, 발견된 앱 복사본을 확인할 수 있습니다. 키 내용과 입력 횟수는 보고서에 포함하지 않습니다. 경로에 사용자 이름이 있을 수 있으므로 공유 전에 사용자 이름 부분을 가리세요.

현재 확인한 Mac CI는 두 CPU의 컴파일·60개 공통 테스트·helper 검사·DMG/ZIP·번들 무결성 검사 성공입니다. 실제 사용자의 입력 모니터링 승인, 물리 키 입력, Spaces·다중 모니터 동작은 기기에서 별도 확인해야 합니다. 유료 Developer ID 서명·Apple 공증은 수행하지 않았습니다.

## 10. 개발자용: 소스 실행·Mac 빌드

설치 파일 사용자는 이 장을 건너뜁니다. 소스 실행에는 Node.js 22.12 이상과 Xcode Command Line Tools가 필요합니다.

```sh
xcode-select --install
npm ci
npm run build
npm test
npm start
```

개발용 터미널/실행 호스트와 설치 앱의 권한은 별개로 취급될 수 있습니다. 설치본 문제를 확인할 때는 위의 Finder 실행 절차로 돌아가세요.

```sh
npm run dist:mac
node scripts/check-mac-package.cjs
```

Windows에서 DMG를 직접 생성하는 절차가 아닙니다. Mac 또는 GitHub Actions **Build macOS**를 사용합니다. workflow는 DMG를 Artifacts로 저장하며 새 Releases를 자동 게시하지 않습니다. 선택적 유료 서명 배포 설정은 [MACOS-DISTRIBUTION.md](MACOS-DISTRIBUTION.md)를 참고하세요.

## 1.3.16 업데이트·정리 안내

비용 보류 방침으로 Mac 표준 자동 교체는 활성화하지 않습니다. 업데이트 버튼으로 DMG를 받은 후 앱 종료 → 응용 프로그램에 대치 → 새 버전 확인 → 이전 DMG·ZIP 정리 순서로 진행합니다. 앱 설정이나 macOS 권한 기록은 지우지 않습니다. 자세한 안내는 [UPDATE-INSTALL.md](UPDATE-INSTALL.md)에 있습니다.
