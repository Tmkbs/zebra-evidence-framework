#!/usr/bin/env python3
"""Build the reviewed DataWedge 15.0 concept explainer with an actual audio track.
Uses only authored graphics, the local eSpeak synthesizer, Pillow and ffmpeg.
No model, customer data, network media, or recording of a real device.
"""
from pathlib import Path
import json, math, shutil, subprocess, tempfile, wave, re
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "classroom" / "media"
SOURCE = "https://techdocs.zebra.com/datawedge/15-0/guide/profiles/"
SCENES = [
    ("What is a profile?", "A DataWedge profile defines how data is captured, optionally formatted, and delivered to an associated application.", -1),
    ("1. Input", "Input controls how data is acquired. For example, a barcode scan provides the data to be processed.", 0),
    ("2. Process", "Processing can format the captured data if needed. This stage is optional.", 1),
    ("3. Output", "Output controls how the data reaches the associated app. A profile connects these stages from capture to delivery.", 2),
]
W,H,FPS=960,540,15
FONT_DIR=Path("/usr/share/fonts/truetype/dejavu")
def font(size,bold=False):
    return ImageFont.truetype(str(FONT_DIR / ("DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf")),size)
F = {k:font(*v) for k,v in {"k":(13,True),"title":(31,True),"box":(21,True),"sub":(15,False),"caption":(22,False),"footer":(12,False)}.items()}
def run(args,**kw):
    return subprocess.run([str(x) for x in args],check=True,**kw)
def wrap(draw,text,f,width):
    lines=[]; cur=""
    for word in text.split():
        nxt=(cur+" "+word).strip()
        if cur and draw.textlength(nxt,font=f)>width:
            lines.append(cur);cur=word
        else:cur=nxt
    if cur:lines.append(cur)
    return lines
def frame(scene_idx,t,duration):
    title,caption,focus=SCENES[scene_idx]
    im=Image.new("RGB",(W,H),"#f3f7f5");d=ImageDraw.Draw(im)
    d.rounded_rectangle((26,23,934,517),radius=19,fill="#ffffff",outline="#d4e4de",width=2)
    d.text((54,45),"ZEBRA TECHDOCS  /  CONCEPT EXPLAINER",font=F["k"],fill="#376c64")
    d.text((54,75),title,font=F["title"],fill="#193d40")
    d.text((54,120),"How a DataWedge 15.0 profile handles data",font=F["sub"],fill="#536f70")
    labels=[("Input","Capture data"),("Process","Optional formatting"),("Output","Deliver data"),("App","Use the data")]
    boxes=[]
    for i,(label,sub) in enumerate(labels):
        x=54+i*223; box=(x,184,x+183,285);boxes.append(box)
        on=focus==i or (focus==2 and i==3)
        d.rounded_rectangle(box,radius=12,fill="#dbeee6" if on else "#eef3f2",outline="#2f8270" if on else "#bbd1cd",width=3 if on else 1)
        d.text((x+91,214),label,font=F["box"],fill="#1b554b",anchor="mm")
        d.text((x+91,250),sub,font=F["sub"],fill="#416b65",anchor="mm")
    for i in range(3):
        x=boxes[i][2]+6;y=234;end=boxes[i+1][0]-6
        d.line((x,y,end,y),fill="#74a99d",width=3)
        d.polygon([(end,y),(end-9,y-5),(end-9,y+5)],fill="#74a99d")
    # Animate a data token along the current stage, not a device simulation.
    idx=focus if focus>=0 else min(2,int(t/max(duration,0.1)*3))
    a=boxes[idx][0]+24;b=boxes[min(idx+1,3)][0]+24
    dot_x=a+(b-a)*((t/2.1)%1)
    d.line((a,310,b,310),fill="#b1d2c8",width=4)
    d.ellipse((dot_x-7,303,dot_x+7,317),fill="#188476")
    d.text((54,343),"EXPLANATION",font=F["k"],fill="#39776d")
    lines=wrap(d,caption,F["caption"],850)
    if len(lines)>3:raise RuntimeError("Caption would overflow")
    for i,line in enumerate(lines):d.text((54,370+i*29),line,font=F["caption"],fill="#24494a")
    d.text((54,473),"Source: DataWedge 15.0 Profiles · Conceptual illustration, not a device test.",font=F["footer"],fill="#536f70")
    d.rounded_rectangle((54,495,906,500),radius=3,fill="#dfebe7")
    d.rounded_rectangle((54,495,54+852*min(1,(scene_idx+t/duration)/len(SCENES)),500),radius=3,fill="#237e6d")
    return im
def stamp(seconds):
    ms=round(seconds*1000);h,ms=divmod(ms,3600000);m,ms=divmod(ms,60000);s,ms=divmod(ms,1000)
    return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"
def main():
    ffmpeg=shutil.which("ffmpeg"); ffprobe=shutil.which("ffprobe")
    speech=shutil.which("espeak-ng") or shutil.which("espeak")
    if not all((ffmpeg,ffprobe,speech)):raise RuntimeError("ffmpeg, ffprobe and eSpeak are required")
    OUT.mkdir(parents=True,exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="zebra-narrated-") as temp:
        tmp=Path(temp); segments=[]; cues=[]; clock=0
        for i,(title,caption,focus) in enumerate(SCENES):
            wav=tmp/f"speech-{i}.wav";seg=tmp/f"scene-{i}.mp4"
            run([speech,"-v","en-us","-s","148","-w",wav,caption])
            with wave.open(str(wav),"rb") as audio: spoken=audio.getnframes()/audio.getframerate()
            count=math.ceil((spoken+0.85)*FPS);duration=count/FPS
            args=[ffmpeg,"-hide_banner","-loglevel","error","-y","-f","rawvideo","-pix_fmt","rgb24","-s",f"{W}x{H}","-r",str(FPS),"-i","pipe:0","-i",str(wav),"-af","adelay=250:all=1,apad","-t",f"{duration:.6f}","-c:v","libx264","-threads","2","-preset","fast","-crf","22","-pix_fmt","yuv420p","-c:a","aac","-ar","44100","-ac","1","-b:a","64k",str(seg)]
            proc=subprocess.Popen(args,stdin=subprocess.PIPE)
            try:
                for n in range(count):proc.stdin.write(frame(i,n/FPS,duration).tobytes())
                proc.stdin.close()
            finally:
                rc=proc.wait()
            if rc!=0:raise RuntimeError("Scene rendering failed")
            segments.append(seg);cues.append({"title":title,"narration":caption,"start_seconds":round(clock,3),"duration_seconds":round(duration,3)})
            clock+=duration
        (tmp/"concat.txt").write_text("".join("file '"+p.name+"'\n" for p in segments),encoding="utf-8")
        target=OUT/"datawedge-profiles.mp4"
        run([ffmpeg,"-hide_banner","-loglevel","error","-y","-f","concat","-safe","0","-i",tmp/"concat.txt","-c","copy","-movflags","+faststart",target])
        probe=json.loads(run([ffprobe,"-v","error","-show_streams","-show_format","-of","json",target],capture_output=True,text=True).stdout)
        tracks={x["codec_type"]:x for x in probe["streams"]}
        if tracks.get("video",{}).get("width")!=W or tracks.get("audio",{}).get("codec_name")!="aac":raise RuntimeError("Expected video and AAC narration")
        if float(probe["format"]["duration"])<15:raise RuntimeError("Incomplete clip")
        run([ffmpeg,"-v","error","-i",target,"-f","null","-"])
        levels=run([ffmpeg,"-hide_banner","-i",target,"-map","0:a:0","-af","volumedetect","-f","null","-"],capture_output=True,text=True).stderr
        match=re.search(r"max_volume: (-?\d+(?:\.\d+)?) dB",levels)
        if not match or float(match[1])< -35:raise RuntimeError("Audio is silent or too quiet")
        (OUT/"datawedge-profiles.vtt").write_text("WEBVTT\n\n"+"\n\n".join(f"{stamp(c['start_seconds'])} --> {stamp(c['start_seconds']+c['duration_seconds'])}\n{c['narration']}" for c in cues)+"\n",encoding="utf-8")
        receipt={"source":SOURCE,"edition":"15.0","kind":"authored_concept_explainer","narration":"offline_eSpeak_en_us","audio_codec":"aac","video_codec":"h264","duration_seconds":float(probe["format"]["duration"]),"bytes":target.stat().st_size,"audio_peak_db":float(match[1]),"decoded_audio_and_video":True,"model_calls":0,"device_tested":False,"scenes":cues}
        (OUT/"datawedge-profiles.json").write_text(json.dumps(receipt,indent=2)+"\n",encoding="utf-8")
        print("VERIFIED narrated MP4:",json.dumps({k:receipt[k] for k in ["duration_seconds","bytes","audio_peak_db","decoded_audio_and_video"]}))
if __name__=="__main__":main()
