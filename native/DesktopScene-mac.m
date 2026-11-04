#import <AppKit/AppKit.h>
#import <ApplicationServices/ApplicationServices.h>
#include <unistd.h>
#include <signal.h>
#include <errno.h>
#include <sys/stat.h>
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// Read-only metadata. No screenshots, Apple Events, input injection or AX writes.
static id attribute(AXUIElementRef element, CFStringRef key) {
 CFTypeRef value=NULL;
 if(AXUIElementCopyAttributeValue(element,key,&value)!=kAXErrorSuccess)return nil;
 return CFBridgingRelease(value);
}
static NSDictionary *geometry(CGRect r) {
 if(!isfinite(r.origin.x)||!isfinite(r.origin.y)||!isfinite(r.size.width)||!isfinite(r.size.height)||r.size.width<=0||r.size.height<=0)return nil;
 return @{ @"x":@(r.origin.x),@"y":@(r.origin.y),@"width":@(r.size.width),@"height":@(r.size.height) };
}
static CGRect elementRect(AXUIElementRef element) {
 id p=attribute(element,kAXPositionAttribute),s=attribute(element,kAXSizeAttribute);CGPoint point;CGSize size;
 if(!p||!s||CFGetTypeID((__bridge CFTypeRef)p)!=AXValueGetTypeID()||CFGetTypeID((__bridge CFTypeRef)s)!=AXValueGetTypeID())return CGRectZero;
 if(!AXValueGetValue((__bridge AXValueRef)p,kAXValueCGPointType,&point)||!AXValueGetValue((__bridge AXValueRef)s,kAXValueCGSizeType,&size))return CGRectZero;
 return (CGRect){point,size};
}
static NSString *localPath(id value) {
 NSURL *url=[value isKindOfClass:NSURL.class]?value:([value isKindOfClass:NSString.class]?[NSURL URLWithString:value]:nil);
 if(!url.isFileURL||(url.host.length&&![url.host isEqualToString:@"localhost"]))return nil;
 return url.path.stringByStandardizingPath;
}
static BOOL enterable(NSString *path) {
 struct stat info;
 if(lstat(path.fileSystemRepresentation,&info)||!S_ISDIR(info.st_mode)||S_ISLNK(info.st_mode)||(info.st_flags&(UF_IMMUTABLE|SF_IMMUTABLE)))return NO;
 return access(path.fileSystemRepresentation,R_OK|X_OK)==0;
}
static NSDictionary *snapshot(pid_t excluded,BOOL includeFolders) {
 static NSDictionary *cachedFinder;
 static CFAbsoluteTime lastFinder;
 NSMutableArray *windows=[NSMutableArray array],*folders=[NSMutableArray array],*icons=[NSMutableArray array],*explorers=[NSMutableArray array];
 NSMutableDictionary *finderWindows=[NSMutableDictionary dictionary];
 NSArray *list=CFBridgingRelease(CGWindowListCopyWindowInfo(kCGWindowListOptionOnScreenOnly|kCGWindowListExcludeDesktopElements,kCGNullWindowID));
 pid_t finderPID=0;
 for(NSRunningApplication *app in [NSRunningApplication runningApplicationsWithBundleIdentifier:@"com.apple.finder"])finderPID=app.processIdentifier;
 for(NSDictionary *item in list){
  pid_t pid=[item[(__bridge NSString*)kCGWindowOwnerPID] intValue];
  if(pid==excluded||[item[(__bridge NSString*)kCGWindowLayer] intValue]!=0||[item[(__bridge NSString*)kCGWindowAlpha] doubleValue]<=0)continue;
  CGRect rect;if(!CGRectMakeWithDictionaryRepresentation((__bridge CFDictionaryRef)item[(__bridge NSString*)kCGWindowBounds],&rect)||rect.size.width<120||rect.size.height<80)continue;
  NSDictionary *r=geometry(rect);if(!r)continue;
  NSString *identifier=[item[(__bridge NSString*)kCGWindowNumber] stringValue];if(!identifier)continue;
  [windows addObject:@{@"id":identifier,@"rect":r}];if(pid==finderPID)finderWindows[identifier]=r;
  if(windows.count==128)break;
 }
 BOOL trusted=AXIsProcessTrusted(),available=NO;
 if(includeFolders&&trusted&&cachedFinder&&CFAbsoluteTimeGetCurrent()-lastFinder<2.0){
  NSMutableArray *currentExplorers=[NSMutableArray array];
  for(NSDictionary *view in cachedFinder[@"explorers"])if(finderWindows[view[@"windowId"]])[currentExplorers addObject:view];
  return @{@"windows":windows,@"folders":cachedFinder[@"folders"],@"icons":cachedFinder[@"icons"],@"explorers":currentExplorers,@"foldersAvailable":cachedFinder[@"foldersAvailable"],@"accessibilityRequired":@NO};
 }
 if(includeFolders&&trusted&&finderPID>0){
  NSURL *desktop=[[NSFileManager defaultManager] URLForDirectory:NSDesktopDirectory inDomain:NSUserDomainMask appropriateForURL:nil create:NO error:NULL];
  NSString *root=desktop.path.stringByStandardizingPath;
  // Immediate desktop entries only; never read file contents or recurse into folders.
  NSDirectoryEnumerator *entries=root?[[NSFileManager defaultManager] enumeratorAtURL:desktop includingPropertiesForKeys:@[NSURLIsSymbolicLinkKey] options:NSDirectoryEnumerationSkipsHiddenFiles|NSDirectoryEnumerationSkipsSubdirectoryDescendants errorHandler:^BOOL(NSURL *url,NSError *error){(void)url;(void)error;return NO;}]:nil;
  NSMutableDictionary *paths=[NSMutableDictionary dictionary];
  NSUInteger scanned=0;for(NSURL *entry in entries){if(++scanned>512)break;NSNumber *linked=nil;if(![entry getResourceValue:&linked forKey:NSURLIsSymbolicLinkKey error:NULL]||linked.boolValue)continue;NSString *key=entry.path.stringByStandardizingPath;if(key.length>4096||[key rangeOfCharacterFromSet:NSCharacterSet.controlCharacterSet].location!=NSNotFound)continue;paths[key]=entry;}
  AXUIElementRef finder=AXUIElementCreateApplication(finderPID);AXUIElementSetMessagingTimeout(finder,0.15);
  id roots=attribute(finder,kAXWindowsAttribute);
  NSMutableArray *queue=[NSMutableArray array];if([roots isKindOfClass:NSArray.class])[queue addObjectsFromArray:roots];
  // Finder exposes its desktop differently across releases; its root children
  // cover the desktop without querying other applications' accessibility trees.
  id children=attribute(finder,kAXChildrenAttribute);if([children isKindOfClass:NSArray.class])[queue addObjectsFromArray:children];
  NSMutableSet *seen=[NSMutableSet set],*found=[NSMutableSet set],*mapped=[NSMutableSet set];NSUInteger cursor=0;
  CFAbsoluteTime deadline=CFAbsoluteTimeGetCurrent()+0.35;
  while(cursor<queue.count&&cursor<1800&&CFAbsoluteTimeGetCurrent()<deadline){
   id node=queue[cursor++];if(CFGetTypeID((__bridge CFTypeRef)node)!=AXUIElementGetTypeID()||[seen containsObject:node])continue;[seen addObject:node];
   AXUIElementRef element=(__bridge AXUIElementRef)node;CGRect rect=elementRect(element);NSDictionary *r=geometry(rect);
   BOOL ordinaryWindow=NO;
   if(r)for(NSDictionary *w in finderWindows.allValues)if(fabs([w[@"x"] doubleValue]-rect.origin.x)<3&&fabs([w[@"y"] doubleValue]-rect.origin.y)<3&&fabs([w[@"width"] doubleValue]-rect.size.width)<3&&fabs([w[@"height"] doubleValue]-rect.size.height)<3){ordinaryWindow=YES;break;}
   NSString *p=localPath(attribute(element,kAXURLAttribute));
   if(!ordinaryWindow&&r&&p&&paths[p]&&![found containsObject:p]){
    [found addObject:p];[icons addObject:@{@"id":p,@"rect":r}];if(folders.count<256&&enterable(p))[folders addObject:@{@"id":p,@"rect":r}];
   }
   // A Finder window maps to a folder only through a local AXDocument URL,
   // never its visible title (which can match unrelated folders).
   NSString *document=localPath(attribute(element,kAXDocumentAttribute));
   if(r&&document&&paths[document]&&enterable(document))for(NSString *identifier in finderWindows){
    NSDictionary *w=finderWindows[identifier];if(![mapped containsObject:identifier]&&fabs([w[@"x"] doubleValue]-rect.origin.x)<3&&fabs([w[@"y"] doubleValue]-rect.origin.y)<3&&fabs([w[@"width"] doubleValue]-rect.size.width)<3&&fabs([w[@"height"] doubleValue]-rect.size.height)<3){[mapped addObject:identifier];[explorers addObject:@{@"windowId":identifier,@"folderId":document}];break;}
   }
   // Read only each ordinary Finder window's folder URL, not its item list.
   // Otherwise a window displaying Desktop could masquerade as desktop icons.
   if(!ordinaryWindow){id nested=attribute(element,kAXChildrenAttribute);if([nested isKindOfClass:NSArray.class]&&queue.count<1800){NSUInteger room=1800-queue.count;[queue addObjectsFromArray:[nested subarrayWithRange:NSMakeRange(0,MIN(room,[nested count]))]];}}
  }
  available=entries!=nil&&icons.count>0;CFRelease(finder);
  cachedFinder=@{@"folders":folders,@"icons":icons,@"explorers":explorers,@"foldersAvailable":@(available)};lastFinder=CFAbsoluteTimeGetCurrent();
 }
 return @{@"windows":windows,@"folders":folders,@"icons":icons,@"explorers":explorers,@"foldersAvailable":@(available),@"accessibilityRequired":@(!trusted&&includeFolders)};
}
int main(int argc,const char *argv[]){@autoreleasepool{
 if(argc==2&&!strcmp(argv[1],"--self-test")){
  if(!geometry(CGRectMake(-100,20,80,90))||geometry(CGRectZero)||localPath(@"https://example.com/folder")||![localPath(@"file://localhost/Users/test/Desktop/test") isEqualToString:@"/Users/test/Desktop/test"])return 5;
  NSString *root=[NSTemporaryDirectory() stringByAppendingPathComponent:NSUUID.UUID.UUIDString],*link=[root stringByAppendingPathExtension:@"link"];
  if(![[NSFileManager defaultManager] createDirectoryAtPath:root withIntermediateDirectories:NO attributes:nil error:NULL])return 6;
  BOOL ok=enterable(root)&&symlink(root.fileSystemRepresentation,link.fileSystemRepresentation)==0&&!enterable(link);
  unlink(link.fileSystemRepresentation);rmdir(root.fileSystemRepresentation);if(!ok)return 7;
  // Verify the real Quartz reader against our own temporary window, not a
  // fabricated JSON snapshot. No Finder permission or other app is modified.
  [NSApplication sharedApplication];[NSApp setActivationPolicy:NSApplicationActivationPolicyAccessory];
  NSWindow *probe=[[NSWindow alloc] initWithContentRect:NSMakeRect(120,120,360,220) styleMask:NSWindowStyleMaskTitled backing:NSBackingStoreBuffered defer:NO];
  probe.releasedWhenClosed=NO;[probe orderFrontRegardless];
  [[NSRunLoop currentRunLoop] runUntilDate:[NSDate dateWithTimeIntervalSinceNow:0.15]];
  NSString *identifier=[NSString stringWithFormat:@"%ld",(long)probe.windowNumber];BOOL visible=NO;
  for(NSDictionary *item in snapshot(getppid(),NO)[@"windows"])if([item[@"id"] isEqualToString:identifier]){
   NSDictionary *r=item[@"rect"];NSRect frame=probe.frame;double top=NSMaxY(NSScreen.screens.firstObject.frame)-NSMaxY(frame);
   visible=fabs([r[@"x"] doubleValue]-frame.origin.x)<2&&fabs([r[@"y"] doubleValue]-top)<2&&fabs([r[@"width"] doubleValue]-frame.size.width)<2&&fabs([r[@"height"] doubleValue]-frame.size.height)<2;break;
  }
  [probe close];if(!visible)return 8;
  puts("MAC_SCENE_TEST_OK");return 0;
 }
 if(argc<3||argc>4)return 2;char *end=NULL;errno=0;long raw=strtol(argv[1],&end,10);if(errno||!end||*end||raw<=1||(long)(pid_t)raw!=raw)return 2;
 BOOL watch=!strcmp(argv[2],"--watch"),single=!strcmp(argv[2],"--snapshot"),includeFolders=argc==4&&!strcmp(argv[3],"--folders");if((!watch&&!single)||(argc==4&&!includeFolders))return 2;
 signal(SIGPIPE,SIG_IGN);
 do{@autoreleasepool{
  NSDictionary *scene=snapshot((pid_t)raw,includeFolders);NSData *data=[NSJSONSerialization dataWithJSONObject:scene options:0 error:NULL];if(!data||data.length>256*1024)return 4;
  if(fwrite(data.bytes,1,data.length,stdout)!=data.length||fputc('\n',stdout)==EOF||fflush(stdout))return 4;
 }if(single)return 0;usleep(750000);}while(kill((pid_t)raw,0)==0||errno!=ESRCH);
 return 0;
}}
