# 2.4.0 보안 수정·검증 기록

## 범위

의존성 보안 공지 대조, 앱의 외부 입력·업데이트·파일 접근 회귀 검사, 패키지 실행 검사와 배포 파일 검증을 구분합니다. 알려진 의존성 취약점 0건은 모든 보안 결함이 없다는 뜻이 아닙니다. 실제 Mac의 입력 모니터링 승인은 사용자 설정이며 앱이 우회하지 않습니다.

## 수정

- Vite 6.4.5: 개발 서버의 파일 차단 우회 수정. 앱 배포본은 개발 서버를 실행하지 않습니다.
- minimatch 11.0.1: 패턴 처리의 과도한 자원 사용 수정.
- glob 14.0.2: 취소된 파일 검색이 계속되는 문제 수정.
- electron-builder 26.18.0 및 ASAR 4.3.1: 수정된 하위 라이브러리를 사용합니다. npm의 오래된 빌드 도구로 되돌리라는 일괄 제안은 적용하지 않습니다.
- 오래된 폴더 비교·임시 파일 정리 도구의 호출 방식 두 곳을 `scripts/build-tool-compat.cjs`에서 명시적으로 변환합니다. 설치 때 재적용하며 예상 코드가 바뀌면 실패합니다. 취약 버전을 숨기거나 보안 경고를 제외하지 않습니다.
- 레지스트리는 HTTPS로 검사하고, CI에서도 개발 도구를 포함한 전체 의존성을 검사합니다.
- 배포 빌드는 검토한 상호작용 PNG 732개의 원본·제작 코드·출력 해시를 확인하고 그대로 사용합니다. ARM 이미지 처리의 반올림 차이로 다른 그림이 재생성되는 것을 방지합니다. 수정·누락·추가·오래된 제작 원본은 검증에서 거부합니다.

공식 수정 공지:

- https://github.com/advisories/GHSA-8g5g-mxqh-grgj
- https://github.com/advisories/GHSA-g3hv-75wg-m249
- https://github.com/advisories/GHSA-3g3m-2fjr-6pw4

## 검증 항목

- 잠금 파일을 이용한 새 설치, 패턴 필터·폴더 비교·ASAR 묶기/풀기·제한된 임시 파일 정리 호환성 검사.
- 타입 검사·전체 빌드·자동 회귀 검사.
- 신뢰하지 않는 페이지/IPC/외부 URL 차단, 업데이트 출처·서명·크기·해시, 경로 이탈·연결·중단·손상 파일·복구 검사.
- 실제 Windows 패키지의 기존 동물·콤보·설정·들기·멀티모니터·이미지 전환 검사.
- Mac은 CI 패키지·런처 복구 검사를 실행하고, 담당자의 실제 기기 입력 권한 확인은 별도로 남깁니다.

유료 서명·macOS 공증 및 OS 권한 자동 변경은 수행하지 않습니다. 기능 묶음의 기존 자체 서명은 공개 키 검증을 유지하기 위한 것으로 Apple 인증과 다릅니다.

## 최종 결과 (2026-11-03)

실행 의존성·전체 개발 도구의 공식 npm HTTPS 취약점 검사 0건. 새 설치·전체 자동 검사 211개, 세 운영체제 패키지 보안·동작·업데이트 복구 검사, 별도 Mac 전달 파일 검사를 통과했습니다. Windows 백신으로 로컬 실행 폴더와 최종 배포 폴더를 검사해 탐지 0건이었습니다. 업로드 대상의 비밀키·GitHub 토큰 패턴 검사에서는 발견 항목이 없었습니다. 이 검사는 전면적인 침투 테스트나 모든 악성 코드·미공개 취약점의 부재를 보증하지 않습니다. 실제 Mac TCC 승인·물리 키보드 입력은 담당자가 확인해야 합니다.

소스: 05fa97126920866499edfd6f7476088d67ed5212. [빌드·실행 검사](https://github.com/GunHeeKim127/keyboard-cat/actions/runs/41629433243), [Mac 전달 파일 검사](https://github.com/GunHeeKim127/keyboard-cat/actions/runs/41630407778), [배포](https://github.com/GunHeeKim127/keyboard-cat/releases/tag/v2.4.0).

## 2.4.1 검증 (2026-11-04)

입력 화면 갱신을 기존 주기에 합치고 변하지 않은 네이티브 좌표 변환을 재사용했습니다. 키 내용은 기록하지 않으며 Windows Raw Input·Mac listen-only 입력 방식을 유지합니다. 세 플랫폼 CI의 공식 npm HTTPS 취약점 검사, 전체 자동 검사, 패키지 보안·복구 검사와 별도 Mac 전달 파일 검사를 통과했습니다. 로컬 자동 검사 216개 통과. 최종 배포 묶음의 서명·해시·1703 PNG 일치와 Windows 백신 검사를 확인했습니다. 미공개 취약점 부재나 실제 외부 앱 입력 지연 해소를 보증하는 검사는 아닙니다. Mac ARM 화면 반영 지연 구간은 추가 실기 확인 대상입니다.

소스 0967930762b1dd4f0613d3d0e79034759dbe48fc. [빌드 검사](https://github.com/GunHeeKim127/keyboard-cat/actions/runs/41637687182), [Mac 전달 파일 검사](https://github.com/GunHeeKim127/keyboard-cat/actions/runs/41741093640), [릴리스](https://github.com/GunHeeKim127/keyboard-cat/releases/tag/v2.4.1).

## 2.5.0 배포 확인 (2026-11-04)

Mac 위치 수집 보조 프로그램은 창 위치와 Finder 최상위 바탕화면 메타데이터를 읽습니다. 파일 내용·창 제목을 읽거나 변경하지 않고, Apple Events·화면 캡처·입력 주입·접근성 쓰기를 하지 않습니다. 파일 항목 512개, 접근성 탐색 개수·시간 제한과 캐시를 사용합니다. 잠긴 폴더·심볼릭 링크·확인 불가한 폴더는 출입 대상으로 사용하지 않습니다. OS 권한 DB·보안 설정은 변경하지 않습니다.

공식 npm HTTPS 취약점 검사, 자동 검사 218개, Windows·Mac 두 종류의 패키지 보안·모션·업데이트 복구 및 실제 Mac 전달 파일 검사를 통과했습니다. 자체 서명·해시·1703 PNG 일치 및 Windows 최종 배포 폴더 백신 탐지 0건을 확인했습니다. 실제 Finder·사용자 권한 변경·물리 입력은 담당자 실기 확인 항목입니다. 초기 프레임 지연의 정확한 원인은 미확정이며 전면적인 성능·침투 테스트를 의미하지 않습니다.

소스 6818aea87c5792cc86ccb7f3b89f9eed98b7ccd9. [최종 빌드 검사](https://github.com/GunHeeKim127/keyboard-cat/actions/runs/41810706770), [Mac 전달 파일 검사](https://github.com/GunHeeKim127/keyboard-cat/actions/runs/41811770874), [릴리스](https://github.com/GunHeeKim127/keyboard-cat/releases/tag/v2.5.0). Intel DMG의 임시 디스크 분리 실패 후보는 배포하지 않고 기존 기록을 보존한 채 새 검사 실행의 파일을 사용했습니다.

## 2.5.1 배포 확인 (2026-11-05)

좌표·모니터 영역 검증, 네이티브 호출 실패 시 이동 계획 취소 및 제한된 재시도를 추가했습니다. 첫 키 입력 우선·자율 행동 무작위 선택·파일 끝 이탈 검사를 포함한 자동 검사 228개를 통과했습니다. Windows·Mac 두 종류 패키지 보안·이미지·업데이트 복구, Mac 전달 파일 검사, 자체 서명·해시·기존 1703 PNG 일치 및 최종 배포 폴더 백신 탐지 0건을 확인했습니다. npm 취약점 검사에서 알려진 취약점 0건입니다. 실제 Mac 사용자 권한 변경·Finder·물리 입력이나 전체 침투 테스트를 의미하지 않습니다.

소스 677034c3e19b5cde765edd5a12df9e1394cb1e4a. [빌드 검사](https://github.com/GunHeeKim127/keyboard-cat/actions/runs/41938392950), [Mac 전달 검사](https://github.com/GunHeeKim127/keyboard-cat/actions/runs/41939592114), [릴리스](https://github.com/GunHeeKim127/keyboard-cat/releases/tag/v2.5.1).
