#!/usr/bin/env python3
"""Render a reviewed visual plan into an actual narrated, captioned MP4.
No generative model, external media, device simulation, or network request.
The input must come from the repository's evidence-gated narration planner.
"""
import hashlib, json, math, os, re, shutil, subprocess, sys, tempfile, wave
from pathlib import Path
from urllib.parse import urlparse
from PIL import Image, ImageDraw, ImageFont

W,H,FPS=960,540,12
def run(args,**kw):
    return subprocess.run([str(a) for a in args],check=True,**kw)
def font(size,bold=False):
    names=[os.environ.get("ZEBRA_FONT_BOLD" if bold else "ZEBRA_FONT"),
           "/usr/share/fonts/truetype/dejavu/"+("DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"),
           "C:/Windows/Fonts/"+("arialbd.ttf" if bold else "arial.ttf"),
           "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"]
    for name in names:
        if name:
            try: return ImageFont.truetype(name,size)
            except OSError: pass
    raise RuntimeError("Install DejaVu Sans or set ZEBRA_FONT and ZEBRA_FONT_BOLD")
def wrap(d,s,f,maxw):
    lines=[];line=""
    for word in s.split():
        if d.textlength(word,font=f)>maxw: raise ValueError("Unbreakable text too wide")
        nxt=(line+" "+word).strip()
        if line and d.textlength(nxt,font=f)>maxw: lines.append(line);line=word
        else: line=nxt
    if line:lines.append(line)
    return lines
def fit(d,s,w,max_lines,initial=27,min_size=13,bold=False):
    for n in range(initial,min_size-1,-1):
        f=font(n,bold)
        try: lines=wrap(d,s,f,w)
        except ValueError: continue
        if len(lines)<=max_lines: return f,lines
    raise ValueError("Text exceeds the reviewed scene layout")
def center(d,text,x,y,w,h,color,size=22,bold=True):
    f,lines=fit(d,text,w-18,3,size,12,bold)
    step=f.size+4
    for i,line in enumerate(lines):
        d.text((x+w/2,y+h/2+(i-(len(lines)-1)/2)*step),line,font=f,fill=color,anchor="mm")
def frame(plan,idx):
    f=plan["frames"][idx];im=Image.new("RGB",(W,H),"#f2f6f5");d=ImageDraw.Draw(im)
    d.rounded_rectangle((22,20,938,520),radius=18,fill="#ffffff",outline="#cfded9",width=2)
    d.text((46,40),"ZEBRA TECHDOCS  /  SOURCE-LINKED CONCEPT EXPLANATION",font=font(14,True),fill="#247065")
    titlefont,lines=fit(d,plan["title"],868,1,30,16,True)
    d.text((46,67),lines[0],font=titlefont,fill="#173c42")
    d.text((46,111),f"STEP {idx+1} / {len(plan['frames'])}   ·   {f['title']}",font=font(19,True),fill="#34665f")
    nodes={n["id"]:n for n in plan["diagram_nodes"]};columns=plan["columns"];active=f["id"]
    if plan["scene"]=="containment":
        for j,key in enumerate(["main","plugin","params"]):
            x,y=55+j*34,145+j*42;w,h=610-j*68,155-j*42
            d.rounded_rectangle((x,y,x+w,y+h),radius=11,fill="#d8eee5" if key==active else "#f2f6f5",outline="#08796d" if key==active else "#aac4bd",width=3 if key==active else 1)
            d.text((x+14,y+10),nodes[key]["caption"],font=font(21,True),fill="#174b43")
        d.rounded_rectangle((693,178,902,274),radius=10,fill="#fff2df" if active=="boundary" else "#eef3f2",outline="#a9c1bd",width=2)
        center(d,"Validate actual values and device behavior",693,178,209,96,"#305453",18)
    else:
        cols=len(columns);gap=20;bw=(860-(cols-1)*gap)/cols
        for j,col in enumerate(columns):
            x=50+j*(bw+gap)
            if j:
                ax=x-gap+2;ay=220
                d.line((ax,ay,x-4,ay),fill="#83aaa2",width=3);d.polygon([(x-4,ay),(x-12,ay-5),(x-12,ay+5)],fill="#83aaa2")
            for k,key in enumerate(col):
                bh=135 if len(col)==1 else 66;y=151+k*74
                d.rounded_rectangle((x,y,x+bw,y+bh),radius=10,fill="#d8eee5" if key==active else "#edf4f2",outline="#08796d" if key==active else "#bed0cc",width=3 if key==active else 1)
                label=nodes[key]["title"]
                if key in ("overview","prototype"):label=nodes[key]["caption"]
                center(d,label,x,y,bw,bh,"#174b43",21)
    d.text((46,313),"NARRATION / CAPTIONS",font=font(13,True),fill="#247065")
    cf,rows=fit(d,f["narration"],868,4,23,16)
    for i,line in enumerate(rows):d.text((46,338+i*(cf.size+5)),line,font=cf,fill="#24494d")
    sources=list(dict.fromkeys(e.get("url","") for e in f.get("evidence",[]) if e.get("url"))) or plan["source_links"]
    host=urlparse(sources[0]).hostname if sources else "reviewed source"
    label=host+("  ·  See receipt for exact passages" if host else "")
    d.text((46,469),label+"  |  Conceptual illustration · device result unverified",font=font(12),fill="#536e70")
    d.rounded_rectangle((46,496,910,502),radius=3,fill="#e4edeb")
    d.rounded_rectangle((46,496,46+864*(idx+1)/len(plan["frames"]),502),radius=3,fill="#218474")
    return im
def stamp(seconds):
    ms=round(seconds*1000);h,ms=divmod(ms,3600000);m,ms=divmod(ms,60000);s,ms=divmod(ms,1000)
    return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"
def main(plan_path,out):
    raw=plan_path.read_bytes();plan=json.loads(raw)
    if plan.get("schema")!="zebra-narrated-clip-plan/v1" or plan.get("kind") not in ("scan_prerequisite","result_discrepancy","configuration_hierarchy","profile_learning","reported_path_comparison"):raise ValueError("Unsupported narration plan")
    frames=plan["frames"]
    if not 1<=len(frames)<=12 or not any(e.get("quote") for f in frames for e in f.get("evidence",[])):raise ValueError("Reviewed evidence required")
    if any(not isinstance(f.get("narration"),str) or not 1<=len(f["narration"])<=520 for f in frames):raise ValueError("Invalid narration length")
    ffmpeg=shutil.which("ffmpeg");probe=shutil.which("ffprobe");speech=shutil.which("espeak-ng") or shutil.which("espeak")
    if not all((ffmpeg,probe,speech)):raise RuntimeError("Install ffmpeg, ffprobe and eSpeak NG (or eSpeak)")
    out.mkdir(parents=True,exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="zebra-scenes-") as tmpdir:
        tmp=Path(tmpdir);segments=[];cues=[];clock=0
        for i,f in enumerate(frames):
            png=tmp/f"scene-{i}.png";wav=tmp/f"voice-{i}.wav";seg=tmp/f"clip-{i}.mp4"
            frame(plan,i).save(png)
            run([speech,"-v","en-us","-s","155","-w",wav,f["narration"]],capture_output=True)
            with wave.open(str(wav),"rb") as w:duration=math.ceil((w.getnframes()/w.getframerate()+0.45)*FPS)/FPS
            run([ffmpeg,"-v","error","-y","-loop","1","-framerate",FPS,"-i",png,"-i",wav,"-af","apad","-t",f"{duration:.6f}","-c:v","libx264","-preset","ultrafast","-crf","24","-pix_fmt","yuv420p","-threads","2","-c:a","aac","-ar","44100","-ac","1",seg],capture_output=True)
            segments.append(seg);cues.append({"id":f["id"],"title":f["title"],"narration":f["narration"],"start_seconds":round(clock,3),"duration_seconds":round(duration,3),"evidence":f["evidence"]})
            clock+=duration
        concat=tmp/"concat.txt";concat.write_text("".join("file '"+p.name+"'\n" for p in segments),encoding="utf-8")
        target=out/"clip.mp4"
        run([ffmpeg,"-v","error","-y","-f","concat","-safe","0","-i",concat,"-c","copy","-movflags","+faststart",target],capture_output=True)
        info=json.loads(run([probe,"-v","error","-show_streams","-show_format","-of","json",target],capture_output=True,text=True).stdout)
        tracks={t["codec_type"]:t for t in info["streams"]};actual=float(info["format"]["duration"])
        if tracks.get("video",{}).get("codec_name")!="h264" or tracks.get("audio",{}).get("codec_name")!="aac" or abs(actual-clock)>2:raise RuntimeError("Missing tracks or incomplete clip")
        run([ffmpeg,"-v","error","-i",target,"-f","null","-"],capture_output=True)
        log=run([ffmpeg,"-hide_banner","-i",target,"-map","0:a:0","-af","volumedetect","-f","null","-"],capture_output=True,text=True).stderr
        peak=re.search(r"max_volume: (-?\d+(?:\.\d+)?) dB",log)
        if not peak or float(peak[1])<-35:raise RuntimeError("Narration is silent or too quiet")
        (out/"clip.vtt").write_text("WEBVTT\n\n"+"\n\n".join(f"{stamp(c['start_seconds'])} --> {stamp(c['start_seconds']+c['duration_seconds'])}\n{c['narration']}" for c in cues)+"\n",encoding="utf-8")
        receipt={"schema":"zebra-narrated-clip-receipt/v1","kind":plan["kind"],"title":plan["title"],"provenance":plan["provenance"],"source_links":plan["source_links"],"scope":plan["scope"],"narration":"local_eSpeak_en_us","model_generated":False,"device_tested":False,"quality_improvement_measured":False,"duration_seconds":actual,"bytes":target.stat().st_size,"audio_peak_db":float(peak[1]),"audio_codec":"aac","video_codec":"h264","decoded_audio_and_video":True,"plan_sha256":hashlib.sha256(raw).hexdigest(),"video_sha256":hashlib.sha256(target.read_bytes()).hexdigest(),"scenes":cues}
        (out/"receipt.json").write_text(json.dumps(receipt,indent=2)+"\n",encoding="utf-8")
        print(json.dumps({k:receipt[k] for k in ("kind","duration_seconds","bytes","audio_peak_db","decoded_audio_and_video")}))
if __name__=="__main__":
    if len(sys.argv)!=3:raise SystemExit("Usage: render_narrated_clip.py plan.json output_dir")
    main(Path(sys.argv[1]),Path(sys.argv[2]))
