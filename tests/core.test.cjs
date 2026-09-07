const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const C=fs.existsSync(__dirname+'/../core.js')?require('../core.js'):{};
test('fraction end comes from next boundary even if hidden; last end is unknown',()=>{
 assert.equal(typeof C.fractions,'function');
 const f=C.fractions([{position:2,label:'A1'},{position:4,label:'A2',show:false},{position:6,label:'A3'}]);
 assert.equal(f[0].end,4); assert.equal(f[1].end,null);
});
test('zoom clips fractions without changing real bounds and omits crowded text',()=>{
 assert.equal(typeof C.track,'function');
 const t=C.track([{position:0,label:'A long label'},{position:1,label:'A2'},{position:2,label:'A3'}],[.5,1.5],100);
 assert.equal(t[0].left,.5);assert.equal(t[0].start,0);assert.equal(t[0].labelVisible,false);assert.equal(t[1].right,1.5);
});
test('integrates interpolated endpoints with trapezoids',()=>{
 assert.equal(typeof C.integrate,'function');
 const r=C.integrate({x:[0,1,2],y:[0,2,0]},.5,1.5,'zero',0);
 assert.equal(r.net,1.5);assert.equal(r.volume,1);
});
test('linear baseline and constant baseline give signed net area',()=>{
 assert.equal(typeof C.integrate,'function');
 assert.equal(C.integrate({x:[0,1,2],y:[2,5,4]},0,2,'linear',0).net,2);
 assert.equal(C.integrate({x:[0,1],y:[1,1]},0,1,'constant',2).net,-1);
});
test('rejects out-of-range integration and duplicate x',()=>{
 assert.equal(typeof C.integrate,'function');
 assert.throws(()=>C.integrate({x:[0,1],y:[0,1]},-.1,1,'zero',0));
 assert.throws(()=>C.integrate({x:[0,0],y:[0,1]},0,1,'zero',0));
});
test('paired import never misaligns a missing Y and preserves unit',()=>{
 assert.equal(typeof C.pairs,'function');
 assert.deepEqual(C.pairs([['0','2'],['1',''],['2','4']],0,'mAU','CV'),{x:[0,2],y:[2,4],unit:'mAU',xUnit:'CV'});
});
test('baseline signal interpolates its own independent X grid',()=>{
 const r=C.integrate({x:[0,1,2],y:[3,3,3]},0,2,'signal',0,{x:[0,.5,2],y:[0,2,0]});
 assert.equal(r.gross,6);assert.equal(r.baseline,2);assert.equal(r.net,4);
});
test('CV conversion requires positive column volume and is reversible',()=>{
 assert.equal(typeof C.volumeScale,'function');
 assert.equal(C.volumeScale('mL','CV',24),1/24);
 assert.equal(C.volumeScale('CV','mL',24),24);
 assert.equal(12*C.volumeScale('mL','CV',24),.5);
 for(const v of [0,-1,NaN,Infinity,null])assert.throws(()=>C.volumeScale('mL','CV',v));
 assert.throws(()=>C.volumeScale('min','CV',24));
 assert.throws(()=>C.volumeScale('','CV',24));
 assert.equal(C.volumeScale('CV','CV',null),1);
});
test('changing X from mL to CV scales area and volume but preserves height',()=>{
 assert.equal(typeof C.volumeScale,'function');
 const d={x:[0,12,24],y:[0,4,0]},factor=C.volumeScale('mL','CV',24);
 const a=C.integrate(d,0,24),b=C.integrate({x:d.x.map(x=>x*factor),y:d.y},0,1);
 assert.equal(a.net/24,b.net);assert.equal(b.volume,1);assert.equal(a.height,b.height);
});
test('tube 5 through 8 includes the entire eighth tube, even if markers hidden',()=>{
 assert.equal(typeof C.fractionRange,'function');
 const markers=Array.from({length:10},(_,i)=>({position:i*2,label:'A'+(i+1),show:i!==5}));
 assert.deepEqual(C.fractionRange(markers,5,8),{start:8,end:16,startLabel:'A5',endLabel:'A8'});
 assert.equal(C.fractionRange(markers,5,5).end,10);
});
test('fraction selection rejects missing end, reversed tubes and duplicate boundaries',()=>{
 assert.equal(typeof C.fractionRange,'function');
 const f=[{position:0,label:'A1'},{position:1,label:'A2'}];
 assert.throws(()=>C.fractionRange(f,1,2),/终点/);
 assert.throws(()=>C.fractionRange(f,2,1));assert.throws(()=>C.fractionRange(f,0,1));
 assert.throws(()=>C.fractionRange([{position:0},{position:0},{position:1}],1,2));
 assert.equal(C.fractionRange([{position:0,label:'A1',end:1}],1,1).end,1);
});
