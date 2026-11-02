import type {Area, Point} from './types.ts';
import {WORLD} from '../content/areas.ts';
export interface Grid {cols:number; rows:number; cw:number; ch:number; walk:boolean[]}
export function inside(p:Point, polygon:Point[]):boolean {
 let result=false;
 for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
  const a=polygon[i],b=polygon[j];
  if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)result=!result;
 }return result;
}
export function buildGrid(area:Area):Grid {
 const cols=27,rows=43,cw=WORLD.width/cols,ch=WORLD.height/rows;
 const walk=Array.from({length:cols*rows},(_,i)=>{
  const p={x:(i%cols+.5)*cw,y:(Math.floor(i/cols)+.5)*ch};
  return inside(p,area.walkPolygon)&&!area.obstacles.some(r=>p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h);
 });return{cols,rows,cw,ch,walk};
}
export const center=(g:Grid,i:number):Point=>({x:(i%g.cols+.5)*g.cw,y:(Math.floor(i/g.cols)+.5)*g.ch});
export function nearest(g:Grid,p:Point):number {
 let best=-1,distance=Infinity;
 for(let i=0;i<g.walk.length;i++)if(g.walk[i]){const c=center(g,i),d=(c.x-p.x)**2+(c.y-p.y)**2;if(d<distance){best=i;distance=d;}}
 return best;
}
export function findPath(g:Grid,from:Point,to:Point):Point[]|null {
 const start=nearest(g,from),goal=nearest(g,to);if(start<0||goal<0)return null;
 if(start===goal)return[center(g,goal)];
 const frontier=new Set([start]),previous=new Map<number,number>(),cost=new Map([[start,0]]),score=new Map([[start,0]]);
 const neighbors=(i:number):[number,number][]=>{const x=i%g.cols,y=Math.floor(i/g.cols),result:[number,number][]=[];
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=x+dx,ny=y+dy;if(nx<0||nx>=g.cols||ny<0||ny>=g.rows)continue;const n=ny*g.cols+nx;if(!g.walk[n])continue;
   if(dx&&dy&&(!g.walk[y*g.cols+nx]||!g.walk[ny*g.cols+x]))continue;
   result.push([n,Math.hypot(dx*g.cw,dy*g.ch)]);
  }return result;
 };
 while(frontier.size){let current=-1,best=Infinity;for(const i of frontier){const value=score.get(i)??Infinity;if(value<best){best=value;current=i;}}
  if(current===goal){const route=[current];while(previous.has(route[0]))route.unshift(previous.get(route[0])!);return route.slice(1).map(i=>center(g,i));}
  frontier.delete(current);
  for(const [n,weight] of neighbors(current)){const value=cost.get(current)!+weight;if(value<(cost.get(n)??Infinity)){previous.set(n,current);cost.set(n,value);const a=center(g,n),b=center(g,goal);score.set(n,value+Math.hypot(a.x-b.x,a.y-b.y));frontier.add(n);}}
 }return null;
}
