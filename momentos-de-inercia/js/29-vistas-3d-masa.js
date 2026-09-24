// ════════════════════════════════════════════════════════
//  MODO 3D · INERCIA DE MASA — dos vistas ortogonales en el mismo lienzo
// ════════════════════════════════════════════════════════
// Planta (X–Y) a la izquierda y alzado (X–Z) a la derecha, como en el 3D de
// centroide. La GEOMETRÍA de las vistas, el dibujo, el ratón, la colocación,
// el bloque de giro y la isométrica son **el mismo código que centroide/js/21-**
// y se copiaron de allí: si tocas uno, mira el otro (§5.4 de CLAUDE.md). Lo
// propio de este tema es el final: la densidad por pieza, `calcularMasa3d` y
// los resultados, que hablan de masa y no de volumen.
//
// El cálculo vive en `28-inercia-de-masa.js` y los sólidos en
// `core/datos/solidos-3d.js`, que se comparten con centroide.


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
// bounds3 con el volteo aplicado mientras solo giren en planta (ahí la caja no
// cambia) y de `cajaRevolucionRotada` —que también es exacta— en cuanto están
// tumbados. rot0 la da en la postura propia de la pieza, sin ningún giro.
function bounds3Rel(fig, rot0){
  const def = SOLID_DEFS[fig.type];
  const f = rot0 ? Object.assign({}, fig, {rotation:0, rotXZ:0, rotYZ:0}) : fig;
  const V = verticesSolido(f);
  if(V){
    const b = {left:Infinity,right:-Infinity,back:Infinity,front:-Infinity,bottom:Infinity,top:-Infinity};
    V.forEach(q=>{ b.left=Math.min(b.left,q[0]); b.right=Math.max(b.right,q[0]); b.back=Math.min(b.back,q[1]);
      b.front=Math.max(b.front,q[1]); b.bottom=Math.min(b.bottom,q[2]); b.top=Math.max(b.top,q[2]); });
    return b;
  }
  if(giroFueraDePlanta(f)){
    const c = cajaRevolucionRotada(f);
    if(c) return c;
  }
  const b = def.bounds3(fig.dims);
  if(f.volteado) return {left:b.left, right:b.right, back:b.back, front:b.front, bottom:-b.top, top:-b.bottom};
  return b;
}
// Caja del sólido en el mundo, en las tres direcciones.
function bounds3Mundo(fig){
  const b = bounds3Rel(fig, false);
  return {x0:fig.cx+b.left, x1:fig.cx+b.right, y0:fig.cy+b.back, y1:fig.cy+b.front,
          z0:fig.cz+b.bottom, z1:fig.cz+b.top};
}

// ══ Espacio de trabajo ══════════════════════════════════════════════
// El botón de la barra muestra el modo ACTUAL y abre #menuEspacio, igual que
// en centroide. Aquí solo hay dos modos: sección plana (inercia de áreas) y
// cuerpo sólido (inercia de masa).
function setModoEspacio(m, opts){
  opts = opts || {};
  const cambia = (modoEspacio !== m);
  modoEspacio = m;
  const es3 = (m === '3d');
  const b = document.getElementById('btnEspacio');
  if(b){
    const sp = b.querySelector('span'); if(sp) sp.textContent = es3 ? '3D' : '2D';
    b.title = 'Espacio de trabajo: ' + (es3 ? 'cuerpo s\u00f3lido (3D), inercia de masa' : 'secci\u00f3n plana (2D), inercia de \u00e1reas') + '. Pulsa para cambiar.';
    b.classList.toggle('active', es3);
  }
  [['esp-2d','2d'], ['esp-3d','3d']].forEach(([id, v])=>{
    const e = document.getElementById(id);
    if(e) e.classList.toggle('active', m === v);
  });
  const mostrar = (id, si) => { const e = document.getElementById(id); if(e) e.style.display = si ? '' : 'none'; };
  mostrar('palGrid', !es3); mostrar('palGrid3d', es3);
  mostrar('posZField', es3); mostrar('rotField', !es3);
  if(!es3){
    const gb = document.getElementById('giro3dBox'); if(gb) gb.innerHTML = '';
    const db = document.getElementById('densidadBox'); if(db) db.innerHTML = '';
  }
  const head = document.querySelector('#menuFiguras .tb-menu-head');
  if(head) head.textContent = es3 ? 'Insertar s\u00f3lido' : 'Insertar figura';
  if(cambia && !opts.sinLimpiar){
    figures = []; selectedFigId = null; selectedFigType = null; selFiguras = [];
    colorIdx = 0; ghostPos = null;
    document.querySelectorAll('.fig-btn').forEach(x=>x.classList.remove('selected'));
    selectFigure(null); renderFigList();
    try{ actualizarInfoSel(); }catch(e){}
    invalidarResultados();
  }
  const hint = document.getElementById('canvasHint');
  if(hint) hint.textContent = es3
    ? 'Planta a la izquierda, alzado a la derecha. Elige un s\u00f3lido en Figuras y haz clic para colocarlo.'
    : 'Selecciona una figura del panel y haz clic para colocarla';
  if(canvas) canvas.style.cursor = (herramienta === 'pan') ? 'grab' : 'default';
  if(!opts.sinAjustar) fitView();
  render();
}
// El menú se coloca bajo la barra y alineado con su botón, igual que
// `abrirPaleta` (23-).
function menuEspacio(ev){
  const m = document.getElementById('menuEspacio');
  if(!m) return;
  const abre = !m.classList.contains('abierto');
  m.classList.toggle('abierto', abre);
  const btn = document.getElementById('btnEspacio');
  if(btn) btn.classList.toggle('active', abre || esModo3d());
  if(!abre) return;
  const tb = document.querySelector('.toolbar'); if(!tb) return;
  const rt = tb.getBoundingClientRect();
  const anc = (ev && ev.currentTarget) || document.getElementById('btnEspacio');
  const rb = anc ? anc.getBoundingClientRect() : rt;
  m.style.top  = (rt.bottom + 6) + 'px';
  m.style.left = Math.max(8, Math.min(rb.left, window.innerWidth - m.offsetWidth - 8)) + 'px';
}
function cerrarMenuEspacio(){
  const m = document.getElementById('menuEspacio');
  if(m) m.classList.remove('abierto');
  const b = document.getElementById('btnEspacio');
  if(b) b.classList.toggle('active', esModo3d());
}
document.addEventListener('click', ev=>{
  const m = document.getElementById('menuEspacio');
  if(!m || !m.classList.contains('abierto')) return;
  if(m.contains(ev.target)) return;
  const b = document.getElementById('btnEspacio');
  if(b && b.contains(ev.target)) return;
  cerrarMenuEspacio();
});
// Cambiar de espacio vacía el panel: una sección plana no es un cuerpo.
function elegirEspacio(m){
  cerrarMenuEspacio();
  if(m === modoEspacio) return;
  if(figures.length){
    const ok = confirm(m === '3d'
      ? 'Pasar a cuerpo s\u00f3lido (3D) vac\u00eda el panel: las figuras planas no se conservan.\n\u00bfContinuar?'
      : 'Volver a la secci\u00f3n plana (2D) vac\u00eda el panel: los s\u00f3lidos no se conservan.\n\u00bfContinuar?');
    if(!ok) return;
    try{ registrarCambio(); }catch(e){}
  }
  setModoEspacio(m);
}

// ══ Densidad de cada pieza ══════════════════════════════════════
// La inercia de masa necesita ρ, que el 2D no tenía. Cada pieza guarda su
// valor y su unidad, así que un cuerpo de acero con un disco de aluminio se
// monta sin más; un cuerpo de un solo material es el caso trivial.
// Se guarda LO QUE ESCRIBE EL ALUMNO (valor y unidad) y la conversión a las
// unidades de dibujo se hace al calcular, en un solo sitio: así cambiar la
// unidad de longitud no corrompe la densidad (el fallo que mordió en
// centroide el 2026-09-16).
const DENS_FAC = {'kg/m\u00b3':1, 'g/cm\u00b3':1000, 'lb/ft\u00b3':16.0185};   // a kg/m³
const DENS_POR_DEFECTO = 7850;                                     // acero, kg/m³
let densUnidad = 'kg/m\u00b3';
// ρ en kg por (unidad de dibujo)³, que es lo que consume el motor.
function rhoInterna(fig){
  const v = Number(fig && fig.rho);
  if(!isFinite(v) || v <= 0) return 0;
  const u = (fig.rhoU && DENS_FAC[fig.rhoU]) ? fig.rhoU : densUnidad;
  const met = (typeof LEN_FAC_I === 'object' && LEN_FAC_I[unit]) ? LEN_FAC_I[unit] : 1;
  return v * (DENS_FAC[u] || 1) * met * met * met;
}
function setDensidadFig(val){
  const fig = figures.find(f=>f.id===selectedFigId); if(!fig) return;
  const v = Number(val);
  if(!isFinite(v) || v <= 0){ aviso('La densidad tiene que ser un n\u00famero mayor que cero.', 'error'); pintarDensidad(fig); return; }
  if(v === fig.rho) return;
  registrarCambio();
  fig.rho = v; invalidarResultados(); renderFigList();
}
function setDensidadUnidadFig(u){
  const fig = figures.find(f=>f.id===selectedFigId); if(!fig || fig.rhoU === u) return;
  registrarCambio();
  fig.rhoU = u; invalidarResultados(); pintarDensidad(fig);
}
// La misma densidad para todas: lo normal en un cuerpo de un solo material.
function densidadATodas(){
  const fig = figures.find(f=>f.id===selectedFigId); if(!fig) return;
  registrarCambio();
  figures.forEach(f=>{ f.rho = fig.rho; f.rhoU = fig.rhoU; });
  invalidarResultados(); renderFigList();
  aviso('Densidad aplicada a las ' + figures.length + ' piezas.');
}
function pintarDensidad(fig){
  const box = document.getElementById('densidadBox');
  if(!box) return;
  if(!fig || !esModo3d()){ box.innerHTML = ''; return; }
  const u = fig.rhoU || densUnidad;
  const ops = Object.keys(DENS_FAC).map(k=>'<option value="'+k+'"'+(k===u?' selected':'')+'>'+k+'</option>').join('');
  box.innerHTML = '<div class="prop-sep"></div>'
    + '<div class="field"><label>Densidad <span style="color:var(--grn2);font-weight:800">(\u03c1)</span></label>'
    + '<div class="field-row">'
    + '<div class="field"><input type="number" id="densVal" value="' + fig.rho + '" step="any" min="0" onchange="setDensidadFig(this.value)"></div>'
    + '<div class="field"><select id="densUni" onchange="setDensidadUnidadFig(this.value)" style="width:100%;background:var(--bg);'
    + 'border:1px solid var(--border2);color:var(--text);padding:8px 9px;border-radius:7px;font-size:12px;font-family:inherit;">'
    + ops + '</select></div></div>'
    + '<button class="btn-sm" style="margin-top:6px;width:100%" onclick="densidadATodas()">Aplicar a todas las piezas</button>'
    + '<div style="font-size:9.5px;color:var(--muted);margin-top:5px;line-height:1.45;">La masa de la pieza es m = \u03c1V; un hueco la resta.</div>'
    + '</div>';
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
  // Rótulo centrado arriba de cada vista, pero sin meterse debajo de la columna
  // de control (izquierda, 96 px) ni de los botones del lienzo (arriba a la
  // derecha): el del alzado se montaba con ellos.
  const RESERVA_DER = 118, RESERVA_IZQ = 104;
  [g.planta, g.alzado].forEach(v=>{
    ctx.font = 'bold 11px Inter'; const w = ctx.measureText(v.rotulo).width + 16;
    let xr = (v.x0+v.x1)/2 - w/2;
    xr = Math.min(xr, W - w - RESERVA_DER);
    xr = Math.max(xr, RESERVA_IZQ);
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
    ghostPos = centroideDesdeClic3d(selectedFigType, puntoColocacion3d(v, w));
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
      updatePropPanel(); invalidarResultados(); render();
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
  if(selectedFigType){ const p = puntoColocacion3d(v, w); placeSolid(selectedFigType, p.x, p.y, p.z); return; }
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
        invalidarResultados(); renderFigList();
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
// El sólido cae con el CENTRO DE SU BASE (ancla BM) en el punto que se tocó,
// igual que una figura plana cae por su ancla (06-figure-management.js). Se
// toca en una de las dos vistas, así que solo llegan dos de las tres
// coordenadas: en planta, x e y, y la base se apoya en z = 0, que es como se
// dan los datos en los enunciados; en el alzado, x y z, con y = 0.
function puntoColocacion3d(vista, w){
  const t = 2/viewScale, q = v => Math.abs(v) < t ? 0 : v;
  return (vista && vista.id === 'planta') ? {x:q(w.x), y:q(w.v), z:0} : {x:q(w.x), y:0, z:q(w.v)};
}
// Centroide que corresponde a dejar el centro de la base en `p`. La figura
// fantasma se dibuja por su CENTROIDE (drawPlanta/drawAlzado son relativos a
// él), así que sin esto la vista previa y el sólido caerían en sitios
// distintos, que es lo que pasaba antes.
function centroideDesdeClic3d(type, p){
  const def = SOLID_DEFS[type]; if(!def) return {x:p.x, y:p.y, z:p.z};
  const off = solidAnchorOffsetFig({type, dims:getDefaultDims3d(type), rotation:0, rotXZ:0, rotYZ:0, volteado:false}, 'BM');
  return {x:p.x - off.dx, y:p.y - off.dy, z:p.z - off.dz};
}
function placeSolid(type, px, py, pz){
  const def = SOLID_DEFS[type]; if(!def) return;
  px = isFinite(px) ? px : 0; py = isFinite(py) ? py : 0; pz = isFinite(pz) ? pz : 0;
  registrarCambio();
  const id = ++figIdCounter, dims = getDefaultDims3d(type);
  const color = COLORS[colorIdx % COLORS.length]; colorIdx++;
  const fig = {id, type, dims, cx:0, cy:0, cz:0, rotation:0, rotXZ:0, rotYZ:0, volteado:false, sign:1, color,
               anchor:'BM', activeAnchor:'BM', name:def.name, es3d:true,
               rho:DENS_POR_DEFECTO, rhoU:densUnidad,
               thickness:1, angleMode:'semi'};
  const off0 = solidAnchorOffsetFig(fig, 'BM');
  fig.cx = px - off0.dx; fig.cy = py - off0.dy; fig.cz = pz - off0.dz;
  figures.push(fig);
  selectedFigType = null; ghostPos = null;
  document.querySelectorAll('.fig-btn').forEach(b=>b.classList.remove('selected'));
  canvas.style.cursor = 'grab';
  document.getElementById('canvasHint').textContent =
    def.name + ' colocado con el centro de su base en (' + r2(px) + ', ' + r2(py) + ', ' + r2(pz) + ') ' + unit
    + '. Arrástralo en la planta o en el alzado, o usa el panel.';
  selectFigure(id);
  invalidarResultados(); renderFigList(); render();
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
  invalidarResultados(); buildPropPanel3d(fig); render();
}
// Plano en el que se está girando la pieza. Es estado de la INTERFAZ (qué
// ángulo se edita), no del modelo: los tres ángulos conviven en la figura.
let planoGiro3d = 'xy';
function fijarPlanoGiro(id){
  if(!PLANOS_GIRO.some(p=>p.id === id)) return;
  planoGiro3d = id;
  const fig = figures.find(f=>f.id===selectedFigId);
  if(fig) buildPropPanel3d(fig);
}
// Ángulo escrito en el campo: se aplica al plano activo. Como el volteo y las
// medidas, deja el ancla activa donde está. El 0 es un valor válido; lo que no
// sea un número se rechaza y el campo repone lo que tenía la figura (§7).
function updateGiro3d(val){
  const fig = figures.find(f=>f.id===selectedFigId); if(!fig) return;
  const def = planoGiroDef(planoGiro3d), v = parseFloat(val);
  if(!isFinite(v)){ aviso('El ángulo de giro tiene que ser un número.', 'error'); updatePropPanel3d(); return; }
  // Lo que se escribe es el ángulo del EJE DE LA PIEZA; lo que se guarda, el
  // giro aplicado. La conversión va aquí, en el borde de la ventana.
  const giro = giroDesdePanel(v, def.id);
  if(Math.abs(giro - anguloPlano(fig, def.id)) < 1e-12) return;
  registrarCambio();
  recolocarPorAncla(fig, f=>{ f[def.prop] = giro; });
  invalidarResultados(); buildPropPanel3d(fig); render();
}
// ── La vista del plano de giro ────────────────────────────────────────────
// Debajo del selector de plano y del ángulo: enseña el plano en el que se está
// girando, con la PROYECCIÓN de la pieza sobre él —a trazos, dónde estaba sin
// girar; en sólido, dónde está ahora— y el arco del ángulo. Los ejes se
// dibujan EN EL PUNTO DE ANCLAJE, porque el giro se hace respecto de él
// (petición del profesor, 2026-09-23).
function vistaPlanoGiroSVG(fig, planoId){
  const def = SOLID_DEFS[fig.type];
  if(!def || typeof proyeccionSolido !== 'function') return '';
  const pl = planoGiroDef(planoId), ang = anguloPlano(fig, planoId);
  const ahora = proyeccionSolido(fig, planoId);
  if(!ahora) return '';
  // El ancla activa, proyectada en el mismo plano: es el centro del giro.
  const aAct = fig.activeAnchor || 'BM';
  const pr = q => planoId === 'xy' ? [q.dx, q.dy] : planoId === 'xz' ? [q.dx, q.dz] : [q.dz, q.dy];
  let A = [0,0];
  try{ A = pr(solidAnchorOffsetFig(fig, aAct)); }catch(e){}

  // ENCAJE (2026-09-24): todo lo que se va a dibujar —la silueta, el anclaje,
  // los dos lados del ángulo y el arco con su rótulo— se mide en unidades del
  // MUNDO y entra en la envolvente ANTES de calcular la escala. Antes el arco
  // y la línea del eje se dimensionaban en píxeles desde el anclaje, así que
  // en cuanto el ancla dejaba de estar en el centro se salían del recuadro.
  const W = 250, H = 164, M = 26;
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  const meter = p => { u0 = Math.min(u0,p[0]); u1 = Math.max(u1,p[0]);
                       v0 = Math.min(v0,p[1]); v1 = Math.max(v1,p[1]); };
  ahora.forEach(meter); meter(A);
  const aPanel = anguloPanel(fig, planoId), hayAng = Math.abs(aPanel) > 0.05;
  const tam = Math.max(u1-u0, v1-v0, 1e-9);
  const rad = tam*0.30, lado = tam*0.60;   // radio del arco y largo del lado
  if(hayAng){
    const a1 = aPanel*Math.PI/180;
    meter([A[0] + lado*Math.cos(a1), A[1] + lado*Math.sin(a1)]);
    meter([A[0] - lado*0.3*Math.cos(a1), A[1] - lado*0.3*Math.sin(a1)]);
    // El arco hay que MUESTREARLO: por dónde pasa depende del ángulo (uno de
    // 140° sale por arriba a la izquierda), y el radio de más deja sitio al
    // rótulo, que se escribe por fuera.
    const rr = rad*1.3, n = 24, paso = a1/n;
    for(let i = 0; i <= n; i++) meter([A[0] + rr*Math.cos(i*paso), A[1] + rr*Math.sin(i*paso)]);
  }
  const bw = Math.max(u1-u0, 1e-9), bh = Math.max(v1-v0, 1e-9);
  const s = Math.min((W-2*M)/bw, (H-2*M)/bh);
  const px = u => M + (u-u0)*s + ((W-2*M) - bw*s)/2;
  const py = v => H - M - (v-v0)*s - ((H-2*M) - bh*s)/2;
  const poli = pts => pts.map((q,i)=>(i?'L':'M') + _ffN(px(q[0])) + ',' + _ffN(py(q[1]))).join(' ') + 'Z';

  const O = {x:px(A[0]), y:py(A[1])};
  // Los ejes cruzan el recuadro entero: así se leen siempre, esté donde esté
  // el punto de anclaje, y no compiten con la silueta por el espacio.
  const bx0 = 8, bx1 = W - 8, by0 = 8, by1 = H - 8;
  let g = `<path d="${poli(ahora)}" fill="${FF_COL.relleno}" stroke="${FF_COL.linea}" stroke-width="1.6" `
     + `stroke-linejoin="round"/>`;
  // Ejes del plano EN EL PUNTO DE ANCLAJE: el de partida a la derecha y el
  // otro hacia arriba, que es como se mide el ángulo.
  const col = FF_COL.eje;
  g += `<line x1="${_ffN(bx0)}" y1="${_ffN(O.y)}" x2="${_ffN(bx1)}" y2="${_ffN(O.y)}" stroke="${col}" stroke-width="0.9"/>`
     + _ffPunta(bx1, O.y, 1, 0, col, 4.8)
     + `<line x1="${_ffN(O.x)}" y1="${_ffN(by1)}" x2="${_ffN(O.x)}" y2="${_ffN(by0)}" stroke="${col}" stroke-width="0.9"/>`
     + _ffPunta(O.x, by0, 0, -1, col, 4.8)
     + _ffTexto(bx1 - 2, O.y - 6, pl.desde, col, {anchor:'end', fs:11, recta:true})
     + _ffTexto(O.x + 6, by0 + 9, pl.hacia, col, {anchor:'start', fs:11, recta:true});
  // El ángulo, con sus dos lados: el eje de partida del plano —que ya está
  // dibujado, es el propio eje del recuadro— y, en línea de trazos, EL EJE DE
  // LA PIEZA, la línea que la parte por el medio, que es con quien se forma.
  // El valor es el mismo que dice el campo.
  if(hayAng){
    const a0 = 0, a1 = aPanel*Math.PI/180, L = lado*s, r = rad*s;
    g += `<line x1="${_ffN(O.x - L*0.3*Math.cos(a1))}" y1="${_ffN(O.y + L*0.3*Math.sin(a1))}" `
       + `x2="${_ffN(O.x + L*Math.cos(a1))}" y2="${_ffN(O.y - L*Math.sin(a1))}" `
       + `stroke="${FF_COL.cen}" stroke-width="1.1" stroke-dasharray="5,3"/>`
       + _ffCotaAngulo(O.x, O.y, r, Math.min(a0,a1), Math.max(a0,a1), r2(aPanel) + '°', FF_COL.cen);
  }
  // El punto de anclaje: es el centro del giro.
  const cAnc = (typeof colorAncla === 'function') ? colorAncla(aAct) : FF_COL.cen;
  g += `<circle cx="${_ffN(O.x)}" cy="${_ffN(O.y)}" r="6.4" fill="${cAnc}" opacity=".22"/>`
     + `<circle cx="${_ffN(O.x)}" cy="${_ffN(O.y)}" r="3.6" fill="${cAnc}" stroke="#fff" stroke-width="1.2"/>`;
  return `<svg viewBox="0 0 ${W} ${H}" class="ref-fig-svg" role="img" `
       + `aria-label="Plano ${pl.label}: la pieza proyectada y el ángulo girado alrededor del punto de anclaje">${g}</svg>`;
}
// El bloque completo: plano, ángulo y vista, para el final del panel.
function bloqueGiro3dHTML(fig){
  const def = SOLID_DEFS[fig.type];
  if(!def || fig.type === 's_esfera') return '';        // la esfera se ve igual
  const pl = planoGiroDef(planoGiro3d);
  const botones = PLANOS_GIRO.map(q=>'<button class="anchor-btn' + (q.id === pl.id ? ' active' : '')
      + '" onclick="fijarPlanoGiro(&#39;' + q.id + '&#39;)">' + q.label + '</button>').join('');
  const vista = vistaPlanoGiroSVG(fig, pl.id);
  return '<div class="prop-sep"></div>'
    + '<div class="field"><label>Girar en el plano</label><div class="anchor-row">' + botones + '</div></div>'
    + '<div class="field"><label>Ángulo en ' + pl.label
    + ' <span style="color:var(--grn2);font-weight:800">(°)</span></label>'
    + '<input type="number" id="giro3d" step="any" value="' + r2(anguloPanel(fig, pl.id)) + '" '
    + 'onchange="updateGiro3d(this.value)">'
    + '<div style="font-size:9.5px;color:var(--muted);margin-top:5px;line-height:1.45;">'
    + 'Ángulo que forma ' + pl.que + ' con ' + pl.desde + ', hacia ' + pl.hacia + ' (antihorario, giro '
    + 'alrededor del eje ' + pl.eje + ').' + (pl.base ? ' Sin girar vale ' + pl.base + '°.' : '')
    + '</div></div>'
    + (vista ? '<div class="ref-fig-box"><div class="ref-fig-title">Plano ' + pl.label
             + ' — giro respecto al punto de anclaje</div>' + vista + '</div>' : '');
}

// Isométrica de referencia: la pieza SIN girar, apoyada por el centro de su
// base en el origen y con los ejes X, Y, Z. Es la postura desde la que se mide
// cualquier giro, así que el alumno ve contra qué está girando.
function svgIsoReferencia(fig, opts){
  opts = opts || {};
  if(typeof escenaIso !== 'function') return '';
  const base = Object.assign({}, fig, {rotation:0, rotXZ:0, rotYZ:0, volteado:false, cx:0, cy:0, cz:0});
  const off = solidAnchorOffsetFig(base, 'BM');
  base.cx = -off.dx; base.cy = -off.dy; base.cz = -off.dz;
  let E;
  try{ E = escenaIso({figs:[base]}); }catch(e){ return ''; }
  // Los ejes se dibujan aquí y no con `escenaIso({ejes:true})`: allí miden un
  // cuarto del cuerpo y se pierden dentro de la pieza. Aquí salen del centro
  // de la base, sobresalen de ella y llevan su letra fuera.
  const b3 = bounds3Rel(base, true);
  const L = 0.85*Math.max(b3.right-b3.left, b3.front-b3.back, b3.top-b3.bottom, 1e-9);
  const eq = [['X',[L,0,0]], ['Y',[0,L,0]], ['Z',[0,0,L]]].map(([n,q])=>{
    const w = isoProy(q[0], q[1], q[2]); return {n, u:w.u, v:w.v};
  });
  const O = isoProy(0, 0, 0);
  let u0 = Math.min(E.u0, O.u), u1 = Math.max(E.u1, O.u), v0 = Math.min(E.v0, O.v), v1 = Math.max(E.v1, O.v);
  eq.forEach(e=>{ u0 = Math.min(u0, e.u); u1 = Math.max(u1, e.u); v0 = Math.min(v0, e.v); v1 = Math.max(v1, e.v); });
  const W = 190, H = 158, M = 22;
  const bw = Math.max(u1-u0,1e-9), bh = Math.max(v1-v0,1e-9);
  const s = Math.min((W-2*M)/bw, (H-2*M)/bh);
  const dx = (W - bw*s)/2, dy = (H - bh*s)/2;
  const tu = u => (dx + (u-u0)*s).toFixed(1), tv = v => (H - dy - (v-v0)*s).toFixed(1);
  const poli = pts => pts.map((q,i)=>(i?'L':'M') + tu(q[0]) + ',' + tv(q[1])).join(' ');
  const col = fig.color || '#14766d';
  let g = '';
  E.items.forEach(it=>{
    g += `<path d="${poli(it.hull)}Z" fill="${col}" fill-opacity=".18" stroke="${col}" stroke-width="1.3"/>`;
    (it.anillos||[]).forEach(r=>{ g += `<path d="${poli(r)}" fill="none" stroke="${col}" stroke-width=".6" opacity=".4"/>`; });
    (it.aristas||[]).forEach(a=>{ g += `<line x1="${tu(a[0][0])}" y1="${tv(a[0][1])}" x2="${tu(a[1][0])}" y2="${tv(a[1][1])}" stroke="${col}" stroke-width=".7" opacity=".45"/>`; });
  });
  g += `<defs><marker id="pfEje" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">`
     + `<path d="M0,0 L6,3 L0,6 Z" fill="#0d3a8f"/></marker></defs>`;
  eq.forEach(e=>{
    g += `<line x1="${tu(O.u)}" y1="${tv(O.v)}" x2="${tu(e.u)}" y2="${tv(e.v)}" stroke="#0d3a8f" stroke-width="1.2" marker-end="url(#pfEje)"/>`
       + `<text x="${tu(e.u)}" y="${tv(e.v)}" dx="4" dy="-3" font-size="10" font-weight="800" fill="#0d3a8f">${e.n}</text>`;
  });
  // Puntos de anclaje, con su color y el activo resaltado: así se ve en la
  // isométrica dónde cae el punto por el que se coloca la pieza, igual que en
  // las dos vistas planas (2026-09-23).
  if(opts.anclas !== false && typeof colorAncla === 'function'){
    (SOLID_ANCHORS || []).forEach(a=>{
      let q; try{ q = solidAnchorOffsetFig(base, a); }catch(e){ return; }
      const w = isoProy(base.cx + q.dx, base.cy + q.dy, base.cz + q.dz);
      const ax = tu(w.u), ay = tv(w.v), col = colorAncla(a);
      if(a === opts.activa)
        g += `<circle cx="${ax}" cy="${ay}" r="6.6" fill="${col}" opacity=".22"/>`
           + `<circle cx="${ax}" cy="${ay}" r="3.7" fill="${col}" stroke="#fff" stroke-width="1.2"/>`;
      else
        g += `<circle cx="${ax}" cy="${ay}" r="2.6" fill="${col}" stroke="#fff" stroke-width="0.9"/>`;
    });
  }
  g += `<circle cx="${tu(O.u)}" cy="${tv(O.v)}" r="2.4" fill="#0d3a8f"/>`
     + `<text x="${tu(O.u)}" y="${tv(O.v)}" dx="-9" dy="11" font-size="9" font-weight="700" fill="#0d3a8f">O</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" class="ref-fig-svg" role="img" `
       + `aria-label="Vista isométrica de la pieza sin girar, con los ejes y los puntos de anclaje">${g}</svg>`;
}

// ══ Panel de propiedades de un sólido ══════════════════════════════
// Mismo cuerpo que el de centroide salvo el bloque de material, que aquí es
// la densidad y va en #densidadBox (§5.4: al tocar uno, mira el otro).
function buildPropPanel3d(fig){
  const def = SOLID_DEFS[fig.type];
  document.getElementById('propTitle').textContent = fig.name
    + (giroFueraDePlanta(fig) ? ' (girado)' : '') + (fig.volteado ? ' (volteado)' : '');
  document.getElementById('signPos').classList.toggle('active', fig.sign===1);
  document.getElementById('signNeg').classList.toggle('active', fig.sign===-1);
  const df = document.getElementById('dimFields');
  const anclaAct = fig.activeAnchor || 'BM';
  const ficha = (typeof fichaSolidoSVG === 'function') ? fichaSolidoSVG(fig.type, {activa:anclaAct}) : '';
  const infoS = (typeof formulasSolidoHTML === 'function') ? formulasSolidoHTML(fig.type) : '';
  if(ficha){
    df.innerHTML = '<div class="ref-fig-box">'
      + (infoS ? '<button type="button" class="ref-fig-info" onclick="alternarInfoFigura(this)"'
               + ' title="F\u00f3rmulas del s\u00f3lido" aria-label="F\u00f3rmulas del s\u00f3lido">i</button>' : '')
      + '<div class="ref-fig-title">' + (def.name || '') + ' \u2014 sin girar</div>'
      + ficha
      + (typeof leyendaAnclasHTML === 'function' ? leyendaAnclasHTML() : '')
      + (infoS ? '<div class="ref-fig-pop" hidden>' + infoS + '</div>' : '')
      + '</div>';
  } else {
    df.innerHTML = '';
  }
  if(fig.type !== 's_esfera'){
    const vb = document.createElement('div'); vb.className = 'field';
    vb.innerHTML = '<label>Orientaci\u00f3n</label><div class="anchor-row">'
      + '<button class="anchor-btn' + (fig.volteado ? '' : ' active') + '" onclick="if(figures.find(f=>f.id===selectedFigId).volteado) alternarVolteo()">Base abajo</button>'
      + '<button class="anchor-btn' + (fig.volteado ? ' active' : '') + '" onclick="if(!figures.find(f=>f.id===selectedFigId).volteado) alternarVolteo()">Base arriba (volteado)</button></div>';
    df.appendChild(vb);
  }
  const rf = document.getElementById('rotField');
  if(rf) rf.style.display = 'none';
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
    const col = (typeof colorAncla === 'function') ? colorAncla(a) : null;
    btn.innerHTML = (col ? '<span class="anc-dot" style="background:' + col + '"></span>' : '')
                  + SOLID_ANCHOR_LABELS[a];
    btn.onclick = ()=>{ fig.activeAnchor = a; fig.anchor = a; buildPropPanel3d(fig); render(); };
    ab.appendChild(btn);
  });
  const pl = document.getElementById('posLabel');
  if(pl) pl.textContent = 'Posici\u00f3n: ' + SOLID_ANCHOR_LABELS[fig.activeAnchor||'BM'] + ' (x, y, z)';
  pintarDensidad(fig);
  const gb = document.getElementById('giro3dBox');
  if(gb) gb.innerHTML = bloqueGiro3dHTML(fig);
}

// Al cambiar una dimensión, el ancla activa se queda donde estaba (es lo que
// el alumno fijó) y el centroide se recoloca respecto de ella.
function updateDim3d(dimId, val){
  const fig = figures.find(f=>f.id===selectedFigId); if(!fig) return;
  registrarCambio();
  recolocarPorAncla(fig, f=>{ f.dims[dimId] = parseFloat(val)||0; });
  updatePropPanel3d(); invalidarResultados(); render();
}
// Posición del ancla y giro escritos en el panel: el ancla se queda donde
// dice el alumno y el centroide se recoloca con el giro nuevo.
function updateFigFromProp3d(){
  const fig = figures.find(f=>f.id===selectedFigId); if(!fig) return;
  registrarCambio();
  const num = id => { const e = document.getElementById(id); const n = parseFloat(e && e.value); return isFinite(n) ? n : 0; };
  const off = solidAnchorOffsetFig(fig, fig.activeAnchor||'BM');
  fig.cx = num('posX') - off.dx; fig.cy = num('posY') - off.dy; fig.cz = num('posZ') - off.dz;
  invalidarResultados(); render();
}
function updatePropPanel3d(){
  const fig = figures.find(f=>f.id===selectedFigId); if(!fig) return;
  const a = anclaSolido(fig);
  const set = (id, v) => { const e = document.getElementById(id); if(e) e.value = r2(v); };
  set('posX', a.x); set('posY', a.y); set('posZ', a.z);
  set('giro3d', anguloPanel(fig, planoGiro3d));
}
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
// vistaId: 'planta' (x, y) o 'alzado' (x, z). El volteo solo cambia el alzado,
// igual que en trazarSolido: en planta el sólido se ve igual del derecho que
// del revés.
function _ordenesVistaPropia(fig, vistaId){
  const def = SOLID_DEFS[fig.type], cmds = [];
  const pol = contornoSolido(fig, vistaId, {rot0:true});
  if(pol){ pol.forEach((q,i)=>cmds.push([i?'L':'M', q[0], q[1]])); cmds.push(['Z']); return cmds; }
  const sz = (fig.volteado && vistaId !== 'planta') ? -1 : 1;
  const fake = { moveTo:(x,y)=>cmds.push(['M',x,y*sz]), lineTo:(x,y)=>cmds.push(['L',x,y*sz]),
    closePath:()=>cmds.push(['Z']), rect:(x,y,w,h)=>{ cmds.push(['M',x,y*sz],['L',x+w,y*sz],['L',x+w,(y+h)*sz],['L',x,(y+h)*sz],['Z']); },
    arc:(cx,cy,r,a0,a1,acw)=>{ const n=28; let d=a1-a0; if(acw && d>0) d-=2*Math.PI; if(!acw && d<0) d+=2*Math.PI;
      for(let i=0;i<=n;i++){ const a=a0+d*(i/n); cmds.push([i===0&&!cmds.length?'M':'L', cx+r*Math.cos(a), (cy+r*Math.sin(a))*sz]); } },
    quadraticCurveTo:(qx,qy,x,y)=>{ const p0=cmds[cmds.length-1]; const x0=p0?p0[1]:0, y0=p0?p0[2]*sz:0; const n=20;
      for(let i=1;i<=n;i++){ const t=i/n, u=1-t; cmds.push(['L', u*u*x0+2*u*t*qx+t*t*x, (u*u*y0+2*u*t*qy+t*t*y)*sz]); } },
    ellipse:(cx,cy,rx,ry,rot,a0,a1,acw)=>{ const n=36; let d=a1-a0;
      if(acw && d>0) d-=2*Math.PI; if(!acw && d<0) d+=2*Math.PI;
      const cr=Math.cos(rot||0), sr=Math.sin(rot||0);
      for(let i=0;i<=n;i++){ const a=a0+d*(i/n), ex=rx*Math.cos(a), ey=ry*Math.sin(a);
        cmds.push([i===0&&!cmds.length?'M':'L', cx+ex*cr-ey*sr, (cy+ex*sr+ey*cr)*sz]); } },
    beginPath:()=>{} };
  try{ (vistaId === 'planta' ? def.drawPlanta : def.drawAlzado)(fake, fig.dims); }catch(e){}
  return cmds;
}
// Los giros de una pieza, en una línea: «X–Y: 30° · X–Z: 90°». Vacío si no
// gira. En un sólido de revolución el giro en planta no se ve, pero se dice
// igual, porque está en el modelo y en el archivo.
function textoGiros3d(fig){
  const t = PLANOS_GIRO.filter(p=>Math.abs(anguloPlano(fig, p.id)) > 1e-9)
    .map(p=>p.label + ': ' + r2(anguloPlano(fig, p.id)) + '°');
  return t.length ? ' · ' + t.join(' · ') : '';
}
function croquisSolido(fig, idx){
  const def = SOLID_DEFS[fig.type]; if(!def) return '';
  const b = bounds3Rel(fig, true);
  const W=170, H=140, M=26;
  const col = fig.color || '#14766d', neg = fig.sign < 0;

  // Una vista ortogonal ACOTADA: 'planta' se lee en (x, y) y 'alzado' en (x, z).
  const vista = vistaId => {
    const cmds = _ordenesVistaPropia(fig, vistaId);
    const esPl = vistaId === 'planta';
    const h0 = esPl ? b.back : b.bottom, h1 = esPl ? b.front : b.top;
    const bw = Math.max(b.right-b.left,1e-9), bh = Math.max(h1-h0,1e-9);
    const s = Math.min((W-2*M)/bw, (H-2*M)/bh);
    const px = x => M + (x-b.left)*s, py = v => H-M - (v-h0)*s;
    let path = '';
    cmds.forEach(c=>{ path += c[0]==='Z' ? 'Z' : (c[0] + px(c[1]).toFixed(1) + ',' + py(c[2]).toFixed(1) + ' '); });
    const gx = px(0), gy = py(0);
    // Solo el alzado acota la altura del centroide sobre la base: en planta esa
    // distancia no se ve.
    let extra = '';
    if(!esPl){
      const vb = fig.volteado ? h1 : h0, xa = px(b.left)-9, ym = (py(vb)+gy)/2;
      extra = `<line x1="${xa}" y1="${py(vb)}" x2="${xa}" y2="${gy}" stroke="#e2aa1b" stroke-width="1"/>`
            + `<text x="${xa-3}" y="${ym}" font-size="8" fill="#b8860c" text-anchor="middle" transform="rotate(-90 ${xa-3} ${ym})">${decFix(def.cBase(fig.dims),'len')}</text>`;
    }
    return `<svg viewBox="0 0 ${W} ${H}" class="croq-svg">
      <path d="${path}" fill="${col}" fill-opacity="${neg?0.10:0.22}" stroke="${col}" stroke-width="1.5" stroke-dasharray="${neg?'4 3':'0'}"/>
      <line x1="${gx}" y1="${py(h0)}" x2="${gx}" y2="${py(h1)}" stroke="${col}" stroke-width=".8" stroke-dasharray="3 2" opacity=".5"/>
      <line x1="${px(b.left)}" y1="${gy}" x2="${px(b.right)}" y2="${gy}" stroke="${col}" stroke-width=".8" stroke-dasharray="3 2" opacity=".5"/>
      <circle cx="${gx}" cy="${gy}" r="3.2" fill="#e2aa1b" stroke="#fff" stroke-width="1"/>${extra}
      <line x1="${px(b.left)}" y1="${H-13}" x2="${px(b.right)}" y2="${H-13}" stroke="#64748b" stroke-width=".9"/>
      <text x="${(px(b.left)+px(b.right))/2}" y="${H-4}" font-size="8" fill="#475569" text-anchor="middle">${decFix(bw,'len')}</text>
      <line x1="${W-12}" y1="${py(h0)}" x2="${W-12}" y2="${py(h1)}" stroke="#64748b" stroke-width=".9"/>
      <text x="${W-5}" y="${(py(h0)+py(h1))/2}" font-size="8" fill="#475569" text-anchor="middle" transform="rotate(-90 ${W-5} ${(py(h0)+py(h1))/2})">${decFix(bh,'len')}</text>
    </svg>`;
  };

  // La isométrica NO se acota: está para ver la forma de la pieza, y las cotas
  // ya las dan los dos planos. Se arma con la pieza sola, centrada en su
  // centroide y sin girar (el giro va escrito en la cabecera).
  const iso = () => {
    if(typeof escenaIso !== 'function') return '';
    let E;
    try{ E = escenaIso({figs:[Object.assign({}, fig, {cx:0, cy:0, cz:0, rotation:0, rotXZ:0, rotYZ:0})]}); }catch(e){ return ''; }
    const bw = Math.max(E.u1-E.u0,1e-9), bh = Math.max(E.v1-E.v0,1e-9);
    const s = Math.min((W-2*M)/bw, (H-2*M)/bh);
    const tu = u => (M + (u-E.u0)*s).toFixed(1), tv = v => (H-M - (v-E.v0)*s).toFixed(1);
    const poli = pts => pts.map((q,i)=>(i?'L':'M') + tu(q[0]) + ',' + tv(q[1])).join(' ');
    let g = '';
    E.items.forEach(it=>{
      g += `<path d="${poli(it.hull)}Z" fill="${col}" fill-opacity="${neg?0.10:0.22}" stroke="${col}" stroke-width="1.5" stroke-dasharray="${neg?'4 3':'0'}"/>`;
      (it.anillos||[]).forEach(r=>{ g += `<path d="${poli(r)}" fill="none" stroke="${col}" stroke-width=".6" opacity=".45"/>`; });
      (it.aristas||[]).forEach(a=>{ g += `<line x1="${tu(a[0][0])}" y1="${tv(a[0][1])}" x2="${tu(a[1][0])}" y2="${tv(a[1][1])}" stroke="${col}" stroke-width=".7" opacity=".5"/>`; });
      g += `<circle cx="${tu(it.c.u)}" cy="${tv(it.c.v)}" r="3.2" fill="#e2aa1b" stroke="#fff" stroke-width="1"/>`;
    });
    return `<svg viewBox="0 0 ${W} ${H}" class="croq-svg">${g}</svg>`;
  };

  const cel = (t, svg) => `<div style="flex:1 1 0;min-width:0;text-align:center">
        <div style="font-size:9.5px;font-weight:700;color:var(--grn2);margin-bottom:1px">${t}</div>${svg}</div>`;

  return `
  <div class="croq">
    <div class="croq-h"><span class="croq-n">${idx+1}</span>
      <span class="croq-t">${esc(fig.etiqueta||fig.name||def.name)}${neg?' <i>(hueco)</i>':''}${fig.volteado?' · volteado':''}${textoGiros3d(fig)}</span></div>
    <div style="display:flex;gap:4px;align-items:flex-start">
      ${cel('Planta (X–Y)', vista('planta'))}
      ${cel('Alzado (X–Z)', vista('alzado'))}
      ${cel('Isométrica', iso())}
    </div>
    <div class="croq-d"><span>x̃ = ${decFix(fig.cx,'len')}</span><span>ỹ = ${decFix(fig.cy,'len')}</span><span>z̃ = ${decFix(fig.cz,'len')} ${unit}</span></div>
  </div>`;
}

// ══ Cálculo ═══════════════════════════════════════════════════════════════
// Todo el trabajo lo hace `inerciaDeMasa` (28-). Aquí solo se reúnen las
// piezas con su densidad y se pasa el resultado a las unidades en las que se
// dice una inercia de masa: kg·m².
//
// El motor trabaja en las unidades de dibujo (kg por unidad³ de densidad, y
// kg·unidad² de inercia), y la conversión a metros se hace UNA vez, al final:
// así cambiar la unidad de longitud no obliga a tocar el motor.
function calcularMasa3d(){
  if(!figures.length){ aviso('Agrega al menos un sólido.'); return; }
  const sinRho = figures.filter(f=>!(rhoInterna(f) > 0));
  if(sinRho.length){
    aviso('Falta la densidad en ' + sinRho.length + (sinRho.length===1 ? ' pieza.' : ' piezas.'), 'error');
    return;
  }
  const piezas = figures.map(f=>({fig:f, rho:rhoInterna(f), signo:f.sign === -1 ? -1 : 1}));
  const R = inerciaDeMasa(piezas);
  if(!R){ aviso('No se pudo calcular el cuerpo.', 'error'); return; }
  if(!(R.m > 0)){ aviso('La masa total no es positiva: los huecos se comen el cuerpo.', 'error'); return; }
  // kg·unidad² → kg·m². Las longitudes se siguen dando en la unidad de dibujo.
  const met = (typeof LEN_FAC_I === 'object' && LEN_FAC_I[unit]) ? LEN_FAC_I[unit] : 1;
  R.met = met; R.aSI = met*met;
  results = R;
  renderResults3dMasa(R);
}

// ══ Resultados en pantalla ════════════════════════════════════════════════
// Ecuación con números y resultado, más las tablas: las explicaciones van al
// informe (§7 de CLAUDE.md).
function renderResults3dMasa(res){
  const rp = document.getElementById('resultsPanel'); if(rp) rp.style.display = 'block';
  const hint = document.getElementById('noResultsHint'); if(hint) hint.style.display = 'none';
  const ra = document.getElementById('resultsArea'); if(ra) ra.style.display = 'block';
  setTimeout(()=>{ ra && ra.scrollIntoView({behavior:'smooth', block:'start'}); }, 150);

  const f = v => fmtVal(v), nL = v => decFix(v,'len');
  const uL = unit, u3 = unit + '³';
  const kI = res.aSI;                       // kg·unidad² → kg·m²
  const I = v => fmtVal(v*kI);              // una inercia, ya en kg·m²
  const cero = v => Math.abs(v) < 1e-12 ? 0 : v;
  let html = '';

  // ── Las dos vistas ──
  html += `<div class="res-section">
    <div class="res-section-title"><div class="num" style="background:var(--grn)">✎</div>El cuerpo</div>
    <canvas id="cv3dRes" style="width:100%;max-width:760px;height:300px;display:block;margin:0 auto"></canvas>
  </div>`;

  // ── Tabla de piezas ──
  let filas = '';
  res.partes.forEach((p, i)=>{
    const neg = p.signo === -1;
    filas += `<tr${neg ? ' style="color:var(--rojo,#c0392b)"' : ''}>
      <td class="name-cell">${i+1}. ${p.fig.name}${neg ? ' (hueco)' : ''}</td>
      <td class="num-cell">${f(p.V)}</td>
      <td class="num-cell">${f(p.fig.rho)} <span style="font-size:9px;color:var(--muted)">${p.fig.rhoU || densUnidad}</span></td>
      <td class="num-cell">${f(p.m)}</td>
      <td class="num-cell">${nL(p.g.x)}</td>
      <td class="num-cell">${nL(p.g.y)}</td>
      <td class="num-cell">${nL(p.g.z)}</td>
      <td class="num-cell">${I(p.enOrigen.xx)}</td>
      <td class="num-cell">${I(p.enOrigen.yy)}</td>
      <td class="num-cell">${I(p.enOrigen.zz)}</td>
    </tr>`;
  });
  html += `<div class="res-section">
    <div class="res-section-title"><div class="num" style="background:var(--grn)">1</div>Las piezas</div>
    <div style="overflow-x:auto"><table class="fig-table">
      <thead><tr>
        <th>Pieza</th><th>V (${u3})</th><th>ρ</th><th>m (kg)</th>
        <th>x̃ (${uL})</th><th>ỹ (${uL})</th><th>z̃ (${uL})</th>
        <th>I<sub>x</sub> (kg·m²)</th><th>I<sub>y</sub></th><th>I<sub>z</sub></th>
      </tr></thead>
      <tbody>${filas}</tbody>
      <tfoot><tr style="font-weight:700">
        <td class="name-cell">Σ</td><td class="num-cell">—</td><td class="num-cell">—</td>
        <td class="num-cell">${f(res.m)}</td>
        <td class="num-cell">${nL(res.cg.x)}</td><td class="num-cell">${nL(res.cg.y)}</td><td class="num-cell">${nL(res.cg.z)}</td>
        <td class="num-cell">${I(res.O.xx)}</td><td class="num-cell">${I(res.O.yy)}</td><td class="num-cell">${I(res.O.zz)}</td>
      </tr></tfoot>
    </table></div>
    <div style="font-size:10px;color:var(--muted);margin-top:6px;line-height:1.5">
      I de cada pieza respecto de los ejes del ORIGEN, ya con el traslado: I<sub>x</sub> = Ī<sub>x</sub> + m(d<sub>y</sub>² + d<sub>z</sub>²).
      Un hueco entra con masa negativa.
    </div>
  </div>`;

  // ── Masa y centro de masa ──
  html += `<div class="res-section">
    <div class="res-section-title"><div class="num" style="background:var(--grn)">2</div>Masa y centro de masa</div>
    <div class="eq-row"><div class="eq-lbl">m</div><div class="eq-body">m = Σ ρ<sub>i</sub> V<sub>i</sub> = <b>${f(res.m)}</b> kg</div></div>
    <div class="eq-row"><div class="eq-lbl">G</div><div class="eq-body">
      x̄ = Σm<sub>i</sub>x̃<sub>i</sub>/Σm<sub>i</sub> = <b>${nL(res.cg.x)}</b> ${uL} &nbsp;·&nbsp;
      ȳ = <b>${nL(res.cg.y)}</b> ${uL} &nbsp;·&nbsp; z̄ = <b>${nL(res.cg.z)}</b> ${uL}</div></div>
  </div>`;

  // ── El tensor, en O y en G ──
  const filaT = (t, k) => `<tr>
      <td class="name-cell">${k}</td>
      <td class="num-cell">${I(t.xx)}</td><td class="num-cell">${I(t.yy)}</td><td class="num-cell">${I(t.zz)}</td>
      <td class="num-cell">${I(cero(t.xy))}</td><td class="num-cell">${I(cero(t.yz))}</td><td class="num-cell">${I(cero(t.xz))}</td>
    </tr>`;
  html += `<div class="res-section">
    <div class="res-section-title"><div class="num" style="background:var(--grn)">3</div>Momentos y productos de inercia</div>
    <div style="overflow-x:auto"><table class="fig-table">
      <thead><tr><th>Respecto de</th>
        <th>I<sub>xx</sub></th><th>I<sub>yy</sub></th><th>I<sub>zz</sub></th>
        <th>P<sub>xy</sub></th><th>P<sub>yz</sub></th><th>P<sub>xz</sub></th></tr></thead>
      <tbody>${filaT(res.O, 'el origen O')}${filaT(res.G, 'el centro de masa G')}</tbody>
    </table></div>
    <div style="font-size:10px;color:var(--muted);margin-top:6px;line-height:1.5">
      Todo en kg·m². Del origen al centro de masa se baja con el mismo traslado al revés:
      Ī<sub>xx</sub> = I<sub>xx</sub> − m(ȳ² + z̄²).
    </div>
    <div class="eq-row"><div class="eq-lbl">k</div><div class="eq-body">
      Radios de giro respecto de G: k<sub>x</sub> = √(Ī<sub>xx</sub>/m) = <b>${f(res.kG.x*res.met)}</b> m &nbsp;·&nbsp;
      k<sub>y</sub> = <b>${f(res.kG.y*res.met)}</b> m &nbsp;·&nbsp; k<sub>z</sub> = <b>${f(res.kG.z*res.met)}</b> m</div></div>
  </div>`;

  // ── Ejes principales ──
  const nombra = ['I₁ (máximo)', 'I₂', 'I₃ (mínimo)'];
  const cajas = res.principales.map((e, i)=>`
    <div class="principal-box${i===0 ? ' main' : ''}">
      <div class="p-lbl">${nombra[i]}</div>
      <div class="p-val">${I(e.I)}</div>
      <div class="p-unit">kg·m²</div>
      <div style="font-size:10px;color:var(--muted);margin-top:6px;line-height:1.4">
        dirección (${e.u.map(v=>(Math.abs(v)<1e-12?0:v).toFixed(4)).join(' ; ')})
      </div>
    </div>`).join('');
  html += `<div class="res-section">
    <div class="res-section-title"><div class="num" style="background:var(--grn)">4</div>Ejes principales de inercia (en G)</div>
    <div class="principal-grid">${cajas}</div>
    <div style="font-size:10px;color:var(--muted);margin-top:8px;line-height:1.5">
      Son las tres direcciones en las que los productos de inercia se anulan, y sus momentos.
      En el plano equivalen a θ<sub>p</sub> y al círculo de Mohr.
    </div>
  </div>`;

  const cont = document.getElementById('resultsContent') || document.getElementById('resultsPanel');
  if(cont) cont.innerHTML = html;
  // Las dos vistas, ya con el resultado en la mano.
  try{ drawVistas3dEn('cv3dRes', {res}); }catch(e){}
}

// ══ Ejemplos del 3D ═══════════════════════════════════════════════════════
// La ventana enseña UNO (§7 de CLAUDE.md); el otro se carga por id desde la
// consola y es un caso de verificación más.
//
// `esperado` es el TEXTO que pinta la ventana; `verifica`, los NÚMEROS que
// contrasta la consola. Al añadir un ejemplo, pon los dos: solo con
// `esperado` no lo comprueba nadie.
//
// Los valores de referencia están calculados A MANO con las fórmulas del
// capítulo (cilindro: Ī_zz = ½mR², Ī_xx = m(3R²+h²)/12, y el traslado
// I = Ī + md²), no medidos con la propia aplicación.
const EJEMPLOS_3D = [
  {id:'volante', nombre:'Volante con buje',
   desc:'Disco de acero con un buje centrado y un agujero pasante. Todo es coaxial, así que los tres ejes del dibujo ya son los principales.',
   esperado:'m = 39.71 kg · z̄ = 24.78 mm · I_zz = 0.7944 kg·m² · Ī_xx = 0.4168 kg·m²',
   verifica:{m:39.70502, cgz:24.78261, Izz_O:0.7943593, Ixx_O:0.4411429, Ixx_G:0.4167570},
   armar:(S)=>{ S('s_cilindro', {r:200, h:40},  'BM', 0,0,0,   1, 'Disco');
                S('s_cilindro', {r:60,  h:100}, 'BM', 0,0,40,  1, 'Buje');
                S('s_cilindro', {r:50,  h:140}, 'BM', 0,0,0,  -1, 'Agujero pasante'); }},
  // El caso que ejercita de verdad el GIRO del tensor: la cabeza está tumbada,
  // así que su eje propio va a lo largo de X y sus momentos se permutan. Con
  // el tensor sin girar, Ī_zz de la cabeza saldría ½mR² = 0.0057 en vez de
  // m(3R²+h²)/12 = 0.0220, y el error no se vería en el dibujo.
  {id:'mazo', nombre:'Mazo',
   desc:'Mango vertical y cabeza tumbada: el tensor de la cabeza hay que girarlo, no basta con trasladarlo.',
   esperado:'m = 8.767 kg · z̄ = 295.8 mm · Ī_xx = 0.06195 kg·m² · Ī_zz = 0.02221 kg·m²',
   verifica:{m:8.767164, cgz:295.8212, Ixx_G:0.0619545, Izz_G:0.0222051},
   armar:(S)=>{ S('s_cilindro', {r:15, h:300}, 'BM', 0,0,0,   1, 'Mango');
                // Por el CENTROIDE, que con la pieza girada es el punto que no
                // se mueve; y con el eje de la pieza a 0° de +X, o sea tumbada.
                S('s_cilindro', {r:40, h:180}, 'C',  0,0,330, 1, 'Cabeza', {xz:0}); }},
];
function loadExample3d(id){
  const ej = EJEMPLOS_3D.find(e=>e.id === id) || EJEMPLOS_3D[0];
  figures = []; figIdCounter = 0; colorIdx = 0;
  selectedFigId = null; selectedFigType = null; selFiguras = [];
  // La unidad se fija con el panel VACÍO: así no convierte nada y el ejemplo
  // entra con sus medidas en mm, que es como está escrito.
  setUnit('mm');
  // `ancla` dice por qué punto se da la posición, y `giros` los ángulos del
  // PANEL (los que ve el alumno), no los internos.
  const S = (type, dims, ancla, x, y, z, sign, name, giros) => {
    const def = SOLID_DEFS[type];
    const fig = {id:++figIdCounter, type, dims, cx:0, cy:0, cz:0,
                 rotation:0, rotXZ:0, rotYZ:0, volteado:false, sign, es3d:true,
                 color:COLORS[colorIdx++ % COLORS.length], anchor:ancla, activeAnchor:ancla,
                 name:name || def.name, rho:DENS_POR_DEFECTO, rhoU:densUnidad,
                 thickness:1, angleMode:'semi'};
    if(giros){
      if(giros.xy !== undefined) fig.rotation = giroDesdePanel(giros.xy, 'xy');
      if(giros.xz !== undefined) fig.rotXZ    = giroDesdePanel(giros.xz, 'xz');
      if(giros.yz !== undefined) fig.rotYZ    = giroDesdePanel(giros.yz, 'yz');
    }
    // El giro va puesto ANTES de situarla: el desplazamiento del centroide al
    // ancla depende de la postura.
    const off = solidAnchorOffsetFig(fig, ancla);
    fig.cx = x - off.dx; fig.cy = y - off.dy; fig.cz = z - off.dz;
    figures.push(fig);
    return fig;
  };
  ej.armar(S);
  selectFigure(null); renderFigList(); fitView(); calculate();
  comprobarMasa3d(ej);
}
// Contrasta el resultado con los valores de referencia. Mira magnitud Y signo:
// un hueco puesto como material da la masa mal y salta aquí.
function comprobarMasa3d(ej){
  if(!ej || !ej.verifica || !results || !results.principales) return;
  const k = results.aSI, R = results;
  const tiene = {
    m:R.m, cgx:R.cg.x, cgy:R.cg.y, cgz:R.cg.z,
    Ixx_O:R.O.xx*k, Iyy_O:R.O.yy*k, Izz_O:R.O.zz*k,
    Ixx_G:R.G.xx*k, Iyy_G:R.G.yy*k, Izz_G:R.G.zz*k,
  };
  let malos = 0;
  Object.keys(ej.verifica).forEach(kk=>{
    const esp = ej.verifica[kk], obt = tiene[kk];
    if(obt === undefined){ console.warn('Ejemplo ' + ej.id + ': no sé medir «' + kk + '»'); return; }
    if(Math.abs(obt - esp) > Math.max(1e-5, Math.abs(esp)*3e-5)){
      malos++;
      console.warn('Ejemplo ' + ej.id + ': ' + kk + ' = ' + obt
                 + ' se desvía de la referencia ' + esp);
    }
  });
  if(!malos) console.log('Ejemplo ' + ej.id + ': los ' + Object.keys(ej.verifica).length
                       + ' valores de referencia coinciden.');
}
