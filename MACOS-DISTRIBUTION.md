# macOS 일반 사용자 배포

현재의 ad-hoc 빌드는 Apple 공증이 없어 Gatekeeper가 차단할 수 있습니다. 앱 내부 코드로 이 알림을 없앨 수 없습니다. 터미널이나 보안 예외 설정 없이 배포하려면 Apple Developer Program의 Developer ID Application 인증서로 서명하고 Apple 공증을 받아야 합니다. 기존 DMG에는 새 설정이 소급 적용되지 않습니다.

## 배포자 최초 설정

1. Apple Developer 계정에서 **Developer ID Application** 인증서를 발급하고 개인 키를 포함한 암호화된 `.p12`로 내보냅니다. Apple Development나 Mac App Distribution 인증서로 대체하지 마세요.
2. GitHub 저장소 → Settings → Secrets and variables → Actions → New repository secret에 아래 항목을 등록합니다. 인증서·비밀번호를 소스, 이슈, 채팅에 붙여 넣지 마세요.

| Secret | 값 |
| --- | --- |
| MAC_CSC_LINK | 개인 키를 포함한 .p12 파일의 Base64 문자열 |
| MAC_CSC_KEY_PASSWORD | .p12 내보내기 암호 |
| APPLE_ID | 공증에 사용할 Apple 계정 이메일 |
| APPLE_APP_SPECIFIC_PASSWORD | 해당 계정의 앱 전용 암호 |
| APPLE_TEAM_ID | Developer Program Team ID |

3. 변경 내용을 직접 커밋·푸시합니다.
4. Actions → Build macOS → Run workflow에서 **Developer ID signing and Apple notarization**을 체크하고 실행합니다.
5. 성공한 실행의 이름과 내려받을 아티팩트 끝이 **Notarized**인지 확인합니다. 일반 push 빌드는 계속 Unnotarized 테스트 빌드입니다.
6. 아티팩트를 풀어 나온 DMG 자체를 GitHub Releases에 첨부해 배포합니다. 사용자에게 소스 ZIP이나 여러 설치 파일을 묶은 ZIP을 전달하지 않습니다.

인증 정보가 없으면 서명 빌드는 명확히 실패합니다. 서명 실패를 무시하거나 무공증 빌드로 대체하지 않습니다. 앱과 포함된 입력 보조 프로그램 모두 서명 대상이며, hardened runtime과 Apple 공증을 활성화합니다. 빌드 후 앱의 Gatekeeper 승인, 공증 티켓, 보조 프로그램의 Developer ID·타임스탬프·서명 팀을 검사합니다. 인증 정보가 아직 등록되지 않아 이 경로의 실제 서명·공증 성공은 확인하지 못했습니다.

## 이미 받은 무공증 앱을 터미널 없이 열기

신뢰하는 배포본인지 확인한 뒤 앱을 Applications로 옮기고 한 번 실행합니다. 차단 창에서 ‘완료’를 누른 후 **시스템 설정 → 개인정보 보호 및 보안 → 보안 → 확인 없이 열기(Open Anyway)**를 선택하고 인증합니다. 맥의 관리 정책에 따라 이 항목이 제한될 수 있습니다. 이 절차는 무공증 버전에 대한 수동 허용입니다.

공증 후에도 macOS의 최초 인터넷 다운로드 확인 및 키 입력 횟수 감지를 위한 개인정보 권한 허용은 별도로 나타날 수 있습니다.

공식 안내: https://support.apple.com/ko-kr/102445
공식 빌드 문서: https://www.electron.build/v26/docs/notarization/
