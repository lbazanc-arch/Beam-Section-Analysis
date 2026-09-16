// ── Informe rápido: el botón rojo «PDF» (no el de LaTeX) ──
// Todo el trabajo lo hace bsaInformeRapido de core/comun.js: abre la pestaña
// dentro de la misma pulsación, clona #resultsPanel, pasa cada lienzo del panel
// (la lámina con cotas, la sección resuelta y, en 3D, la vista isométrica) a
// imagen recortada, quita los controles y arma el documento con la cabecera
// BSA, la fecha y el colofón; en el ordenador imprime solo y en el teléfono
// deja el botón «Imprimir / Guardar como PDF». Aquí va solo lo propio del tema:
// el acento, el rótulo del lienzo del editor según el espacio de trabajo y el
// CSS de las clases del panel de resultados (el documento nuevo no carga
// estilos.css). Tamaños pensados para el papel; en pantalla la hoja se amplía.
const CSS_INFORME_CEN = `
  :root{--grn3:var(--acc2);}
  .res-section{margin:0 0 10px;}
  .res-section-title{display:flex;align-items:center;gap:7px;font-size:11.5px;font-weight:800;
    color:var(--acc);border-bottom:1.5px solid var(--acc2);padding-bottom:4px;margin:12px 0 7px;
    break-after:avoid;page-break-after:avoid;}
  .res-section-title .num{width:18px;height:18px;border-radius:50%;background:var(--acc2);
    display:inline-flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;
    color:#fff;flex:none;}
  .proc-block{background:var(--suave);border:1px solid var(--borde);border-radius:6px;
    padding:6px 10px;margin:0 0 7px;break-inside:avoid;page-break-inside:avoid;}
  .proc-block.proc-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:4px 18px;}
  .proc-col{min-width:0;}
  .proc-sub{font-size:9px;font-weight:700;color:var(--acc);text-transform:uppercase;
    letter-spacing:.5px;margin:0 0 4px;}
  .eq-row{margin:1px 0;}
  .eq-body{font-family:var(--math);font-size:11px;line-height:1.55;margin:1px 0;}
  .eq-body .katex{font-size:1.05em;color:var(--text);}
  .v{color:var(--acc2);font-weight:700;font-style:italic;font-family:var(--math);}
  /* Tablas: la de cada figura y la de resumen */
  .fig-tabla,.tabla-res{width:100%;border-collapse:collapse;font-family:var(--math);font-size:11px;}
  .fig-tabla th,.tabla-res th{padding:3px 6px;text-align:left;font-size:9px;font-weight:700;
    color:var(--acc);text-transform:uppercase;letter-spacing:.4px;vertical-align:bottom;
    border-bottom:1.5px solid var(--borde);background:var(--suave);font-family:var(--sans);}
  .tabla-res th{text-align:right;}
  .tabla-res th:nth-child(1),.tabla-res th:nth-child(2){text-align:left;}
  .tabla-res th span{font-weight:600;text-transform:none;letter-spacing:0;}
  .fig-tabla td,.tabla-res td{padding:2px 6px;border-bottom:1px solid var(--borde);vertical-align:middle;}
  .fig-tabla td.v,.tabla-res td.v{text-align:right;}
  .fig-tabla tr:last-child td{border-bottom:none;}
  .tabla-res .fila-total td{font-weight:700;border-top:2px solid var(--acc);border-bottom:none;
    background:var(--suave);color:var(--acc2);}
  /* Tarjeta por figura: datos a la izquierda, croquis a la derecha */
  .fig-card{display:flex;gap:12px;align-items:stretch;background:var(--suave);
    border:1px solid var(--borde);border-radius:6px;padding:7px 10px;margin:0 0 7px;
    break-inside:avoid;page-break-inside:avoid;}
  .fig-card-datos{flex:1;min-width:0;display:flex;flex-direction:column;}
  .fig-card-h{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:600;
    margin:0 0 6px;flex-wrap:wrap;}
  .fig-card-dib{flex:0 0 175px;display:flex;align-items:stretch;}
  .croq{width:100%;margin:0;padding:5px 7px 4px;border:1px solid var(--borde);border-radius:6px;
    background:#fff;display:flex;flex-direction:column;justify-content:center;}
  .croq-h{display:flex;align-items:center;gap:6px;margin:0 0 3px;}
  .croq-n{width:14px;height:14px;border-radius:50%;background:var(--acc2);color:#fff;
    font-size:8.5px;font-weight:800;display:flex;align-items:center;justify-content:center;flex:none;}
  .croq-t{font-size:9px;font-weight:700;line-height:1.2;}
  .croq-t i{color:#c0392b;font-style:normal;font-size:8px;}
  .croq-svg{width:100%;max-width:165px;height:auto;display:block;margin:0 auto;}
  .croq-d{display:flex;flex-wrap:wrap;justify-content:space-between;gap:1px 6px;font-size:8px;
    color:var(--muted);border-top:1px solid var(--borde);padding-top:3px;margin-top:3px;font-family:var(--math);}
  /* Cajas de resumen */
  .summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin:0 0 7px;
    break-inside:avoid;page-break-inside:avoid;}
  .summary-box{border:1px solid var(--borde);border-radius:5px;padding:5px 8px;background:#fff;}
  .summary-box.highlight{background:var(--suave);border-color:var(--acc2);}
  .s-lbl{font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;margin:0 0 2px;}
  .s-val{font-size:13px;font-weight:700;color:var(--acc);font-style:italic;font-family:var(--math);}
  .s-unit{font-size:8px;color:var(--muted);}
  /* Los lienzos del panel, ya como imagen */
  .res-section .bsa-fig-lienzo{margin:2px 0 4px;}
  .res-section .bsa-fig-lienzo img{max-height:100mm;}
  /* Teléfono: la tarjeta se apila y el resumen va de dos en dos */
  @media screen and (max-width:640px){
    .fig-card{flex-direction:column;}
    .fig-card-dib{flex:0 0 auto;width:100%;max-width:230px;margin:0 auto;}
    .croq-svg{max-width:200px;}
    .summary-grid{grid-template-columns:repeat(2,1fr);}
    .eq-body{overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;}
  }
`;

// El encaje de la figura (cajaDibujoInforme, encajarDibujoInforme,
// lienzoTemporalInforme, marcoLienzoInforme) vive en core/comun.js.

// ── La figura del informe ──
// Se dibuja en el lienzo del editor AGRANDADO un momento a un tamaño fijo:
// canvas y ctx son const y render() lee canvas.clientWidth, así que no se puede
// cambiar por otro lienzo. Todo ocurre dentro de la misma pulsación y despues()
// lo repone antes de que el navegador pinte: el alumno no ve el cambio.
// Recortar la vista TAL COMO ESTABA dejaba cortada la segunda columna de cotas
// de la derecha, y en el teléfono el lienzo es estrecho. Ahora:
//  1. Sin rejilla, ejes, selección, figura fantasma ni recuadro isométrico, el
//     modelo se encaja MIDIENDO el dibujo (encajarDibujoInforme): las cadenas
//     de cotas y los rótulos no escalan con el zoom. La medida ignora lo que
//     el tema traza de borde a borde: los ejes que pasan por C, la leyenda de
//     la esquina y, en 3D, la raya entre planta y alzado y sus rótulos.
//  2. El lienzo se ajusta a ese dibujo (con sitio para la leyenda abajo, o para
//     los rótulos de las vistas arriba) y un marco blanco corta esos ejes.
// despues() repone el tamaño del lienzo, la vista, la selección y la
// visibilidad, y redibuja.
const FIG_INFORME_CEN = {ancho:820, alto:580, ancho3d:1100, alto3d:560, res:2,
  margen:16, holgura:18, marco:6, anchoMin:240, leyenda:34, banda3d:40, vistaMin:300};

function _tamLienzoInformeCen(ancho, alto, res){
  canvas.style.width = ancho + 'px'; canvas.style.height = alto + 'px';
  canvas.width = Math.round(ancho*res); canvas.height = Math.round(alto*res);
  ctx.setTransform(res, 0, 0, res, 0, 0);
}

// 2D (sección y alambre): los dos ejes que pasan por el centroide van de borde
// a borde y la leyenda está fija abajo a la izquierda (drawResultsOverlay, 04-).
function _ignorarInformeCen2D(){
  if(!results || !VIS.centroide) return null;
  const sp = worldToScreen(results.xbar, results.ybar);
  const H = canvas.clientHeight, finLey = 7 + (results.hetero ? 214 : 118) + 4;
  return (x, y)=> Math.abs(y - sp.y) <= 1.6 || Math.abs(x - sp.x) <= 1.6
               || (x <= finLey && y >= H - 31);
}

function _figuraInformeCen2D(){
  const f = FIG_INFORME_CEN;
  if(!figuresBBox()) return;
  _tamLienzoInformeCen(f.ancho, f.alto, f.res);
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
    medir: ()=>{ render(); return cajaDibujoInforme(canvas, {ignorar: _ignorarInformeCen2D()}); },
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
  // Lienzo a la medida del dibujo, con la franja de la leyenda debajo
  const B = r.caja, hol = f.holgura;
  const ley = (results && VIS.centroide) ? f.leyenda : 0;
  let x0 = B.x0 - hol, x1 = B.x1 + hol;
  if(x1 - x0 < f.anchoMin){ const e = (f.anchoMin - (x1 - x0))/2; x0 -= e; x1 += e; }
  const y0 = B.y0 - hol;
  const W2 = Math.ceil(x1 - x0), H2 = Math.ceil(B.y1 + hol - y0 + ley);
  _tamLienzoInformeCen(W2, H2, f.res);
  viewTx -= x0; viewTy -= y0;
  render();
  marcoLienzoInforme(ctx, W2, H2, f.marco);
}

// 3D: dos vistas de ancho A con el mismo viewTx y viewTy (21-). Los rótulos de
// las vistas van arriba (y < 36), la raya que las separa en x = A y los ejes
// por C cruzan cada vista (marcarCentroide3d).
function _ignorarInformeCen3D(A){
  const f = FIG_INFORME_CEN;
  const hayC = !!(results && results.es3d && VIS.centroide);
  const xC = hayC ? viewTx + results.xbar*viewScale : 0;
  const yP = hayC ? viewTy - results.ybar*viewScale : 0;
  const yA = hayC ? viewTy - results.zbar*viewScale : 0;
  return (x, y)=>{
    if(y < f.banda3d - 4) return true;
    if(!hayC) return false;
    const enAlzado = x >= A;
    return Math.abs((enAlzado ? x - A : x) - xC) <= 1.6 || Math.abs(y - (enAlzado ? yA : yP)) <= 1.6;
  };
}

function _figuraInformeCen3D(){
  const f = FIG_INFORME_CEN;
  if(!bbox3d()) return;
  _tamLienzoInformeCen(f.ancho3d, f.alto3d, f.res);
  const A = f.ancho3d/2, H = f.alto3d;
  const caja = ()=>{ const b = bbox3d(); return Object.assign({xc:(b.x0 + b.x1)/2, vc:(b.v0 + b.v1)/2}, b); };
  const c0 = caja();
  let s = Math.min(A*0.6/Math.max(c0.x1 - c0.x0, 1e-9), (H - f.banda3d)*0.6/Math.max(c0.v1 - c0.v0, 1e-9));
  if(!isFinite(s) || s <= 0) s = 1;
  viewScale = Math.max(1e-4, Math.min(s, 20000));
  viewTx = A/2 - c0.xc*viewScale;
  viewTy = (H + f.banda3d)/2 + c0.vc*viewScale;
  // Una caja por vista (sin la raya del medio) y en coordenadas de la vista
  const medir = ()=>{
    render();
    const ig = _ignorarInformeCen3D(A);
    const p = cajaDibujoInforme(canvas, {zona:{x0:0, y0:0, x1:A - 3, y1:H}, ignorar:ig});
    const q = cajaDibujoInforme(canvas, {zona:{x0:A + 3, y0:0, x1:2*A, y1:H}, ignorar:ig});
    const cajas = [p, q && {x0:q.x0 - A, x1:q.x1 - A, y0:q.y0, y1:q.y1}].filter(Boolean);
    if(!cajas.length) return null;
    return {x0:Math.min(...cajas.map(c=>c.x0)), y0:Math.min(...cajas.map(c=>c.y0)),
            x1:Math.max(...cajas.map(c=>c.x1)), y1:Math.max(...cajas.map(c=>c.y1))};
  };
  const r = encajarDibujoInforme({
    ancho: A, alto: H,
    margen: {izq:f.margen, der:f.margen, arr:f.banda3d + 8, aba:f.margen},
    medir: medir,
    modelo: ()=>{
      const c = caja();
      return {x0:viewTx + c.x0*viewScale, x1:viewTx + c.x1*viewScale,
              y0:viewTy - c.v1*viewScale, y1:viewTy - c.v0*viewScale};
    },
    escalar: (k, dx, dy)=>{
      const c = caja();
      const sx = viewTx + c.xc*viewScale, sy = viewTy - c.vc*viewScale;
      viewScale *= k;
      viewTx = sx + dx - c.xc*viewScale;
      viewTy = sy + dy + c.vc*viewScale;
    }
  });
  if(!r.ok) console.warn('Informe PDF: la figura del cuerpo no cabe entera en su lienzo.');
  if(!r.caja) return;
  // Lienzo a la medida: dos vistas iguales y la franja de los rótulos arriba
  const B = r.caja, hol = f.holgura, T = f.banda3d;
  let x0 = B.x0 - hol;
  const ancho = B.x1 + hol - x0, A2 = Math.ceil(Math.max(ancho, f.vistaMin));
  x0 -= (A2 - ancho)/2;
  const y0 = B.y0 - hol;
  const H2 = Math.ceil(B.y1 + hol - y0 + T);
  _tamLienzoInformeCen(2*A2, H2, f.res);
  viewTx -= x0; viewTy += T - y0;
  render();
  marcoLienzoInforme(ctx, 2*A2, H2, f.marco);
}

function downloadPDF(){
  const tituloEditor = modoEspacio === '3d'      ? 'Cuerpo analizado — planta y alzado'
                     : modoEspacio === 'alambre' ? 'Alambre analizado'
                     :                             'Sección analizada';
  let guardado = null;
  return bsaInformeRapido({
    panel: 'resultsPanel',
    hayResultados: () => !!results,
    sinResultados: 'Primero calcula el centroide.',
    tema: 'Centroide',
    acento: {acc:'#0f5c56', acc2:'#0b3f3a', suave:'#f4f9f7', borde:'#c8e0d8'},
    antes: ()=>{
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
        viewTx:viewTx, viewTy:viewTy, viewScale:viewScale,
        grilla:VIS.grilla, ejes:VIS.ejes, iso:VIS.iso,
        selectedFigId:selectedFigId, selFiguras:selFiguras, selectedFigType:selectedFigType, ghostPos:ghostPos,
        copia:copia};
      VIS.grilla = false; VIS.ejes = false; VIS.iso = false;
      selectedFigId = null; selFiguras = []; selectedFigType = null; ghostPos = null;
      if(modoEspacio === '3d') _figuraInformeCen3D(); else _figuraInformeCen2D();
    },
    despues: ()=>{
      if(!guardado) return;
      const g = guardado;
      guardado = null;
      canvas.style.width = g.sw; canvas.style.height = g.sh;
      canvas.width = g.cw; canvas.height = g.ch;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      viewTx = g.viewTx; viewTy = g.viewTy; viewScale = g.viewScale;
      VIS.grilla = g.grilla; VIS.ejes = g.ejes; VIS.iso = g.iso;
      selectedFigId = g.selectedFigId; selFiguras = g.selFiguras;
      selectedFigType = g.selectedFigType; ghostPos = g.ghostPos;
      render();
      // Y encima, los píxeles de antes del informe (el fondo es opaco y el
      // tamaño el mismo: la copia tapa el lienzo entero, píxel a píxel).
      const c = g.copia;
      if(c && c.width && c.width === canvas.width && c.height === canvas.height){
        ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(c, 0, 0); ctx.restore();
      }
    },
    figuras: [{titulo: tituloEditor, lienzo: 'mainCanvas'}],
    cssTema: CSS_INFORME_CEN
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
  // van debajo y a la derecha. Con un margen simétrico la cota total del eje X
  // se salía del lienzo y aparecía cortada. Así que primero se encaja con un
  // margen provisional, se pregunta cuánto espacio pide la acotación con esa
  // escala, y se vuelve a encajar reservándolo de verdad.
  const fw=Math.max(xMax-xMin,.001), fh=Math.max(yMax-yMin,.001);
  const cfgCotas = base => ({
    px: x => base.toSx(x), py: y => base.toSy(y),
    fuente:'600 9px Inter, sans-serif', fuenteTotal:'700 9.5px Inter, sans-serif',
    tick:3.8, salto:13, sepX:26, sepY:30, angulos:false
  });
  // El dibujo se centra en el hueco libre. Antes se anclaba al margen
  // izquierdo: como la escala la manda la altura, en una pantalla ancha el
  // dibujo quedaba pegado a la izquierda con medio lienzo en blanco.
  const encajar = (mIzq, mDer, mSup, mInf)=>{
    const dispW = W - mIzq - mDer, dispH = H - mSup - mInf;
    const sc = Math.min(dispW/fw, dispH/fh);
    const sobraX = dispW - fw*sc, sobraY = dispH - fh*sc;
    return {
      toSx: wx => mIzq + sobraX/2 + (wx-xMin)*sc,
      toSy: wy => H - mInf - sobraY/2 - (wy-yMin)*sc,
      scale: sc
    };
  };
  // Los rótulos de radio y ángulo se colocan junto a su figura, así que no hay
  // que reservar una banda lateral; sí un margen holgado para que las cajas
  // quepan alrededor del dibujo.
  const MARGEN_ROT = 62;
  let T = encajar(MARGEN_ROT, 70, 30, 70);           // provisional
  let esp = {abajo:70, derecha:70};
  try{ esp = espacioCotas(c, cfgCotas(T)); }catch(e){}
  T = encajar(MARGEN_ROT,
              Math.min(esp.derecha+10, W*0.42),
              30,
              Math.min(esp.abajo+8, H*0.42));
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
    const esL = !!FIG_DEFS[fig.type].esLinea;    // un tramo de alambre no se rellena
    if(!esL){ figPath(fig,c);c.fillStyle=hexAlpha(fig.color,.28);c.fill(); }
    figPath(fig,c);c.strokeStyle=hexAlpha(fig.color,.9);c.lineWidth=esL?3.2:1.8;c.lineCap='round';c.stroke();
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
  c.textAlign='center';
  const etiq = crearColocador(c, {x0:4, y0:4, x1:W-4, y1:H-4});
  for(const fig of figures){
    const def=FIG_DEFS[fig.type]; if(!def||!def.bounds) continue;
    const b=def.bounds(fig.dims),d=fig.dims,rot=(fig.rotation||0)*Math.PI/180;
    const cosr=Math.cos(rot),sinr=Math.sin(rot);
    const S=(lx,ly)=>({x:toSx(fig.cx+lx*cosr-ly*sinr),y:toSy(fig.cy+lx*sinr+ly*cosr)});
    const clr=hexAlpha(fig.color,.9);
    // Las cotas b= y h= por figura eran el sistema de acotación ANTIGUO. Ahora
    // conviven con las cotas generales encadenadas y se leían como restos
    // superpuestos, así que se retiran: la cadena general ya da todas las
    // distancias entre bordes. Sólo se conservan los radios, que la cadena
    // ortogonal no puede expresar.

    // ── Radio: se traza SIEMPRE desde el centro real del arco hasta la
    // superficie. El origen local de cada figura es su centroide, que sólo
    // coincide con el centro del arco en el círculo completo; en el resto hay
    // que descontar la distancia al centroide, o la línea nace desplazada.
    if(d.r!==undefined){
      let co=null, ext=null;                    // centro del arco y punto en la superficie
      if(fig.type==='circle'){
        co={x:0,y:0};             ext={x:d.r,y:0};
      } else if(fig.type==='quarter'){
        const dc=4*d.r/(3*Math.PI);
        co={x:-dc,y:-dc};         ext={x:-dc+d.r,y:-dc};
      } else if(fig.type==='semicircle'){
        const yc=4*d.r/(3*Math.PI);
        co={x:0,y:-yc};           ext={x:d.r,y:-yc};
      } else if(fig.type==='sector'){
        const t=d.alpha*Math.PI/180, yc=2*d.r*Math.sin(t)/(3*t);
        co={x:0,y:-yc};           ext={x:0,y:-yc+d.r};   // sobre la bisectriz
      } else if(fig.type==='segmento'){
        // El centro del arco está BAJO la cuerda; el radio se traza hasta la
        // cima, que es el único punto de la superficie sobre la bisectriz.
        const t=d.alpha*Math.PI/180, s=Math.sin(t), cc=Math.cos(t);
        const yO=2*d.r*Math.pow(s,3)/(3*(t-s*cc));
        co={x:0,y:-yO};           ext={x:0,y:-yO+d.r};
      } else if(fig.type==='hexagono'){
        co={x:0,y:0};             ext={x:d.r,y:0};        // radio circunscrito
      } else if(fig.type==='octogono'){
        co={x:0,y:0};             ext={x:d.r*Math.cos(Math.PI/8), y:d.r*Math.sin(Math.PI/8)};
      } else if(def.centroArco){                          // arcos de alambre (24-)
        co=def.centroArco(d);     ext=def.puntoRadio(d);
      }
      if(co){
        const p0=S(co.x,co.y), p1=S(ext.x,ext.y);
        c.save();
        c.strokeStyle=clr; c.lineWidth=1.1; c.setLineDash([]);
        c.beginPath(); c.moveTo(p0.x,p0.y); c.lineTo(p1.x,p1.y); c.stroke();
        // marca del centro y punta en la superficie
        c.fillStyle=clr;
        c.beginPath(); c.arc(p0.x,p0.y,2.2,0,Math.PI*2); c.fill();
        const ang=Math.atan2(p1.y-p0.y,p1.x-p0.x);
        c.beginPath();
        c.moveTo(p1.x,p1.y);
        c.lineTo(p1.x-7*Math.cos(ang-0.38), p1.y-7*Math.sin(ang-0.38));
        c.lineTo(p1.x-7*Math.cos(ang+0.38), p1.y-7*Math.sin(ang+0.38));
        c.closePath(); c.fill();
        // Las etiquetas NO se escriben aquí: se encolan en el colocador y se
        // pintan al final, para que puedan apartarse unas de otras.
        const mx=(p0.x+p1.x)/2, my=(p0.y+p1.y)/2;
        etiq.add('R='+d.r+unit, mx-8*Math.sin(ang), my+8*Math.cos(ang)-2, clr, 'bold 9px Inter');
        if(fig.type==='sector' || fig.type==='segmento'){
          etiq.add('\u03b8='+d.alpha+'\u00b0', p0.x, p0.y+13, clr, '9px Inter');
        }
        if(fig.type==='l_arco'){
          etiq.add('\u03c6='+d.phi+'\u00b0', p0.x, p0.y+13, clr, '9px Inter');
        }
        c.restore();
      }
    }
  }
  // Huecos prohibidos para los rótulos: la caja de cada figura (con algo de
  // aire) y las bandas donde van las cotas, abajo y a la derecha.
  const obstaculos = figures.map(f=>{
    const b = figuraBoundsMundo(f);
    const x0 = toSx(b.left), x1 = toSx(b.right);
    const y0 = toSy(b.top),  y1 = toSy(b.bottom);
    return {x:x0-4, y:y0-4, w:(x1-x0)+8, h:(y1-y0)+8};
  });
  {
    const yb = toSy(yMin), xr = toSx(xMax);
    obstaculos.push({x:0, y:yb+6, w:W, h:H});          // banda inferior de cotas
    obstaculos.push({x:xr+6, y:0, w:W, h:H});          // banda derecha de cotas
  }
  etiq.pintar(obstaculos);   // cada valor en su recuadro, junto a su figura
  // Cotas generales encadenadas de toda la sección (criterio del Cap. 7)
  try{ cotasCompuestaGenerales(c, toSx, toSy, W, H, scale); }catch(e){}
  c.textAlign='left';c.fillStyle='rgba(30,33,38,.35)';c.font='8px Inter';
  c.fillText('G = centroide global de la secci\u00f3n', 12, H-8);
}

// ── Cotas generales de la sección compuesta ──
// Mismo criterio que el lienzo principal y que el Cap. 7: cadenas de cotas
// fuera del dibujo (horizontales abajo, verticales a la derecha) tomadas de los
// BORDES reales de las figuras. Recibe la transformación del lienzo destino
// para poder usarse también en el PDF.
// Cotas de la sección compuesta en la vista de resultados. Usa EXACTAMENTE el
// mismo motor que el lienzo del editor (planCotas + pintarCadenaCotas), solo
// cambia la proyección y el tamaño de letra: antes eran dos implementaciones
// distintas del mismo criterio y se veían diferentes.
function cotasCompuestaGenerales(c, toSx, toSy, W, H, esc){
  if(!figures.length) return;
  dibujarCotasSobre(c, {
    px: x => toSx(x), py: y => toSy(y),
    fuente: '600 9px Inter, sans-serif',
    fuenteTotal: '700 9.5px Inter, sans-serif',
    tick: 3.8, salto: 13, sepX: 26, sepY: 30, angulos: false
  });
}
// ── Acotación general de la sección (mismo criterio que el Cap. 7) ──
// Cotas encadenadas fuera del dibujo: horizontales debajo y verticales a la
// derecha, en las coordenadas donde hay bordes de figura.
