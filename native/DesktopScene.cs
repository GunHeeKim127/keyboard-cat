using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Security.Cryptography;
using System.Threading;
using System.Web.Script.Serialization;
using System.Windows.Automation;
using Microsoft.Win32.SafeHandles;

// Read-only scene metadata. No input injection, file changes, window titles,
// screenshots, cross-process memory or third-party window manipulation.
class DesktopScene {
 static readonly SHA256 iconHash=SHA256.Create();
 static readonly Stopwatch clock=Stopwatch.StartNew();static long lastFolders=-10000;
 static List<object> cachedFolders=new List<object>(),cachedExplorers=new List<object>(),cachedIcons=new List<object>();static bool cachedAvailable;
 [StructLayout(LayoutKind.Sequential)] struct Rect {public int left,top,right,bottom;}
 delegate bool EnumProc(IntPtr h,IntPtr data);
 [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc cb,IntPtr data);
 [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")] static extern bool IsIconic(IntPtr h);
 [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h,out Rect r);
 [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h,out uint pid);
 [DllImport("user32.dll",EntryPoint="GetWindowLongW")] static extern uint WindowStyle(IntPtr h,int index);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern int GetClassName(IntPtr h,StringBuilder text,int n);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern IntPtr FindWindowEx(IntPtr parent,IntPtr after,string cls,string title);
 [DllImport("dwmapi.dll")] static extern int DwmGetWindowAttribute(IntPtr h,int attr,out Rect r,int size);
 [DllImport("dwmapi.dll")] static extern int DwmGetWindowAttribute(IntPtr h,int attr,out int value,int size);
 [DllImport("user32.dll")] static extern bool SetProcessDpiAwarenessContext(IntPtr context);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern SafeFileHandle CreateFile(string path,uint access,uint share,IntPtr security,uint disposition,uint flags,IntPtr template);
 // Ask Windows for current-token directory access; never enumerate its contents.
 // Reparse points, encrypted/offline folders and uncertain failures are not entry targets.
 public static bool CanEnterFolder(string path){
  try{var attributes=File.GetAttributes(path);if((attributes&FileAttributes.Directory)==0||(attributes&(FileAttributes.ReparsePoint|FileAttributes.Encrypted|FileAttributes.Offline))!=0)return false;
   using(var handle=CreateFile(path,0x81u,7u,IntPtr.Zero,3u,0x02200000u,IntPtr.Zero))return !handle.IsInvalid;
  }catch{return false;}
 }
 static object Geometry(double x,double y,double w,double h){return new {x=x,y=y,width=w,height=h};}
 static string Canon(string p){try{return Path.GetFullPath(p).TrimEnd('\\').ToUpperInvariant();}catch{return "";}}
 static object Snapshot(int excluded,bool includeFolders){
  var windows=new List<object>();var handles=new HashSet<long>();IntPtr desktopView=IntPtr.Zero;
  EnumWindows(delegate(IntPtr h,IntPtr unused){
   var name=new StringBuilder(128);GetClassName(h,name,128);string cls=name.ToString();
   if(cls=="Progman"||cls=="WorkerW"){var view=FindWindowEx(h,IntPtr.Zero,"SHELLDLL_DefView",null);if(view!=IntPtr.Zero)desktopView=view;return true;}
   uint pid;GetWindowThreadProcessId(h,out pid);int cloaked=0;DwmGetWindowAttribute(h,14,out cloaked,4);
   if(pid==excluded||!IsWindowVisible(h)||IsIconic(h)||cloaked!=0||cls=="Shell_TrayWnd"||cls=="Shell_SecondaryTrayWnd")return true;
   // Tooltips, click-through overlays and no-activate shell canvases are not
   // ordinary application surfaces and must not hide every desktop icon.
   if((WindowStyle(h,-20)&(0x80u|0x20u|0x08000000u))!=0)return true;
   try{using(var process=Process.GetProcessById((int)pid))if(process.ProcessName.Equals("explorer",StringComparison.OrdinalIgnoreCase)&&cls!="CabinetWClass"&&cls!="ExploreWClass")return true;}catch{}
   Rect r;if(DwmGetWindowAttribute(h,9,out r,Marshal.SizeOf(typeof(Rect)))!=0&&!GetWindowRect(h,out r))return true;
   if(r.right-r.left<120||r.bottom-r.top<80)return true;
   handles.Add(h.ToInt64());windows.Add(new {id=h.ToInt64().ToString(),rect=Geometry(r.left,r.top,r.right-r.left,r.bottom-r.top)});return windows.Count<128;
  },IntPtr.Zero);
  var folders=new List<object>();var explorers=new List<object>();var icons=new List<object>();bool foldersAvailable=false;
  if(!includeFolders)return new {windows=windows,folders=folders,icons=icons,explorers=explorers,foldersAvailable=false};
  if(clock.ElapsedMilliseconds-lastFolders<2000)return new {windows=windows,folders=cachedFolders,icons=cachedIcons,explorers=cachedExplorers,foldersAvailable=cachedAvailable};
  // Only immediate local desktop directories; never descend into their contents.
  var directories=new Dictionary<string,string>(StringComparer.OrdinalIgnoreCase);
  var files=new HashSet<string>(StringComparer.OrdinalIgnoreCase);
  foreach(string root in new[]{Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory),Environment.GetFolderPath(Environment.SpecialFolder.CommonDesktopDirectory)}){
   try{foreach(string p in Directory.EnumerateDirectories(root)){if(directories.Count>=256)break;directories[Path.GetFileName(p)]=Canon(p);}foreach(string p in Directory.EnumerateFiles(root)){if(files.Count>=512)break;files.Add(Path.GetFileName(p));files.Add(Path.GetFileNameWithoutExtension(p));}}catch{}
  }
  if(desktopView!=IntPtr.Zero)try{
   var list=FindWindowEx(desktopView,IntPtr.Zero,"SysListView32",null);
   if(list!=IntPtr.Zero){var items=AutomationElement.FromHandle(list).FindAll(TreeScope.Children,new PropertyCondition(AutomationElement.ControlTypeProperty,ControlType.ListItem));
    for(int i=0;i<items.Count&&i<512;i++){var item=items[i].Current;string p;bool folder=directories.TryGetValue(item.Name,out p);if((!folder&&!files.Contains(item.Name))||item.IsOffscreen)continue;var r=item.BoundingRectangle;if(r.IsEmpty||r.Width<1||r.Height<1)continue;var rect=Geometry(r.X,r.Y,r.Width,r.Height);icons.Add(new {id=folder?p:"file-icon-"+BitConverter.ToString(iconHash.ComputeHash(Encoding.UTF8.GetBytes(item.Name))).Replace("-",""),rect=rect});if(folder&&CanEnterFolder(p))folders.Add(new {id=p,rect=rect});}foldersAvailable=true;
   }
  }catch{}
  object shell=null,views=null;try{
   shell=Activator.CreateInstance(Type.GetTypeFromProgID("Shell.Application"));dynamic sh=shell;views=sh.Windows();dynamic all=views;
   int count=Math.Min(128,(int)all.Count);for(int i=0;i<count;i++){object view=null;try{view=all.Item(i);dynamic v=view;long h=(long)v.HWND;if(!handles.Contains(h))continue;string url=(string)v.LocationURL;Uri uri;if(!Uri.TryCreate(url,UriKind.Absolute,out uri)||!uri.IsFile||uri.IsUnc)continue;explorers.Add(new {windowId=h.ToString(),folderId=Canon(uri.LocalPath)});}catch{}finally{if(view!=null&&Marshal.IsComObject(view))Marshal.ReleaseComObject(view);}}
  }catch{}finally{if(views!=null&&Marshal.IsComObject(views))Marshal.ReleaseComObject(views);if(shell!=null&&Marshal.IsComObject(shell))Marshal.ReleaseComObject(shell);}
  cachedFolders=folders;cachedExplorers=explorers;cachedIcons=icons;cachedAvailable=foldersAvailable;lastFolders=clock.ElapsedMilliseconds;
  return new {windows=windows,folders=folders,icons=icons,explorers=explorers,foldersAvailable=foldersAvailable};
 }
 [STAThread] static int Main(string[] args){
  Console.OutputEncoding=new UTF8Encoding(false); // The Electron pipe always decodes UTF-8, including Korean paths.
  try{SetProcessDpiAwarenessContext(new IntPtr(-4));}catch{}
  int pid;if((args.Length!=2&&args.Length!=3)||!int.TryParse(args[0],out pid)||pid<=1)return 2;
  Process parent;try{parent=Process.GetProcessById(pid);}catch{return 3;}
  var json=new JavaScriptSerializer();using(parent){do{try{Console.WriteLine(json.Serialize(Snapshot(pid,args.Length==3&&args[2]=="--folders")));Console.Out.Flush();}catch{return 4;}if(args[1]=="--snapshot")return 0;if(args[1]!="--watch")return 2;Thread.Sleep(750);}while(!parent.HasExited);}return 0;
 }
}
