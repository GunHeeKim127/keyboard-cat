using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Windows.Forms;
// Asynchronous Raw Input sink. No keyboard hook, input suppression, key-name conversion or text logging.
class KeyCounter : NativeWindow, IDisposable {
 [StructLayout(LayoutKind.Sequential)] struct Device { public ushort page,usage;public uint flags;public IntPtr target; }
 [DllImport("user32.dll",SetLastError=true)] static extern bool RegisterRawInputDevices(Device[] devices,uint count,uint size);
 [DllImport("user32.dll")] static extern uint GetRawInputData(IntPtr input,uint command,IntPtr data,ref uint size,uint header);
 readonly int header=IntPtr.Size==8?24:16;
 readonly IntPtr buffer=Marshal.AllocHGlobal(64);
 int pending;
 KeyCounter(){CreateHandle(new CreateParams{Parent=new IntPtr(-3)});}
 bool Register(){return RegisterRawInputDevices(new[]{new Device{page=1,usage=6,flags=0x100,target=Handle}},1,(uint)Marshal.SizeOf(typeof(Device)));}
 void Parse(){
   // Only device type and keydown/up message are interpreted. VKey/MakeCode are never read.
   if(Marshal.ReadInt32(buffer)==1){int message=Marshal.ReadInt32(buffer,header+8);if(message==0x100||message==0x104)pending++;}
 }
 void Clear(){for(int i=0;i<64;i+=8)Marshal.WriteInt64(buffer,i,0);}
 protected override void WndProc(ref Message message){
   if(message.Msg==0xFF){uint size=64;uint copied=GetRawInputData(message.LParam,0x10000003,buffer,ref size,(uint)header);if(copied!=uint.MaxValue&&copied>=header+16)Parse();Clear();}
   base.WndProc(ref message);
 }
 public void Dispose(){DestroyHandle();Clear();Marshal.FreeHGlobal(buffer);}
 static int SelfTest(){using(var counter=new KeyCounter()){
   counter.Clear();Marshal.WriteInt32(counter.buffer,0,1);
   foreach(int message in new[]{0x100,0x101,0x104,0x105}){Marshal.WriteInt32(counter.buffer,counter.header+8,message);counter.Parse();}
   if(counter.pending!=2)return 5;
   if(!counter.Register())return 4;
   Console.WriteLine("RAW_INPUT_TEST_OK");return 0;
 }}
 [STAThread] static int Main(string[] args){
   if(args.Length==1&&args[0]=="--self-test")return SelfTest();
   if(args.Length!=1)return 2;
   Process parent;try{parent=Process.GetProcessById(int.Parse(args[0]));}catch{return 3;}
   using(parent)using(var counter=new KeyCounter()){
    if(!counter.Register())return 4;
    Console.Error.WriteLine("RAW_INPUT_READY");
    var timer=new Timer();timer.Interval=50;
    timer.Tick+=delegate{if(parent.HasExited){Application.Exit();return;}if(counter.pending>0){try{Console.WriteLine(counter.pending);Console.Out.Flush();counter.pending=0;}catch{Application.Exit();}}};
    timer.Start();try{Application.Run();}finally{timer.Stop();timer.Dispose();}
   }return 0;
 }
}
