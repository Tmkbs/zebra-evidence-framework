#!/usr/bin/env python3
"""Render any matched storyboard as narrated MP4, local speech + authored visuals.
Input is the generated batch receipt; no model, external media, or device capture.
"""
import hashlib, json, math, re, shutil, subprocess, sys, tempfile, wave
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

W,H,FPS=1280,720,12
KINDS={"scan_prerequisite","result_discrepancy","configuration_hierarchy","profile_learning","reported_path_comparison"}
FONT=Path("/usr/share/fonts/truetype/dejavu")
def font(size,bold=False):
    return ImageFont.truetype(str(FONT/("DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf")),size)
def cmd(args,**kw):
    return subprocess.run([str(x) for x in args],check=True,timeout=90,**kw)
def stamp(s):
    ms=round(s*1000);h,ms=divmod(ms,3600000);m,ms=divmod(ms,60000);sec,ms=divmod(ms,1000)
    return f"{h:02d}:{m:02d}:{sec:02d}.{ms:03d}"
def wrapped(d,text,f,width):
    result=[];line=""
    for word in text.split():
        if d.textlength(word,font=f)>width:raise ValueError("Unbroken token too long")
        nxt=(line+" "+word).strip()
        if line and d.textlength(nxt,font=f)>width:result.append(line);line=word
        else:line=nxt
    if line:result.append(line)
    return result
def fit(d,text,width,maxlines,size=30,minimum=15,bold=False):
    for n in range(size,minimum-1,-1):
        f=font(n,bold)
        try:lines=wrapped(d,text,f,width)
        except ValueError:continue
        if len(lines)<=maxlines:return f,lines,n
    raise ValueError("Text cannot fit without truncation")
def textblock(d,x,y,text,width,maxlines,size,minimum=15,color="#17393f",bold=False,center=False):
    f,lines,n=fit(d,text,width,maxlines,size,minimum,bold)
    for line in lines:
        d.text((x+(width/2 if center else 0),y),line,font=f,fill=color,anchor="mt" if center else None)
        y+=n+7
    return y
def validate(packet):
    if packet.get("schema")!="zebra-narration-input/v1":raise ValueError("Wrong narration schema")
    m,p=packet["map"],packet["video_plan"]
    if m["schema"]!="zebra-visual-guide/v1" or p["schema"]!="zebra-contextual-clip/v1" or m["kind"] not in KINDS or p["kind"]!=m["kind"]:raise ValueError("Unsupported video")
    if m.get("device_tested") is not False or p.get("device_recording") is not False:raise ValueError("Unverified boundary required")
    columns=m["columns"];nodes={n["id"]:n for n in m["nodes"]};frames=p["frames"]
    ids=[x for col in columns for x in col]
    if len(columns)>4 or not all(1<=len(col)<=2 for col in columns) or len(ids)!=len(set(ids)) or ids!=[f["id"] for f in frames] or not all(i in nodes for i in ids):raise ValueError("Invalid storyboard layout")
    if not any(e.get("quote") for f in frames for e in f["evidence"]):raise ValueError("Evidence required")
    for f in frames:
        node=nodes[f["id"]]
        if f["caption"]!=node["detail"].strip() or f["title"]!=node["title"] or f["evidence"]!=node["evidence"]:raise ValueError("Frame diverges from source map")
        if not 1<=len(f["caption"])<=520:raise ValueError("Incomplete or overlong caption")
    return m,p,nodes
def image_scene(m,p,nodes,index,target):
    im=Image.new("RGB",(W,H),"#f2f6f5");d=ImageDraw.Draw(im)
    d.rounded_rectangle((30,26,W-30,H-26),radius=18,fill="white",outline="#c9ded8",width=2)
    d.text((54,48),"ZEBRA TECHDOCS / SOURCE-LINKED EXPLAINER",font=font(18,True),fill="#377467")
    d.text((W-56,50),f"{index+1} / {len(p['frames'])}",font=font(17,True),fill="#506d70",anchor="ra")
    frame=p["frames"][index]
    textblock(d,54,83,p["title"],1168,2,34,24,bold=True)
    columns=m["columns"];gap=34;width=(1160-gap*(len(columns)-1))//len(columns)
    positions={}
    for i,col in enumerate(columns):
        x=60+i*(width+gap);h=102 if len(col)==2 else 122
        for j,ident in enumerate(col):
            y=168+(j*116 if len(col)==2 else 50)
            positions[ident]=(x,y,x+width,y+h)
    for edge in m["links"]:
        a,b=positions[edge["from"]],positions[edge["to"]]
        x1,y1=a[2]+4,(a[1]+a[3])//2;x2,y2=b[0]-6,(b[1]+b[3])//2
        if x2>x1:
            d.line((x1,y1,x2,y2),fill="#85a9a3",width=3)
            d.polygon([(x2,y2),(x2-10,y2-5),(x2-10,y2+5)],fill="#85a9a3")
    for ident,(x,y,x2,y2) in positions.items():
        active=ident==frame["id"]
        d.rounded_rectangle((x,y,x2,y2),radius=12,fill="#d9efe6" if active else "#f1f5f4",outline="#237c69" if active else "#c1d6d1",width=3 if active else 1)
        textblock(d,x+10,y+14,nodes[ident]["title"],x2-x-20,2,22,14,bold=True,center=True)
        textblock(d,x+10,y+62,nodes[ident]["caption"],x2-x-20,2,16,12,color="#496b66",center=True)
    d.line((54,422,W-54,422),fill="#d3e4df",width=2)
    textblock(d,54,438,frame["title"],1168,1,25,18,bold=True)
    textblock(d,54,478,frame["caption"],1168,4,25,17)
    d.text((54,649),"Conceptual explanation — no device test or verified fix.",font=font(15),fill="#52716d")
    d.text((W-54,649),"Source citations in the accompanying receipt",font=font(15),fill="#52716d",anchor="ra")
    d.rounded_rectangle((54,680,W-54,685),radius=2,fill="#dcece7")
    d.rounded_rectangle((54,680,54+(W-108)*(index+1)/len(p["frames"]),685),radius=2,fill="#24806c")
    im.save(target)
def main():
    if len(sys.argv)!=3:raise SystemExit("build_narrated_clip.py INPUT.json OUTPUT_DIR")
    src,out=Path(sys.argv[1]),Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
    if any((out/name).exists() for name in ("explainer.mp4","explainer.vtt","receipt.json")):raise ValueError("Output already exists")
    m,p,nodes=validate(json.loads(src.read_text(encoding="utf-8")))
    ffmpeg,ffprobe,speech=shutil.which("ffmpeg"),shutil.which("ffprobe"),shutil.which("espeak-ng") or shutil.which("espeak")
    if not all((ffmpeg,ffprobe,speech)):raise RuntimeError("Install FFmpeg and eSpeak-NG")
    cues=[];clock=0
    with tempfile.TemporaryDirectory(prefix="zebra-narration-") as tmpname:
        tmp=Path(tmpname);segments=[]
        for i,frame in enumerate(p["frames"]):
            png,wav,seg=tmp/f"{i}.png",tmp/f"{i}.wav",tmp/f"{i}.mp4"
            image_scene(m,p,nodes,i,png)
            narration=("Developer question: " if frame["status"]=="input" else "")+frame["caption"]
            cmd([speech,"-v","en-us","-s","155","-w",wav,"--stdin"],input=narration,text=True,capture_output=True)
            with wave.open(str(wav),"rb") as sound:spoken=sound.getnframes()/sound.getframerate()
            duration=math.ceil((spoken+0.7)*FPS)/FPS
            cmd([ffmpeg,"-hide_banner","-loglevel","error","-y","-loop","1","-framerate",str(FPS),"-i",png,"-i",wav,"-af","adelay=250:all=1,apad","-t",f"{duration:.6f}","-c:v","libx264","-threads","2","-preset","fast","-tune","stillimage","-crf","23","-pix_fmt","yuv420p","-c:a","aac","-ar","44100","-ac","1","-b:a","64k",seg],capture_output=True)
            cues.append({"frame_id":frame["id"],"title":frame["title"],"narration":narration,"start_seconds":round(clock,3),"duration_seconds":round(duration,3),"evidence":frame["evidence"]})
            clock+=duration;segments.append(seg)
        (tmp/"concat.txt").write_text("".join("file '"+x.name+"'\n" for x in segments),encoding="utf-8")
        video=tmp/"explainer.mp4"
        cmd([ffmpeg,"-hide_banner","-loglevel","error","-y","-f","concat","-safe","0","-i",tmp/"concat.txt","-c","copy","-movflags","+faststart",video],capture_output=True)
        probe=json.loads(cmd([ffprobe,"-v","error","-show_streams","-show_format","-of","json",video],capture_output=True,text=True).stdout)
        streams={x["codec_type"]:x for x in probe["streams"]}
        duration=float(probe["format"]["duration"])
        if streams.get("video",{}).get("codec_name")!="h264" or streams.get("audio",{}).get("codec_name")!="aac" or abs(duration-clock)>2:raise RuntimeError("Incomplete video/audio")
        cmd([ffmpeg,"-v","error","-i",video,"-f","null","-"],capture_output=True)
        levels=cmd([ffmpeg,"-hide_banner","-i",video,"-map","0:a:0","-af","volumedetect","-f","null","-"],capture_output=True,text=True).stderr
        peak=re.search(r"max_volume: (-?\d+(?:\.\d+)?) dB",levels)
        if not peak or float(peak[1])< -35:raise RuntimeError("Missing audible narration")
        receipt={"schema":"zebra-narrated-video-receipt/v1","kind":m["kind"],"title":p["title"],"narration":"local_eSpeak_en_us","video_codec":"h264","audio_codec":"aac","duration_seconds":duration,"bytes":video.stat().st_size,"audio_peak_db":float(peak[1]),"decoded_audio_and_video":True,"video_sha256":hashlib.sha256(video.read_bytes()).hexdigest(),"narration_input_sha256":hashlib.sha256(src.read_bytes()).hexdigest(),"source_links":p["source_links"],"scenes":cues,"device_tested":False,"model_generated":False,"publication_approved":False}
        (out/"explainer.vtt").write_text("WEBVTT\n\n"+"\n\n".join(f"{stamp(c['start_seconds'])} --> {stamp(c['start_seconds']+c['duration_seconds'])}\n{c['narration']}" for c in cues)+"\n",encoding="utf-8")
        shutil.copyfile(video,out/"explainer.mp4")
        (out/"receipt.json").write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
        print(json.dumps({k:receipt[k] for k in ("kind","duration_seconds","bytes","audio_peak_db","decoded_audio_and_video")}))
if __name__=="__main__":main()
