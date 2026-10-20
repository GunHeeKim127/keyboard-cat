#include <ApplicationServices/ApplicationServices.h>
#include <CoreFoundation/CoreFoundation.h>
#include <signal.h>
#include <unistd.h>
#include <errno.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>

// Listen-only tap: never inspect CGEvent fields, key codes, flags or Unicode text.
static CFMachPortRef tap;
static unsigned int pending;
static pid_t parent_pid;
static unsigned int ticks;
static int exit_status;
static void diagnostic(const char *message){fputs(message,stderr);fputc('\n',stderr);fflush(stderr);}
static bool preflight(void){bool allowed=CGPreflightListenEventAccess();diagnostic(allowed?"ACCESS_ALLOWED":"ACCESS_DENIED");return allowed;}
static CFMachPortRef create_tap(void);
static CGEventRef count_event(CGEventTapProxy proxy,CGEventType type,CGEventRef event,void *context){
 (void)proxy;(void)context;
 if(type==kCGEventKeyDown)pending++;
 else if((type==kCGEventTapDisabledByTimeout||type==kCGEventTapDisabledByUserInput)&&tap)CGEventTapEnable(tap,true);
 return event;
}
static void flush_count(CFRunLoopTimerRef timer,void *context){
 (void)timer;(void)context;
 if(kill(parent_pid,0)==-1&&errno==ESRCH){CFRunLoopStop(CFRunLoopGetCurrent());return;}
 if(++ticks%20==0){
  // Preflight is advisory. Keep a working OS-authorized tap alive even when
  // the permission query disagrees; revoked/disabled taps are handled below.
  if(!CFMachPortIsValid(tap)){diagnostic("TAP_INVALID");exit_status=78;CFRunLoopStop(CFRunLoopGetCurrent());return;}
  if(!CGEventTapIsEnabled(tap)){
   CGEventTapEnable(tap,true);
   if(!CGEventTapIsEnabled(tap)){diagnostic("TAP_DISABLED");exit_status=78;CFRunLoopStop(CFRunLoopGetCurrent());return;}
  }
 }
 if(pending){unsigned int count=pending;pending=0;if(printf("%u\n",count)<0||fflush(stdout)!=0)CFRunLoopStop(CFRunLoopGetCurrent());}
}
static CFMachPortRef create_tap(void){
 CFMachPortRef created=CGEventTapCreate(kCGSessionEventTap,kCGTailAppendEventTap,kCGEventTapOptionListenOnly,CGEventMaskBit(kCGEventKeyDown),count_event,NULL);
 diagnostic(created?"TAP_CREATED":"TAP_CREATE_FAILED");return created;
}
int main(int argc,char **argv){
 if(argc==2&&!strcmp(argv[1],"--self-test")){
  count_event(NULL,kCGEventKeyDown,NULL,NULL);count_event(NULL,kCGEventKeyUp,NULL,NULL);count_event(NULL,kCGEventKeyDown,NULL,NULL);
  if(pending!=2)return 5;puts("MAC_COUNTER_TEST_OK");return 0;
 }
 const bool no_prompt=argc==3&&!strcmp(argv[2],"--no-prompt");
 if(argc!=2&&!no_prompt)return 2;char *end=NULL;errno=0;long parent=strtol(argv[1],&end,10);if(!end||*end||errno==ERANGE||parent<=1||(long)(pid_t)parent!=parent)return 2;parent_pid=(pid_t)parent;
 signal(SIGPIPE,SIG_IGN);
 // Let the OS enforce access on the actual listen-only tap. A preflight
 // disagreement must not prevent an otherwise permitted connection.
 preflight();
 tap=create_tap();
 if(!tap&&!preflight()){
  fputs("PERMISSION_REQUIRED\n",stderr);fflush(stderr);
  if(no_prompt)return 77;
  diagnostic(CGRequestListenEventAccess()?"REQUEST_ALLOWED":"REQUEST_DENIED");
  tap=create_tap();
  if(!tap&&!preflight())return 77;
 }
 if(!tap){fputs("EVENT_TAP_UNAVAILABLE\n",stderr);return 78;}
 CFRunLoopSourceRef source=CFMachPortCreateRunLoopSource(kCFAllocatorDefault,tap,0);
 if(!source){fputs("EVENT_TAP_UNAVAILABLE\n",stderr);CFRelease(tap);return 78;}
 CFRunLoopAddSource(CFRunLoopGetCurrent(),source,kCFRunLoopCommonModes);CGEventTapEnable(tap,true);
 if(!CFMachPortIsValid(tap)||!CGEventTapIsEnabled(tap)){diagnostic("TAP_DISABLED");CFRunLoopRemoveSource(CFRunLoopGetCurrent(),source,kCFRunLoopCommonModes);CFRelease(source);CFMachPortInvalidate(tap);CFRelease(tap);return 78;}
 CFRunLoopTimerRef timer=CFRunLoopTimerCreate(kCFAllocatorDefault,CFAbsoluteTimeGetCurrent()+.05,.05,0,0,flush_count,NULL);
 if(!timer){fputs("EVENT_TAP_UNAVAILABLE\n",stderr);CFRelease(source);CFRelease(tap);return 78;}
 CFRunLoopAddTimer(CFRunLoopGetCurrent(),timer,kCFRunLoopCommonModes);
 fputs("INPUT_READY\n",stderr);fflush(stderr);CFRunLoopRun();
 CFRunLoopTimerInvalidate(timer);CFRelease(timer);CFRunLoopRemoveSource(CFRunLoopGetCurrent(),source,kCFRunLoopCommonModes);CFRelease(source);CGEventTapEnable(tap,false);CFMachPortInvalidate(tap);CFRelease(tap);return exit_status;
}
