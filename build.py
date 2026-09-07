from pathlib import Path
import re
p=Path(__file__).parent
s=(p/'upstream/index.html').read_text()
s=re.sub(r'<script type="application/ld\+json">.*?</script>','',s,flags=re.S)
s=re.sub(r'<link rel="canonical"[^>]+>|<meta name="google-site-verification"[^>]+>','',s)
s=re.sub(r'<title>.*?</title>','<title>Fraction Studio · Chromatogram v6</title>',s)
for lib in ['papaparse','xlsx.full','plotly']:
 s=re.sub(r'https://cdnjs.cloudflare.com/[^"\s]+/'+re.escape(lib)+r'\.min.js','vendor/'+lib+'.min.js',s)
s=s.replace('</head>','<link rel="icon" href="icon.png"><link rel="stylesheet" href="studio.css"><script src="core.js"></script></head>')
s=s.replace('Advanced Chromatogram Analyzer v5','Fraction Studio <small>v6 · local edition</small>').replace('Interactive visualization and analysis of chromatography data.','ÄKTA / SEC · 同步 Fraction 轨道 · 精确峰积分')
s=s.replace('src="logo.png" alt="Lab Logo"','src="icon.png" alt="Fraction Studio"')
start=s.index('                            originalRawData[mapping.name] = { x: [], y: [], unit: unitString };')
end=s.index('\n                        }',start)
s=s[:start]+'''                            originalRawData[mapping.name] = ChromCore.pairs(dataRows, idx, unitString, (units[idx] || '').trim());'''+s[end:]
start=s.index("            if (document.getElementById('showFractionsCheck').checked && fractionData.length > 0) {",s.index('function plotGraph()'))
end=s.index("            if (document.getElementById('showRegionsCheck').checked",start)
s=s[:start]+s[end:]
start=s.index('            if (primaryVar && !isNaN(startVal)',s.index('function plotGraph()'))
end=s.index('            selectedVariables.forEach',start)
s=s[:start]+'''            const computed = v6Result();
            if (computed && showRegion && selectedVariables.includes(primaryVar)) {
                const idx = selectedVariables.indexOf(primaryVar), axis = idx ? 'y'+(idx+1) : 'y';
                traces.push({x:computed.points.map(p=>p.x),y:computed.points.map(p=>p.b),mode:'lines',line:{color:'#97a9b6',width:1,dash:'dot'},yaxis:axis,showlegend:false,hoverinfo:'skip'});
                traces.push({x:computed.points.map(p=>p.x),y:computed.points.map(p=>p.y),mode:'lines',line:{width:0},fill:'tonexty',fillcolor:'rgba(13,148,136,.18)',yaxis:axis,showlegend:false,hoverinfo:'skip'});
            }

'''+s[end:]
s=s.replace("Plotly.newPlot('plotlyChart', traces, layout, config);","renderV6(traces, layout, config);")
s=s.replace("version: '4.25',","version: '6.0-local',\n                studio: studioState(),")
s=s.replace('                    columnParams = sessionData.columnParams', '                    restoreStudio(sessionData.studio);\n                    columnParams = sessionData.columnParams')
s=s.replace("        function resetState() {", "        function resetState() {\n            if (typeof resetStudio === 'function') resetStudio();")
s=s.replace('</body>','<script src="studio.js"></script><script src="design.js"></script></body>')
(p/'index.html').write_text(s)
