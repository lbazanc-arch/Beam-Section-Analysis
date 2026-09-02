/* ── Avisos no bloqueantes ──
   El diálogo nativo queda silenciado en móvil: la acción parecía no tener efecto. */
let _avisoTimer = null;
function aviso(msg, tipo){
  let c = document.getElementById('avisoCaja');
  if(!c){
    c = document.createElement('div');
    c.id = 'avisoCaja';
    c.className = 'aviso-caja';
    const t = document.createElement('span');
    t.id = 'avisoTxt';
    const x = document.createElement('button');
    x.className = 'aviso-x'; x.type = 'button';
    x.setAttribute('aria-label','Cerrar aviso');
    x.textContent = '\u00d7';
    x.addEventListener('click', cerrarAviso);
    c.appendChild(t); c.appendChild(x);
    document.body.appendChild(c);
  }
  document.getElementById('avisoTxt').textContent = msg;
  c.classList.toggle('error', tipo === 'error');
  c.classList.add('visible');
  if(_avisoTimer) clearTimeout(_avisoTimer);
  _avisoTimer = setTimeout(cerrarAviso, 4500);
}

function renderKatex(root){
  if(!window.katex) return;
  root.querySelectorAll('.ktx').forEach(el=>{
    if(el.getAttribute('data-done')) return;
    try{ katex.render(el.getAttribute('data-tex'), el, {throwOnError:false, displayMode: el.getAttribute('data-display')==='1'}); el.setAttribute('data-done','1'); }
    catch(e){ el.textContent = el.getAttribute('data-tex'); }
  });
}

// ═══════════════════════════════════════════════════════════
//  BSA — Cap. 9.5 · Presión de fluidos sobre compuertas
//  La compuerta se arma por tramos encadenados. Sobre los tramos
//  mojados actúa la presión hidrostática; el conjunto se resuelve
//  por equilibrio: reacciones de los apoyos y fuerza del tope.
// ═══════════════════════════════════════════════════════════
let nodos = [];     // {id,x,y,nombre,apoyo:null|'fijo'|'movil',apAng,rotula:bool,tope:null|{ang}}
let tramos = [];    // {id,a,b,tipo:'recto'|'arco',flecha,cara:0|1|2}
let nodoSeq = 0, tramoSeq = 0;
let tool = 'pan', selNodo = null;
let gesto = null;   // gesto unificado del botón "Mover / editar" (criterio cap9)
const UMBRAL_ARRASTRE = 4, UMBRAL_MANTENER_MS = 450;
let selN = [], selT = [], infoNodo = null, infoTramo = null;
let apoyoId = null, topeId = null;
let R = null;
let unitLen = 'm', unitFor = 'kN';
let DEC = {len:2, fuerza:2};
let cv, ctx, W = 0, H = 0, vx = 0, vy = 0, escala = 60;
let mouseW = null;

// ── Visibilidad de capas del dibujo (criterio cap6/cap7) ──
// Solo afecta a lo que se ve; el cálculo usa siempre el modelo completo.
const VIS = {grilla:true, apoyos:true, liquidos:true, presion:true};
function setVis(cual, valor){ VIS[cual] = !!valor; dibujar(); }

const LEN_A_M = {m:1, cm:0.01, ft:0.3048};
const FOR_A_KN = {kN:1, N:0.001, ton:9.80665, lb:0.00444822};

function dec(v,t){
  const d = (t==='len') ? DEC.len : DEC.fuerza;
  const n = Number(v);
  if(!isFinite(n)) return '0';
  return (Math.abs(n)<5e-11?0:n).toFixed(d);
}
function esCero(v){ return Math.abs(v) < 1e-9; }
function num(id,def){ const e=document.getElementById(id); const v=e?parseFloat(e.value):NaN;
  return isFinite(v)?v:(def||0); }
function kx(tex){
  const esc = String(tex).replace(/&/g,'&amp;').replace(/"/g,'&quot;')
                         .replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return '<span class="ktx" data-tex="'+esc+'"></span>';
}
function uPres(){ return unitFor+'/'+unitLen+'\u00B2'; }
function nombreNodo(i){ const L='ABCDEFGHIJKLMNOPQRSTUVWXYZ'; return i<26?L[i]:L[i%26]+Math.floor(i/26); }
function reNombrar(){ nodos.forEach((n,i)=>n.nombre = nombreNodo(i)); }
function nomTramo(t){
  const a = nodos.find(n=>n.id===t.a), b = nodos.find(n=>n.id===t.b);
  return (a&&b) ? a.nombre+b.nombre : '?';
}

// ── Líquidos por zona ──
// Cada zona tiene sus capas, definidas por la COTA de su nivel superior.
// Físicamente el líquido más liviano flota sobre el más denso, así que el
// programa reordena las capas por densidad y avisa si venían al revés.
let zonas = {1:[], 2:[]};   // [{g, niv}]
let avisoOrden = {1:false, 2:false};

function capasOrdenadas(z){
  const lista = zonas[z].filter(l=>isFinite(l.g) && isFinite(l.niv));
  if(!lista.length){ avisoOrden[z] = false; return []; }
  const niveles = lista.map(l=>l.niv).sort((a,b)=>b-a);      // de arriba a abajo
  const dens = lista.map(l=>l.g).sort((a,b)=>a-b);            // del más liviano al más denso
  // ¿el alumno los había puesto ya en el orden físico?
  const comoEstan = lista.slice().sort((a,b)=>b.niv-a.niv).map(l=>l.g);
  avisoOrden[z] = comoEstan.some((g,i)=>Math.abs(g-dens[i]) > 1e-12);
  return niveles.map((niv,i)=>({niv, g:dens[i]}));
}

function presionZona(z, y){
  const capas = capasOrdenadas(z);
  let p = 0;
  for(let i=0;i<capas.length;i++){
    const arriba = capas[i].niv;
    const abajo = (i+1 < capas.length) ? capas[i+1].niv : -Infinity;
    if(y >= arriba) continue;                 // por encima de esta capa
    const base = Math.max(y, abajo);
    p += capas[i].g * (arriba - base);        // tramo de esta capa que queda encima
    if(y >= abajo) break;                     // y cae dentro de esta capa
  }
  return p;
}
function nivelZona(z){
  const c = capasOrdenadas(z);
  return c.length ? c[0].niv : -Infinity;
}
function anchoB(){ return Math.abs(num('pB',1))||1; }

function addLiquido(z){
  registrarCambio();
  const c = capasOrdenadas(z);
  const nivPrev = c.length ? c[c.length-1].niv - 1 : 0;
  zonas[z].push({g:9.81, niv:nivPrev});
  R = null; refrescar();
}
function borrarLiquido(z,i){ registrarCambio(); zonas[z].splice(i,1); R=null; refrescar(); }
function editLiquido(z,i,campo,v){
  registrarCambio();
  const val = parseFloat(v);
  if(isFinite(val)) zonas[z][i][campo] = val;
  R = null; refrescar();
}
function pintarZonas(){
  [1,2].forEach(z=>{
    const el = document.getElementById('listaZ'+z);
    if(!el) return;
    if(!zonas[z].length){
      el.innerHTML = '<div class="list-empty">Sin líquido en esta zona.</div>';
      return;
    }
    const ord = capasOrdenadas(z);
    let h = zonas[z].map((l,i)=>
      '<div class="liq-row">'
      + '<div class="liq-sw" style="background:'+colorCapa(l.g)+'"></div>'
      + '<span class="lab">γ</span><input type="number" step="any" value="'+l.g+'" '
      + 'onchange="editLiquido('+z+','+i+',\'g\',this.value)">'
      + '<span class="lab">nivel</span><input type="number" step="any" value="'+l.niv+'" '
      + 'onchange="editLiquido('+z+','+i+',\'niv\',this.value)">'
      + '<button class="x" onclick="borrarLiquido('+z+','+i+')">×</button></div>').join('');
    if(avisoOrden[z])
      h += '<div class="zona-avi">Los líquidos se han reordenado por densidad: el más liviano flota sobre el más denso.</div>';
    if(ord.length > 1)
      h += '<div class="hint-sm">De arriba a abajo: '
         + ord.map(c=>'γ='+dec(c.g,'f')).join(' · ') + '</div>';
    el.innerHTML = h;
  });
}
function colorCapa(g){
  const t = Math.max(0, Math.min(1, (g-6)/12));
  const r = Math.round(120 - 80*t), gg = Math.round(190 - 70*t), b = Math.round(225 - 45*t);
  return 'rgb('+r+','+gg+','+b+')';
}

// ── Geometría de un tramo ──
// Un tramo curvo se define por su cuerda y una flecha (sagita).
function puntosTramo(t, N){
  const a = nodos.find(n=>n.id===t.a), b = nodos.find(n=>n.id===t.b);
  if(!a||!b) return [];
  const pts = [];
  if(t.tipo === 'recto' || esCero(t.flecha||0)){
    for(let i=0;i<=N;i++) pts.push({x:a.x+(b.x-a.x)*i/N, y:a.y+(b.y-a.y)*i/N});
  } else {
    const dx = b.x-a.x, dy = b.y-a.y, c = Math.hypot(dx,dy);
    const f = t.flecha;
    const Rr = (c*c/4 + f*f)/(2*Math.abs(f));       // radio del arco
    const mx = (a.x+b.x)/2, my = (a.y+b.y)/2;
    const ux = dx/c, uy = dy/c, nx = -uy, ny = ux;   // normal a la cuerda
    const h = Math.sqrt(Math.max(0, Rr*Rr - c*c/4));
    const sg = f >= 0 ? 1 : -1;
    const cx = mx - nx*h*sg, cy = my - ny*h*sg;      // centro del arco
    let t1 = Math.atan2(a.y-cy, a.x-cx), t2 = Math.atan2(b.y-cy, b.x-cx);
    let d = t2 - t1;
    while(d >  Math.PI) d -= 2*Math.PI;
    while(d < -Math.PI) d += 2*Math.PI;
    if(Math.abs(f) > c/2){ d = d > 0 ? d - 2*Math.PI : d + 2*Math.PI; }
    for(let i=0;i<=N;i++){
      const th = t1 + d*i/N;
      pts.push({x:cx+Rr*Math.cos(th), y:cy+Rr*Math.sin(th)});
    }
  }
  return pts;
}

// ── Resultante de la presión sobre un tramo ──
// Se integra punto a punto: vale igual para rectos y curvos.
// Orientación: la normal +n del tramo apunta hacia una zona u otra según su
// geometría. Se deduce sola y el alumno puede invertirla si el caso lo pide.
function signoZona(t){
  const pts = puntosTramo(t, 12);
  let sx = 0;
  for(let i=0;i<pts.length-1;i++){
    const dx = pts[i+1].x-pts[i].x, dy = pts[i+1].y-pts[i].y;
    const ds = Math.hypot(dx,dy) || 1;
    sx += dy/ds;                     // componente x de la normal (dy/ds, -dx/ds)
  }
  const base = (sx >= 0) ? 1 : -1;   // +1: +n mira a la zona 2
  return t.invertir ? -base : base;
}
function presionNetaTramo(t, y){
  const sg = signoZona(t);
  return sg * (presionZona(1,y) - presionZona(2,y));
}

function fuerzaTramo(t){
  if(t.activo === false) return null;
  const N = 800;
  const pts = puntosTramo(t, N);
  if(pts.length < 2) return null;
  let Fx = 0, Fy = 0, Mo = 0, len = 0, pMin = Infinity, pMax = -Infinity;
  for(let i=0;i<N;i++){
    const A = pts[i], B = pts[i+1];
    const dx = B.x-A.x, dy = B.y-A.y, ds = Math.hypot(dx,dy);
    if(ds < 1e-14) continue;
    len += ds;
    const mx = (A.x+B.x)/2, my = (A.y+B.y)/2;
    const p = presionNetaTramo(t, my);
    if(p < pMin) pMin = p;
    if(p > pMax) pMax = p;
    // normal a la derecha del recorrido
    const nx = dy/ds, ny = -dx/ds;
    const dF = p*anchoB()*ds;
    Fx += dF*nx; Fy += dF*ny;
    Mo += mx*(dF*ny) - my*(dF*nx);          // momento respecto al origen
  }
  const F = Math.hypot(Fx,Fy);
  // punto de la línea de acción más cercano al origen
  let px = 0, py = 0;
  // Punto de la línea de acción más próximo al origen. De Mo = px·Fy − py·Fx
  // junto con p ⊥ F sale px = Fy·Mo/F² y py = −Fx·Mo/F².
  if(F > 1e-12){ px = Fy*Mo/(F*F); py = -Fx*Mo/(F*F); }
  return {Fx, Fy, F, Mo, px, py, len, pMin, pMax};
}

// ── Equilibrio del conjunto ──
function resolverSistema(A,b){
  const n = b.length;
  const M = A.map((f,i)=>f.slice().concat([b[i]]));
  for(let c=0;c<n;c++){
    let piv=c;
    for(let f=c+1;f<n;f++) if(Math.abs(M[f][c])>Math.abs(M[piv][c])) piv=f;
    if(Math.abs(M[piv][c])<1e-10) return null;
    [M[c],M[piv]]=[M[piv],M[c]];
    for(let f=0;f<n;f++){
      if(f===c) continue;
      const k=M[f][c]/M[c][c];
      if(k===0) continue;
      for(let j=c;j<=n;j++) M[f][j]-=k*M[c][j];
    }
  }
  return M.map((f,i)=>M[i][n]/M[i][i]);
}

function analizar(){
  if(!tramos.length) return {error:'sin-tramos'};
  const cargas = [];
  tramos.forEach(t=>{
    const f = fuerzaTramo(t);
    if(f && f.F > 1e-12) cargas.push({t, ...f});
  });

  // incógnitas
  const inc = [];
  nodos.forEach(n=>{
    if(n.apoyo === 'fijo'){ inc.push({n, tipo:'Rx'}); inc.push({n, tipo:'Ry'}); }
    else if(n.apoyo === 'movil'){ inc.push({n, tipo:'R', ang:(n.apAng===undefined?90:n.apAng)*Math.PI/180}); }
    if(n.tope) inc.push({n, tipo:'T', ang:(n.tope.ang||0)*Math.PI/180});
  });
  const rotulas = nodos.filter(n=>n.rotula);
  const nEq = 3 + rotulas.length;
  const diag = {inc:inc.length, eq:nEq, rot:rotulas.length};
  if(inc.length !== nEq) return {error:'determinacion', diag, cargas, inc};

  // ── ecuaciones ──
  const A = Array.from({length:nEq}, ()=>new Array(inc.length).fill(0));
  const b = new Array(nEq).fill(0);
  const dir = u => {
    if(u.tipo==='Rx') return {x:1,y:0};
    if(u.tipo==='Ry') return {x:0,y:1};
    return {x:Math.cos(u.ang), y:Math.sin(u.ang)};
  };
  // ΣFx, ΣFy, ΣM(origen)
  inc.forEach((u,j)=>{
    const d = dir(u);
    A[0][j] = d.x; A[1][j] = d.y;
    A[2][j] = u.n.x*d.y - u.n.y*d.x;
  });
  let sx=0, sy=0, sm=0;
  cargas.forEach(c=>{ sx+=c.Fx; sy+=c.Fy; sm+=c.Mo; });
  b[0] = -sx; b[1] = -sy; b[2] = -sm;

  // Una ecuación extra por rótula: ΣM = 0 respecto a ella,
  // tomando solo las fuerzas de un lado de la cadena.
  rotulas.forEach((rt, k)=>{
    const lado = ladoDeRotula(rt);
    inc.forEach((u,j)=>{
      if(lado.nodos.indexOf(u.n.id) < 0) return;
      const d = dir(u);
      A[3+k][j] = (u.n.x-rt.x)*d.y - (u.n.y-rt.y)*d.x;
    });
    let m = 0;
    cargas.forEach(c=>{
      if(lado.tramos.indexOf(c.t.id) < 0) return;
      m += (c.px-rt.x)*c.Fy - (c.py-rt.y)*c.Fx;
    });
    b[3+k] = -m;
  });

  const x = resolverSistema(A,b);
  if(!x) return {error:'singular', diag, cargas, inc};
  const val = {};
  inc.forEach((u,j)=>{ val[j] = x[j]; });
  return {cargas, inc, val, diag, rotulas};
}

// Nodos y tramos que quedan a un lado de la rótula (recorriendo la cadena)
function ladoDeRotula(rt){
  const vis = {}, nds = [], trs = [];
  const ady = {};
  nodos.forEach(n=>ady[n.id]=[]);
  tramos.forEach(t=>{ ady[t.a].push({n:t.b,t}); ady[t.b].push({n:t.a,t}); });
  const primero = ady[rt.id][0];
  if(!primero) return {nodos:[], tramos:[]};
  const cola = [primero.n];
  vis[rt.id] = true; vis[primero.n] = true;
  nds.push(primero.n); trs.push(primero.t.id);
  while(cola.length){
    const x = cola.shift();
    ady[x].forEach(e=>{
      if(trs.indexOf(e.t.id) < 0) trs.push(e.t.id);
      if(vis[e.n]) return;
      vis[e.n] = true; nds.push(e.n); cola.push(e.n);
    });
  }
  return {nodos:nds, tramos:trs};
}

function calcular(){
  R = analizar();
  const rp = document.getElementById('resultsPanel');
  const ra = document.getElementById('resultsArea');
  const hint = document.getElementById('noResultsHint');
  if(ra) ra.style.display='block';
  if(hint) hint.style.display='none';
  if(rp){
    rp.style.display='block';
    rp.innerHTML = R.error ? renderError(R) : renderResultados(R);
    try{ renderKatex(rp); }catch(e){}
  }
  dibujar();
  setTimeout(()=>{ try{ ra.scrollIntoView({behavior:'smooth',block:'start'}); }catch(e){} },130);
}

function renderError(r){
  let t;
  if(r.error === 'sin-tramos') t = 'Arma la compuerta: coloca nudos y únelos con tramos.';
  else if(r.error === 'determinacion'){
    const d = r.diag, g = d.inc - d.eq;
    t = 'Hay <b>' + d.inc + ' incógnita(s)</b> (reacciones y topes) y <b>' + d.eq + ' ecuación(es)</b> '
      + 'de equilibrio' + (d.rot ? ' (3 del conjunto más ' + d.rot + ' por las rótulas)' : '') + '. '
      + (g < 0 ? 'Faltan ' + (-g) + ': la compuerta no está sujeta y se movería.'
               : 'Sobran ' + g + ': el problema es hiperestático y la estática no basta para resolverlo.');
  }
  else t = 'La disposición de apoyos no impide el movimiento: revisa sus direcciones.';
  return '<div class="res-section"><div class="res-title"><div class="num">!</div>No se puede resolver</div>'
    + '<div class="verdict bad"><div class="verdict-t">Equilibrio</div>' + t + '</div></div>';
}
