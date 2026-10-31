"""Original 32-bar dark-fantasy cue, piano samples + synthesized pads/bells.
Requires Python, numpy, scipy, ffmpeg. Usage:
 python3 tools/render-akatsuki-lantern-bgm.py --samples /path/to/cache --output /path/to/mix.wav --score /path/to/score.json
Missing piano samples are fetched from N. P. Brosowsky's tonejs-instruments (CC BY 3.0).
"""
from pathlib import Path
import argparse,subprocess,urllib.request,hashlib,json,wave
import numpy as np
from scipy import signal
ap=argparse.ArgumentParser();ap.add_argument('--samples',type=Path,required=True);ap.add_argument('--output',type=Path,required=True);ap.add_argument('--score',type=Path,required=True);args=ap.parse_args();args.samples.mkdir(parents=True,exist_ok=True)
SR=32000;BPM=66;BEAT=60/BPM;BAR=BEAT*3;DURATION=32*BAR;N=round(SR*DURATION);rng=np.random.default_rng(71423);mix=np.zeros((N,2),np.float64);events=[];sources=[]
def hz(n):return 440*2**((n-69)/12)
def add(tone,at,gain=1,pan=0):
 if tone.ndim==1:tone=np.column_stack((tone*np.sqrt((1-pan)/2),tone*np.sqrt((1+pan)/2)))
 elif pan: tone=tone*np.array([np.sqrt((1-pan)/2),np.sqrt((1+pan)/2)])*np.sqrt(2)
 tone=tone*gain;start=round(at*SR)%N
 # Circular accumulation preserves the final notes and reverb across the loop.
 first=min(len(tone),N-start);mix[start:start+first]+=tone[:first]
 if first<len(tone):mix[:len(tone)-first]+=tone[first:]
def envelope(count,attack,release):
 e=np.ones(count);a=min(count,int(attack*SR));r=min(count-a,int(release*SR))
 if a:e[:a]=np.sin(np.linspace(0,np.pi/2,a))**2
 if r:e[-r:]=np.cos(np.linspace(0,np.pi/2,r))**2
 return e
notes={'C4':60,'E4':64,'F4':65,'G4':67,'A4':69,'B4':71,'C5':72,'D5':74,'E5':76,'F5':77};decoded={}
for note,midi in notes.items():
 p=args.samples/f'piano-{note}.mp3';url=f'https://raw.githubusercontent.com/nbrosowsky/tonejs-instruments/master/samples/piano/{note}.mp3'
 if not p.exists():
  with urllib.request.urlopen(url,timeout=30) as r:p.write_bytes(r.read())
 raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-f','f32le','-ar',str(SR),'-ac','2','pipe:1']);a=np.frombuffer(raw,dtype='<f4').reshape(-1,2).astype(np.float64);a-=a.mean(axis=0)
 energy=np.max(np.abs(a),axis=1);active=np.flatnonzero(energy>max(.001,energy.max()*.025));a=a[max(0,int(active[0])-64):] if len(active) else a;a/=max(.01,np.max(np.abs(a)));decoded[midi]=a
 sources.append({'note':note,'url':url,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
def piano(n,at,dur,velocity=.8):
 base=min(decoded,key=lambda k:abs(k-n));ratio=2**((n-base)/12);a=decoded[base];a=signal.resample_poly(a,10000,round(10000*ratio),axis=0);length=min(len(a),round((dur+.75)*SR));a=a[:length].copy();a*=envelope(length,.008,min(.75,max(.15,dur*.4)))[:,None];add(a,at,.105*velocity,-.10);events.append({'voice':'piano','midi':n,'at':round(at,4),'duration':round(dur,4),'velocity':velocity})
def pad(notes,at,dur,weight=1):
 count=round((dur+2.8)*SR);t=np.arange(count)/SR;voice=np.zeros((count,2))
 for j,n in enumerate(notes):
  f=hz(n)
  for ch,detune in enumerate([-.035,.035]):
   phase=2*np.pi*f*(2**(detune/12))*(t+.0009*np.sin(2*np.pi*(.17+j*.013)*t+j));tone=np.zeros(count)
   for h in range(1,9):tone+=np.sin(phase*h+j*.37)*(1/h**1.65)*np.exp(-(f*h/1600)**2)
   voice[:,ch]+=tone*.0115*weight
 voice*=envelope(count,1.2,2.8)[:,None];add(voice,at);events.append({'voice':'pad','notes':notes,'at':round(at,4),'duration':round(dur,4)})
def bass(n,at,dur,weight=1):
 count=round((dur+.7)*SR);t=np.arange(count)/SR;phase=2*np.pi*hz(n)*t;a=(np.sin(phase)*.7+np.sin(phase*2)*.25+np.sin(phase*3)*.08)*envelope(count,.35,.7);add(a,at,.024*weight);events.append({'voice':'bass','midi':n,'at':round(at,4),'duration':round(dur,4)})
def bell(n,at,weight=.7):
 count=SR*7;t=np.arange(count)/SR;f=hz(n);a=np.zeros(count)
 for mult,vol,decay in [(1,1,2.8),(2.01,.27,2.1),(2.76,.10,1.4),(4.11,.055,.9)]:a+=np.sin(2*np.pi*f*mult*t+.15*mult)*np.exp(-t/decay)*vol
 a*=envelope(count,.025,1);add(a,at,.023*weight,.28 if n%2 else -.3);events.append({'voice':'bell','midi':n,'at':round(at,4),'duration':7})
# D minor, 3/4. Each section is explicitly composed; no random note selection.
chords=[
 (38,[50,57,62,65]),(48,[48,57,62,65]),(46,[46,53,57,62]),(46,[46,53,57,62]),
 (43,[43,50,55,58]),(41,[48,53,57,62]),(45,[45,52,57,62]),(45,[45,52,55,61]),
 (38,[50,57,62,65]),(48,[48,55,60,64]),(46,[46,53,57,62]),(45,[48,53,57,60]),
 (43,[43,50,55,58]),(46,[46,53,57,62]),(40,[47,52,55,58]),(45,[45,52,55,61]),
 (43,[43,50,55,58]),(41,[48,53,57,62]),(51,[51,55,58,62]),(50,[50,53,58,62]),
 (48,[48,55,58,63]),(46,[46,50,55,58]),(45,[45,52,57,62]),(45,[45,52,55,61]),
 (38,[50,57,62,65]),(48,[48,57,62,65]),(46,[46,53,57,62]),(43,[43,50,55,58]),
 (41,[48,53,57,62]),(40,[47,52,55,58]),(45,[45,52,57,62]),(45,[45,52,55,61])]
A=[[(.6,74,1.3),(2.2,69,.65)],[(.1,77,.95),(1.3,76,.7),(2.2,74,.65)],[(.3,69,1.6),(2.2,65,.65)],[(.2,76,.65),(1.1,74,1.6)],[(.2,70,1.15),(1.6,69,.55),(2.3,67,.55)],[(.25,65,.8),(1.3,74,1.4)],[(.4,76,2.0)],[(.5,73,.9),(1.7,69,.8)]]
B=[[(.2,74,1.4),(1.9,77,.8)],[(.3,76,.8),(1.5,72,1.1)],[(.2,74,1.5),(2.0,69,.7)],[(.3,72,1.2),(1.9,69,.8)],[(.25,70,1.3),(1.9,67,.8)],[(.4,69,1.7)],[(.25,70,.65),(1.3,67,1.2)],[(.5,73,1.1),(2.0,76,.7)]]
C=[[(.4,74,1.8)],[(.5,72,1.7)],[(.4,75,1.6)],[(.4,74,1.6)],[(.4,72,1.6)],[(.5,70,1.6)],[(.4,69,1.7)],[(.5,73,1.4)]]
for bar,(root,notes) in enumerate(chords):
 at=bar*BAR;intensity=.8 if bar<4 else 1 if bar<16 else .86 if bar<24 else .92
 pad(notes,at,BAR+.15,intensity);bass(root,at,BAR*.85,intensity)
 # Sparse low piano counterline, leaving room for spoken dialogue.
 if bar%2==0:piano(notes[-2],at+BEAT*.08,BEAT*1.25,.36*intensity)
 if bar in [3,7,11,15,19,23,27,31]:piano(notes[-1],at+BEAT*2.4,BEAT*.55,.32)
 melody=(A if bar<8 else B if bar<16 else C if bar<24 else A)[bar%8]
 for beat,n,duration in melody:piano(n,at+BEAT*beat+float(rng.uniform(-.008,.008)),BEAT*duration,(.72 if bar<16 else .62)*float(rng.uniform(.96,1.04)))
 if bar in [0,8,16,24]:bell(62 if bar!=16 else 58,at+BEAT*.1,.52)
 if bar in [6,14,22,30]:bell(69,at+BEAT*1.8,.27)
print('Composed',len(events),'events,',round(DURATION,3),'seconds',flush=True)
# Diffuse stereo stone-room reverb; circular tail keeps the phrase's loop continuous.
wet=np.zeros_like(mix);count=round(4.8*SR);t=np.arange(count)/SR
for ch in range(2):
 noise=rng.normal(size=count);ir=signal.sosfilt(signal.butter(2,[170,3100],btype='bandpass',fs=SR,output='sos'),noise)*np.exp(-t/1.05)*np.minimum(1,t/.055);ir[:round(.028*SR)]=0;ir/=np.sqrt(np.sum(ir*ir))+1e-12;ir*=.36
 for delay,gain in [(.047,.10),(.083,.075),(.139,.055),(.227,.035)]:ir[round((delay+ch*.006)*SR)]+=gain
 con=signal.fftconvolve(mix[:,ch],ir);wet[:,ch]=con[:N];wet[:len(con)-N,ch]+=con[N:]
mix=mix+wet*.45;mix=signal.sosfilt(signal.butter(2,[38,10500],btype='bandpass',fs=SR,output='sos'),np.vstack((mix[-2*SR:],mix)),axis=0)[2*SR:]
# Conservative headroom; final loudness normalization is performed with ffmpeg.
peak=np.max(np.abs(mix));mix*=.7/max(peak,.001);mix-=mix.mean(axis=0)
args.output.parent.mkdir(parents=True,exist_ok=True)
with wave.open(str(args.output),'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes(np.clip(mix*32767,-32768,32767).astype('<i2').tobytes())
args.score.write_text(json.dumps({'title':'灯りだけが、覚えている','bpm':BPM,'meter':'3/4','duration':DURATION,'key':'D minor','arrangement':'Original fixed 32-bar cue; recorded piano, synthesized warm pads, low bass and distant bells; circular reverb tail.','license':'Piano samples: N. P. Brosowsky / tonejs-instruments, CC BY 3.0; original score and synthesized layers created for this game.','sources':sources,'events':events},ensure_ascii=False,indent=2));print('Rendered',args.output,'peak',float(np.max(np.abs(mix))),'RMS',float(np.sqrt(np.mean(mix*mix))),flush=True)
