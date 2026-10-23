import type {CoreFailure} from './core-store';
export function coreFailureInfo(f:CoreFailure|undefined,platform:string){
 if(!f)return undefined;
 const reasons={permission:'키보드 입력 권한을 확인하지 못했어요.',input:'입력 보조 프로그램의 준비를 확인하지 못했어요.',screen:'새 앱의 화면과 첫 이미지를 확인하지 못했어요.',crash:'새 앱이 정상 시작 확인 전에 종료됐어요.',interrupted:'업데이트 전환 도중 앱이나 PC가 종료됐어요.',verification:'업데이트 파일의 서명이나 내용을 확인하지 못했어요.',download:'업데이트 파일을 모두 받지 못했어요.',switch:'업데이트 전환 또는 설정 저장을 완료하지 못했어요.'};
 const guide=f.code==='permission'&&platform==='darwin'?'시스템 설정 → 개인정보 보호 및 보안 → 입력 모니터링에서 Keyboard Cat을 허용하세요. 응용 프로그램 폴더의 같은 앱을 사용하고, 권한을 바꿨다면 리모컨에서 입력 다시 연결을 누른 뒤 다시 시도하세요.':f.code==='input'?'리모컨의 입력 진단에서 입력 보조 프로그램 상태를 확인하고 입력 다시 연결을 누르세요.':f.code==='download'?'인터넷 연결과 저장 공간을 확인한 뒤 다시 시도하세요.':f.code==='verification'?'파일을 직접 수정하거나 보안 검사를 끄지 마세요. 업데이트를 다시 확인해 공식 릴리스 파일을 받으세요.':'현재 버전은 계속 사용할 수 있어요. 저장 공간과 입력 진단을 확인한 뒤 다시 시도하거나 이번 업데이트를 취소하세요.';
 return {version:f.version,at:f.at,code:f.code,cancelled:f.cancelled,resolved:f.resolved,reason:reasons[f.code],guidance:guide};
}
