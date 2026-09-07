/* Presentation layer: preserve existing control IDs and event handlers. */
(()=>{
 const icon=(paths)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
 const icons={
 import:icon('<path d="M12 15V3m-4 4 4-4 4 4M4 14v6h16v-6"/>'),
 plot:icon('<path d="M3 3v18h18M6 16l4-7 4 5 5-10"/>'),
 analysis:icon('<path d="M3 19h18M5 16c4 0 3-11 7-11s3 11 7 11M8 19V7m8 12V7"/>'),
 annotate:icon('<path d="M4 3h10l7 7-11 11-7-7V4Z"/><circle cx="8" cy="8" r="1"/>'),
 export:icon('<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>')};
 const header=document.querySelector('.app-header');
 header.prepend(document.querySelector('.header-logo'));
 document.querySelector('.header-right').innerHTML='<span class="local-badge"><i></i> 本地工作空间</span>';
 document.querySelector('.app-title').innerHTML='Fraction Studio <small>6.0</small>';
 document.querySelector('.app-subtitle').textContent='CHROMATOGRAPHY WORKSPACE';
 for(const [i,button] of [...document.querySelectorAll('.tab-btn')].entries()){
  button.querySelector('.tab-icon').innerHTML=Object.values(icons)[i];
 }
 const panel=document.querySelector('.controls-panel');
 const panelTitle=document.createElement('div');panelTitle.className='panel-heading';
 panelTitle.innerHTML='<span>工作台设置</span><span class="eyebrow">CONTROLS</span>';panel.prepend(panelTitle);
 // Keep original handlers while replacing decorative emoji and verbose button labels.
 const labels={saveSessionBtn:'保存会话',plotBtn:'更新图表',calcBtn:'计算浓度',detectBtn:'显示峰标记',clearPeaksBtn:'清除',fractionBtn:'管理 Fraction',regionBtn:'管理区域',saveBtn:'导出 PNG',copyBtn:'复制图表',fontBtn:'字体与样式',undoBtn:'撤销',redoBtn:'重做'};
 for(const [id,label] of Object.entries(labels))document.getElementById(id).textContent=label;
 document.querySelector('.btn-import').innerHTML=icons.import+'<span>导入 ÄKTA 数据</span>';
 document.querySelector('.btn-import-secondary').textContent='自定义导入 · CSV / Excel';
 document.querySelector('button[onclick*="loadSessionInput"]').textContent='打开会话';
 document.querySelector('label[for="editModeCheck"]').textContent='拖动标签';
 const editBar=document.getElementById('editModeCheck').closest('.checkbox-item').parentElement;editBar.classList.add('chart-edit-bar');
 const chart=document.querySelector('.chart-container');
 const top=document.createElement('div');top.className='chart-top';
 top.innerHTML='<div><span class="eyebrow">CHROMATOGRAM</span><h2>色谱分析</h2></div><div class="chart-actions"></div>';
 chart.prepend(top);
 const actions=top.querySelector('.chart-actions');
 actions.append(document.getElementById('studioDemo'),document.getElementById('studioSVG'));
 document.getElementById('studioDemo').textContent='载入合成示例';
 document.getElementById('studioSVG').innerHTML=icons.export+'导出 SVG';
 const empty=document.createElement('div');empty.className='empty-state';
 empty.innerHTML='<div class="empty-mark">'+icons.analysis+'</div><span class="eyebrow">A CLEARER VIEW OF YOUR SEPARATION</span><h3>从一条色谱曲线开始</h3><p>导入实验数据，查看峰形、Fraction 与积分结果。<br>也可以先载入合成示例，熟悉分析工作台。</p><button class="empty-import" type="button">选择数据文件 <span>↗</span></button><span class="empty-formats">ÄKTA TXT · CSV · Excel 自定义导入</span>';
 empty.querySelector('button').onclick=()=>document.getElementById('fileInput').click();chart.append(empty);
 const tools=document.querySelector('.studio-tools');
 const rows=[...tools.querySelectorAll(':scope > .studio-row')];
 const coordinates=document.createElement('section');coordinates.className='coordinate-card';
 coordinates.innerHTML='<div class="section-heading"><div><span class="eyebrow">ANALYSIS SETUP</span><h3>坐标与基线</h3></div><span class="section-note">统一坐标，精确积分</span></div><div class="coordinate-fields"></div>';
 const fields=coordinates.querySelector('.coordinate-fields');
 // Logical reading order: volume, display unit, source unit, baseline.
 fields.append(rows[1].children[0],rows[0].children[0],rows[1].children[1],rows[0].children[1]);
 coordinates.append(document.getElementById('studioConversionHint'));
 tools.prepend(coordinates);rows[0].remove();rows[1].remove();
 const peakSection=document.createElement('section');peakSection.className='peak-card';
 peakSection.innerHTML='<div class="section-heading"><div><span class="eyebrow">PEAK COLLECTION</span><h3>峰结果</h3></div><span class="section-note">保存区间并比较峰面积</span></div>';
 const peakRow=rows[2];peakRow.classList.add('peak-actions');
 peakSection.append(peakRow,document.getElementById('studioPeaks'));tools.append(peakSection);
 document.getElementById('studioPeakName').setAttribute('aria-label','峰名称');
 document.getElementById('studioKeep').textContent='+ 保存当前峰';
 document.getElementById('studioCSV').textContent='导出 CSV';
 document.getElementById('studioClear').textContent='清空';
 document.getElementById('studioResult').setAttribute('aria-live','polite');
 document.getElementById('studioFractions').innerHTML='<summary>Fraction 区间</summary>';
 const titles={'Open Data File':'导入数据','Session':'分析会话','Column Parameters':'柱参数','Integration Range':'积分区间','Results':'计算结果','Peak Detection':'峰识别','Data Series':'数据通道','Fractions on Plot':'Fraction 轨道','Regions on Plot':'区域显示','X-Axis Range':'横轴范围','Save Image':'图像导出','Chart Appearance':'图表外观'};
 document.querySelectorAll('.tab-section-label').forEach(e=>{e.textContent=titles[e.textContent.trim()]||e.textContent;});
})();
