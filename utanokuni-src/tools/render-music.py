"""Original fixed-score instrumental, not a recording or arrangement of a nursery rhyme.
Requires numpy, scipy and ffmpeg. Writes a looped music-box MP3. No vocals or service API.
"""
from pathlib import Path
import numpy as np
from scipy.signal import lfilter
import subprocess,wave,tempfile
root=Path(__file__).resolve().parent.parent
sr=32000;beat=60/69;bars=24;length=bars*3*beat;n=round(length*sr);out=np.zeros((n,2),dtype=np.float64)
# Authored waltz; a few unresolved notes make the familiar shape slightly uncertain.
score=[[(74,0),(79,1),(81,2)],[(83,0),(81,1.5)],[(79,0),(76,1),(74,2)],[(72,0),(74,2)],
 [(74,0),(79,1),(83,2)],[(86,0),(83,1),(81,2)],[(80,0),(76,1.5)],[(74,0),(71,2)],
 [(76,0),(79,1.5)],[(83,0),(84,1),(83,2)],[(79,0),(78,1.5)],[(74,0),(76,2)],
 [(74,0),(79,1),(81,2)],[(83,0),(81,1.5)],[(79,0),(76,1),(74,2)],[(73,0),(74,2)],
 [(79,0),(83,1),(86,2)],[(84,0),(83,1.5)],[(81,0),(79,1),(76,2)],[(74,0),(72,2)],
 [(74,0),(79,1),(81,2)],[(83,0),(80,1.5)],[(76,0),(74,1.5)],[(71,0),(74,2)]]
def add(sound,at,pan=0):
 idx=(np.arange(len(sound))+round(at*sr))%n
 for c,gain in enumerate([np.sqrt((1-pan)/2),np.sqrt((1+pan)/2)]):np.add.at(out[:,c],idx,sound*gain)
def box(note,at,velocity=.6):
 f=440*2**((note-69)/12);t=np.arange(round(sr*4))/sr;signal=np.zeros_like(t)
 for k,(multiple,amp,decay) in enumerate([(1,1,1.25),(2,.28,.65),(2.76,.09,.36),(4.02,.045,.22)]):
  signal+=amp*np.sin(2*np.pi*f*multiple*t+.17*k)*np.exp(-t/decay)
 signal*=np.minimum(1,t/.004)*velocity*.13
 add(signal,at,np.sin(note*1.13)*.18)
for bar,notes in enumerate(score):
 for note,at in notes:box(note,bar*3*beat+at*beat,.65 if at==0 else .49)
 # A sparse, quiet lower-register accompaniment, with no harsh transients.
 roots=[55,52,48,50];box(roots[(bar//2)%4],bar*3*beat,.29)
 if bar%2==0:box(roots[(bar//2)%4]+7,(bar*3+1.9)*beat,.19)
# Circular room tail, avoiding a silent hard edge at the loop point.
for c in range(2):
 dry=out[:,c].copy()
 for delay,gain in [(.083,.10),(.17,.08),(.293,.06),(.47,.035),(.73,.025)]:out[:,c]+=np.roll(dry,round((delay+c*.009)*sr))*gain
 out[:,c]=lfilter([.22],[1,-.78],np.r_[out[-sr:,c],out[:,c]])[sr:]
peak=np.abs(out).max();out*=.39/max(.0001,peak)
with tempfile.TemporaryDirectory() as tmp:
 wav=Path(tmp)/'music.wav'
 with wave.open(str(wav),'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(sr);w.writeframes((out*32767).astype('<i2').tobytes())
 dest=root/'public/audio/unturned-page.mp3';dest.parent.mkdir(parents=True,exist_ok=True)
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(wav),'-ar','44100','-codec:a','libmp3lame','-q:a','4',str(dest)],check=True)
 print(dest.name,round(length,2),'seconds',dest.stat().st_size,'bytes')
