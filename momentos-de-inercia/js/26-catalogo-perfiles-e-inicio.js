// ═══════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════
window.addEventListener('load', ()=>{ try{ setHerramienta('pan'); }catch(e){} resizeCanvas(); fitView(); });
window.addEventListener('resize', resizeCanvas);

function downloadPDF(){
  if(!results){aviso('Primero calcula el momento de inercia.');return;}
  const mainCv=document.getElementById('mainCanvas');
  const mohrCv=document.getElementById('mohrCanvas');
  const compCv=document.getElementById('compositeCanvas');
  // Re-render Mohr diagrams at high resolution → crisp, larger images in the PDF
  const epPDF = computeExtraPoint(results);
  const mohrPCv=document.getElementById('mohrCanvasP');
  if(mohrCv) drawMohr({Ix:results.Ix,Iy:results.Iy,Ixy:results.Ixy},'mohrCanvas',{res:3});
  if(mohrPCv && epPDF) drawMohr({Ix:epPDF.IxP,Iy:epPDF.IyP,Ixy:epPDF.IxyP},'mohrCanvasP',Object.assign({res:3}, epPDF.rot?{rot:epPDF.rot}:{}));
  const mainImg=mainCv?mainCv.toDataURL('image/png'):null;
  const mohrImg=mohrCv?mohrCv.toDataURL('image/png'):null;
  const mohrPImg=(mohrPCv&&epPDF)?mohrPCv.toDataURL('image/png'):null;
  const compImg=compCv?compCv.toDataURL('image/png'):null;
  // Restore normal on-screen resolution
  if(mohrCv) drawMohr({Ix:results.Ix,Iy:results.Iy,Ixy:results.Ixy},'mohrCanvas');
  if(mohrPCv && epPDF) drawMohr({Ix:epPDF.IxP,Iy:epPDF.IyP,Ixy:epPDF.IxyP},'mohrCanvasP', epPDF.rot?{rot:epPDF.rot}:undefined);
  let body=document.getElementById('resultsPanel').innerHTML;
  const mohrStyle='width:100%;height:auto;max-height:265px;border-radius:8px;border:1px solid #ddd;display:block;object-fit:contain;';
  if(mohrImg) body=body.replace(/<canvas id="mohrCanvas"[^>]*><\/canvas>/,'<img src="'+mohrImg+'" style="'+mohrStyle+'">');
  if(mohrPImg) body=body.replace(/<canvas id="mohrCanvasP"[^>]*><\/canvas>/,'<img src="'+mohrPImg+'" style="'+mohrStyle+'">');
  if(compImg) body=body.replace(/<canvas id="compositeCanvas"[^>]*><\/canvas>/,
    '<img src='+compImg+' style="width:100%;height:175px;border-radius:8px;border:1px solid #ddd;display:block;object-fit:contain;background:#f0f4f2;">');
  const mainSnap=mainImg?'<div style="margin-bottom:12px;page-break-inside:avoid;"><h3 style="font-size:11px;font-weight:700;color:#1a7a62;margin-bottom:5px;font-family:Inter,sans-serif;text-transform:uppercase;letter-spacing:.5px;">Vista del panel — figuras y ejes principales</h3><img src="'+mainImg+'" style="width:100%;max-height:300px;border-radius:6px;border:1px solid #ccc;display:block;object-fit:contain;background:#ffffff;"></div>':'';
  const dt=new Date().toLocaleDateString('es-PE',{day:'2-digit',month:'long',year:'numeric'});
  const pdfWin=window.open('','_blank','width=980,height=760');
  if(!pdfWin){aviso('Permite ventanas emergentes para el PDF.', 'error');return;}
  const katexCss=(document.getElementById('katex-css')||{}).textContent||'';
  const css='*{box-sizing:border-box;margin:0;padding:0;}:root{--math:\'STIX Two Text\',\'Times New Roman\',Georgia,serif;--sans:Inter,\'Helvetica Neue\',Arial,sans-serif;--grn:#c9930f;--grn2:#041d56;--card:#f4f9f7;--border:#c8e0d8;--text:#1a1a1a;--muted:#5a7570;}body{font-family:var(--sans);font-size:10.5px;background:#fff;color:var(--text);padding:12mm 9mm 14mm;-webkit-print-color-adjust:exact;print-color-adjust:exact;}.pdf-header{display:flex;align-items:center;gap:12px;border-bottom:2px solid var(--grn2);padding-bottom:7px;margin-bottom:10px;}.pdf-title{font-size:17px;font-weight:800;color:var(--grn);}.pdf-sub{font-size:10px;color:var(--muted);}.pdf-date{margin-left:auto;font-size:9px;color:var(--muted);}.res-section-title{display:flex;align-items:center;gap:7px;font-size:11.5px;font-weight:800;color:var(--grn);border-bottom:1.5px solid var(--grn2);padding-bottom:4px;margin:9px 0 6px;}.res-section-title .num{width:18px;height:18px;border-radius:50%;background:var(--grn2);display:inline-flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:#fff;flex:none;}.proc-block{background:var(--card);border:1px solid var(--border);border-radius:6px;padding:6px 10px;margin-bottom:6px;page-break-inside:avoid;}.proc-subtitle{font-size:9px;font-weight:700;color:var(--grn);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;}.eq-body{font-family:var(--math);font-size:11px;color:var(--text);line-height:1.5;margin:1px 0;}.eq-body .katex{font-size:1.05em;color:var(--text);}.eq-body .v{color:var(--grn);font-weight:700;}.fig-table,.steiner-table{width:100%;border-collapse:collapse;font-family:var(--math);font-size:11px;page-break-inside:avoid;}.fig-table th,.steiner-table th{padding:3px 6px;text-align:left;font-size:9px;font-weight:700;color:var(--grn);text-transform:uppercase;letter-spacing:.4px;border-bottom:1.5px solid var(--border);background:var(--card);font-family:var(--sans);}.fig-table td,.steiner-table td{padding:2px 6px;border-bottom:1px solid var(--border);font-family:var(--math);vertical-align:middle;}.fig-table tfoot td,.steiner-table tfoot td{font-weight:700;border-top:2px solid var(--border);background:var(--card);color:var(--grn);}.steiner-table{width:100%;font-size:8.5px;}.steiner-table th{white-space:normal;line-height:1.15;vertical-align:bottom;text-align:center;padding:3px 4px;}.steiner-table td{white-space:nowrap;text-align:center;padding:3px 4px;}.steiner-table td:first-child{text-align:left;}.steiner-table .num{background:none;color:var(--grn);font-style:italic;}.num-cell,.num{color:var(--grn);font-style:italic;font-family:var(--math);}.summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-bottom:7px;page-break-inside:avoid;}.summary-box{border:1px solid var(--border);border-radius:5px;padding:5px 8px;}.summary-box.highlight{background:var(--card);border-color:var(--grn2);}.s-lbl{font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:2px;font-family:var(--sans);}.s-val{font-size:13px;font-weight:700;color:var(--grn);font-style:italic;font-family:var(--math);}.s-unit{font-size:8px;color:var(--muted);}.principal-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-bottom:7px;page-break-inside:avoid;}.principal-box{border:1px solid var(--border);border-radius:5px;padding:6px;text-align:center;}.principal-box.main{background:var(--card);border-color:var(--grn2);}.p-lbl{font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px;font-family:var(--sans);}.p-val{font-size:15px;font-weight:700;color:var(--grn);font-style:italic;font-family:var(--math);}.fig-color-dot{width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:5px;vertical-align:middle;}.name-cell{font-weight:600;font-family:var(--sans);}.sign-pos{color:#1a8a72;font-weight:700;}.sign-neg{color:#c0392b;font-weight:700;}.notbtn,.notation-bar{display:none!important;}.point-input{display:none!important;}.point-tool:not(.has-point){display:none!important;}.res-section{margin-bottom:8px;}img{max-width:100%;}.fig-color-dot{display:inline-block!important;width:8px!important;height:8px!important;min-width:8px!important;border-radius:50%!important;margin-right:5px!important;vertical-align:middle!important;flex-shrink:0!important;flex-grow:0!important;}.mth-sqrt{display:inline-flex;align-items:flex-start;}.mth-rad{font-size:1.2em;line-height:0.9;padding-right:1px;}.mth-cnt{border-top:1.5px solid currentColor;padding:1px 3px 0 1px;margin-top:3px;}.mth-frac{display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;margin:0 2px;}.mth-num{border-bottom:1.5px solid currentColor;padding:0 4px;text-align:center;}.mth-den{padding:1px 4px;text-align:center;}.wm-seal{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:340px;height:340px;opacity:.07;z-index:9999;pointer-events:none;}.wm-seal svg{width:100%;height:100%;}.pdf-foot{margin-top:10px;text-align:center;font-size:8.5px;color:var(--muted);border-top:1px solid var(--border);padding-top:6px;letter-spacing:.3px;}@page{size:A4 portrait;margin:0;}@media print{body{padding:12mm 9mm 14mm;}}';
  const wmSeal='<div class="wm-seal"><svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><defs><path id="stp" d="M 26,100 A 74,74 0 0 1 174,100"/><path id="sbt" d="M 26,100 A 74,74 0 0 0 174,100"/></defs><circle cx="100" cy="100" r="94" fill="none" stroke="#041d56" stroke-width="2.5"/><circle cx="100" cy="100" r="80" fill="none" stroke="#041d56" stroke-width="1"/><text font-family="Inter,sans-serif" font-size="9" font-weight="800" fill="#041d56" letter-spacing="1"><textPath href="#stp" startOffset="50%" text-anchor="middle">BEAM &amp; SECTION ANALYSIS</textPath></text><text font-family="Inter,sans-serif" font-size="10.5" font-weight="600" fill="#041d56" letter-spacing="1"><textPath href="#sbt" startOffset="50%" text-anchor="middle">by Luis Alejandro Bazán Campos</textPath></text><text x="100" y="106" font-family="Inter,sans-serif" font-size="16" font-weight="800" fill="#041d56" text-anchor="middle">BSA</text><line x1="62" y1="118" x2="138" y2="118" stroke="#041d56" stroke-width="1"/><text x="100" y="133" font-family="Inter,sans-serif" font-size="9" fill="#041d56" text-anchor="middle" letter-spacing="1">ESTÁTICA</text></svg></div>';
  const pdfFoot='<div class="pdf-foot">BSA · by Luis Alejandro Bazán Campos</div>';
  pdfWin.document.write('<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>BSA \u2014 Momento de Inercia</title><link href="https://fonts.googleapis.com/css2?family=STIX+Two+Text:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet"><style>'+katexCss+'</style><style>'+css+'</style></head><body>'+wmSeal+'<div class="pdf-header"><span style="font-size:18px">\ud83d\udccf</span><div><div class="pdf-title">BSA \u2014 Momentos de Inercia</div><div class="pdf-sub">by Luis Alejandro Bazán Campos</div></div><div class="pdf-date">Generado: '+dt+'</div></div>'+mainSnap+body+pdfFoot+'</body></html>');
  pdfWin.document.close();
  pdfWin.focus();
  setTimeout(function(){pdfWin.print();},1400);
}

// Cotas de la sección compuesta en la vista de resultados. Delega en el mismo
// motor que el lienzo del editor: solo cambian la proyección y el tamaño de
// letra, para que pantalla y resultados muestren exactamente lo mismo.
function cotasCompuestaGenerales(c, toSx, toSy){
  if(!figures.length) return;
  dibujarCotasSobre(c, {
    px: x => toSx(x), py: y => toSy(y),
    fuente: '600 9px Inter, sans-serif',
    fuenteTotal: '700 9.5px Inter, sans-serif',
    tick: 3.8, salto: 13, sepX: 26, sepY: 30, angulos: false
  });
}

function drawCompositeFigure(canvasId) {
  const cv=document.getElementById(canvasId);
  if(!cv||!figures.length) return;
  const dpr=window.devicePixelRatio||1, W=cv.clientWidth||600, H=cv.clientHeight||350;
  cv.width=W*dpr; cv.height=H*dpr;
  const c=cv.getContext('2d'); c.scale(dpr,dpr);
  c.fillStyle='#ffffff'; c.fillRect(0,0,W,H);
  let xMin=Infinity,xMax=-Infinity,yMin=Infinity,yMax=-Infinity;
  for(const fig of figures){
    const def=FIG_DEFS[fig.type]; if(!def||!def.bounds) continue;
    const b=def.bounds(fig.dims),rot=(fig.rotation||0)*Math.PI/180;
    const corners=[{x:b.left,y:b.bottom},{x:b.right,y:b.bottom},{x:b.right,y:b.top},{x:b.left,y:b.top}];
    for(const cor of corners){
      const rx=fig.cx+cor.x*Math.cos(rot)-cor.y*Math.sin(rot);
      const ry=fig.cy+cor.x*Math.sin(rot)+cor.y*Math.cos(rot);
      xMin=Math.min(xMin,rx);xMax=Math.max(xMax,rx);yMin=Math.min(yMin,ry);yMax=Math.max(yMax,ry);
    }
  }
  // ── Encaje en DOS PASADAS ──
  // La acotación no ocupa lo mismo arriba que abajo: la cadena y la cota total
  // van debajo y a la derecha. Con un margen simétrico la cota total se salía
  // del lienzo. Se encaja con un margen provisional, se pregunta cuánto pide
  // la acotación con esa escala, y se vuelve a encajar reservándolo.
  const fw=Math.max(xMax-xMin,.001), fh=Math.max(yMax-yMin,.001);
  const cfgCotas = T => ({
    px: x => T.toSx(x), py: y => T.toSy(y),
    fuente:'600 9px Inter, sans-serif', fuenteTotal:'700 9.5px Inter, sans-serif',
    tick:3.8, salto:13, sepX:26, sepY:30, angulos:false
  });
  const encajar = (mIzq, mDer, mSup, mInf)=>{
    const dW = W - mIzq - mDer, dH = H - mSup - mInf;
    const sc = Math.min(dW/fw, dH/fh);
    const sobraX = dW - fw*sc, sobraY = dH - fh*sc;
    return {
      toSx: wx => mIzq + sobraX/2 + (wx-xMin)*sc,
      toSy: wy => H - mInf - sobraY/2 - (wy-yMin)*sc,
      scale: sc
    };
  };
  const MARGEN_ROT = 62;
  let T = encajar(MARGEN_ROT, 70, 30, 70);
  let esp = {abajo:70, derecha:70};
  try{ esp = espacioCotas(c, cfgCotas(T)); }catch(e){}
  T = encajar(MARGEN_ROT,
              Math.min(esp.derecha+10, W*0.42), 30,
              Math.min(esp.abajo+8,   H*0.42));
  const scale=T.scale, toSx=T.toSx, toSy=T.toSy;
  // Grid
  c.strokeStyle='rgba(228,172,23,.07)'; c.lineWidth=0.5;
  const gs=Math.pow(10,Math.round(Math.log10(fw/5)));
  for(let gx=Math.floor(xMin/gs)*gs;gx<=xMax+gs;gx+=gs){c.beginPath();c.moveTo(toSx(gx),0);c.lineTo(toSx(gx),H);c.stroke();}
  for(let gy=Math.floor(yMin/gs)*gs;gy<=yMax+gs;gy+=gs){c.beginPath();c.moveTo(0,toSy(gy));c.lineTo(W,toSy(gy));c.stroke();}
  // Axes
  c.strokeStyle='rgba(30,33,38,.2)'; c.lineWidth=1;
  const ox0=toSx(0),oy0=toSy(0);
  if(ox0>0&&ox0<W){c.beginPath();c.moveTo(ox0,0);c.lineTo(ox0,H);c.stroke();}
  if(oy0>0&&oy0<H){c.beginPath();c.moveTo(0,oy0);c.lineTo(W,oy0);c.stroke();}
  function figPath(fig,ctx2){
    const def=FIG_DEFS[fig.type]; if(!def) return;
    ctx2.save();ctx2.translate(toSx(fig.cx),toSy(fig.cy));
    ctx2.rotate(-fig.rotation*Math.PI/180);ctx2.scale(scale,-scale);
    ctx2.beginPath();def.draw(ctx2,fig.dims,false);ctx2.restore();
  }
  for(const fig of figures.filter(f=>f.sign===1)){
    figPath(fig,c);c.fillStyle=hexAlpha(fig.color,.28);c.fill();
    figPath(fig,c);c.strokeStyle=hexAlpha(fig.color,.9);c.lineWidth=1.8;c.stroke();
  }
  for(const fig of figures.filter(f=>f.sign===-1)){
    figPath(fig,c);c.fillStyle='#ffffff';c.fill();
    c.save();figPath(fig,c);c.clip();
    c.strokeStyle=hexAlpha(fig.color,.4);c.lineWidth=1;
    for(let i=-H;i<W+H;i+=7){c.beginPath();c.moveTo(i,0);c.lineTo(i+H,H);c.stroke();}
    c.restore();
    figPath(fig,c);c.strokeStyle=hexAlpha(fig.color,.85);c.lineWidth=1.5;
    c.setLineDash([4,3]);c.stroke();c.setLineDash([]);
  }
  if(results){
    const gsx=toSx(results.xbar),gsy=toSy(results.ybar);
    c.beginPath();c.arc(gsx,gsy,5.5,0,Math.PI*2);
    c.fillStyle='#f0c040';c.fill();c.strokeStyle='#fff';c.lineWidth=1.2;c.stroke();
    c.fillStyle='#f0c040';c.font='bold 10px Inter';c.textAlign='left';c.fillText('G',gsx+8,gsy-5);
  }
  // Las cotas b= y h= por figura eran el sistema de acotación ANTIGUO. Con la
  // cadena general encadenada se leían como restos superpuestos, así que se
  // retiran: la cadena ya da todas las distancias entre bordes. Solo quedan
  // los radios y los ángulos, que una cadena ortogonal no puede expresar, y
  // ahora van en un recuadro colocado en un hueco libre junto a su figura.
  c.textAlign='center';
  const etiq = crearColocador(c, {x0:4, y0:4, x1:W-4, y1:H-4});
  for(const fig of figures){
    const def=FIG_DEFS[fig.type]; if(!def||!def.bounds) continue;
    const d=fig.dims, rot=(fig.rotation||0)*Math.PI/180;
    if(d.r === undefined) continue;
    const clr = hexAlpha(fig.color,.95);
    // Centro real del arco: el origen local de cada figura es su centroide, que
    // solo coincide con el centro del arco en el círculo completo.
    let co = {x:0, y:0};
    if(fig.type==='quarter'){ const dc=4*d.r/(3*Math.PI); co={x:-dc,y:-dc}; }
    else if(fig.type==='semicircle'){ co={x:0, y:-4*d.r/(3*Math.PI)}; }
    else if(fig.type==='sector'){
      const t=d.alpha*Math.PI/180; co={x:0, y:-2*d.r*Math.sin(t)/(3*t)};
    }
    const wx = fig.cx + co.x*Math.cos(rot) - co.y*Math.sin(rot);
    const wy = fig.cy + co.x*Math.sin(rot) + co.y*Math.cos(rot);
    const p0 = {x:toSx(wx), y:toSy(wy)};
    const ang = rot + (fig.type==='sector' ? Math.PI/2 : 0);
    const p1 = {x:toSx(wx + d.r*Math.cos(ang)), y:toSy(wy + d.r*Math.sin(ang))};
    c.save();
    c.strokeStyle=clr; c.lineWidth=1.1;
    c.beginPath(); c.moveTo(p0.x,p0.y); c.lineTo(p1.x,p1.y); c.stroke();
    c.restore();
    etiq.add('R='+d.r+unit, (p0.x+p1.x)/2, (p0.y+p1.y)/2, clr, 'bold 9px Inter');
    if(fig.type==='sector'){
      etiq.add('\u03b8='+d.alpha+'\u00b0', p0.x, p0.y, clr, '9px Inter');
    }
  }
  // Huecos prohibidos: la caja de cada figura y las bandas donde van las cotas.
  const obstaculos = figures.map(f=>{
    const bb = figuraBoundsMundo(f);
    const x0=toSx(bb.left), x1=toSx(bb.right), y0=toSy(bb.top), y1=toSy(bb.bottom);
    return {x:x0-4, y:y0-4, w:(x1-x0)+8, h:(y1-y0)+8};
  });
  {
    const yb = toSy(yMin), xr = toSx(xMax);
    obstaculos.push({x:0, y:yb+6, w:W, h:H});
    obstaculos.push({x:xr+6, y:0, w:W, h:H});
  }
  etiq.pintar(obstaculos);

  // Cadena de cotas general, con el mismo motor que el lienzo del editor
  try{ cotasCompuestaGenerales(c, toSx, toSy); }catch(e){}

  c.textAlign='left';c.fillStyle='rgba(30,33,38,.35)';c.font='8px Inter';
  c.fillText('G = centroide global de la secci\u00f3n', 12, H-8);
}

// ═══════════════════════════════════════════════════════════
//  GUARDAR / ABRIR — archivo local del usuario
//  El ejercicio ya no vive en el navegador ni en el portal: se descarga un
//  .json que el alumno guarda donde quiera y vuelve a abrir cuando quiera.
//  En escritorio se ofrece el diálogo "Guardar como" del sistema; donde esa
//  API no existe (Firefox, Safari, móvil) se recurre a la descarga normal.
// ═══════════════════════════════════════════════════════════
const BSA_FORMATO = 'bsa10';
const BSA_VERSION = 1;
const BSA_EXT     = '.bsa10.json';

function nombreArchivoSeguro(nombre){
  // Sin caracteres que rompan el nombre de archivo en Windows/macOS/Android.
  const limpio = (nombre||'ejercicio').trim().replace(/[\\/:*?"<>|]+/g,'-').slice(0,60);
  return limpio || 'ejercicio';
}

function abrirGuardar(){
  const m = document.getElementById('guardarModal'); if(!m) return;
  const inp = document.getElementById('nombreProyecto');
  if(inp) inp.value = '';
  m.classList.add('show');
}
function cerrarGuardar(){
  const m = document.getElementById('guardarModal'); if(m) m.classList.remove('show');
}

async function guardarProyecto(){
  const inp = document.getElementById('nombreProyecto');
  const nombre = (inp && inp.value || '').trim();
  if(!nombre){ aviso('Ponle un nombre al ejercicio antes de guardarlo.', 'error');
               if(inp) inp.focus(); return; }

  const estado = histSnapshot();
  if(!estado){ aviso('No hay nada calculado que guardar.', 'error'); return; }

  const paquete = { bsaApp: BSA_FORMATO, version: BSA_VERSION,
                    titulo: nombre, fecha: new Date().toISOString(), estado: estado };
  const texto   = JSON.stringify(paquete, null, 2);
  const archivo = nombreArchivoSeguro(nombre) + BSA_EXT;

  // Camino preferido: el diálogo del sistema, que deja elegir carpeta.
  if(window.showSaveFilePicker){
    try{
      const handle = await window.showSaveFilePicker({
        suggestedName: archivo,
        types: [{ description:'Ejercicio BSA — Momento de inercia',
                  accept: {'application/json': ['.json']} }]
      });
      const w = await handle.createWritable();
      await w.write(texto); await w.close();
      cerrarGuardar();
      aviso('Guardado como "' + handle.name + '".');
      return;
    }catch(err){
      // Cancelar no es un error: se sale en silencio.
      if(err && err.name === 'AbortError') return;
    }
  }
  descargarComoArchivo(texto, archivo);
  cerrarGuardar();
  aviso('Descargando "' + archivo + '". Búscalo en tu carpeta de descargas.');
}

function descargarComoArchivo(texto, nombreArchivo){
  const blob = new Blob([texto], {type:'application/json'});
  const url  = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nombreArchivo;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  // Se revoca con retraso: algunos navegadores necesitan la URL viva
  // mientras arranca la descarga.
  setTimeout(()=>URL.revokeObjectURL(url), 4000);
}

function cerrarHistorial(){
  const m = document.getElementById('histModal'); if(m) m.classList.remove('show');
}

function onArchivoElegido(ev){
  const file = ev.target.files && ev.target.files[0];
  ev.target.value = '';                    // permite reelegir el mismo archivo
  if(!file) return;
  const lector = new FileReader();
  lector.onerror = () => aviso('No se pudo leer el archivo.', 'error');
  lector.onload = () => {
    let datos;
    try{ datos = JSON.parse(lector.result); }
    catch(e){ aviso('El archivo no es un ejercicio válido (JSON dañado).', 'error'); return; }
    if(datos.bsaApp && datos.bsaApp !== BSA_FORMATO)
      aviso('Este archivo parece de otro capítulo (' + datos.bsaApp
          + '). Se intentará abrir de todos modos.', 'error');
    const st = (datos.estado && datos.estado.state) || datos.estado
               || datos.state || datos;
    try{ histRestore(st);
         aviso('Ejercicio abierto desde "' + file.name + '".');
         cerrarHistorial(); }
    catch(e){ aviso('No se pudo abrir: el archivo tiene un formato inesperado.', 'error'); }
  };
  lector.readAsText(file);
}
