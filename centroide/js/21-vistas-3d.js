// ═══════════════════════════════════════════════════════════
//  MODO 3D · «Cuerpo sólido»: dos vistas ortogonales en el mismo lienzo,
//  planta (X–Y) a la izquierda y alzado (X–Z) a la derecha.
// ═══════════════════════════════════════════════════════════
// El modelo es el mismo que en 2D con una coordenada más (cz) y un catálogo
// propio (SOLID_DEFS). Todo lo que aquí se define lleva el sufijo «3d» o
// «Solido» para no engrosar la lista de funciones con el mismo nombre que
// momentos-de-inercia. Los puntos de entrada del código 2D (render, ratón,
// panel de propiedades, calculate, fitView, ejemplo, informe) derivan aquí
// cuando modoEspacio === '3d'.
//
// Proyección: las dos vistas comparten viewTx, viewTy y viewScale, medidos
// desde el borde IZQUIERDO de cada vista; la coordenada vertical es y en la
// planta y z en el alzado. Así desplazar o hacer zoom mueve las dos a la vez
// y el eje X queda alineado entre ambas.

function esModo3d(){ return modoEspacio === '3d'; }

// ── Geometría de las vistas sobre el lienzo principal ──
function geomVistas(){
  const W = canvas.clientWidth, H = canvas.clientHeight;
  const ancho = W/2;
  return {W, H, ancho,
    planta:{id:'planta', x0:0,     x1:ancho, rotulo:'Planta  (X – Y)', letra:'y'},
    alzado:{id:'alzado', x0:ancho, x1:W,     rotulo:'Alzado  (X – Z)', letra:'z'}};
}
function vistaEnPunto(sx){ const g = geomVistas(); return sx < g.ancho ? g.planta : g.alzado; }
function p3(vista, wx, wv){ return {x: vista.x0 + viewTx + wx*viewScale, y: viewTy - wv*viewScale}; }
function s3(vista, sx, sy){ return {x:(sx - vista.x0 - viewTx)/viewScale, v:-(sy - viewTy)/viewScale}; }
function vDe(fig, vistaId){ return vistaId === 'planta' ? fig.cy : fig.cz; }

// Caja del sólido relativa a su centroide, tal como está colocado: los
// poliedros la sacan de sus vértices girados; los sólidos de revolución, de
// bounds3 (el giro no los cambia) con el volteo aplicado. rot0 la da sin giro.
function bounds3Rel(fig, rot0){
  const def = SOLID_DEFS[fig.type];
  const V = verticesSolido(rot0 ? Object.assign({}, fig, {rotation:0}) : fig);
  if(V){
    const b = {left:Infinity,right:-Infinity,back:Infinity,front:-Infinity,bottom:Infinity,top:-Infinity};
    V.forEach(q=>{ b.left=Math.min(b.left,q[0]); b.right=Math.max(b.right,q[0]); b.back=Math.min(b.back,q[1]);
      b.front=Math.max(b.front,q[1]); b.bottom=Math.min(b.bottom,q[2]); b.top=Math.max(b.top,q[2]); });
    return b;
  }
  const b = def.bounds3(fig.dims);
  if(fig.volteado) return {left:b.left, right:b.right, back:b.back, front:b.front, bottom:-b.top, top:-b.bottom};
  return b;
}
// Caja del sólido en el mundo, en las tres direcciones.
function bounds3Mundo(fig){
  const b = bounds3Rel(fig, false);
  return {x0:fig.cx+b.left, x1:fig.cx+b.right, y0:fig.cy+b.back, y1:fig.cy+b.front,
          z0:fig.cz+b.bottom, z1:fig.cz+b.top};
}

// ══ Cambio de modo ═════════════════════════════════════════════════════════
// El botón de la barra muestra el modo al que se PASA: dice «3D» mientras se
// trabaja en 2D y «2D» mientras se trabaja en 3D.
function setModoEspacio(m, opts){
  opts = opts || {};
  const cambia = (modoEspacio !== m);
  modoEspacio = m;
  const es3 = (m === '3d');
  const b = document.getElementById('btnEspacio');
  if(b){
    const sp = b.querySelector('span'); if(sp) sp.textContent = es3 ? '2D' : '3D';
    b.title = es3 ? 'Volver a la sección plana (2D)' : 'Pasar a cuerpo sólido (3D)';
    b.classList.toggle('active', es3);
  }
  const mostrar = (id, si) => { const e = document.getElementById(id); if(e) e.style.display = si ? '' : 'none'; };
  mostrar('palGrid', !es3); mostrar('palGrid3d', es3);
  mostrar('btnPerfiles', !es3);
  mostrar('posZField', es3); mostrar('rotField', !es3);
  mostrar('transCampoDz', es3); mostrar('repCampoDz', es3); mostrar('visIsoItem', es3);
  { const lb = document.querySelector('#rotField label'); if(lb) lb.textContent = es3 ? 'Giro α (°) alrededor del eje vertical' : 'Rotación α (°)'; }
  // Las dos paletas comparten el botón «Ver más»: al cambiar de modo se
  // pliegan las dos y el botón vuelve a «Ver más».
  try{
    const btn = document.getElementById('palMas'), txt = document.getElementById('palMasTxt');
    if(btn){ btn.classList.remove('abierto'); if(txt) txt.textContent = 'Ver más'; }
    ['palGrid','palGrid3d'].forEach(gid=>{ const g = document.getElementById(gid); if(!g) return;
      g.querySelectorAll('.fig-btn').forEach((b,i)=>b.classList.toggle('oculta', i >= PAL_VISIBLES)); });
  }catch(e){}
  const pp = document.getElementById('palPerfiles');
  if(pp){ if(es3) pp.style.display = 'none'; else { try{ pintarMisPerfiles(); }catch(e){} } }
  const head = document.querySelector('#menuFiguras .tb-menu-head');
  if(head) head.textContent = es3 ? 'Insertar sólido' : 'Insertar figura';
  if(cambia && !opts.sinLimpiar){
    figures = []; selectedFigId = null; selectedFigType = null; selFiguras = [];
    results = null; colorIdx = 0; ghostPos = null;
    document.querySelectorAll('.fig-btn').forEach(x=>x.classList.remove('selected'));
    selectFigure(null); renderFigList(); actualizarInfoSel();
    const rp = document.getElementById('resultsPanel'); if(rp) rp.style.display = 'none';
    const nh = document.getElementById('noResultsHint'); if(nh) nh.style.display = '';
  }
  const hint = document.getElementById('canvasHint');
  if(hint) hint.textContent = es3
    ? 'Planta a la izquierda, alzado a la derecha. Elige un sólido en Figuras y haz clic para colocarlo.'
    : 'Selecciona una figura del panel y haz clic para colocarla';
  canvas.style.cursor = (herramienta === 'pan') ? 'grab' : 'default';
  if(!opts.sinAjustar) fitView();
  render();
}
function alternarEspacio(){
  const destino = esModo3d() ? '2d' : '3d';
  if(figures.length){
    const ok = confirm(destino === '3d'
      ? 'Pasar a cuerpo sólido (3D) vacía el panel: las figuras planas no se conservan.\n¿Continuar?'
      : 'Volver a la sección plana (2D) vacía el panel: los sólidos no se conservan.\n¿Continuar?');
    if(!ok) return;
    registrarCambio();
  }
  try{ cerrarMenusZona1(); }catch(e){}
  setModoEspacio(destino);
}

// ══ Dibujo ═════════════════════════════════════════════════════════════════
// Todo el pintado recibe una proyección {px, py, esc} para servir igual al
// lienzo principal (transformación interactiva) y a los lienzos de
// resultados (encaje propio).
function trazarSolido(c, fig, vistaId, proj){
  const def = SOLID_DEFS[fig.type]; if(!def) return;
  const sx = proj.px(fig.cx), sy = proj.py(vDe(fig, vistaId));
  // En el alzado un sólido volteado se dibuja en espejo respecto de su
  // centroide (la planta no cambia). Los poliedros van por su silueta.
  const sz = (fig.volteado && vistaId !== 'planta') ? -1 : 1;
  c.save(); c.translate(sx, sy); c.scale(proj.esc, -proj.esc*sz);
  c.beginPath();
  const pol = contornoSolido(fig, vistaId);
  if(pol){ pol.forEach((q,i)=>{ if(i) c.lineTo(q[0], q[1]*sz); else c.moveTo(q[0], q[1]*sz); }); c.closePath(); }
  else (vistaId === 'planta' ? def.drawPlanta : def.drawAlzado)(c, fig.dims);
  c.restore();
}
function pintarSolido(c, fig, vistaId, proj, selected, numero){
  const color = fig.color, alpha = fig.sign===1 ? 0.25 : 0.12, borderAlpha = fig.sign===1 ? 0.9 : 0.6;
  trazarSolido(c, fig, vistaId, proj);
  c.fillStyle = hexAlpha(color, alpha); c.fill();
  c.strokeStyle = selected ? '#fff' : hexAlpha(color, borderAlpha);
  c.lineWidth = selected ? 2.5 : 1.5;
  c.setLineDash(fig.sign === -1 ? [5,3] : []); c.stroke(); c.setLineDash([]);
  if(fig.sign === -1){
    // Trama diagonal del hueco, recortada al contorno.
    const b = bounds3Mundo(fig);
    const x0 = proj.px(b.x0), x1 = proj.px(b.x1);
    const v0 = vistaId === 'planta' ? b.y0 : b.z0, v1 = vistaId === 'planta' ? b.y1 : b.z1;
    const y0 = Math.min(proj.py(v0), proj.py(v1)), y1 = Math.max(proj.py(v0), proj.py(v1));
    c.save(); trazarSolido(c, fig, vistaId, proj); c.clip();
    c.strokeStyle = hexAlpha(color, 0.35); c.lineWidth = 1;
    const L = (x1-x0) + (y1-y0);
    for(let i = -L; i < L; i += 8){ c.beginPath(); c.moveTo(x0+i, y0); c.lineTo(x0+i+(y1-y0), y1); c.stroke(); }
    c.restore();
  }
  const sx = proj.px(fig.cx), sy = proj.py(vDe(fig, vistaId));
  c.beginPath(); c.arc(sx, sy, 4, 0, Math.PI*2);
  c.fillStyle = selected ? '#fff' : hexAlpha(color, 0.9); c.fill();
  if(numero){
    c.beginPath(); c.arc(sx+9, sy-9, 7, 0, Math.PI*2);
    c.fillStyle = '#fff'; c.fill(); c.strokeStyle = hexAlpha(color, .9); c.lineWidth = 1; c.stroke();
    c.fillStyle = hexAlpha(color, .95); c.font = 'bold 9px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(String(numero), sx+9, sy-9); c.textAlign = 'start'; c.textBaseline = 'alphabetic';
  }
}

function grid3d(v){
  const H = canvas.clientHeight;
  const rawStep = 50/viewScale, exp = Math.floor(Math.log10(rawStep)), base = Math.pow(10,exp);
  const step = rawStep/base < 2 ? base : rawStep/base < 5 ? 2*base : 5*base;
  const a = s3(v, v.x0, 0), b = s3(v, v.x1, H);
  const x0 = Math.floor(a.x/step)*step, v0 = Math.floor(b.v/step)*step;
  ctx.lineWidth = 0.5;
  for(let wx = x0; wx <= b.x+step; wx += step){
    const sx = p3(v, wx, 0).x;
    ctx.strokeStyle = (Math.round(wx/step)%5===0) ? 'rgba(4,29,86,.16)' : 'rgba(4,29,86,.07)';
    ctx.beginPath(); ctx.moveTo(sx,0); ctx.lineTo(sx,H); ctx.stroke();
  }
  for(let wv = v0; wv <= a.v+step; wv += step){
    const sy = p3(v, 0, wv).y;
    ctx.strokeStyle = (Math.round(wv/step)%5===0) ? 'rgba(4,29,86,.16)' : 'rgba(4,29,86,.07)';
    ctx.beginPath(); ctx.moveTo(v.x0,sy); ctx.lineTo(v.x1,sy); ctx.stroke();
  }
}
function ejes3d(v){
  const H = canvas.clientHeight;
  const o = p3(v, 0, 0);
  ctx.strokeStyle = 'rgba(30,33,38,.18)'; ctx.lineWidth = 1; ctx.setLineDash([]);
  if(o.y >= 0 && o.y <= H){
    ctx.beginPath(); ctx.moveTo(v.x0, o.y); ctx.lineTo(v.x1, o.y); ctx.stroke();
    ctx.fillStyle = 'rgba(30,33,38,.18)';
    ctx.beginPath(); ctx.moveTo(v.x1-8,o.y-4); ctx.lineTo(v.x1,o.y); ctx.lineTo(v.x1-8,o.y+4); ctx.fill();
    ctx.fillStyle = 'rgba(30,33,38,.35)'; ctx.font = 'bold 12px Inter'; ctx.fillText('X', v.x1-16, o.y-6);
  }
  if(o.x >= v.x0 && o.x <= v.x1){
    ctx.strokeStyle = 'rgba(30,33,38,.18)';
    ctx.beginPath(); ctx.moveTo(o.x, H); ctx.lineTo(o.x, 0); ctx.stroke();
    ctx.fillStyle = 'rgba(30,33,38,.18)';
    ctx.beginPath(); ctx.moveTo(o.x-4,8); ctx.lineTo(o.x,0); ctx.lineTo(o.x+4,8); ctx.fill();
    ctx.fillStyle = 'rgba(30,33,38,.35)'; ctx.font = 'bold 12px Inter'; ctx.fillText(v.letra.toUpperCase(), o.x+6, 16);
  }
  ctx.fillStyle = 'rgba(30,33,38,.3)'; ctx.font = '10px Inter';
  if(o.x>=v.x0 && o.x<=v.x1 && o.y>=0 && o.y<=H) ctx.fillText('O', o.x+3, o.y-3);
}

// Cotas en cadena por vista: los bordes en X de todos los sólidos y los
// bordes en Y (planta) o en Z (alzado). Reutiliza el planificador y los
// pintores de 18-acotacion.js, que trabajan con valores y proyecciones.
function bordes3d(vistaId){
  const xs = [], vs = [];
  figures.forEach(f=>{
    const b = bounds3Mundo(f);
    xs.push(b.x0, b.x1);
    if(vistaId === 'planta') vs.push(b.y0, b.y1); else vs.push(b.z0, b.z1);
  });
  return {xs: xs.sort((a,b)=>a-b), vs: vs.sort((a,b)=>a-b)};
}
function dibujarCotas3d(c, vistaId, cfg){
  if(!figures.length) return;
  const {xs, vs} = bordes3d(vistaId);
  const medir = t => { c.save(); c.font = cfg.fuente; const w = c.measureText(t).width; c.restore(); return w; };
  const planX = planCotas(xs, cfg.px, medir), planV = planCotas(vs, cfg.py, medir);
  if(planX){
    const borde = cfg.py(Math.min(...vs)), base = borde + cfg.sepX;
    pintarCadenaCotas(c, planX, 'x', base, {pos:cfg.px, borde, tick:cfg.tick, salto:cfg.salto, fuente:cfg.fuente});
    pintarCotaTotal(c, planX.coords[0], planX.coords[planX.coords.length-1], 'x',
      base + 12 + (planX.nMax+1)*cfg.salto, {pos:cfg.px, fuenteTotal:cfg.fuenteTotal});
  }
  if(planV){
    const borde = cfg.px(Math.max(...xs)), base = borde + cfg.sepY;
    pintarCadenaCotas(c, planV, 'y', base, {pos:cfg.py, borde, tick:cfg.tick, salto:cfg.salto, fuente:cfg.fuente});
    pintarCotaTotal(c, planV.coords[0], planV.coords[planV.coords.length-1], 'y',
      base + 12 + (planV.nMax+1)*cfg.salto, {pos:cfg.py, fuenteTotal:cfg.fuenteTotal});
  }
}
function espacioCotas3d(c, vistaId, cfg){
  if(!figures.length) return {abajo:12, derecha:12};
  const {xs, vs} = bordes3d(vistaId);
  const medir = t => { c.save(); c.font = cfg.fuente; const w = c.measureText(t).width; c.restore(); return w; };
  const planX = planCotas(xs, cfg.px, medir), planV = planCotas(vs, cfg.py, medir);
  return {abajo:   planX ? cfg.sepX + 12 + (planX.nMax+1)*cfg.salto + 22 : 12,
          derecha: planV ? cfg.sepY + 12 + (planV.nMax+1)*cfg.salto + 24 : 12};
}

// Marca del centroide (y de G si difiere) en una vista.
function marcarCentroide3d(c, vistaId, proj, res, opts){
  opts = opts || {};
  const H = opts.H || canvas.clientHeight, X0 = opts.x0 || 0, X1 = opts.x1 || canvas.clientWidth;
  const pC = {x: proj.px(res.xbar), y: proj.py(vistaId==='planta' ? res.ybar : res.zbar)};
  c.save(); c.strokeStyle='rgba(240,192,64,.45)'; c.lineWidth=1; c.setLineDash([6,4]);
  c.beginPath(); c.moveTo(X0,pC.y); c.lineTo(X1,pC.y); c.stroke();
  c.beginPath(); c.moveTo(pC.x,0); c.lineTo(pC.x,H); c.stroke(); c.restore();
  const vC = vistaId==='planta' ? res.ybar : res.zbar;
  const punto = (p, col, ring, lab, txt)=>{
    c.beginPath(); c.arc(p.x,p.y,7,0,Math.PI*2); c.fillStyle=col; c.fill();
    c.strokeStyle='#fff'; c.lineWidth=1.5; c.stroke();
    c.fillStyle=ring; c.font='bold 13px Inter'; c.textAlign='left'; c.fillText(lab, p.x+11, p.y-8);
    c.font='bold 10px Inter'; const w=c.measureText(txt).width+8;
    c.fillStyle='rgba(255,255,255,.9)'; c.fillRect(p.x+10,p.y+2,w,14);
    c.fillStyle=ring; c.fillText(txt, p.x+14, p.y+12);
  };
  punto(pC, '#f0c040', '#b8860c', 'C', '('+decFix(res.xbar,'len')+' , '+decFix(vC,'len')+')');
  if(res.hetero && res.sep > 1e-9){
    const vG = vistaId==='planta' ? res.yg : res.zg;
    const pG = {x: proj.px(res.xg), y: proj.py(vG)};
    c.save(); c.strokeStyle='#c0392b'; c.lineWidth=1.6; c.setLineDash([4,3]);
    c.beginPath(); c.moveTo(pC.x,pC.y); c.lineTo(pG.x,pG.y); c.stroke(); c.restore();
    punto(pG, '#c0392b', '#96281b', 'G', '('+decFix(res.xg,'len')+' , '+decFix(vG,'len')+')');
  }
  c.textAlign='start';
}

function render3d(){
  const g = geomVistas(), W = g.W, H = g.H;
  ctx.clearRect(0,0,W,H);
  ctx.save(); ctx.fillStyle = CANVAS_BG; ctx.fillRect(0,0,W,H); ctx.restore();
  [g.planta, g.alzado].forEach(v=>{
    ctx.save(); ctx.beginPath(); ctx.rect(v.x0, 0, v.x1-v.x0, H); ctx.clip();
    if(VIS.grilla) grid3d(v);
    if(VIS.ejes) ejes3d(v);
    const proj = {px:x=>p3(v,x,0).x, py:w=>p3(v,0,w).y, esc:viewScale};
    figures.forEach((fig,i)=>pintarSolido(ctx, fig, v.id, proj, fig.id===selectedFigId || figuraMarcada(fig.id), i+1));
    // Rótulo de coordenadas junto al centroide, como en 2D.
    figures.forEach(fig=>{
      const sp = {x:proj.px(fig.cx), y:proj.py(vDe(fig,v.id))};
      ctx.fillStyle = hexAlpha(fig.color, 0.7); ctx.font = '9px Inter';
      ctx.fillText('('+r2(fig.cx)+', '+r2(vDe(fig,v.id))+')', sp.x+6, sp.y+12);
    });
    if(VIS.cotas){ try{ dibujarCotas3d(ctx, v.id, {px:proj.px, py:proj.py,
      fuente:'600 10.5px Inter, sans-serif', fuenteTotal:'700 11px Inter, sans-serif',
      tick:4.5, salto:15, sepX:44, sepY:50}); }catch(e){} }
    if(selectedFigType && ghostPos && SOLID_DEFS[selectedFigType]){
      const def = SOLID_DEFS[selectedFigType], d = getDefaultDims3d(selectedFigType);
      const gv = v.id==='planta' ? ghostPos.y : ghostPos.z;
      ctx.save(); ctx.translate(proj.px(ghostPos.x), proj.py(gv)); ctx.scale(viewScale,-viewScale);
      ctx.beginPath(); (v.id==='planta' ? def.drawPlanta : def.drawAlzado)(ctx, d); ctx.restore();
      ctx.fillStyle = 'rgba(228,172,23,.18)'; ctx.strokeStyle = 'rgba(228,172,23,.8)';
      ctx.setLineDash([4,3]); ctx.lineWidth = 1.5; ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
    }
    if(results && results.es3d && VIS.centroide) marcarCentroide3d(ctx, v.id, proj, results, {H, x0:v.x0, x1:v.x1});
    ctx.restore();
  });
  // Recuadro isométrico de solo lectura (23-vista-isometrica.js), opcional.
  if(VIS.iso && figures.length && typeof dibujarIsoEn === 'function'){
    const wI = Math.round(W*0.26), hI = Math.round(H*0.36), xI = W - wI - 12, yI = 52;
    try{ dibujarIsoEn(ctx, xI, yI, wI, hI, {marco:true, marcarC:!!(results && results.es3d && VIS.centroide), numerar:true}); }catch(e){}
  }
  // Separador y rótulos de las vistas
  ctx.save();
  ctx.strokeStyle = 'rgba(15,92,86,.35)'; ctx.lineWidth = 1.5; ctx.setLineDash([6,4]);
  ctx.beginPath(); ctx.moveTo(g.ancho,0); ctx.lineTo(g.ancho,H); ctx.stroke(); ctx.setLineDash([]);
  // Rótulo centrado arriba de cada vista (a la izquierda lo taparía la columna).
  [g.planta, g.alzado].forEach(v=>{
    ctx.font = 'bold 11px Inter'; const w = ctx.measureText(v.rotulo).width + 16;
    const xr = (v.x0+v.x1)/2 - w/2;
    ctx.fillStyle = 'rgba(15,92,86,.92)'; ctx.fillRect(xr, 10, w, 22);
    ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.fillText(v.rotulo, xr+8, 21); ctx.textBaseline = 'alphabetic';
  });
  ctx.restore();
}

// ══ Ratón y táctil (mismo motor de gestos que 2D, por vista) ═══════════════
function hitTest3d(sx, sy){
  const v = vistaEnPunto(sx), w = s3(v, sx, sy), tol = 6/viewScale;
  for(const fig of [...figures].reverse()){
    const sp = p3(v, fig.cx, vDe(fig, v.id));
    if(Math.hypot(sx-sp.x, sy-sp.y) < 10) return fig;
    const b = bounds3Mundo(fig);
    const v0 = v.id==='planta' ? b.y0 : b.z0, v1 = v.id==='planta' ? b.y1 : b.z1;
    if(w.x >= b.x0-tol && w.x <= b.x1+tol && w.v >= v0-tol && w.v <= v1+tol) return fig;
  }
  return null;
}
function figurasEnRecuadro3d(vista, x0,y0,x1,y1){
  const a = s3(vista, Math.min(x0,x1), Math.min(y0,y1)), b = s3(vista, Math.max(x0,x1), Math.max(y0,y1));
  const rx0 = Math.min(a.x,b.x), rx1 = Math.max(a.x,b.x), rv0 = Math.min(a.v,b.v), rv1 = Math.max(a.v,b.v);
  return figures.filter(f=>{
    const c = bounds3Mundo(f);
    const v0 = vista.id==='planta' ? c.y0 : c.z0, v1 = vista.id==='planta' ? c.y1 : c.z1;
    return c.x0 <= rx1 && c.x1 >= rx0 && v0 <= rv1 && v1 >= rv0;
  }).map(f=>f.id);
}

function onMouseMove3d(e){
  const sp = getCanvasPos(e), v = vistaEnPunto(sp.x), w = s3(v, sp.x, sp.y);
  document.getElementById('canvasHint').textContent =
    (v.id==='planta' ? 'Planta' : 'Alzado') + ' · x: ' + r2(w.x) + ' ' + unit + '   ' + v.letra + ': ' + r2(w.v) + ' ' + unit;
  if(selectedFigType){
    ghostPos = v.id==='planta' ? {x:w.x, y:w.v, z:0} : {x:w.x, y:0, z:w.v};
    render(); return;
  }
  if(isDragging && !isDraggingFig){
    viewTx = dragViewStart.x + (sp.x - dragStart.x);
    viewTy = dragViewStart.y + (sp.y - dragStart.y);
    render(); return;
  }
  if(gesto){
    if(!gesto.moved){
      if(Math.hypot(sp.x-gesto.x0, sp.y-gesto.y0) > UMBRAL_ARRASTRE){
        gesto.moved = true;
        if(gesto.tEsperaId){ clearTimeout(gesto.tEsperaId); gesto.tEsperaId = null; }
        const esVacio = gesto.hitFig === null;
        if(esVacio && !gesto.mantenido){
          gesto.tipo = 'pan-temporal';
          isDragging = true; dragStart = {x:gesto.x0, y:gesto.y0}; dragViewStart = {x:viewTx, y:viewTy};
        } else if(gesto.modo === 'borrar'){
          gesto.tipo = 'rubber-borrar'; mostrarRecuadroSeleccion('borrar');
        } else if(gesto.hitFig !== null){
          const grupo = selFiguras.indexOf(gesto.hitFig) >= 0 ? selFiguras.slice() : [gesto.hitFig];
          if(selFiguras.indexOf(gesto.hitFig) < 0){ selFiguras = grupo; selectFigure(gesto.hitFig); }
          gesto.tipo = 'mover';
          registrarCambio();
          gesto.origenes = grupo.map(id=>{ const f = figures.find(z=>z.id===id);
            return f ? {id, cx:f.cx, cy:f.cy, cz:f.cz} : null; }).filter(Boolean);
        } else if(esVacio && gesto.mantenido){
          gesto.tipo = 'rubber'; mostrarRecuadroSeleccion();
        }
      }
    }
    if(gesto.tipo === 'mover'){
      // Se arrastra dentro de la vista donde empezó el gesto: cambia x y la
      // coordenada vertical de ESA vista (y en planta, z en alzado).
      const gv = gesto.vista, wv = s3(gv, sp.x, sp.y);
      const dx = wv.x - gesto.wx0, dv = wv.v - gesto.wv0;
      gesto.origenes.forEach(o=>{
        const f = figures.find(z=>z.id===o.id); if(!f) return;
        f.cx = o.cx + dx;
        if(gv.id === 'planta') f.cy = o.cy + dv; else f.cz = o.cz + dv;
      });
      updatePropPanel(); results = null; render();
    } else if(gesto.tipo === 'pan-temporal'){
      viewTx = dragViewStart.x + (sp.x - dragStart.x);
      viewTy = dragViewStart.y + (sp.y - dragStart.y);
      render();
    } else if(gesto.tipo === 'rubber' || gesto.tipo === 'rubber-borrar'){
      gesto.x1 = sp.x; gesto.y1 = sp.y; actualizarRecuadroSeleccion(gesto);
    }
    return;
  }
  const hit = hitTest3d(sp.x, sp.y);
  canvas.style.cursor = hit ? 'move' : (isDragging ? 'grabbing' : 'grab');
}

function onMouseDown3d(e){
  const sp = getCanvasPos(e), v = vistaEnPunto(sp.x), w = s3(v, sp.x, sp.y);
  if(herramienta === 'pan' && !selectedFigType){
    isDragging = true; dragStart = sp; dragViewStart = {x:viewTx, y:viewTy};
    canvas.style.cursor = 'grabbing'; return;
  }
  if(selectedFigType){ placeSolid(selectedFigType); return; }
  if(herramienta === 'sel' || herramienta === 'borrar'){
    const hit = hitTest3d(sp.x, sp.y);
    gesto = {modo:herramienta, vista:v, hitFig: hit ? hit.id : null, x0:sp.x, y0:sp.y, wx0:w.x, wv0:w.v,
             moved:false, mantenido:false};
    if(!hit) armarEsperaDeRecuadro(gesto);
    return;
  }
  isDragging = true; dragStart = sp; dragViewStart = {x:viewTx, y:viewTy};
  canvas.style.cursor = 'grabbing'; selectFigure(null);
}

function onMouseUp3d(){
  isDragging = false; isDraggingFig = false; dragFigId = null; dragAnchorId = null;
  if(gesto){
    if(gesto.tEsperaId) clearTimeout(gesto.tEsperaId);
    if(gesto.tipo === 'pan-temporal'){
      gesto = null; canvas.style.cursor = (herramienta==='pan') ? 'grab' : 'default'; return;
    }
    if(gesto.modo === 'borrar'){
      let aBorrar = [];
      if(!gesto.moved){ if(gesto.hitFig !== null) aBorrar = [gesto.hitFig]; }
      else if(gesto.tipo === 'rubber-borrar') aBorrar = figurasEnRecuadro3d(gesto.vista, gesto.x0, gesto.y0, gesto.x1, gesto.y1);
      ocultarRecuadroSeleccion();
      if(aBorrar.length){
        registrarCambio();
        figures = figures.filter(f => aBorrar.indexOf(f.id) < 0);
        if(aBorrar.indexOf(selectedFigId) >= 0) selectFigure(null);
        selFiguras = selFiguras.filter(id => aBorrar.indexOf(id) < 0);
        results = null; renderFigList();
      }
      actualizarInfoSel(); render(); gesto = null; canvas.style.cursor = 'default'; return;
    }
    if(!gesto.moved){
      if(gesto.hitFig !== null) alternarFigura(gesto.hitFig);
      else { selFiguras = []; selectFigure(null); actualizarInfoSel(); render(); }
    } else if(gesto.tipo === 'mover'){
      renderFigList(); actualizarInfoSel(); render();
    } else if(gesto.tipo === 'rubber'){
      selFiguras = figurasEnRecuadro3d(gesto.vista, gesto.x0, gesto.y0, gesto.x1, gesto.y1);
      selectFigure(selFiguras.length ? selFiguras[selFiguras.length-1] : null);
      ocultarRecuadroSeleccion(); renderFigList(); actualizarInfoSel(); render();
    }
    gesto = null;
  }
  canvas.style.cursor = (herramienta==='pan') ? 'grab' : 'default';
}
function onDblClick3d(e){
  const sp = getCanvasPos(e), hit = hitTest3d(sp.x, sp.y);
  if(hit) abrirEdicionFigura(hit.id);
}
function onWheel3d(e){
  e.preventDefault();
  const sp = getCanvasPos(e), v = vistaEnPunto(sp.x);
  const factor = e.deltaY < 0 ? 1.12 : 1/1.12;
  const antes = s3(v, sp.x, sp.y);
  viewScale = Math.max(0.1, Math.min(50, viewScale*factor));
  const despues = s3(v, sp.x, sp.y);
  viewTx += (despues.x-antes.x)*viewScale;
  viewTy -= (despues.v-antes.v)*viewScale;
  render();
}

// ══ Encuadre ═══════════════════════════════════════════════════════════════
function bbox3d(){
  if(!figures.length) return null;
  let x0=Infinity, x1=-Infinity, v0=Infinity, v1=-Infinity;
  figures.forEach(f=>{ const b = bounds3Mundo(f);
    x0=Math.min(x0,b.x0); x1=Math.max(x1,b.x1);
    v0=Math.min(v0,b.y0,b.z0); v1=Math.max(v1,b.y1,b.z1); });
  return {x0,x1,v0,v1};
}
function fitView3d(){
  const g = geomVistas();
  const bb = bbox3d();
  if(!bb){ viewTx = g.ancho/2; viewTy = g.H/2; viewScale = 1; render(); return; }
  const bw = Math.max(bb.x1-bb.x0, 1e-9), bv = Math.max(bb.v1-bb.v0, 1e-9);
  // Aire para las cadenas de cotas, a la derecha y abajo de cada vista.
  // La columna de control se superpone al borde izquierdo del lienzo (unos
  // 100 px), así que la planta se centra un poco a la derecha de su mitad.
  let s = Math.min((g.ancho*0.52)/bw, (g.H*0.60)/bv);
  if(!isFinite(s) || s <= 0) s = 1;
  s = Math.max(1e-4, Math.min(s, 20000));
  viewScale = s;
  viewTx = g.ancho*0.50 - (bb.x0+bb.x1)/2*s;
  viewTy = g.H*0.46 + (bb.v0+bb.v1)/2*s;
  render();
}

// ══ Alta de sólidos y panel de propiedades ═════════════════════════════════
function getDefaultDims3d(type){
  const d = {}; SOLID_DEFS[type].dims.forEach(x=>{ d[x.id] = x.def; }); return d;
}
// El sólido nace con el centro de su BASE en el origen, que es como se dan
// los datos en los enunciados; cz guarda la posición del centroide.
function placeSolid(type){
  const def = SOLID_DEFS[type]; if(!def) return;
  registrarCambio();
  const id = ++figIdCounter, dims = getDefaultDims3d(type);
  const color = COLORS[colorIdx % COLORS.length]; colorIdx++;
  const fig = {id, type, dims, cx:0, cy:0, cz:0, rotation:0, volteado:false, sign:1, color,
               anchor:'BM', activeAnchor:'BM', name:def.name, es3d:true,
               matId:(modoCuerpo==='heterogeneo' && MATS.length) ? MATS[0].id : null,
               thickness:1, angleMode:'semi'};
  const off0 = solidAnchorOffsetFig(fig, 'BM');
  fig.cx = -off0.dx; fig.cy = -off0.dy; fig.cz = -off0.dz;
  figures.push(fig);
  selectedFigType = null; ghostPos = null;
  document.querySelectorAll('.fig-btn').forEach(b=>b.classList.remove('selected'));
  canvas.style.cursor = 'grab';
  document.getElementById('canvasHint').textContent =
    def.name + ' colocado con el centro de su base en el origen (0, 0, 0). Arrástralo en la planta o en el alzado, o usa el panel.';
  selectFigure(id);
  results = null; renderFigList(); render();
}

function anclaSolido(fig){
  const off = solidAnchorOffsetFig(fig, fig.activeAnchor || 'BM');
  return {x:fig.cx+off.dx, y:fig.cy+off.dy, z:fig.cz+off.dz};
}
// Cambio de giro o de volteo manteniendo fija el ancla activa.
function recolocarPorAncla(fig, cambio){
  const antes = anclaSolido(fig);
  cambio(fig);
  const off = solidAnchorOffsetFig(fig, fig.activeAnchor || 'BM');
  fig.cx = antes.x - off.dx; fig.cy = antes.y - off.dy; fig.cz = antes.z - off.dz;
}
function alternarVolteo(){
  const fig = figures.find(f=>f.id===selectedFigId); if(!fig) return;
  registrarCambio();
  recolocarPorAncla(fig, f=>{ f.volteado = !f.volteado; });
  results = null; buildPropPanel3d(fig); render();
}
function buildPropPanel3d(fig){
  const def = SOLID_DEFS[fig.type];
  document.getElementById('propTitle').textContent = fig.name + (fig.volteado ? ' (volteado)' : '');
  document.getElementById('signPos').classList.toggle('active', fig.sign===1);
  document.getElementById('signNeg').classList.toggle('active', fig.sign===-1);
  const df = document.getElementById('dimFields');
  const ref = REF_SOLIDS[fig.type];
  df.innerHTML = ref ? `<div class="ref-fig-box"><div class="ref-fig-title">${ref.title}</div>${ref.svg}<div class="ref-fig-formula">${ref.formulas}</div></div>` : '';
  // Volteo (base arriba). La esfera no cambia al voltearla.
  if(fig.type !== 's_esfera'){
    const vb = document.createElement('div'); vb.className = 'field';
    vb.innerHTML = '<label>Orientación</label><div class="anchor-row">'
      + '<button class="anchor-btn' + (fig.volteado ? '' : ' active') + '" onclick="if(figures.find(f=>f.id===selectedFigId).volteado) alternarVolteo()">Base abajo</button>'
      + '<button class="anchor-btn' + (fig.volteado ? ' active' : '') + '" onclick="if(!figures.find(f=>f.id===selectedFigId).volteado) alternarVolteo()">Base arriba (volteado)</button></div>';
    df.appendChild(vb);
  }
  // El giro alrededor del eje vertical solo se nota en los poliedros.
  const rf = document.getElementById('rotField');
  if(rf) rf.style.display = def.vertices ? '' : 'none';
  if(modoCuerpo==='heterogeneo'){
    const box = document.createElement('div'); box.className = 'field';
    const opts = MATS.map(m=>`<option value="${m.id}"${fig.matId===m.id?' selected':''}>${matSimbolo()}${m.id} = ${decFix(m.val,'len')} ${m.unidad||''}</option>`).join('');
    box.innerHTML = '<label>'+(matMagnitud==='densidad'?'Densidad':'Peso específico')
      +' <span style="color:var(--grn2);font-weight:800">('+matSimbolo()+')</span></label>'
      +'<select id="fig-mat" onchange="asignarMaterial(this.value)" style="width:100%;background:var(--bg);'
      +'border:1px solid var(--border2);color:var(--text);padding:8px 9px;border-radius:7px;font-size:12px;font-family:inherit;">'
      +'<option value="">— Sin asignar —</option>'+opts+'</select>'
      +'<div style="font-size:9.5px;color:var(--muted);margin-top:5px;line-height:1.45;">En 3D el peso es '+matSimbolo()+'·V: no hay espesor.</div>';
    df.appendChild(box);
  }
  const pairs = []; for(let i=0;i<def.dims.length;i+=2) pairs.push(def.dims.slice(i,i+2));
  pairs.forEach(pair=>{
    const row = document.createElement('div'); row.className = pair.length>1 ? 'field-row' : 'field';
    pair.forEach(dim=>{
      const d = document.createElement('div'); d.className = 'field';
      d.innerHTML = `<label>${dim.label} <span style="color:var(--grn2);font-weight:800">(${unit})</span></label>`
        + `<input type="number" id="dim-${dim.id}" value="${fig.dims[dim.id]}" step="any" min="0.001" onchange="updateDim3d('${dim.id}',this.value)">`;
      row.appendChild(d);
    });
    df.appendChild(row);
  });
  updatePropPanel3d();
  const ab = document.getElementById('anchorBtns'); ab.innerHTML = '';
  SOLID_ANCHORS.forEach(a=>{
    const btn = document.createElement('button');
    const act = a === (fig.activeAnchor||'BM');
    btn.className = 'anchor-btn' + (act ? ' active' : ''); btn.style.fontWeight = act ? '700' : '500';
    btn.textContent = SOLID_ANCHOR_LABELS[a];
    btn.onclick = ()=>{ fig.activeAnchor = a; fig.anchor = a; buildPropPanel3d(fig); render(); };
    ab.appendChild(btn);
  });
  const pl = document.getElementById('posLabel');
  if(pl) pl.textContent = 'Posición: ' + SOLID_ANCHOR_LABELS[fig.activeAnchor||'BM'] + ' (x, y, z)';
}
// Al cambiar una dimensión, el ancla activa se queda donde estaba (es lo que
// el alumno fijó) y el centroide se recoloca respecto de ella.
function updateDim3d(dimId, val){
  const fig = figures.find(f=>f.id===selectedFigId); if(!fig) return;
  registrarCambio();
  recolocarPorAncla(fig, f=>{ f.dims[dimId] = parseFloat(val)||0; });
  updatePropPanel3d(); results = null; render();
}
// Posición del ancla y giro escritos en el panel: el ancla se queda donde
// dice el alumno y el centroide se recoloca con el giro nuevo.
function updateFigFromProp3d(){
  const fig = figures.find(f=>f.id===selectedFigId); if(!fig) return;
  registrarCambio();
  const num = id => { const e = document.getElementById(id); const n = parseFloat(e && e.value); return isFinite(n) ? n : 0; };
  const def = SOLID_DEFS[fig.type];
  if(def.vertices) fig.rotation = num('rotation');
  const off = solidAnchorOffsetFig(fig, fig.activeAnchor||'BM');
  fig.cx = num('posX') - off.dx; fig.cy = num('posY') - off.dy; fig.cz = num('posZ') - off.dz;
  results = null; render();
}
function updatePropPanel3d(){
  const fig = figures.find(f=>f.id===selectedFigId); if(!fig) return;
  const a = anclaSolido(fig);
  const set = (id, v) => { const e = document.getElementById(id); if(e) e.value = r2(v); };
  set('posX', a.x); set('posY', a.y); set('posZ', a.z); set('rotation', fig.rotation||0);
}

// ══ Cálculo ═════════════════════════════════════════════════════════════════
// El mismo balance de momentos que en 2D, con volúmenes y tres coordenadas.
function calculate3d(){
  if(!figures.length){ aviso('Agrega al menos un sólido.'); return; }
  const hetero = (modoCuerpo==='heterogeneo');
  let V=0, Qx=0, Qy=0, Qz=0, W=0, Wx=0, Wy=0, Wz=0;
  const steps = [];
  for(const fig of figures){
    const def = SOLID_DEFS[fig.type];
    const v = def.volume(fig.dims)*fig.sign;
    const mat = hetero ? matPorId(fig.matId) : null;
    const g = mat ? Number(mat.val) : 1;
    const gLabel = mat ? (matSimbolo()+mat.id) : '—';
    const w = v*g;
    V += v; Qx += v*fig.cx; Qy += v*fig.cy; Qz += v*fig.cz;
    W += w; Wx += w*fig.cx; Wy += w*fig.cy; Wz += w*fig.cz;
    steps.push({fig, v, a:v, g, gLabel, mat, t:1, w, xi:fig.cx, yi:fig.cy, zi:fig.cz,
                vx:v*fig.cx, vy:v*fig.cy, vz:v*fig.cz, wx:w*fig.cx, wy:w*fig.cy, wz:w*fig.cz});
  }
  if(Math.abs(V) < 1e-12){ aviso('El volumen total es cero. Revisa los huecos.', 'error'); return; }
  const xbar = Qx/V, ybar = Qy/V, zbar = Qz/V;
  const xg = Math.abs(W)>1e-12 ? Wx/W : xbar, yg = Math.abs(W)>1e-12 ? Wy/W : ybar, zg = Math.abs(W)>1e-12 ? Wz/W : zbar;
  const sep = Math.hypot(xg-xbar, yg-ybar, zg-zbar);
  results = {es3d:true, xbar, ybar, zbar, xg, yg, zg, V, A:V, W, Qx, Qy, Qz, Wx, Wy, Wz, sep, hetero, steps,
             Ix:0, Iy:0, Ixy:0, Imax:0, Imin:0, thetaP:0, Jo:0, kx:0, ky:0};
  renderResults3d(results);
  render();
}

// ══ Resultados en pantalla ═════════════════════════════════════════════════
// Encaje de las dos vistas dentro de un lienzo cualquiera (resultados, PDF).
function pintarVistas3dEn(c, W, H, opts){
  opts = opts || {};
  c.fillStyle = '#ffffff'; c.fillRect(0,0,W,H);
  if(!figures.length) return;
  const bb = bbox3d();
  const ancho = W/2, cfgBase = {fuente:'600 9px Inter, sans-serif', fuenteTotal:'700 9.5px Inter, sans-serif',
                                tick:3.8, salto:13, sepX:26, sepY:30};
  [['planta',0],['alzado',ancho]].forEach(([vid, x0])=>{
    const bw = Math.max(bb.x1-bb.x0,1e-9), bv = Math.max(bb.v1-bb.v0,1e-9);
    const mI = 34, mS = 34;
    const encajar = (mD, mInf)=>{
      const s = Math.min((ancho-mI-mD)/bw, (H-mS-mInf)/bv);
      const sobX = (ancho-mI-mD) - bw*s, sobY = (H-mS-mInf) - bv*s;
      return {px: x => x0 + mI + sobX/2 + (x-bb.x0)*s, py: v => H - mInf - sobY/2 - (v-bb.v0)*s, esc:s};
    };
    let proj = encajar(70, 70);
    let esp = {abajo:70, derecha:70};
    try{ esp = espacioCotas3d(c, vid, Object.assign({px:proj.px, py:proj.py}, cfgBase)); }catch(e){}
    proj = encajar(Math.min(esp.derecha+10, ancho*0.42), Math.min(esp.abajo+8, H*0.42));
    c.save(); c.beginPath(); c.rect(x0,0,ancho,H); c.clip();
    // ejes por O
    const o = {x:proj.px(0), y:proj.py(0)};
    c.strokeStyle = 'rgba(30,33,38,.2)'; c.lineWidth = 1;
    if(o.x > x0 && o.x < x0+ancho){ c.beginPath(); c.moveTo(o.x,0); c.lineTo(o.x,H); c.stroke(); }
    if(o.y > 0 && o.y < H){ c.beginPath(); c.moveTo(x0,o.y); c.lineTo(x0+ancho,o.y); c.stroke(); }
    figures.forEach((f,i)=>pintarSolido(c, f, vid, proj, false, opts.numerar ? i+1 : 0));
    if(opts.cotas !== false){ try{ dibujarCotas3d(c, vid, Object.assign({px:proj.px, py:proj.py}, cfgBase)); }catch(e){} }
    if(opts.marcarG && results && results.es3d) marcarCentroide3d(c, vid, proj, results, {H, x0, x1:x0+ancho});
    c.restore();
    c.save(); c.font = 'bold 10px Inter'; c.fillStyle = 'rgba(15,92,86,.92)';
    const rot = vid==='planta' ? 'Planta (X – Y)' : 'Alzado (X – Z)';
    const w = c.measureText(rot).width + 14; c.fillRect(x0+8, 8, w, 18);
    c.fillStyle = '#fff'; c.textBaseline = 'middle'; c.fillText(rot, x0+15, 17); c.restore();
  });
  c.save(); c.strokeStyle = 'rgba(15,92,86,.35)'; c.setLineDash([6,4]); c.lineWidth = 1.2;
  c.beginPath(); c.moveTo(ancho,0); c.lineTo(ancho,H); c.stroke(); c.restore();
}
function drawVistas3dEn(canvasId, opts){
  const cv = document.getElementById(canvasId); if(!cv) return;
  const dpr = window.devicePixelRatio||1, W = cv.clientWidth||600, H = cv.clientHeight||350;
  cv.width = W*dpr; cv.height = H*dpr;
  const c = cv.getContext('2d'); c.scale(dpr,dpr);
  pintarVistas3dEn(c, W, H, opts);
}

// Croquis SVG de un sólido (su alzado, con las medidas), para la tarjeta de
// resultados. El contorno se muestrea igual que croquisFigura en 2D.
// Contorno del alzado propio (sin giro, con volteo) como lista de órdenes
// ['M'|'L', x, z] relativas al centroide, para SVG.
function _ordenesAlzadoPropio(fig){
  const def = SOLID_DEFS[fig.type], cmds = [];
  const pol = contornoSolido(fig, 'alzado', {rot0:true});
  if(pol){ pol.forEach((q,i)=>cmds.push([i?'L':'M', q[0], q[1]])); cmds.push(['Z']); return cmds; }
  const sz = fig.volteado ? -1 : 1;
  const fake = { moveTo:(x,y)=>cmds.push(['M',x,y*sz]), lineTo:(x,y)=>cmds.push(['L',x,y*sz]),
    closePath:()=>cmds.push(['Z']), rect:(x,y,w,h)=>{ cmds.push(['M',x,y*sz],['L',x+w,y*sz],['L',x+w,(y+h)*sz],['L',x,(y+h)*sz],['Z']); },
    arc:(cx,cy,r,a0,a1,acw)=>{ const n=28; let d=a1-a0; if(acw && d>0) d-=2*Math.PI; if(!acw && d<0) d+=2*Math.PI;
      for(let i=0;i<=n;i++){ const a=a0+d*(i/n); cmds.push([i===0&&!cmds.length?'M':'L', cx+r*Math.cos(a), (cy+r*Math.sin(a))*sz]); } },
    quadraticCurveTo:(qx,qy,x,y)=>{ const p0=cmds[cmds.length-1]; const x0=p0?p0[1]:0, y0=p0?p0[2]*sz:0; const n=20;
      for(let i=1;i<=n;i++){ const t=i/n, u=1-t; cmds.push(['L', u*u*x0+2*u*t*qx+t*t*x, (u*u*y0+2*u*t*qy+t*t*y)*sz]); } } };
  try{ def.drawAlzado(fake, fig.dims); }catch(e){}
  return cmds;
}
function croquisSolido(fig, idx){
  const def = SOLID_DEFS[fig.type]; if(!def) return '';
  const b = bounds3Rel(fig, true);
  const W=190, H=150, M=30;
  const cmds = _ordenesAlzadoPropio(fig);
  const bw = Math.max(b.right-b.left,1e-9), bh = Math.max(b.top-b.bottom,1e-9);
  const s = Math.min((W-2*M)/bw, (H-2*M)/bh);
  const px = x => M + (x-b.left)*s, py = z => H-M - (z-b.bottom)*s;
  let path = '';
  cmds.forEach(c=>{ path += c[0]==='Z' ? 'Z' : (c[0] + px(c[1]).toFixed(1) + ',' + py(c[2]).toFixed(1) + ' '); });
  const gx = px(0), gy = py(0), col = fig.color || '#14766d', neg = fig.sign < 0;
  return `
  <div class="croq">
    <div class="croq-h"><span class="croq-n">${idx+1}</span>
      <span class="croq-t">${esc(fig.etiqueta||fig.name||def.name)}${neg?' <i>(hueco)</i>':''}${fig.volteado?' · volteado':''}${(fig.rotation&&def.vertices)?' · α = '+r2(fig.rotation)+'°':''}</span></div>
    <svg viewBox="0 0 ${W} ${H}" class="croq-svg">
      <path d="${path}" fill="${col}" fill-opacity="${neg?0.10:0.22}" stroke="${col}" stroke-width="1.6" stroke-dasharray="${neg?'4 3':'0'}"/>
      <line x1="${gx}" y1="${py(b.bottom)}" x2="${gx}" y2="${py(b.top)}" stroke="${col}" stroke-width=".8" stroke-dasharray="3 2" opacity=".55"/>
      <line x1="${px(b.left)}" y1="${gy}" x2="${px(b.right)}" y2="${gy}" stroke="${col}" stroke-width=".8" stroke-dasharray="3 2" opacity=".55"/>
      <circle cx="${gx}" cy="${gy}" r="3.4" fill="#e2aa1b" stroke="#fff" stroke-width="1"/>
      <text x="${gx+6}" y="${gy-5}" font-size="9" font-weight="700" fill="#b8860c">C${idx+1}</text>
      <line x1="${px(b.left)}" y1="${H-16}" x2="${px(b.right)}" y2="${H-16}" stroke="#64748b" stroke-width=".9"/>
      <text x="${(px(b.left)+px(b.right))/2}" y="${H-6}" font-size="8.5" fill="#475569" text-anchor="middle">${decFix(bw,'len')} ${unit}</text>
      <line x1="${W-16}" y1="${py(b.bottom)}" x2="${W-16}" y2="${py(b.top)}" stroke="#64748b" stroke-width=".9"/>
      <text x="${W-8}" y="${(py(b.bottom)+py(b.top))/2}" font-size="8.5" fill="#475569" text-anchor="middle" transform="rotate(-90 ${W-8} ${(py(b.bottom)+py(b.top))/2})">${decFix(bh,'len')} ${unit}</text>
    </svg>
    <div class="croq-d"><span>x̃ = ${decFix(fig.cx,'len')}</span><span>ỹ = ${decFix(fig.cy,'len')}</span><span>z̃ = ${decFix(fig.cz,'len')} ${unit}</span></div>
  </div>`;
}

function renderResults3d(res){
  const u3 = unit+'³', u1 = unit;
  currentU4 = unit+'⁴'; currentU2 = unit+'²'; currentU1 = u1;
  const rp = document.getElementById('resultsPanel'); if(rp) rp.style.display = 'block';
  const hint = document.getElementById('noResultsHint'); if(hint) hint.style.display = 'none';
  const ra = document.getElementById('resultsArea'); if(ra) ra.style.display = 'block';
  setTimeout(()=>{ ra && ra.scrollIntoView({behavior:'smooth', block:'start'}); }, 150);
  const f = v => fmtVal(v), nL = v => decFix(v,'len');
  const het = res.hetero, simb = matSimbolo();
  const Wsim = (matMagnitud==='densidad') ? 'm' : 'W';
  let html = '';

  html += `<div class="res-section">
    <div class="res-section-title"><div class="num" style="background:var(--grn)">✎</div>Cuerpo compuesto — planta y alzado con cotas</div>
    <canvas id="compositeCanvas" style="width:100%;max-width:860px;height:420px;display:block;margin:0 auto;border-radius:10px;border:1px solid var(--border);background:#fff;"></canvas>
    <div style="font-size:10px;color:var(--muted);margin-top:6px;">
      Volumen que <b style="color:var(--grn2)">suma</b> = sólido &nbsp;|&nbsp; Volumen que <b style="color:#c0392b">resta</b> = trama (//) &nbsp;|&nbsp; cada sólido lleva su número
    </div></div>`;

  html += `<div class="res-section"><div class="res-section-title"><div class="num">1</div>Propiedades de cada sólido</div>`;
  res.steps.forEach((s,i)=>{
    const def = SOLID_DEFS[s.fig.type];
    const nom = s.fig.etiqueta || s.fig.name || def.name;
    const signo = s.fig.sign===1 ? '<span style="color:var(--grn2);font-weight:700">＋ Suma</span>' : '<span style="color:#c0392b;font-weight:700">－ Resta (hueco)</span>';
    html += `<div class="fig-card"><div class="fig-card-datos">
        <div class="fig-card-h"><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${s.fig.color}"></span><b>${i+1}. ${esc(nom)}</b> ${signo}</div>
        <div class="eq-row"><div class="eq-body">${kx(def.formula.V + '\\quad ' + def.formula.c + (def.formula.cx ? '\\quad ' + def.formula.cx : ''))}</div></div>
        <table class="fig-tabla"><thead><tr><th>Magnitud</th><th>Símbolo</th><th style="text-align:right">Valor</th><th>Unidad</th></tr></thead><tbody>
          <tr><td>Volumen</td><td><i>V<sub>i</sub></i></td><td class="v">${f(Math.abs(s.v))}</td><td>${u3}</td></tr>
          <tr><td>Centroide x</td><td><i>x̃<sub>i</sub></i></td><td class="v">${nL(s.xi)}</td><td>${u1}</td></tr>
          <tr><td>Centroide y</td><td><i>ỹ<sub>i</sub></i></td><td class="v">${nL(s.yi)}</td><td>${u1}</td></tr>
          <tr><td>Centroide z</td><td><i>z̃<sub>i</sub></i></td><td class="v">${nL(s.zi)}</td><td>${u1}</td></tr>
          ${het?`<tr><td>${matMagnitud==='densidad'?'Densidad':'Peso específico'}</td><td><i>${simb}<sub>i</sub></i></td><td class="v">${s.mat?nL(s.mat.val):'—'}</td><td>${s.mat?esc(s.mat.unidad||''):'—'}</td></tr>
          <tr><td>${matMagnitud==='densidad'?'Masa':'Peso'}</td><td><i>${Wsim}<sub>i</sub></i></td><td class="v">${f(Math.abs(s.w))}</td><td>—</td></tr>`:''}
        </tbody></table></div>
      <div class="fig-card-dib">${croquisSolido(s.fig, i)}</div></div>`;
  });
  html += `</div>`;

  html += `<div class="res-section"><div class="res-section-title"><div class="num">2</div>Tabla resumen de sólidos</div>
    <div style="overflow-x:auto;"><table class="tabla-res"><thead><tr>
      <th>N°</th><th>Sólido</th><th style="text-align:center">Signo</th>${het?`<th style="text-align:center">${simb}<sub>i</sub></th>`:''}
      <th>V<sub>i</sub><br><span>(${u3})</span></th><th>x̃<sub>i</sub><br><span>(${u1})</span></th><th>ỹ<sub>i</sub><br><span>(${u1})</span></th><th>z̃<sub>i</sub><br><span>(${u1})</span></th>
      <th>V<sub>i</sub>x̃<sub>i</sub></th><th>V<sub>i</sub>ỹ<sub>i</sub></th><th>V<sub>i</sub>z̃<sub>i</sub></th>
      ${het?`<th>${Wsim}<sub>i</sub>x̃<sub>i</sub></th><th>${Wsim}<sub>i</sub>ỹ<sub>i</sub></th><th>${Wsim}<sub>i</sub>z̃<sub>i</sub></th>`:''}
    </tr></thead><tbody>`;
  res.steps.forEach((s,i)=>{
    const nom = s.fig.etiqueta || s.fig.name;
    html += `<tr><td>${i+1}</td><td><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${s.fig.color};margin-right:5px"></span>${esc(nom)}</td>
      <td style="text-align:center;font-weight:800;color:${s.fig.sign>0?'var(--grn2)':'#c0392b'}">${s.fig.sign>0?'＋':'－'}</td>
      ${het?`<td style="text-align:center;font-weight:700;color:var(--grn2)">${s.gLabel}</td>`:''}
      <td class="v">${f(s.v)}</td><td class="v">${nL(s.xi)}</td><td class="v">${nL(s.yi)}</td><td class="v">${nL(s.zi)}</td>
      <td class="v">${f(s.vx)}</td><td class="v">${f(s.vy)}</td><td class="v">${f(s.vz)}</td>
      ${het?`<td class="v">${f(s.wx)}</td><td class="v">${f(s.wy)}</td><td class="v">${f(s.wz)}</td>`:''}</tr>`;
  });
  html += `<tr class="fila-total"><td colspan="${het?4:3}">Σ (Total)</td><td class="v">${f(res.V)}</td><td>—</td><td>—</td><td>—</td>
      <td class="v">${f(res.Qx)}</td><td class="v">${f(res.Qy)}</td><td class="v">${f(res.Qz)}</td>
      ${het?`<td class="v">${f(res.Wx)}</td><td class="v">${f(res.Wy)}</td><td class="v">${f(res.Wz)}</td>`:''}</tr></tbody></table></div></div>`;

  const coc = (n, num, den, val) => kx(`\\bar{${n}} = \\dfrac{\\sum V_{i}\\tilde{${n}}_{i}}{\\sum V_{i}} = \\dfrac{${ftex(num)}}{${ftex(den)}} = ${kres(ftex(val)+'\\,'+utex(u1))}`);
  const cocW = (n, num, den, val) => kx(`${n}_{G} = \\dfrac{\\sum ${Wsim}_{i}\\tilde{${n}}_{i}}{\\sum ${Wsim}_{i}} = \\dfrac{${ftex(num)}}{${ftex(den)}} = ${kres(ftex(val)+'\\,'+utex(u1))}`);
  html += `<div class="res-section"><div class="res-section-title"><div class="num">3</div>${het?'Centroide, centro de gravedad y volumen':'Centroide y volumen del cuerpo'}</div>
    <div class="proc-block proc-cols">
      <div class="proc-col"><div class="proc-sub">Volumen total</div>
        <div class="eq-row"><div class="eq-body">${kx(`V = \\sum V_{i} = ${ftex(res.V)}\\,${utex(u3)}`)}</div></div></div>
      <div class="proc-col"><div class="proc-sub">Coordenadas del centroide C</div>
        <div class="eq-row"><div class="eq-body">${coc('x', res.Qx, res.V, res.xbar)}</div></div>
        <div class="eq-row"><div class="eq-body">${coc('y', res.Qy, res.V, res.ybar)}</div></div>
        <div class="eq-row"><div class="eq-body">${coc('z', res.Qz, res.V, res.zbar)}</div></div></div>`;
  if(het){
    html += `<div class="proc-col"><div class="proc-sub">Coordenadas del centro de gravedad G</div>
        <div class="eq-row"><div class="eq-body">${kx(`\\sum ${Wsim}_{i} = \\sum ${simb}_{i}V_{i} = ${kres(ftex(res.W))}`)}</div></div>
        <div class="eq-row"><div class="eq-body">${cocW('x', res.Wx, res.W, res.xg)}</div></div>
        <div class="eq-row"><div class="eq-body">${cocW('y', res.Wy, res.W, res.yg)}</div></div>
        <div class="eq-row"><div class="eq-body">${cocW('z', res.Wz, res.W, res.zg)}</div></div></div>`;
  }
  html += `</div><div class="summary-grid">
      <div class="summary-box"><div class="s-lbl">Volumen total V</div><div class="s-val">${f(res.V)}</div><div class="s-unit">${u3}</div></div>
      <div class="summary-box highlight"><div class="s-lbl">x̄</div><div class="s-val">${nL(res.xbar)}</div><div class="s-unit">${u1}</div></div>
      <div class="summary-box highlight"><div class="s-lbl">ȳ</div><div class="s-val">${nL(res.ybar)}</div><div class="s-unit">${u1}</div></div>
      <div class="summary-box highlight"><div class="s-lbl">z̄</div><div class="s-val">${nL(res.zbar)}</div><div class="s-unit">${u1}</div></div>
    </div>`;
  if(het){
    html += `<div class="summary-grid">
      <div class="summary-box highlight" style="border-color:#c0392b"><div class="s-lbl">x_G</div><div class="s-val">${nL(res.xg)}</div><div class="s-unit">${u1}</div></div>
      <div class="summary-box highlight" style="border-color:#c0392b"><div class="s-lbl">y_G</div><div class="s-val">${nL(res.yg)}</div><div class="s-unit">${u1}</div></div>
      <div class="summary-box highlight" style="border-color:#c0392b"><div class="s-lbl">z_G</div><div class="s-val">${nL(res.zg)}</div><div class="s-unit">${u1}</div></div>
      <div class="summary-box" style="border-color:#c0392b"><div class="s-lbl">Separación C–G</div><div class="s-val">${nL(res.sep)}</div><div class="s-unit">${u1}</div></div>
    </div>`;
  }
  html += `<div class="proc-block" style="border-left:3px solid ${het?'#c0392b':'var(--grn)'};padding-left:12px;margin-top:10px;">
      <div style="font-size:11.5px;line-height:1.65;color:var(--muted)">${het
        ? `Cuerpo <b style="color:#c0392b">heterogéneo</b>: el centro de gravedad G queda a ${nL(res.sep)} ${u1} del centroide C, desplazado hacia el material más pesado.`
        : `Cuerpo <b style="color:var(--grn2)">homogéneo</b>: el peso específico se cancela en el cociente, así que el centroide, el centro de masa y el centro de gravedad son el mismo punto.`}</div></div></div>`;

  // Pappus–Guldinus: solo cuando todo es de revolución sobre el mismo eje.
  const pap = (typeof datosPappus === 'function') ? datosPappus() : null;
  let numSec = 4;
  if(pap){
    html += `<div class="res-section"><div class="res-section-title"><div class="num">${numSec++}</div>Comprobación — Pappus y Guldinus</div>
      <div style="font-size:11.5px;line-height:1.6;color:var(--muted);margin-bottom:8px;">Todos los sólidos son de revolución alrededor del mismo eje vertical, así que cada volumen es el de girar 360° su media sección (área generatriz <i>A<sub>i</sub></i>) alrededor del eje: ${kx('V_i = 2\\pi\\,\\bar{r}_i\\,A_i')}, con <i>r̄<sub>i</sub></i> la distancia del centroide de esa área al eje.</div>
      <div style="overflow-x:auto;"><table class="tabla-res"><thead><tr><th>N°</th><th>Sólido</th><th>A<sub>i</sub><br><span>(${unit}²)</span></th><th>r̄<sub>i</sub><br><span>(${u1})</span></th><th>2π r̄<sub>i</sub> A<sub>i</sub><br><span>(${u3})</span></th><th>V<sub>i</sub> de la tabla<br><span>(${u3})</span></th></tr></thead><tbody>`;
    pap.filas.forEach((r,i)=>{ html += `<tr><td>${i+1}</td><td>${esc(r.nombre)}</td><td class="v">${f(r.A)}</td><td class="v">${nL(r.r)}</td><td class="v">${f(r.Vp)}</td><td class="v">${f(r.V)}</td></tr>`; });
    html += `<tr class="fila-total"><td colspan="4">Σ (Total)</td><td class="v">${f(pap.Vp)}</td><td class="v">${f(res.V)}</td></tr></tbody></table></div>
      <div style="font-size:11px;color:var(--grn2);font-weight:700;margin-top:6px;">${pap.ok ? '✓ Coincide con la tabla de volúmenes.' : '⚠ No coincide: revisar.'}</div></div>`;
  }

  html += `<div class="res-section"><div class="res-section-title"><div class="num">${numSec++}</div>Cuerpo resuelto — ubicación de ${het?'C y G':'C'} en planta y alzado</div>
    <canvas id="finalCanvas" style="width:100%;max-width:860px;height:400px;display:block;margin:0 auto;border-radius:10px;border:1px solid var(--border);background:#fff;"></canvas>
    <div style="font-size:10px;color:var(--muted);margin-top:6px;"><b style="color:#b8860c">C</b> = centroide del volumen${het?` &nbsp;·&nbsp; <b style="color:#c0392b">G</b> = centro de gravedad`:''}. En la planta se lee (x̄, ȳ); en el alzado, (x̄, z̄).</div></div>`;

  html += `<div class="res-section"><div class="res-section-title"><div class="num">${numSec++}</div>Vista isométrica</div>
    <canvas id="isoCanvas" style="width:100%;max-width:860px;height:380px;display:block;margin:0 auto;border-radius:10px;border:1px solid var(--border);background:#fff;"></canvas>
    <div style="font-size:10px;color:var(--muted);margin-top:6px;">Croquis de solo lectura: cada sólido con su silueta y su número; <b style="color:#b8860c">C</b> marcado con sus tres coordenadas. Los huecos van a trazos.</div></div>`;

  const cont = document.getElementById('resultsPanel');
  if(cont) cont.innerHTML = html;
  try{ if(cont) renderKatex(cont); }catch(e){ console.warn('KaTeX:', e); }
  setTimeout(()=>{ try{ drawVistas3dEn('compositeCanvas', {cotas:true, numerar:true}); }catch(e){}
                   try{ drawVistas3dEn('finalCanvas', {cotas:false, marcarG:true}); }catch(e){}
                   try{ if(typeof dibujarIsoEnCanvas === 'function') dibujarIsoEnCanvas('isoCanvas', {marcarC:true, numerar:true, ejes:true}); }catch(e){} }, 90);
}

// ══ Ejemplo 3D ═══════════════════════════════════════════════════════════════
// Placa base + cilindro + semiesfera encima, con un agujero cilíndrico que
// atraviesa el cilindro. Simétrico respecto de X e Y: x̄ = ȳ = 0 sirve de
// comprobación, y z̄ se obtiene con la tabla.
function loadExample3d(){
  resetAll();
  const base = (tipo, dims, x, y, zBase, signo) => {
    const def = SOLID_DEFS[tipo];
    return {tipo, dims, cx:x, cy:y, cz:zBase + def.cBase(dims), signo};
  };
  const DATOS = [
    base('s_prisma',    {a:160, b:160, h:20}, 0, 0, -20, +1),
    base('s_cilindro',  {r:50, h:100},        0, 0,   0, +1),
    base('s_semiesfera',{r:50},               0, 0, 100, +1),
    base('s_cilindro',  {r:20, h:100},        0, 0,   0, -1)
  ];
  figures = DATOS.map((d,i)=>({
    id: ++figIdCounter, type:d.tipo, dims:Object.assign({}, d.dims), cx:d.cx, cy:d.cy, cz:d.cz,
    rotation:0, volteado:false, sign:d.signo, color:COLORS[i % COLORS.length], anchor:'BM', activeAnchor:'BM',
    name:SOLID_DEFS[d.tipo].name, es3d:true,
    matId:(modoCuerpo==='heterogeneo' && MATS.length) ? MATS[0].id : null, thickness:1, angleMode:'semi'
  }));
  setUnit('mm'); colorIdx = figures.length % COLORS.length;
  renderFigList(); fitView(); calculate();
}
