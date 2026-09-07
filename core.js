(function(root){
'use strict';
function fractions(markers){
 const sorted=markers.filter(f=>Number.isFinite(f.position)).slice().sort((a,b)=>a.position-b.position);
 return sorted.map((f,i)=>({...f,start:f.position,end:Number.isFinite(f.end)&&f.end>f.position?f.end:(sorted[i+1]?.position>f.position?sorted[i+1].position:null)})).filter(f=>f.show!==false);
}
function track(markers,range,width){
 return fractions(markers).filter(f=>f.start<=range[1]&&(f.end===null?f.start>=range[0]:f.end>range[0])).map(f=>{
 const left=Math.max(f.start,range[0]),right=Math.min(f.end??f.start,range[1]);
 return {...f,left,right,labelVisible:(right-left)/(range[1]-range[0])*width>String(f.label).length*7+14};
 });
}
function pairs(rows,col,unit,xUnit){
 const d={x:[],y:[],unit,xUnit};
 for(const row of rows){if(String(row[col]??'').trim()===''||String(row[col+1]??'').trim()==='')continue;const x=Number(row[col]),y=Number(row[col+1]);if(Number.isFinite(x)&&Number.isFinite(y)){d.x.push(x);d.y.push(y);}}
 return d;
}
function validate(d){
 if(!d||d.x.length<2||d.x.length!==d.y.length)throw Error('至少需要两个成对数据点');
 for(let i=0;i<d.x.length;i++)if(!Number.isFinite(d.x[i])||!Number.isFinite(d.y[i])||(i&&d.x[i]<=d.x[i-1]))throw Error('X 必须严格递增，且 X/Y 均为有效数值');
}
function at(d,x){
 if(x<d.x[0]||x>d.x[d.x.length-1])throw Error('积分范围超出数据范围');
 let l=0,r=d.x.length-1;while(l+1<r){let m=(l+r)>>1;if(d.x[m]<=x)l=m;else r=m;}
 return d.y[l]+(d.y[r]-d.y[l])*(x-d.x[l])/(d.x[r]-d.x[l]);
}
function integrate(d,start,end,mode='zero',constant=0,baseline=null){
 validate(d);if(!(end>start)||!Number.isFinite(constant))throw Error('起点必须小于终点，基线必须为有效数字');
 const yl=at(d,start),yr=at(d,end);if(baseline)validate(baseline);
 const xs=[start,...d.x.filter(x=>x>start&&x<end),...(baseline?baseline.x.filter(x=>x>start&&x<end):[]),end].sort((a,b)=>a-b).filter((x,i,a)=>!i||x!==a[i-1]);
 const points=xs.map(x=>{const y=at(d,x),b=mode==='linear'?yl+(yr-yl)*(x-start)/(end-start):mode==='constant'?constant:mode==='signal'?at(baseline,x)+constant:0;return {x,y,b,net:y-b};});
 let gross=0,base=0;for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],w=b.x-a.x;gross+=w*(a.y+b.y)/2;base+=w*(a.b+b.b)/2;}
 const apex=points.reduce((a,b)=>b.net>a.net?b:a);
 return {gross,baseline:base,net:gross-base,volume:end-start,start,end,apex:apex.x,height:apex.net,points};
}
function volumeScale(source,target,columnVolume){
 if(!source||!target)throw Error('请先指定原始数据的横轴单位');
 if(source===target)return 1;
 if(!['mL','CV'].includes(source)||!['mL','CV'].includes(target))throw Error('目前仅支持 mL 与 CV 换算，时间单位需要流速');
 if(!Number.isFinite(columnVolume)||columnVolume<=0)throw Error('请填写大于 0 的柱体积：1 CV = 多少 mL');
 return source==='mL'?1/columnVolume:columnVolume;
}
function fractionRange(markers,first,last){
 const all=markers.filter(f=>Number.isFinite(f.position)).slice().sort((a,b)=>a.position-b.position);
 if(!Number.isInteger(first)||!Number.isInteger(last)||first<1||last<first||last>all.length)throw Error('请选择有效管号，Start 不得晚于 End');
 if(all.some((f,i)=>i>0&&f.position<=all[i-1].position))throw Error('Fraction 边界重复，请先修正');
 const start=all[first-1],finish=all[last-1];
 const end=Number.isFinite(finish.end)&&finish.end>finish.position?finish.end:all[last]?.position;
 if(!Number.isFinite(end)||end<=finish.position)throw Error('所选末管终点未知，请在 Fraction 中补充下一条边界或改用坐标输入');
 return {start:start.position,end,startLabel:String(start.label??first),endLabel:String(finish.label??last)};
}
const api={fractions,track,pairs,integrate,volumeScale,fractionRange};if(typeof module!=='undefined')module.exports=api;else root.ChromCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
