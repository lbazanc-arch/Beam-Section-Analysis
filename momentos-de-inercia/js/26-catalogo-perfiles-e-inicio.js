// ═══════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════
window.addEventListener('load', ()=>{ try{ setHerramienta('pan'); }catch(e){} resizeCanvas(); fitView(); });
window.addEventListener('resize', resizeCanvas);

// ── Informe rápido (botón rojo «PDF», no el de LaTeX) ──
// Lo arma bsaInformeRapido de core/comun.js: abre la pestaña dentro de la
// pulsación, clona el panel de resultados sin controles (cada lienzo pasa a
// imagen recortada), pone cabecera y colofón comunes y, en el ordenador,
// imprime solo. Aquí queda lo propio del tema:
//  - el círculo de Mohr se redibuja a triple resolución CON el giro que tenga
//    en pantalla, y después se deja como estaba;
//  - lo que no va al papel: el recuadro para escribir el punto P, la sección
//    del punto si no hay punto, y el bloque del deslizador si θ = 0 (sin giro
//    no hay resultado que enseñar). La barra de notación, «Rotar ejes» y la
//    pista de la rigidez llevan data-bsa-pantalla en 23-;
//  - CSS_INFORME_IN, el CSS de las clases del panel pensado para el papel.
function _opcionesMohrPantalla(){
  if(!results || !(Math.abs(mohrTheta) > 1e-9)) return {};
  const rt = rotateInertia(results.Ix, results.Iy, results.Ixy, mohrTheta);
  rt.ang = mohrTheta;
  return {rot: rt};
}
// res: resolución del lienzo (3 para el papel); sin ella, la de la pantalla.
function _redibujarMohr(res){
  if(!results) return;
  const extra = res ? {res: res} : {};
  if(document.getElementById('mohrCanvas'))
    drawMohr({Ix:results.Ix, Iy:results.Iy, Ixy:results.Ixy}, 'mohrCanvas',
      Object.assign({}, _opcionesMohrPantalla(), extra));
  const ep = computeExtraPoint(results);
  if(ep && document.getElementById('mohrCanvasP'))
    drawMohr({Ix:ep.IxP, Iy:ep.IyP, Ixy:ep.IxyP}, 'mohrCanvasP',
      Object.assign({}, ep.rot ? {rot: ep.rot} : {}, extra));
}

const CSS_INFORME_IN = [
  // Los nombres del tema (los estilos en línea del panel usan --grn2, --muted…)
  ':root{--grn:#041d56;--grn2:#0d3a8f;--grn3:#0d3a8f;--card:#f7f9fc;--bg:#ffffff;',
  '  --border:#d5dce6;--border2:#c8ccd4;--muted:#5f6b76;--green:#2f9e6f;--mf:var(--math)}',
  '.results-wrap{padding:0;max-width:none;margin:0}',
  '.results-wrap h2{font-size:14px!important;color:var(--grn)!important}',
  // Secciones
  '.res-section{margin-bottom:12px}',
  '.res-section-title{display:flex;align-items:center;gap:7px;font-size:11.5px;font-weight:800;color:var(--grn);',
  '  letter-spacing:.3px;border-bottom:1.5px solid var(--grn2);padding-bottom:4px;margin:10px 0 7px;',
  '  break-after:avoid;page-break-after:avoid}',
  '.res-section-title .num{width:18px;height:18px;border-radius:50%;background:var(--grn2);color:#fff;flex:none;',
  '  display:inline-flex;align-items:center;justify-content:center;font:800 9px/1 var(--sans)}',
  '.proc-block{background:var(--card);border:1px solid var(--border);border-radius:6px;padding:7px 10px;',
  '  margin-bottom:7px;break-inside:avoid;page-break-inside:avoid}',
  '.proc-subtitle{font-size:9px;font-weight:700;color:var(--grn2);text-transform:uppercase;letter-spacing:.5px;',
  '  margin-bottom:4px;break-after:avoid;page-break-after:avoid}',
  // Ecuaciones
  '.eq-row{display:flex;align-items:baseline;gap:8px;padding:1px 0}',
  '.eq-lbl{flex:none;font-size:10px;color:var(--muted)}.eq-lbl:empty{display:none}',
  '.eq-body{min-width:0;max-width:100%;font-family:var(--mf);font-size:11px;line-height:1.6;color:var(--text)}',
  '.eq-body .katex{font-size:1.05em}',
  '.eq-sep{height:1px;background:var(--border);margin:5px 0}',
  // Tarjeta de cada figura con su croquis
  '.fig-card{display:flex;gap:10px;align-items:flex-start}',
  '.fig-card-datos{flex:1;min-width:0}',
  '.fig-card-dib{flex:0 0 150px}',
  '.croq{width:100%;background:#fff;border:1px solid var(--border);border-radius:6px;padding:6px 7px 5px}',
  '.croq-h{display:flex;align-items:center;gap:5px;margin-bottom:3px}',
  '.croq-n{flex:none;width:15px;height:15px;border-radius:50%;background:var(--grn2);color:#fff;font-size:8.5px;',
  '  font-weight:800;display:flex;align-items:center;justify-content:center}',
  '.croq-t{font-size:9px;font-weight:700;line-height:1.25}',
  '.croq-t i{color:#c0392b;font-style:normal;font-size:8px}',
  '.croq-svg{display:block;width:100%;height:auto}',
  '.croq-d{display:flex;justify-content:space-between;gap:6px;font-size:8px;color:var(--muted);',
  '  border-top:1px solid var(--border);padding-top:4px;margin-top:3px}',
  // Tablas
  '.fig-table,.steiner-table,.tabla{width:100%;border-collapse:collapse}',
  '.fig-table{font-size:10px;margin-bottom:4px}',
  '.fig-table th,.steiner-table th,.tabla th{font-family:var(--sans);font-size:8.5px;font-weight:700;color:var(--grn2);',
  '  text-transform:uppercase;letter-spacing:.3px;line-height:1.2;text-align:left;vertical-align:bottom;',
  '  background:var(--suave);border-bottom:1.5px solid var(--border);padding:3px 5px}',
  '.fig-table td,.steiner-table td,.tabla td{padding:2px 5px;border-bottom:1px solid var(--border);vertical-align:middle}',
  '.fig-table td,.steiner-table td{font-family:var(--mf)}',
  '.fig-table tfoot td,.steiner-table tfoot td{font-weight:700;color:var(--grn);background:var(--suave);',
  '  border-top:1.5px solid var(--grn2)}',
  '.fig-table .num-cell,.steiner-table .num{color:var(--grn2);font-style:italic;font-variant-numeric:tabular-nums}',
  '.fig-table .name-cell{font-family:var(--sans);font-weight:600}',
  '.steiner-table{font-size:8.5px}',
  '.steiner-table th{text-align:center;padding:3px 4px}',
  '.steiner-table td{text-align:center;white-space:nowrap;padding:2px 4px}',
  '.steiner-table th:first-child,.steiner-table td:first-child{text-align:left}',
  '.tabla{font-size:9.5px}',
  '.sign-pos{color:#1a8a72;font-weight:700}.sign-neg{color:#c0392b;font-weight:700}',
  // Cajas de resultados
  '.summary-grid,.principal-grid{display:grid;gap:5px;margin:6px 0 8px;break-inside:avoid;page-break-inside:avoid}',
  '.summary-grid{grid-template-columns:repeat(4,1fr)}',
  '.principal-grid{grid-template-columns:repeat(3,1fr)}',
  '.summary-box,.principal-box{min-width:0;background:#fff;border:1px solid var(--border);border-radius:5px}',
  '.summary-box{padding:5px 8px}',
  '.principal-box{padding:6px;text-align:center}',
  '.summary-box.highlight,.principal-box.main{background:var(--suave);border-color:#9fb3d9}',
  '.s-lbl,.p-lbl{font-family:var(--sans);font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:2px}',
  '.s-val,.p-val{font-family:var(--mf);font-weight:700;font-style:italic;color:var(--grn);overflow-wrap:anywhere}',
  '.s-val{font-size:13px}.p-val{font-size:15px}',
  '.s-unit,.p-unit{font-size:8px;color:var(--muted)}',
  // Recuadros de aviso (signo de Pxy, unidades mezcladas)
  '.verdict{margin:8px 0;padding:6px 10px;background:#fff;border:1px solid var(--border);',
  '  border-left:3px solid var(--grn2);border-radius:6px;break-inside:avoid;page-break-inside:avoid}',
  '.verdict.bad{border-left-color:#c0392b;background:#fef2f2}',
  '.verdict-t{font-size:9px;font-weight:800;color:var(--grn);text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px}',
  '.verdict.bad .verdict-t{color:#c0392b}',
  // Teléfono: el croquis debajo de su tabla y las cajas de dos en dos
  '@media screen and (max-width:640px){',
  '  .fig-card{flex-direction:column}',
  '  .fig-card-dib{flex:none;width:100%;max-width:240px;margin:0 auto}',
  '  .summary-grid,.principal-grid{grid-template-columns:repeat(2,1fr)}',
  '}'
].join('\n');

// El encaje de la figura (cajaDibujoInforme, encajarDibujoInforme,
// lienzoTemporalInforme, marcoLienzoInforme) vive en core/comun.js.

// ── La figura del informe ──
// Se dibuja en el lienzo del editor AGRANDADO un momento a un tamaño fijo:
// canvas y ctx son const y render() lee canvas.clientWidth, así que no se puede
// cambiar por otro lienzo. Todo ocurre dentro de la misma pulsación y despues()
// lo repone antes de que el navegador pinte: el alumno no ve el cambio.
// Recortar la vista TAL COMO ESTABA dejaba cortada la segunda columna de cotas
// de la derecha, y en el teléfono el lienzo es estrecho. Ahora:
//  1. Sin rejilla, ejes, selección ni figura fantasma, el modelo se encaja
//     MIDIENDO el dibujo (encajarDibujoInforme): las cadenas de cotas y los
//     rótulos no escalan con el zoom. La medida ignora las rectas que el tema
//     traza de lado a lado (05-): los ejes principales por C, los ejes u-v
//     girados y los ejes del punto P.
//  2. El lienzo se ajusta a ese dibujo y un marco blanco corta esas rectas.
// despues() repone el tamaño del lienzo, la vista, la selección y la
// visibilidad, y redibuja.
const FIG_INFORME_IN = {ancho:820, alto:580, res:2, margen:16, holgura:18, marco:6, anchoMin:200};

function _tamLienzoInformeIn(ancho, alto, res){
  canvas.style.width = ancho + 'px'; canvas.style.height = alto + 'px';
  canvas.width = Math.round(ancho*res); canvas.height = Math.round(alto*res);
  ctx.setTransform(res, 0, 0, res, 0, 0);
}

// Rectas que drawResultsOverlay (05-) traza a lo largo de todo el lienzo, como
// [x, y, ángulo] en px de pantalla (la dirección es (cos a, −sen a)).
function _ignorarInformeIn(){
  if(!results || !VIS.centroide) return null;
  const rectas = [];
  const par = (x, y, grados)=>{ const a = grados*Math.PI/180; rectas.push([x, y, a], [x, y, a + Math.PI/2]); };
  const sp = worldToScreen(results.xbar, results.ybar);
  par(sp.x, sp.y, results.thetaP);
  if(typeof mohrTheta === 'number' && Math.abs(mohrTheta) > 1e-9) par(sp.x, sp.y, mohrTheta);
  let ep = null;
  try{ ep = computeExtraPoint(results); }catch(e){ ep = null; }
  if(ep){
    const pp = worldToScreen(ep.x, ep.y);
    par(pp.x, pp.y, ep.thetaP);
    if(ep.rot) par(pp.x, pp.y, ep.rot.ang);
  }
  const R = rectas.map(([x, y, a])=>[x, y, Math.sin(a), Math.cos(a)]);
  return (x, y)=> R.some(([cx, cy, s, c])=> Math.abs((x - cx)*s + (y - cy)*c) <= 2.2);
}

function _figuraInformeIn(){
  const f = FIG_INFORME_IN;
  if(!figuresBBox()) return;
  _tamLienzoInformeIn(f.ancho, f.alto, f.res);
  const W = f.ancho, H = f.alto;
  const caja = ()=>{
    const b = figuresBBox();
    return {x0:b.x0, x1:b.x1, y0:b.y0, y1:b.y1, xc:(b.x0 + b.x1)/2, yc:(b.y0 + b.y1)/2};
  };
  // Punto de partida: el encuadre de fitView(); la medida lo corrige.
  const c0 = caja();
  let s = Math.min(W*0.7/Math.max(c0.x1 - c0.x0, 1e-9), H*0.7/Math.max(c0.y1 - c0.y0, 1e-9));
  if(!isFinite(s) || s <= 0) s = 1;
  viewScale = Math.max(1e-4, Math.min(s, 20000));
  viewTx = W/2 - c0.xc*viewScale;
  viewTy = H/2 + c0.yc*viewScale;
  const r = encajarDibujoInforme({
    ancho: W, alto: H, margen: f.margen,
    medir: ()=>{ render(); return cajaDibujoInforme(canvas, {ignorar: _ignorarInformeIn()}); },
    modelo: ()=>{
      const c = caja(), p0 = worldToScreen(c.x0, c.y1), p1 = worldToScreen(c.x1, c.y0);
      return {x0:p0.x, y0:p0.y, x1:p1.x, y1:p1.y};
    },
    escalar: (k, dx, dy)=>{
      const c = caja(), p = worldToScreen(c.xc, c.yc);
      viewScale *= k;
      viewTx = p.x + dx - c.xc*viewScale;
      viewTy = p.y + dy + c.yc*viewScale;
    }
  });
  if(!r.ok) console.warn('Informe PDF: la figura de la sección no cabe entera en su lienzo.');
  if(!r.caja) return;
  // Lienzo a la medida del dibujo
  const B = r.caja, hol = f.holgura;
  let x0 = B.x0 - hol, x1 = B.x1 + hol;
  if(x1 - x0 < f.anchoMin){ const e = (f.anchoMin - (x1 - x0))/2; x0 -= e; x1 += e; }
  const y0 = B.y0 - hol;
  const W2 = Math.ceil(x1 - x0), H2 = Math.ceil(B.y1 + hol - y0);
  _tamLienzoInformeIn(W2, H2, f.res);
  viewTx -= x0; viewTy -= y0;
  render();
  marcoLienzoInforme(ctx, W2, H2, f.marco);
}

function downloadPDF(){
  if(typeof modoEspacio !== 'undefined' && modoEspacio === '3d'){
    aviso('El informe del cuerpo solido todavia no esta disponible.', 'error');
    return;
  }
  let giro = null;          // bloque del deslizador de Mohr, si se aparta del papel
  let guardado = null;      // lienzo, vista, selección y visibilidad, para reponerlos
  return bsaInformeRapido({
    tema: 'Momentos de inercia',
    acento: {acc:'#0d3a8f', acc2:'#041d56', suave:'#eef2fb', borde:'#d5dce6'},
    hayResultados: ()=> !!results,
    sinResultados: 'Primero calcula el momento de inercia.',
    antes(){
      // Primero se guarda todo lo que se va a tocar: despues() lo necesita
      // aunque algo falle a medias. También una copia de los píxeles del
      // editor, que despues() vuelve a pintar: redibujar tras reasignar el
      // búfer no da los mismos píxeles aunque la vista sea idéntica (Chrome
      // suaviza distinto los rótulos tras el cambio de tamaño y las lecturas
      // con getImageData; ni un render() más ni dos lo arreglaban).
      const copia = document.createElement('canvas');
      copia.width = canvas.width; copia.height = canvas.height;
      try{ if(copia.width && copia.height) copia.getContext('2d').drawImage(canvas, 0, 0); }catch(e){}
      guardado = {sw:canvas.style.width, sh:canvas.style.height, cw:canvas.width, ch:canvas.height,
        viewTx:viewTx, viewTy:viewTy, viewScale:viewScale, grilla:VIS.grilla, ejes:VIS.ejes,
        selectedFigId:selectedFigId, selFiguras:selFiguras, selectedFigType:selectedFigType,
        ghostPos:ghostPos, resaltada:_figResaltada, copia:copia};
      // La figura de cabecera, sin rejilla ni ejes: los rótulos X e Y van en
      // los bordes del lienzo y cuentan como dibujo, así que el recorte salía
      // casi del tamaño del lienzo entero, con franjas vacías.
      VIS.grilla = false; VIS.ejes = false;
      selectedFigId = null; selFiguras = []; selectedFigType = null; ghostPos = null; _figResaltada = null;
      _figuraInformeIn();
      _redibujarMohr(3);
      const sl = document.getElementById('mohrSlider');
      const bloque = sl ? sl.closest('.proc-block') : null;
      if(bloque && !(Math.abs(mohrTheta) > 1e-9)){
        bloque.setAttribute('data-bsa-pantalla', '');
        giro = bloque;
      }
    },
    despues(){
      if(giro) giro.removeAttribute('data-bsa-pantalla');
      _redibujarMohr(0);
      if(guardado){
        const g = guardado;
        guardado = null;
        canvas.style.width = g.sw; canvas.style.height = g.sh;
        canvas.width = g.cw; canvas.height = g.ch;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        viewTx = g.viewTx; viewTy = g.viewTy; viewScale = g.viewScale;
        VIS.grilla = g.grilla; VIS.ejes = g.ejes;
        selectedFigId = g.selectedFigId; selFiguras = g.selFiguras;
        selectedFigType = g.selectedFigType; ghostPos = g.ghostPos; _figResaltada = g.resaltada;
        render();
        // Y encima, los píxeles de antes del informe (el fondo es opaco y el
        // tamaño el mismo: la copia tapa el lienzo entero, píxel a píxel).
        const c = g.copia;
        if(c && c.width && c.width === canvas.width && c.height === canvas.height){
          ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(c, 0, 0); ctx.restore();
        }
      }
    },
    figuras: [{titulo: 'Sección analizada — figuras y ejes principales', lienzo: 'mainCanvas'}],
    limpiar: {
      quitar: '.point-input,.point-tool:not(.has-point)',
      // Con θ ≠ 0 el bloque del deslizador sí sale; su rótulo de pantalla es
      // una orden («Gira los ejes…») que en el papel no tiene sentido.
      reemplazarTexto: [['Gira los ejes y mira el círculo', 'Ejes girados θ en el círculo de Mohr']]
    },
    cssTema: CSS_INFORME_IN
  });
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
    // La envolvente REAL de una figura girada la da figuraBoundsMundo,
    // que reproduce el trazo. Girando las cuatro esquinas de la caja
    // local, la lámina se encajaba hasta un 41 % más pequeña de lo que
    // cabía con figuras curvas. Queda el respaldo por si un redibujado
    // temprano llega antes que esa pieza (§5.3).
    let pts=null;
    if(typeof figuraBoundsMundo==='function'){
      try{ const c=figuraBoundsMundo(fig);
           if(c) pts=[[c.left,c.bottom],[c.right,c.top]]; }catch(e){ pts=null; }
    }
    if(!pts){
      const b=def.bounds(fig.dims),rot=(fig.rotation||0)*Math.PI/180;
      pts=[[b.left,b.bottom],[b.right,b.bottom],[b.right,b.top],[b.left,b.top]]
            .map(p=>[fig.cx+p[0]*Math.cos(rot)-p[1]*Math.sin(rot),
                     fig.cy+p[0]*Math.sin(rot)+p[1]*Math.cos(rot)]);
    }
    for(const q of pts){
      xMin=Math.min(xMin,q[0]);xMax=Math.max(xMax,q[0]);yMin=Math.min(yMin,q[1]);yMax=Math.max(yMax,q[1]);
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
    else if(fig.type==='segmento'){
      const t=d.alpha*Math.PI/180, s=Math.sin(t), cs=Math.cos(t);
      co={x:0, y:-2*d.r*Math.pow(s,3)/(3*(t - s*cs))};
    }
    // El hexágono y el octógono tienen el centro del círculo circunscrito
    // en su propio centroide: co queda en (0,0).
    const wx = fig.cx + co.x*Math.cos(rot) - co.y*Math.sin(rot);
    const wy = fig.cy + co.x*Math.sin(rot) + co.y*Math.cos(rot);
    const p0 = {x:toSx(wx), y:toSy(wy)};
    // Hacia dónde sale el radio acotado: por la bisectriz en el sector y el
    // segmento, y hacia un VÉRTICE en los polígonos regulares (en el octógono
    // el primer vértice está a 22.5°, no sobre el eje x).
    const ang = rot + ((fig.type==='sector'||fig.type==='segmento') ? Math.PI/2
                      : fig.type==='octogono' ? Math.PI/8 : 0);
    const p1 = {x:toSx(wx + d.r*Math.cos(ang)), y:toSy(wy + d.r*Math.sin(ang))};
    c.save();
    c.strokeStyle=clr; c.lineWidth=1.1;
    c.beginPath(); c.moveTo(p0.x,p0.y); c.lineTo(p1.x,p1.y); c.stroke();
    c.restore();
    etiq.add('R='+d.r+unit, (p0.x+p1.x)/2, (p0.y+p1.y)/2, clr, 'bold 9px Inter');
    if(fig.type==='sector' || fig.type==='segmento'){
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
const BSA_EXT     = '.json';          // un solo .json: la doble extensión .bsa10.json
                                      // dejaba los archivos en gris en el selector de Android
const BSA_PREFIJO = 'momentos-de-inercia-';    // el tema va en el nombre, y el formato dentro (bsaApp)

function nombreArchivoSeguro(nombre){
  // Sin caracteres que rompan el nombre de archivo en Windows/macOS/Android.
  const limpio = (nombre||'ejercicio').trim().replace(/[\\/:*?"<>|]+/g,'-').slice(0,60);
  return limpio || 'ejercicio';
}

function abrirGuardar(){
  ['guardadoAviso','guardadoAcciones'].forEach(i=>{ const e = document.getElementById(i); if(e) e.style.display = 'none'; });
  const m = document.getElementById('guardarModal'); if(!m) return;
  const inp = document.getElementById('nombreProyecto');
  if(inp) inp.value = '';
  m.classList.add('show');
}
function cerrarGuardar(){
  const m = document.getElementById('guardarModal'); if(m) m.classList.remove('show');
}

// Cualquier fallo al guardar se dice con su mensaje: antes moría en la consola
// y en el teléfono parecía que «no pasaba nada».
async function guardarProyecto(){
  try{ await _guardarProyectoSinRed(); }
  catch(err){ aviso('No se pudo guardar: ' + (err && err.message ? err.message : err), 'error'); }
}
async function _guardarProyectoSinRed(){
  const inp = document.getElementById('nombreProyecto');
  const nombre = (inp && inp.value || '').trim();
  if(!nombre){ aviso('Ponle un nombre al ejercicio antes de guardarlo.', 'error');
               if(inp) inp.focus(); return; }

  const estado = histSnapshot();
  if(!estado){ aviso('No hay nada calculado que guardar.', 'error'); return; }

  const paquete = { bsaApp: BSA_FORMATO, version: BSA_VERSION,
                    titulo: nombre, fecha: new Date().toISOString(), estado: estado };
  const texto   = JSON.stringify(paquete, null, 2);
  const archivo = BSA_PREFIJO + nombreArchivoSeguro(nombre) + BSA_EXT;

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
  // Siempre queda una copia en ESTE equipo (core/comun.js): sin servidor y sin
  // archivos. Es lo que hace que guardar funcione en el teléfono.
  const enEquipo = bsaGuardarEnEquipo(BSA_FORMATO, nombre, texto);
  bsaUltimoTextoGuardado = texto;
  bsaUltimoNombreGuardado = archivo;
  if(bsaEsMovil()){ mostrarGuardadoEnEquipo(enEquipo, nombre); return; }
  const como = await bsaGuardarArchivo(texto, archivo);
  cerrarGuardar();
  // En el móvil el archivo sale como .txt (ver bsaGuardarArchivo): se avisa
  // con el nombre real, que es el que el alumno verá en Archivos.
  const guardadoComo = bsaUltimoNombreGuardado || archivo;
  if(como === 'compartido') aviso('Guardado "' + guardadoComo + '" donde elegiste.');
  else if(como === 'descargado') aviso('Descargando "' + guardadoComo + '". Búscalo en tu carpeta de descargas.');
}


function cerrarHistorial(){
  const m = document.getElementById('histModal'); if(m) m.classList.remove('show');
}

// Carga un ejercicio a partir de su TEXTO, venga de un archivo o de lo que
// haya guardado en este equipo.
function _cargarEjercicioTexto(texto, nombre){
    let datos;
    try{ datos = JSON.parse(texto); }
    catch(e){ aviso('El archivo no es un ejercicio válido (JSON dañado).', 'error'); return; }
    if(datos.bsaApp && datos.bsaApp !== BSA_FORMATO)
      aviso('Este archivo parece de otro capítulo (' + datos.bsaApp
          + '). Se intentará abrir de todos modos.', 'error');
    const st = (datos.estado && datos.estado.state) || datos.estado
               || datos.state || datos;
    try{ histRestore(st);
         aviso('Ejercicio abierto desde "' + nombre + '".');
         cerrarHistorial(); }
    catch(e){ aviso('No se pudo abrir: el archivo tiene un formato inesperado.', 'error'); }
}
function onArchivoElegido(ev){
  const file = ev.target.files && ev.target.files[0];
  ev.target.value = '';                    // permite reelegir el mismo archivo
  if(!file) return;
  const lector = new FileReader();
  lector.onerror = () => aviso('No se pudo leer el archivo.', 'error');
  lector.onload = () => _cargarEjercicioTexto(lector.result, file.name);
  lector.readAsText(file);
}

// ── Guardado en ESTE equipo y salida sin nube (core/comun.js) ──
// En el teléfono no se intenta escribir un archivo: entregarlo desde el iframe
// del portal no es fiable. Se guarda aquí y se ofrece llevárselo en una pestaña
// propia, donde el gesto y el documento sí son de nivel superior.
function mostrarGuardadoEnEquipo(res, nombre){
  const av = document.getElementById('guardadoAviso');
  const ac = document.getElementById('guardadoAcciones');
  if(av){
    av.innerHTML = res.ok
      ? 'Guardado <b>' + nombre + '</b> en este equipo. Lo vuelves a abrir desde <b>Historial</b>.'
      : 'No se pudo guardar en este equipo: el almacenamiento está lleno o bloqueado. Usa «Enviar o descargar».';
    av.style.display = '';
  }
  if(ac) ac.style.display = '';
  if(res.ok) aviso('Guardado en este equipo.');
}
function enviarEjercicio(){
  if(!bsaEnviarUltimo()) aviso('El navegador bloqueó la pestaña. Permítela y vuelve a intentarlo.', 'error');
}
// Abrir y quitar lo guardado en este equipo. Los llama bsaHtmlGuardados.
function abrirEjercicioGuardado(id){
  const t = bsaLeerGuardado(BSA_FORMATO, id);
  if(!t){ aviso('Ese ejercicio ya no está en este equipo.', 'error'); return; }
  const e = bsaListaGuardados(BSA_FORMATO).find(x=>x.id === id);
  _cargarEjercicioTexto(t, (e && e.titulo) || 'ejercicio');
  cerrarHistorial();
}
function borrarEjercicioGuardado(id){
  bsaBorrarGuardado(BSA_FORMATO, id);
  pintarGuardadosEnEquipo();
}
function pintarGuardadosEnEquipo(){
  const c = document.getElementById('histGuardados');
  if(c) c.innerHTML = bsaHtmlGuardados(BSA_FORMATO);
}
