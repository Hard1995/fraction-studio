'use strict';
const el=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let savedPeaks=[],v6Error='',v6Rendering=false;
let rangeSelection={mode:'coordinate',first:1,last:1};
function xUnit(){return rawData[el('primaryVarSelect').value]?.xUnit||sourceUnit()||'未指定';}
function yUnit(){return rawData[el('primaryVarSelect').value]?.unit||'signal';}
let currentScale=1, appliedUnit='', appliedVolume='', appliedSource='';
function sourceUnit(){return originalRawData[el('primaryVarSelect').value]?.xUnit||Object.values(originalRawData)[0]?.xUnit||el('studioSourceUnit').value;}
function studioState(){return {rangeSelection:{...rangeSelection},coordinateVersion:1,unit:el('studioUnit').value,columnVolume:el('studioColumnVolume').value,sourceUnit:el('studioSourceUnit').value,scale:currentScale,displayRawData:rawData,baseline:el('studioBaseline').value,constant:el('manualBaselineInput').value,peaks:savedPeaks};}
function restoreStudio(s){
 rangeSelection=s?.rangeSelection?{...s.rangeSelection}:{mode:"coordinate",first:1,last:1};
 el('studioUnit').value=s?.coordinateVersion?s.unit||'':'';
 el('studioColumnVolume').value=s?.columnVolume||'';el('studioSourceUnit').value=s?.sourceUnit||'';
 currentScale=s?.coordinateVersion?s.scale||1:1;
 if(s?.coordinateVersion&&s.displayRawData)rawData=JSON.parse(JSON.stringify(s.displayRawData));
 appliedUnit=el('studioUnit').value;appliedVolume=el('studioColumnVolume').value;appliedSource=el('studioSourceUnit').value;
 el('studioBaseline').value=s?.baseline||'zero';el('manualBaselineInput').value=s?.constant||0;savedPeaks=s?.peaks||[];renderPeaks();
}
function applyCoordinates(){
 try{
  const source=sourceUnit(),target=el('studioUnit').value||source,volume=Number(el('studioColumnVolume').value);
  if(Object.keys(rawData).length===0)throw Error('请先导入数据');
  const known=new Set(Object.values(originalRawData).map(d=>d.xUnit).filter(Boolean));
  if(known.size>1)throw Error('各通道原始横轴单位不一致，请先统一后导入');
  if(el('studioColumnVolume').value!==''&&(!Number.isFinite(volume)||volume<=0))throw Error('柱体积必须是大于 0 的数值');
  const nextScale=ChromCore.volumeScale(source,target,volume),ratio=nextScale/currentScale;
  for(const d of Object.values(rawData)){d.x=d.x.map(x=>x*ratio);d.xUnit=target;}
  for(const f of fractionData){f.position*=ratio;if(Number.isFinite(f.end))f.end*=ratio;}
  for(const r of regionData)for(const k of ['start','end','labelX'])if(Number.isFinite(r[k]))r[k]*=ratio;
  for(const p of detectedPeaks)if(Number.isFinite(p.x))p.x*=ratio;
  for(const p of savedPeaks){for(const k of ['start','end','apex','volume','gross','baseline','net'])if(Number.isFinite(p[k]))p[k]*=ratio;p.unit=p.unit.replace(/·[^·]+$/,'·'+target);}
  for(const id of ['integStartValue','integEndValue','xAxisStart','xAxisEnd'])if(el(id).value.trim()!=='')el(id).value=Number((Number(el(id).value)*ratio).toPrecision(14));
  fullDataRange.min*=ratio;fullDataRange.max*=ratio;
  currentScale=nextScale;appliedUnit=el('studioUnit').value;appliedVolume=el('studioColumnVolume').value;appliedSource=el('studioSourceUnit').value;
  // Undo snapshots contain coordinate-bearing fractions and must not cross a unit conversion.
  if(ratio!==1){editHistory=[];editHistoryIndex=-1;saveEditState();}
  renderPeaks();plotGraph();coordinateHint();
 }catch(e){el('studioUnit').value=appliedUnit;el('studioColumnVolume').value=appliedVolume;el('studioSourceUnit').value=appliedSource;el('studioConversionHint').textContent=e.message;}
}
function coordinateHint(){
 const cv=Number(el('studioColumnVolume').value),source=sourceUnit();
 el('studioSourceUnit').disabled=Boolean(Object.values(originalRawData)[0]?.xUnit);
 el('studioConversionHint').textContent=Number.isFinite(cv)&&cv>0?`1 CV = ${cv} mL；CV = mL ÷ ${cv}。原始单位：${source||'未指定'}；当前显示：${xUnit()}。`:`原始单位：${source||'未指定（请手动选择）'}。切换 mL / CV 前请填写柱体积。`;
}
function resetStudio(){restoreStudio(null);renderPeaks();}
function v6Result(){
 v6Error='';if(!syncTubeRange()){v6Error=el('tubeRangeHint').textContent;return null;} const data=rawData[el('primaryVarSelect').value];if(!data)return null;
 try {return ChromCore.integrate(data,Number(el('integStartValue').value),Number(el('integEndValue').value),el('studioBaseline').value,Number(el('manualBaselineInput').value),rawData['UV (Baseline Corrected)']);}catch(e){v6Error=e.message;return null;}
}
updateIntegration=function(){
 const r=v6Result(),xu=xUnit(),yu=yUnit();
 ['integAreaVal','integVolumeVal','integRangeVal','integAsymmetryVal','integHETPVal'].forEach(id=>el(id).textContent='—');
 el('calcBtn').disabled=true;el('manualBaselineInput').disabled=false;
 if(!r){integrationResults={area:0,volume:0,start:0,end:0};el('studioResult').textContent=v6Error||'导入数据后设置积分区间';return;}
 integrationResults={area:r.net,volume:r.volume,start:r.start,end:r.end};
 el('integAreaVal').textContent=r.net.toFixed(4)+' '+yu+'·'+xu;
 el('integVolumeVal').textContent=r.volume.toFixed(4)+' '+xu;
 el('integRangeVal').textContent=r.start.toFixed(4)+' – '+r.end.toFixed(4)+' '+xu;
 el('studioResult').innerHTML=`<div class="metric metric-primary"><span>NET AREA · 净峰面积</span><strong>${r.net.toFixed(4)} ${esc(yu)}·${esc(xu)}</strong></div><div class="metric"><span>GROSS · 总面积</span><strong>${r.gross.toFixed(4)}</strong></div><div class="metric"><span>BASELINE · 基线面积</span><strong>${r.baseline.toFixed(4)}</strong></div><div class="metric"><span>APEX · 峰顶</span><strong>${r.apex.toFixed(4)} ${esc(xu)}</strong></div>`;
 el('concWarning').style.display='block';el('concWarning').textContent='浓度计算仅在横轴 mL、信号 mAU 时启用；HETP/不对称度需独立核验。';
 if(xu==='mL'&&yu.toLowerCase()==='mau'&&r.net>0){el('calcBtn').disabled=false;el('concWarning').style.display='none';updateConcentrationDisplay();}
};
function renderV6(traces,layout,config){
 const range=layout.xaxis.range||[fullDataRange.min,fullDataRange.max], show=el('showFractionsCheck').checked;
 const track=show?ChromCore.track(fractionData,range,Math.max(200,el('plotlyChart').clientWidth-220)):[];
 layout.width=undefined;layout.autosize=true;layout.height=Math.max(420,Math.min(500,window.innerHeight-300));
 layout.margin={t:75,b:155,l:85,r:55};layout.paper_bgcolor='#ffffff';layout.plot_bgcolor='#ffffff';
 layout.font={family:'-apple-system, BlinkMacSystemFont, Arial, sans-serif',size:12,color:'#334155'};
 layout.legend={orientation:'h',x:0,y:1.16,xanchor:'left',yanchor:'top'};
 layout.annotations=layout.annotations.filter(a=>a.name!=='xAxisTitle'&&a.name!=='chartTitle');
 layout.xaxis.title={text:''};layout.annotations.push({xref:'paper',yref:'paper',x:.46,y:-.27,text:esc(xUnit()),showarrow:false,font:{size:12}});layout.xaxis.tickfont={size:12};layout.xaxis.mirror=false;
 layout.xaxis.showgrid=true;layout.xaxis.gridcolor='#eef2f5';layout.xaxis.zeroline=false;
 selectedVariables.forEach((v,i)=>{const a=layout[i?'yaxis'+(i+1):'yaxis'];const d=rawData[v];let lo=Infinity,hi=-Infinity;for(let j=0;j<d.x.length;j++)if(d.x[j]>=range[0]&&d.x[j]<=range[1]){lo=Math.min(lo,d.y[j]);hi=Math.max(hi,d.y[j]);}if(Number.isFinite(lo)){const pad=(hi-lo||Math.abs(hi)||1)*.06;a.range=[Math.min(0,lo-pad),hi+pad];}a.tickfont.size=11;if(v.includes('Conductivity')){a.tickfont.color='#748c97';layout.annotations.filter(n=>n.name==='yAxisTitle_'+v).forEach(n=>n.font.color='#748c97');a.linecolor='#bac9ce';}a.mirror=false;if(i)a.anchor='free';});
 // Only integration boundary lines are editable; fraction boundaries remain data coordinates.
 let boundary=0;layout.shapes.forEach(s=>{s.editable=false;if(s.type==='line'&&s.line?.color==='red'){s.name=boundary++?'studioEnd':'studioStart';s.editable=false;s.line.color='#0d9488';s.line.width=2;}});
 let lastLabel=-Infinity;
 for(const f of track){
  layout.shapes.push({type:f.end===null?'line':'rect',xref:'x',yref:'paper',x0:f.left,x1:f.right,y0:-.18,y1:-.09,fillcolor:'#d5eeea',line:{color:'#66aaa0',width:1},editable:false});
  const pixel=(f.left+f.right)/2/(range[1]-range[0])*Math.max(200,el('plotlyChart').clientWidth-220);
  if(f.end!==null && (f.labelVisible || pixel-lastLabel>Math.max(38,String(f.label).length*7+10))){lastLabel=pixel;layout.annotations.push({xref:'x',yref:'paper',x:(f.left+f.right)/2,y:-.135,text:esc(f.label),font:{size:11,color:'#165c55'},showarrow:false,yanchor:'middle'});}
 }
 layout.annotations.push({xref:'paper',yref:'paper',x:0,y:1.06,text:esc(currentFileName||'Chromatogram'),showarrow:false,xanchor:'left',font:{size:15,color:'#123c43'}});
 // A dedicated invisible hover trace uses the very same X axis as the chromatogram.
 if(track.length){layout.yaxis99={domain:[0,1],overlaying:'y',range:[0,1],visible:false,fixedrange:true};traces.push({x:track.map(f=>(f.left+f.right)/2),y:track.map(()=>-.135),yaxis:'y99',mode:'markers',marker:{size:16,color:'rgba(0,0,0,0)'},cliponaxis:false,showlegend:false,text:track.map(f=>`${esc(f.label)} · ${f.start}–${f.end??'? (终点未知)'} ${esc(xUnit())}`),hovertemplate:'%{text}<extra>Fraction</extra>'});}
 config.edits={...config.edits};config.scrollZoom=true;
 const chart=el('plotlyChart');
 Plotly.newPlot(chart,traces.map(t=>{if(t.name?.includes('Conductivity'))t.line={...t.line,color:'#8c9eac',width:1.3};return t;}),layout,config).then(()=>{installBoundaryHandles(chart);chart.removeAllListeners('plotly_relayout');chart.on('plotly_relayout',e=>{
  if(v6Rendering)return;
  for(const [key,val] of Object.entries(e)){const match=key.match(/^shapes\[(\d+)\]\.x[01]$/);if(match){const s=chart.layout.shapes[Number(match[1])];if(s?.name==='studioStart'||s?.name==='studioEnd'){el(s.name==='studioStart'?'integStartValue':'integEndValue').value=Number(val).toFixed(5);plotGraph();return;}}}
  const rr=e['xaxis.range']||(e['xaxis.range[0]']!==undefined?[e['xaxis.range[0]'],e['xaxis.range[1]']]:null);
  if(rr||e['xaxis.autorange']){const r=rr||[fullDataRange.min,fullDataRange.max];el('xAxisStart').value=r[0];el('xAxisEnd').value=r[1];plotGraph();return;}
  handleRelayout(e);
 });});
 renderFractionTable();coordinateHint();
}
function renderFractionTable(){
 const fs=ChromCore.fractions(fractionData);el('studioFractions').innerHTML=fs.length?'<summary>Fraction 区间 · '+fs.length+'（最后一管终点未知时不外推）</summary><div class="fraction-table">'+fs.map(f=>`<span><b>${esc(f.label)}</b> ${f.start}–${f.end??'?'} ${esc(xUnit())}</span>`).join('')+'</div>':'<summary>尚无 Fraction 标记</summary>';
}
function renderPeaks(){
 el('studioPeaks').innerHTML=savedPeaks.length?'<table><thead><tr><th>Peak</th><th>Range</th><th>Apex</th><th>Net area</th><th>Area %*</th></tr></thead><tbody>'+savedPeaks.map(p=>{const group=savedPeaks.filter(q=>q.variable===p.variable&&q.unit===p.unit&&q.mode===p.mode&&q.constant===p.constant);const overlap=group.some((a,i)=>group.some((b,j)=>j>i&&a.start<b.end&&b.start<a.end));const total=group.reduce((a,q)=>a+q.net,0);return `<tr><td>${esc(p.name)}</td><td>${p.start}–${p.end}</td><td>${p.apex.toFixed(3)}</td><td>${p.net.toFixed(4)} ${esc(p.unit)}</td><td>${!overlap&&group.every(q=>q.net>=0)&&total>0?(p.net/total*100).toFixed(1):'—'}</td></tr>`;}).join('')+'</tbody></table><p>*仅对同通道、同单位、同基线设置且互不重叠的已保存区间归一化。</p>':'';
}
function keepPeak(){const r=v6Result();if(!r)return;const name=el('studioPeakName').value.trim()||'Peak '+(savedPeaks.length+1);savedPeaks.push({...r,points:undefined,name,unit:yUnit()+'·'+xUnit(),variable:el('primaryVarSelect').value,mode:el('studioBaseline').value,constant:el('manualBaselineInput').value});renderPeaks();}
function exportPeaks(){if(!savedPeaks.length)return;const keys=['name','variable','start','end','apex','height','gross','baseline','net','unit','mode'];const csv=[keys.join(','),...savedPeaks.map(p=>keys.map(k=>'"'+String(p[k]).replace(/"/g,'""')+'"').join(','))].join('\r\n');downloadLocal(new Blob(['\ufeff'+csv],{type:'text/csv'}),'peak-results.csv');}
function downloadLocal(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function demoStudio(){resetState();currentFileName='DEMO · 合成 SEC 数据（非实验结果）';originalRawData={UV:{x:[],y:[],unit:'mAU',xUnit:'mL'},Conductivity:{x:[],y:[],unit:'mS/cm',xUnit:'mL'}};for(let i=0;i<=600;i++){const x=i/25;originalRawData.UV.x.push(x);originalRawData.UV.y.push(5+.12*x+38*Math.exp(-(((x-8)/.65)**2)/2)+210*Math.exp(-(((x-12)/.9)**2)/2)+28*Math.exp(-(((x-16)/1.1)**2)/2));originalRawData.Conductivity.x.push(x);originalRawData.Conductivity.y.push(12+x*.18);}fractionData=Array.from({length:33},(_,i)=>({position:6+i*.5,label:'A'+(i+1),show:true}));rawData=JSON.parse(JSON.stringify(originalRawData));onDataImported();el('studioBaseline').value='linear';el('integStartValue').value=9.5;el('integEndValue').value=14.5;el('showIntegrationLinesCheck').checked=true;el('showIntegRegionCheck').checked=true;el('showFractionsCheck').checked=true;plotGraph();}
const panel=document.createElement('section');panel.className='studio-tools';panel.innerHTML=`<div class="studio-row"><div><label>显示横轴单位</label><select id="studioUnit"><option value="">自动 / 未指定</option>mL</option><option>CV</option><option>min</option></select></div><div><label>积分基线</label><select id="studioBaseline"><option value="zero">Zero · 零基线</option><option value="constant">Constant · 下方 Manual 值</option><option value="linear">Linear · 起止两点</option><option value="signal">Signal · 导入基线 + Manual</option></select></div><button id="studioDemo">载入合成示例</button><button id="studioSVG">导出 SVG</button></div><div class="studio-row"><div><label for="studioColumnVolume">柱体积 · 1 CV = 多少 mL</label><input id="studioColumnVolume" type="number" min="0.000001" step="any" placeholder="例如 24（mL）"></div><div><label for="studioSourceUnit">原始横轴单位（表头缺失时指定）</label><select id="studioSourceUnit"><option value="">从表头识别</option><option value="mL">mL</option><option value="CV">CV</option><option value="min">min</option></select></div></div><p id="studioConversionHint" role="status" class="studio-help"></p><p class="studio-help">拖动绿色积分边界调整区间；框选缩放，双击恢复。Fraction 与曲线共用横轴，密集标签自动隐藏，完整区间见下表。</p><div id="studioResult" role="status"></div><details id="studioFractions"></details><div class="studio-row"><input id="studioPeakName" placeholder="峰名称，例如 Main peak"><button id="studioKeep">保存当前峰</button><button id="studioCSV">导出峰表 CSV</button><button id="studioClear">清空峰表</button></div><div id="studioPeaks"></div>`;
el('plotlyChart').closest('.chart-container').after(panel);
el('studioUnit').innerHTML='<option value="">自动 / 未指定</option><option value="mL">mL</option><option value="CV">CV</option><option value="min">min</option>';
el('studioUnit').onchange=applyCoordinates;el('studioColumnVolume').onchange=applyCoordinates;el('studioSourceUnit').onchange=applyCoordinates;el('studioBaseline').onchange=()=>plotGraph();el('studioDemo').onclick=demoStudio;el('studioKeep').onclick=keepPeak;el('studioCSV').onclick=exportPeaks;el('studioClear').onclick=()=>{savedPeaks=[];renderPeaks();};el('studioSVG').onclick=()=>{if(!el('plotlyChart').data)return;Plotly.downloadImage('plotlyChart',{format:'svg',filename:'chromatogram-v6',width:1400,height:800});};
el('useBaselineCutCheck').parentElement.style.display='none';
document.querySelectorAll('body>footer').forEach(f=>f.style.display='none');
const footer=document.createElement('footer');footer.innerHTML='Based on <a href="https://github.com/Anindya-Karmaker/Advanced_chromatogram_analyzer">Advanced Chromatogram Analyzer</a> · © 2026 Anindya Karmaker · MIT LICENSE · Modified local edition, 2026-09-06. 数据在本机处理。';document.querySelector('.container').append(footer);
const tubePanel=document.createElement('div');tubePanel.className='tube-range-panel';
tubePanel.innerHTML=`<label for="tubeRangeMode">范围选择方式</label><select id="tubeRangeMode"><option value="coordinate">坐标输入 · mL / CV</option><option value="fraction">Fraction · 按管选择</option></select><div id="tubeRangeFields" style="display:none"><label for="tubeStart">Start · 起始管（从该管开始）</label><select id="tubeStart"></select><label for="tubeEnd">End · 结束管（包含整管）</label><select id="tubeEnd"></select></div><p id="tubeRangeHint" role="status"></p>`;
el('integStartValue').closest('.range-control').before(tubePanel);
el('tubeRangeMode').onchange=()=>{rangeSelection.mode=el('tubeRangeMode').value;el('showIntegRegionCheck').checked=true;el('showIntegrationLinesCheck').checked=true;plotGraph();};
for(const [id,key] of [['tubeStart','first'],['tubeEnd','last']])el(id).onchange=()=>{rangeSelection[key]=Number(el(id).value);plotGraph();};
const plotWithoutTubeSelection=plotGraph;
plotGraph=function(){syncTubeRange();return plotWithoutTubeSelection();};
updateIntegration();

function syncTubeRange(){
 if(!el('tubeRangeMode'))return true;
 const active=rangeSelection.mode==='fraction';el('tubeRangeMode').value=rangeSelection.mode;el('tubeRangeFields').style.display=active?'block':'none';
 for(const id of ['integStartValue','integEndValue']){el(id).readOnly=active;el(id).previousElementSibling.textContent=(id==='integStartValue'?'Start':'End')+' ('+xUnit()+'):';}
 if(!active){el('tubeRangeHint').textContent='可输入坐标或拖动图上边界。';return true;}
 const all=fractionData.filter(f=>Number.isFinite(f.position)).slice().sort((a,b)=>a.position-b.position);
 for(const [id,key] of [['tubeStart','first'],['tubeEnd','last']]){
  el(id).innerHTML='<option value="">请选择</option>'+all.map((f,i)=>`<option value="${i+1}">第 ${i+1} 管 · ${esc(f.label)}${f.show===false?'（图中隐藏）':''}</option>`).join('');el(id).value=String(rangeSelection[key]);
 }
 try{
  const r=ChromCore.fractionRange(fractionData,rangeSelection.first,rangeSelection.last);
  el('integStartValue').value=r.start;el('integEndValue').value=r.end;
  el('tubeRangeHint').textContent=`${r.startLabel} 开始 → ${r.endLabel} 结束（含末管）：${Number(r.start.toPrecision(10))}–${Number(r.end.toPrecision(10))} ${xUnit()}。管序按位置排序，隐藏标记仍计入。`;
  return true;
 }catch(e){el('integStartValue').value='';el('integEndValue').value='';el('tubeRangeHint').textContent=e.message;return false;}
}

function installBoundaryHandles(chart){
 chart.querySelectorAll('.boundary-handle').forEach(h=>h.remove());
 if(!el('showIntegrationLinesCheck').checked||rangeSelection.mode==='fraction')return;
 const ax=chart._fullLayout.xaxis,sz=chart._fullLayout._size;
 for(const id of ['integStartValue','integEndValue']){
 const value=Number(el(id).value);if(value<ax.range[0]||value>ax.range[1])continue;
 const h=document.createElement('div');h.className='boundary-handle';h.title=id==='integStartValue'?'拖动积分起点':'拖动积分终点';h.style.cssText=`position:absolute;left:${ax._offset+ax.l2p(value)-7}px;top:${sz.t}px;width:14px;height:${sz.h}px;cursor:ew-resize;z-index:20;touch-action:none;`;chart.append(h);
 h.onpointerdown=e=>{e.preventDefault();e.stopPropagation();h.setPointerCapture(e.pointerId);h.onpointermove=m=>{const px=m.clientX-chart.getBoundingClientRect().left-ax._offset;const v=ax.p2l(px);el(id).value=v.toFixed(5);h.style.left=(ax._offset+px-7)+'px';updateIntegration();};h.onpointerup=()=>{h.onpointermove=null;plotGraph();};};
 }
}
