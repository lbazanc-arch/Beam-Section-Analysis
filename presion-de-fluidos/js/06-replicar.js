// ═══════════════════════════════════════════════════════════
//  REPLICAR: copiar la selección desplazada N veces
// ═══════════════════════════════════════════════════════════
function abrirReplicar(){
  const idsNodos = nodosDeSeleccion();
  if(!idsNodos.length){
    aviso('Marca con "Mover / editar" lo que quieras replicar.');
    return;
  }
  const nTramos = tramosDeGrupo(idsNodos).length;
  document.getElementById('repSub').textContent =
    'Se replicarán ' + idsNodos.length + ' nudo(s)'
    + (nTramos ? ' y ' + nTramos + ' tramo(s)' : '')
    + ', desplazándolos la distancia indicada tantas veces como pidas.';
  actualizarPrevRep();
  document.getElementById('repModal').classList.add('show');
}
function closeReplicar(){ document.getElementById('repModal').classList.remove('show'); }
function actualizarPrevRep(){
  const g = id => parseFloat(document.getElementById(id).value) || 0;
  const dx = g('repDx'), dy = g('repDy');
  const nrep = Math.max(1, Math.min(50, parseInt(document.getElementById('repN').value) || 1));
  const idsNodos = nodosDeSeleccion();
  const base = nodos.find(z=>z.id===idsNodos[0]);
  const el = document.getElementById('repPrev');
  if(!el || !base) return;
  let t = 'Desde ('+dec(base.x,'len')+' ; '+dec(base.y,'len')+') '+unitLen+' → ';
  const p = [];
  for(let i=1;i<=Math.min(nrep,3);i++)
    p.push('('+dec(base.x+dx*i,'len')+' ; '+dec(base.y+dy*i,'len')+')');
  el.innerHTML = t + p.join(', ') + (nrep>3 ? ' …' : '');
}
function applyReplicar(){
  const g = id => parseFloat(document.getElementById(id).value) || 0;
  const dx = g('repDx'), dy = g('repDy');
  const nrep = Math.max(1, Math.min(50, parseInt(document.getElementById('repN').value) || 1));
  if(dx === 0 && dy === 0){ aviso('Indica un desplazamiento en x o en y.'); return; }
  const idsNodos = nodosDeSeleccion();
  if(!idsNodos.length){ aviso('No hay nada que replicar.', 'error'); return; }
  registrarCambio();
  const idsTramos = tramosDeGrupo(idsNodos);
  const nuevosNodos=[], nuevosTramos=[];
  for(let i=1;i<=nrep;i++){
    const mapaNodo = {};
    idsNodos.forEach(id=>{
      const o = nodos.find(z=>z.id===id); if(!o) return;
      const nn = Object.assign({}, o, {id:++nodoSeq, x:o.x+dx*i, y:o.y+dy*i, nombre:'',
                                       tope: o.tope ? Object.assign({}, o.tope) : null});
      nodos.push(nn); mapaNodo[id] = nn.id; nuevosNodos.push(nn.id);
    });
    idsTramos.forEach(id=>{
      const o = tramos.find(z=>z.id===id); if(!o) return;
      const nt = Object.assign({}, o, {id:++tramoSeq, a:mapaNodo[o.a], b:mapaNodo[o.b]});
      tramos.push(nt); nuevosTramos.push(nt.id);
    });
  }
  reNombrar();
  selN = nuevosNodos; selT = nuevosTramos;
  infoNodo = nuevosNodos.length ? nuevosNodos[nuevosNodos.length-1] : null;
  infoTramo = nuevosTramos.length ? nuevosTramos[nuevosTramos.length-1] : null;
  R = null;
  closeReplicar(); refrescar();
}
function limpiarTodo(){
  registrarCambio();
  nodos=[]; tramos=[]; nodoSeq=0; tramoSeq=0; selN=[]; selT=[]; R=null;
  document.getElementById('resultsArea').style.display='none';
  const rp=document.getElementById('resultsPanel'); if(rp){rp.innerHTML='';rp.style.display='none';}
  const hh=document.getElementById('noResultsHint'); if(hh) hh.style.display='';
  refrescar();
}
function refrescar(){ dibujar(); pintarListas(); pintarZonas(); }

function toggleActivo(id){
  const t=tramos.find(z=>z.id===id); if(!t) return;
  t.activo = (t.activo === false);
  R=null; refrescar();
}
function invertirCara(id){
  const t=tramos.find(z=>z.id===id); if(!t) return;
  t.invertir = !t.invertir; R=null; refrescar();
}
function cambiarFlecha(id,v){
  const t=tramos.find(z=>z.id===id); if(!t) return;
  t.flecha=parseFloat(v)||0; R=null; refrescar();
}
// Texto corto de la orientación de un tope o apoyo móvil, para las listas.
function _textoDireccion(u){
  const g = anguloIncognita(u).toFixed(0) + '°';
  if(u.tipo==='T') return (u.n.tope && u.n.tope.modo === 'angulo') ? 'tope a ' + g : 'tope ⟂ (' + g + ')';
  return (u.n.apModo === 'normal') ? 'móvil ⟂ (' + g + ')' : 'móvil ' + g;
}
function pintarListas(){
  const lt=document.getElementById('listaTramos');
  if(lt){
    lt.innerHTML = tramos.length ? tramos.map(t=>{
      const act = t.activo !== false;
      const cara1 = signoZona(t) === 1 ? 'izq.' : 'der.';
      return '<div class="item-row'+(selT.indexOf(t.id)>=0?' sel':'')+'">'
        + '<input type="checkbox" '+(act?'checked':'')+' onchange="toggleActivo('+t.id+')" '
        + 'title="Incluir en el análisis" style="width:14px;height:14px;accent-color:#0f5c56">'
        + '<div class="nm">'+nomTramo(t)+' · '+(t.tipo==='arco'?'curvo':'recto')+'</div>'
        + (t.tipo==='arco' ? '<input type="number" step="any" value="'+t.flecha+'" title="flecha (sagita)" '
            + 'style="width:52px;padding:2px 4px;border:1px solid var(--border2);border-radius:4px;font-size:10px" '
            + 'onchange="cambiarFlecha('+t.id+',this.value)">' : '')
        + '<button class="cara-btn'+(t.invertir?' on':'')+'" onclick="invertirCara('+t.id+')" '
        + 'title="Qué cara mira a la zona 1. Se deduce de la cadena de la compuerta; púlsalo solo si el dibujo del líquido no coincide">Z1 '+cara1+'</button>'
        + '<button class="x" onclick="borrarTramo('+t.id+')">×</button></div>';
    }).join('') : '<div class="list-empty">Sin tramos. Coloca nudos y únelos.</div>';
  }
  const la=document.getElementById('listaApoyos');
  if(la){
    const con = nodos.filter(n=>n.apoyo||n.rotula||n.tope);
    la.innerHTML = con.length ? con.map(n=>{
      const et=[];
      if(n.apoyo==='fijo') et.push('apoyo fijo');
      if(n.apoyo==='movil') et.push(_textoDireccion({n, tipo:'R'}));
      if(n.rotula) et.push('rótula');
      if(n.tope) et.push(_textoDireccion({n, tipo:'T'}) + (n.tope.modo === 'angulo' ? '' : ' · lado zona ' + (n.tope.lado||1)));
      return '<div class="item-row"><div class="dot" style="background:'+(n.tope?'#b45309':'#0b3f3a')+'"></div>'
        + '<div class="nm">'+n.nombre+' · '+et.join(', ')+'</div></div>';
    }).join('') : '<div class="list-empty">Sin apoyos.</div>';
  }
  const si=document.getElementById('tbSelInfo');
  if(si) si.textContent = (!selN.length&&!selT.length) ? 'Nada seleccionado'
    : 'Seleccionado: '+[selN.length?selN.length+' nudo(s)':null, selT.length?selT.length+' tramo(s)':null]
      .filter(Boolean).join(' y ');
}
function borrarTramo(id){ registrarCambio(); tramos=tramos.filter(t=>t.id!==id); R=null; refrescar(); }

// ── Modal de apoyo ──
function abrirApoyoModal(id){
  apoyoId=id; const n=nodos.find(z=>z.id===id); if(!n) return;
  document.getElementById('apNom').textContent=n.nombre;
  document.getElementById('apAng').value = n.apAng===undefined?90:n.apAng;
  const chk = document.getElementById('apNormal');
  if(chk) chk.checked = (n.apModo === 'normal');
  actualizarPrevApoyo();
  document.getElementById('apoyoModal').classList.add('show');
}
function closeApoyoModal(){
  const n=nodos.find(z=>z.id===apoyoId);
  if(n){
    n.apAng=parseFloat(document.getElementById('apAng').value)||90;
    const chk = document.getElementById('apNormal');
    n.apModo = (chk && chk.checked) ? 'normal' : 'angulo';
  }
  document.getElementById('apoyoModal').classList.remove('show'); apoyoId=null; R=null; refrescar();
}
function actualizarPrevApoyo(){
  const n=nodos.find(z=>z.id===apoyoId), el=document.getElementById('apPrev');
  if(!n||!el) return;
  const chk = document.getElementById('apNormal');
  const ang = document.getElementById('apAng');
  if(ang && chk) ang.disabled = chk.checked;
  const inc = nodos.reduce((s,z)=>s+(z.apoyo==='fijo'?2:z.apoyo==='movil'?1:0)+(z.tope?1:0),0);
  const eq = 3 + nodos.filter(z=>z.rotula).length;
  el.innerHTML='Ahora: <b>'+(n.apoyo?(n.apoyo==='fijo'?'apoyo fijo':'apoyo móvil'):'sin apoyo')
    +'</b> · Incógnitas totales: <b>'+inc+'</b> frente a <b>'+eq+'</b> ecuaciones'
    + (chk && chk.checked ? '<br>La reacción del móvil será perpendicular a la compuerta en este nudo.' : '');
}
function setApoyo(t){
  registrarCambio();
  const n=nodos.find(z=>z.id===apoyoId);
  if(n){
    n.apoyo=t;
    if(t==='movil'){
      n.apAng=parseFloat(document.getElementById('apAng').value)||90;
      const chk = document.getElementById('apNormal');
      n.apModo = (chk && chk.checked) ? 'normal' : 'angulo';
    }
    R=null;
  }
  actualizarPrevApoyo(); refrescar();
}

// ── Modal de tope ──
// Un tope liso empuja perpendicularmente a la compuerta desde el lado en
// que está (modo `normal`); si el problema da la dirección, modo `angulo`.
let _topeModo = 'normal';
function abrirTopeModal(id){
  topeId=id; const n=nodos.find(z=>z.id===id); if(!n) return;
  document.getElementById('tpNom').textContent=n.nombre;
  const tp = n.tope || {};
  document.getElementById('tpAng').value = tp.ang || 0;
  // lado por defecto: el seco, si solo una zona tiene líquido
  let lado = tp.lado;
  if(!lado){
    const z1 = capasOrdenadas(1).length, z2 = capasOrdenadas(2).length;
    lado = (z1 && !z2) ? 2 : (z2 && !z1 ? 1 : 2);
  }
  document.getElementById('tpLado').value = String(lado);
  setTopeModo(tp.modo === 'angulo' ? 'angulo' : 'normal');
  document.getElementById('topeModal').classList.add('show');
}
function setTopeModo(m){
  _topeModo = m;
  document.getElementById('tpCampoNormal').style.display = (m==='normal') ? 'block' : 'none';
  document.getElementById('tpCampoAngulo').style.display = (m==='angulo') ? 'block' : 'none';
  const a = document.getElementById('tpTabNormal'), b = document.getElementById('tpTabAngulo');
  if(a) a.classList.toggle('active', m==='normal');
  if(b) b.classList.toggle('active', m==='angulo');
}
function closeTopeModal(){ document.getElementById('topeModal').classList.remove('show'); topeId=null; }
function applyTope(){
  registrarCambio();
  const n=nodos.find(z=>z.id===topeId);
  if(n) n.tope={ang:parseFloat(document.getElementById('tpAng').value)||0, modo:_topeModo,
                lado:parseInt(document.getElementById('tpLado').value,10)||1};
  document.getElementById('topeModal').classList.remove('show'); topeId=null; R=null; refrescar();
}
function quitarTope(){
  registrarCambio();
  const n=nodos.find(z=>z.id===topeId);
  if(n) n.tope=null;
  document.getElementById('topeModal').classList.remove('show'); topeId=null; R=null; refrescar();
}

// ── Panel de control estándar BSA (dos niveles) ──
const SECCIONES = {
  conf:{titulo:'Configuración', btn:'rbConf'},
  ele:{titulo:'Elementos', btn:'rbEle'},
  liq:{titulo:'Líquidos', btn:'rbLiq'}
};
let seccionAbierta = null;

function posicionarToggle(){
  const p = document.getElementById('leftPanel');
  const f = document.getElementById('panelFlyout');
  const b = document.getElementById('panelToggle');
  if(!p || !b) return;
  const rail = !p.classList.contains('plegado');
  const fly  = f && !f.classList.contains('plegado');
  b.classList.toggle('corrido', rail);
  b.classList.toggle('expandido', rail && fly);
}
function togglePanel(){
  const p = document.getElementById('leftPanel');
  if(!p) return;
  const seCierra = !p.classList.contains('plegado');
  p.classList.toggle('plegado');
  if(seCierra) cerrarSeccion();
  posicionarToggle();
  setTimeout(ajustarCanvas, 240);
}
function abrirSeccion(id){
  const f = document.getElementById('panelFlyout');
  if(!f || !SECCIONES[id]) return;
  if(seccionAbierta === id && !f.classList.contains('plegado')){ cerrarSeccion(); return; }
  seccionAbierta = id;
  Object.keys(SECCIONES).forEach(k=>{
    const c = document.getElementById('sec_' + k);
    if(c) c.style.display = (k===id) ? '' : 'none';
    const b = document.getElementById(SECCIONES[k].btn);
    if(b) b.classList.toggle('active', k===id);
  });
  document.getElementById('flyoutTitulo').textContent = SECCIONES[id].titulo;
  f.classList.remove('plegado');
  posicionarToggle();
  setTimeout(ajustarCanvas, 240);
}
function cerrarSeccion(){
  const f = document.getElementById('panelFlyout');
  if(f) f.classList.add('plegado');
  seccionAbierta = null;
  Object.keys(SECCIONES).forEach(k=>{
    const b = document.getElementById(SECCIONES[k].btn);
    if(b) b.classList.remove('active');
  });
  posicionarToggle();
  setTimeout(ajustarCanvas, 240);
}

function zoomIn(){ escala=Math.min(escala*1.25,4000); dibujar(); }
function zoomOut(){ escala=Math.max(escala/1.25,0.02); dibujar(); }
function centrar(){
  if(!nodos.length){ vx=0; vy=0; escala=60; dibujar(); return; }
  const nv = Math.max(nivelZona(1), nivelZona(2));
  const xs=nodos.map(n=>n.x), ys=nodos.map(n=>n.y).concat(isFinite(nv)?[nv]:[]);
  const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
  vx=(x0+x1)/2; vy=(y0+y1)/2;
  const dx=Math.max(x1-x0,0.5), dy=Math.max(y1-y0,0.5);
  // Margen amplio: los diagramas de presión, las resultantes y sus cotas
  // salen de la compuerta por los dos lados.
  escala=Math.max(2,Math.min(Math.min((W-340)/dx,(H-170)/dy),900));
  dibujar();
}

// ═══════════════════════════════════════════════════════════
//  EJEMPLOS DE VERIFICACIÓN
//  Casos de complejidad creciente, contrastados con las fórmulas cerradas
//  del curso (Hibbeler ej. 9.14 y §9.5; Beer §5.9 y prob. 5.79/5.84).
// ═══════════════════════════════════════════════════════════
const EJEMPLOS = [
  {
    id:'vertical',
    nom:'Placa vertical entre 2 y 5 m de profundidad',
    desc:'Compuerta AB vertical de 3 m, ancho 1.5 m, con la superficie del agua 2 m por encima de A. '
        +'Articulada en A y apoyada en un tope liso en B. Es el ejemplo 9.14 de Hibbeler.',
    esperado:'F₁ = 154.51 kN a 1.29 m sobre B (z_P = 3.71 m) · N_B = 88.29 kN ← · R_xA = 66.22 kN ← · R_yA = 0',
    armar(N){
      const A=N(0,-2), B=N(0,-5);
      addTramo(A.id,B.id,'recto');
      A.apoyo='fijo'; B.tope={ang:180, modo:'normal', lado:2};
      zonas = {1:[{g:9.81, niv:0}], 2:[]};
      return 1.5;
    }
  },
  {
    id:'inclinada',
    nom:'Compuerta inclinada apoyada en el fondo',
    desc:'Compuerta AB de 2 × 3 (inclinada), ancho 2 m, articulada en A al nivel del agua y apoyada en B '
        +'sobre el fondo liso del canal (reacción vertical). El agua queda sobre la placa, a su derecha. Como Beer prob. 5.84.',
    esperado:'Diagrama triangular: F₁ = γ z̄ A = 9.81·1.5·(3.606·2) = 106.11 kN, en P a 2/3 de AB (z_P = 2.00 m) · R_B = 127.53 kN ↑ · R_xA = 88.29 kN → · R_yA = 68.67 kN ↓',
    armar(N){
      const A=N(0,0), B=N(2,-3);
      addTramo(A.id,B.id,'recto');
      A.apoyo='fijo'; B.apoyo='movil'; B.apAng=90; B.apModo='angulo';
      zonas = {1:[], 2:[{g:9.81, niv:0}]};
      return 2;
    }
  },
  {
    id:'curva',
    nom:'Compuerta curva (cuarto de círculo)',
    desc:'Arco AB de radio 2 m con centro en (2 ; 0), ancho 2 m; el agua llena el cuarto de círculo, a la derecha, '
        +'hasta el nivel de A. Articulada en B (abajo) y con un tope liso en A, del lado seco. Placa curva de Hibbeler §9.5.',
    esperado:'F_h = γ(1)(2)(2) = 39.24 kN ← · F_v = peso del cuarto de círculo de agua = γ b πR²/4 = 61.64 kN ↓ · F₁ = 73.07 kN por el centro del arco · N_A = 39.24 kN →',
    armar(N){
      const A=N(0,0), B=N(2,-2);
      const t = addTramo(A.id,B.id,'arco'); t.flecha = -(2 - Math.SQRT2);   // R(1 − cos 45°), combado hacia fuera del agua
      B.apoyo='fijo'; A.tope={ang:0, modo:'normal', lado:1};
      zonas = {1:[], 2:[{g:9.81, niv:0}]};
      return 2;
    }
  },
  {
    id:'capas',
    nom:'Dos líquidos: aceite sobre agua',
    desc:'Compuerta AB vertical de 4 m, ancho 1 m. A la izquierda, 1.5 m de aceite (γ = 8.5) sobre agua (γ = 9.81). '
        +'Articulada en A (en la superficie) y tope liso en B.',
    esperado:'p en el cambio de capa = 8.5·1.5 = 12.75; en B = 12.75 + 9.81·2.5 = 37.28 kN/m². F₁ = 9.56 + 62.53 = 72.09 kN (z_P = 2.70 m) · N_B = 48.57 kN. Se resuelve por capas: cada una, rectángulo + triángulo.',
    armar(N){
      const A=N(0,0), B=N(0,-4);
      addTramo(A.id,B.id,'recto');
      A.apoyo='fijo'; B.tope={ang:180, modo:'normal', lado:2};
      zonas = {1:[{g:8.5, niv:0},{g:9.81, niv:-1.5}], 2:[]};
      return 1;
    }
  },
  {
    id:'dosLados',
    nom:'Compuerta de marea: líquido a los dos lados',
    desc:'Compuerta AB vertical de 3 m y 1.2 m de ancho, con bisagra en A (arriba) y tope en B. A la derecha, mar '
        +'(γ = 10.05) 0.5 m por encima de A; a la izquierda, agua dulce (γ = 9.81) 0.3 m por debajo de A. Como Beer prob. 5.79.',
    esperado:'Dos fuerzas en el DCL: F₁ = 42.91 kN del agua dulce (izquierda, 2.7 m mojados, z_P = 1.80 m) y F₂ = 72.36 kN del mar (derecha, z_P = 2.38 m). El tope, del lado izquierdo, resiste la diferencia: N_B = 15.19 kN → · R_xA = 14.26 kN →',
    armar(N){
      const A=N(0,0), B=N(0,-3);
      addTramo(A.id,B.id,'recto');
      A.apoyo='fijo'; B.tope={ang:0, modo:'normal', lado:1};
      zonas = {1:[{g:9.81, niv:-0.3}], 2:[{g:10.05, niv:0.5}]};
      return 1.2;
    }
  },
  {
    id:'rotula',
    nom:'Compuerta de dos hojas con rótula',
    desc:'Hoja vertical AB articulada en A, rótula en B y hoja inclinada BC articulada en C. Ancho 1 m, agua a la izquierda hasta A. '
        +'Cuatro incógnitas y cuatro ecuaciones: la rótula aporta ΣM_B = 0 de una hoja.',
    esperado:'F₁ = 19.62 kN (hoja AB) y F₂ = 73.57 kN (hoja BC, inclinada). La rótula da ΣM_B = 0 de la hoja AB, que despeja R_xA = 6.54 kN ←; luego ΣF_x, ΣM_A y ΣF_y.',
    armar(N){
      const A=N(0,0), B=N(0,-2), C=N(1.5,-4);
      addTramo(A.id,B.id,'recto'); addTramo(B.id,C.id,'recto');
      A.apoyo='fijo'; C.apoyo='fijo'; B.rotula=true;
      zonas = {1:[{g:9.81, niv:0}], 2:[]};
      return 1;
    }
  }
];

function abrirEjemplos(){
  const el = document.getElementById('ejLista');
  if(el) el.innerHTML = EJEMPLOS.map((e,i)=>
      '<div class="item-row" style="display:block;padding:9px 11px;margin-bottom:7px;cursor:pointer" '
    + 'onclick="cargarEjemplo(\'' + e.id + '\')">'
    + '<div style="font-weight:700;font-size:11.5px;color:var(--acc)">' + (i+1) + ' · ' + e.nom + '</div>'
    + '<div class="hint-sm" style="margin-top:3px">' + e.desc + '</div>'
    + '<div class="hint-sm" style="margin-top:3px;color:var(--acc2)"><b>Referencia:</b> ' + e.esperado + '</div>'
    + '</div>').join('');
  document.getElementById('ejModal').classList.add('show');
}
function cerrarEjemplos(){ document.getElementById('ejModal').classList.remove('show'); }

// Sin argumento carga el primero, para no romper llamadas antiguas.
function cargarEjemplo(id){
  const ej = EJEMPLOS.find(e=>e.id === id) || EJEMPLOS[0];
  registrarCambio();
  nodos=[]; tramos=[]; nodoSeq=0; tramoSeq=0; selN=[]; selT=[]; R=null; selNodo=null;
  // Nudo en coordenada EXACTA: addNodo engancha a la rejilla, cuyo paso
  // depende del zoom.
  const N = (x,y)=>{
    const n = {id:++nodoSeq, x, y, nombre:'', apoyo:null, apAng:90, apModo:'angulo', rotula:false, tope:null};
    nodos.push(n); return n;
  };
  const b = ej.armar(N);
  const eb=document.getElementById('pB'); if(eb) eb.value = b || 1;
  reNombrar(); centrar(); refrescar(); calcular();
  cerrarEjemplos();
}

function openUnitsModal(){
  document.getElementById('selLen').value = unitLen;
  document.getElementById('selFor').value = unitFor;
  updateUnitsPreview();
  document.getElementById('unitsModal').classList.add('show');
}
function closeUnitsModal(){ document.getElementById('unitsModal').classList.remove('show'); }
function updateUnitsPreview(){
  const L = document.getElementById('selLen').value, F = document.getElementById('selFor').value;
  document.getElementById('upP').textContent = F+'/'+L+'²';
  document.getElementById('upG').textContent = F+'/'+L+'³';
}
function applyUnits(){
  const nL=document.getElementById('selLen').value, nF=document.getElementById('selFor').value;
  const kL=LEN_A_M[unitLen]/LEN_A_M[nL], kF=FOR_A_KN[unitFor]/FOR_A_KN[nF];
  nodos.forEach(n=>{ n.x*=kL; n.y*=kL; });
  tramos.forEach(t=>{ t.flecha=(t.flecha||0)*kL; });
  const eb=document.getElementById('pB');
  if(eb && eb.value!=='') eb.value=(parseFloat(eb.value)||0)*kL;
  [1,2].forEach(z=>zonas[z].forEach(l=>{ l.niv*=kL; l.g = l.g*kF/(kL*kL*kL); }));
  unitLen=nL; unitFor=nF;
  document.getElementById('chipUnits').textContent=nL+' · '+nF;
  ['uL5','uL6','uL7'].forEach(id=>{ const e=document.getElementById(id); if(e) e.textContent=nL; });
  ['uG1','uG2'].forEach(id=>{ const e=document.getElementById(id); if(e) e.textContent=nF+'/'+nL+'³'; });
  R=null; closeUnitsModal(); centrar(); refrescar();
}
function fillDec(id,val){
  const s = document.getElementById(id); if(!s) return;
  s.innerHTML = '';
  for(let i=0;i<=5;i++){
    const o = document.createElement('option');
    o.value = i; o.textContent = i + (i===1?' decimal':' decimales');
    if(i===val) o.selected = true;
    s.appendChild(o);
  }
}
// Etiqueta de decimales en palabras, igual que en los demás capítulos.
function textoDecimales(){
  const v = Object.values(DEC);
  const iguales = v.every(x=>x===v[0]);
  return iguales ? (v[0] + (v[0]===1?' decimal':' decimales'))
                 : v.join(' / ') + ' decimales';
}

function openDecModal(){
  fillDec('selDecLen',DEC.len); fillDec('selDecFor',DEC.fuerza);
  updateDecPreview(); document.getElementById('decModal').classList.add('show');
}
function closeDecModal(){ document.getElementById('decModal').classList.remove('show'); }
function updateDecPreview(){
  const g = id => { const e = document.getElementById(id); return e?(parseInt(e.value,10)||0):2; };
  const a = document.getElementById('dpL'), b2 = document.getElementById('dpF');
  if(a) a.textContent = (3.14159).toFixed(g('selDecLen'))+' '+unitLen;
  if(b2) b2.textContent = (58.9231).toFixed(g('selDecFor'))+' '+unitFor;
}
function applyDecModal(){
  const g = id => { const e = document.getElementById(id); return e?(parseInt(e.value,10)||0):2; };
  DEC = {len:g('selDecLen'), fuerza:g('selDecFor')};
  document.getElementById('chipDec').textContent = textoDecimales();
  closeDecModal();
  if(R && !R.error) calcular(); else refrescar();
}
