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
  const base = nodo(idsNodos[0]);
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
  const idsCargas = selCargas.filter(id=>{ const c=cargas.find(z=>z.id===id); return c && idsTramos.indexOf(c.tramo)>=0; });
  const nuevosNodos=[], nuevosTramos=[], nuevasCargas=[];
  for(let i=1;i<=nrep;i++){
    const mapaNodo = {};
    idsNodos.forEach(id=>{
      const o = nodo(id); if(!o) return;
      const nn = Object.assign({}, o, {id:++nodoSeq, x:o.x+dx*i, y:o.y+dy*i, nombre:''});
      nodos.push(nn); mapaNodo[id] = nn.id; nuevosNodos.push(nn.id);
    });
    idsTramos.forEach(id=>{
      const o = tramos.find(z=>z.id===id); if(!o) return;
      const nt = Object.assign({}, o, {id:++tramoSeq, a:mapaNodo[o.a], b:mapaNodo[o.b]});
      tramos.push(nt); nuevosTramos.push(nt.id);
      idsCargas.forEach(cid=>{
        const c = cargas.find(z=>z.id===cid);
        if(c && c.tramo===id){
          const nc = Object.assign({}, c, {id:++cargaSeq, tramo:nt.id});
          cargas.push(nc); nuevasCargas.push(nc.id);
        }
      });
    });
  }
  reNombrar();
  selNodos = nuevosNodos; selTramos = nuevosTramos; selCargas = nuevasCargas;
  selNodo = nuevosNodos.length ? nuevosNodos[nuevosNodos.length-1] : null;
  selTramo = nuevosTramos.length ? nuevosTramos[nuevosTramos.length-1] : null;
  R = null;
  closeReplicar(); refrescar();
}
function limpiarTodo(){
  registrarCambio();
  // Sin confirm: en algunos navegadores móviles se bloquea y devolvía false,
  // por lo que el botón parecía no hacer nada. Lo guardado no se toca.
  if(!nodos.length && !tramos.length && !cargas.length){
    aviso('No hay nada que limpiar todavía.'); return;
  }
  nodos=[]; tramos=[]; cargas=[]; nodoSeq=0; tramoSeq=0; cargaSeq=0;
  selNodo=null; selTramo=null; primerNodo=null; R=null;
  selNodos=[]; selTramos=[]; selCargas=[];
  document.getElementById('resultsArea').style.display='none';
  const rp=document.getElementById('resultsPanel'); if(rp){ rp.innerHTML=''; rp.style.display='none'; }
  const hh=document.getElementById('noResultsHint'); if(hh) hh.style.display='';
  centrar(); refrescar();
}
// ═══════════════════════════════════════════════════════════
//  EJEMPLOS DE VERIFICACIÓN
//  Cada entrada arma una viga cuyo resultado se conoce por desarrollo
//  analítico. Sirven para contrastar el motor contra casos de referencia,
//  no solo para tener algo dibujado en pantalla.
// ═══════════════════════════════════════════════════════════
const EJEMPLOS = [
  {
    id:'simple',
    nom:'Viga simple con puntual y distribuida',
    desc:'8 m · apoyo fijo en A y móvil en C · P = 10 kN a 2 m · w = 5 kN/m entre 4 y 8 m.',
    esperado:'R<sub>A</sub> = 12.50 · R<sub>C</sub> = 17.50 kN · M<sub>máx</sub> = 30.63 kN·m en x = 4.50 m',
    armar(N){
      const A=N(0,0), B=N(4,0), C=N(8,0);
      addTramo(A.id,B.id); addTramo(B.id,C.id);
      A.apoyo='simple'; C.apoyo='movil';
      cargas.push({id:++cargaSeq, tipo:'P', destino:'tramo', tramo:tramos[0].id, pos:2, mag:10, mag2:0});
      cargas.push({id:++cargaSeq, tipo:'U', destino:'tramo', tramo:tramos[1].id, pos:0, posFin:4, mag:5, mag2:5});
    }
  },
  {
    id:'triangular',
    nom:'Triangular, puntual, momento y voladizo',
    desc:'A apoyo fijo · B móvil a 7 m · voladizo de 1 m · triangular 0→2 T/m en 0–3 m · '
        +'P = 1 T a 3 m · momento 3 T·m en C · w = 2 T/m entre 3 y 7 m · P = 0.5 T en el extremo.',
    esperado:'Comprobar equilibrio: ΣF y ΣM deben cerrar; M = 0 en los dos apoyos libres del voladizo.',
    armar(N){
      const A=N(0,0), C=N(3,0), B=N(7,0), D=N(8,0);
      addTramo(A.id,C.id); addTramo(C.id,B.id); addTramo(B.id,D.id);
      A.apoyo='simple'; B.apoyo='movil';
      // triangular creciente 0 -> 2 sobre A–C
      cargas.push({id:++cargaSeq, tipo:'T', destino:'tramo', tramo:tramos[0].id, pos:0, posFin:3, mag:0, mag2:2});
      cargas.push({id:++cargaSeq, tipo:'P', destino:'tramo', tramo:tramos[0].id, pos:3, mag:1, mag2:0});
      cargas.push({id:++cargaSeq, tipo:'M', destino:'nudo', nudo:C.id, mag:3, mag2:0});
      cargas.push({id:++cargaSeq, tipo:'U', destino:'tramo', tramo:tramos[1].id, pos:0, posFin:4, mag:2, mag2:2});
      cargas.push({id:++cargaSeq, tipo:'P', destino:'tramo', tramo:tramos[2].id, pos:1, mag:0.5, mag2:0});
    }
  },
  {
    id:'rotula',
    nom:'Empotrada con rótula y carga inclinada',
    desc:'10 m · empotramiento en A · rótula en C (4 m) · móvil en F · w = 10 kN/m entre 2 y 6 m · '
        +'momento 5 kN·m · P = 100 kN a 45° en E · w = 5 kN/m entre 8 y 10 m.',
    esperado:'R<sub>A,x</sub> = −70.71 kN · ΣF<sub>y</sub> de reacciones = 120.71 kN · M = 0 en la rótula',
    armar(N){
      const A=N(0,0), B=N(2,0), C=N(4,0), D=N(6,0), E=N(8,0), F=N(10,0);
      addTramo(A.id,B.id); addTramo(B.id,C.id); addTramo(C.id,D.id);
      addTramo(D.id,E.id); addTramo(E.id,F.id);
      A.apoyo='empotrado'; F.apoyo='movil'; C.rotula=true;
      cargas.push({id:++cargaSeq, tipo:'U', destino:'tramo', tramo:tramos[1].id, pos:0, posFin:2, mag:10, mag2:10});
      cargas.push({id:++cargaSeq, tipo:'U', destino:'tramo', tramo:tramos[2].id, pos:0, posFin:2, mag:10, mag2:10});
      // el momento va DENTRO del tramo C–D, no sobre la rótula: colocarlo
      // justo en la rótula haría saltar M a un lado de un punto que, por
      // definición, no transmite momento
      cargas.push({id:++cargaSeq, tipo:'M', destino:'nudo', nudo:D.id, mag:-5, mag2:0});
      const P = 100, c = Math.SQRT1_2;
      cargas.push({id:++cargaSeq, tipo:'P', dir:'y', destino:'tramo', tramo:tramos[3].id, pos:2, mag:P*c, mag2:0});
      cargas.push({id:++cargaSeq, tipo:'P', dir:'x', destino:'tramo', tramo:tramos[3].id, pos:2, mag:P*c, mag2:0});
      cargas.push({id:++cargaSeq, tipo:'U',  destino:'tramo', tramo:tramos[4].id, pos:0, posFin:2, mag:5, mag2:5});
    }
  },
  {
    id:'portico',
    nom:'Pórtico quebrado con tramo inclinado',
    desc:'Tres tramos: horizontal A–D, inclinado 3-4 hasta G y horizontal G–J · '
        +'w = 8 kN/m en A–C · fuerza de 24 kN en C · momento 20 kN·m en D · '
        +'w = 6 kN/m vertical sobre el tramo inclinado · P = 30 kN · momento 10 kN·m · w = 6 kN/m en G–J.',
    esperado:'Caso de geometría quebrada: comprobar que N deja de ser nula en el tramo inclinado.',
    armar(N){
      // pendiente 3:4 -> por cada 4 en x baja 3 en y
      const A=N(0,0), C=N(9,0), D=N(12,0), G=N(20,-6), J=N(32,-6);
      addTramo(A.id,C.id); addTramo(C.id,D.id); addTramo(D.id,G.id); addTramo(G.id,J.id);
      A.apoyo='simple'; J.apoyo='movil';
      cargas.push({id:++cargaSeq, tipo:'U', destino:'tramo', tramo:tramos[0].id, pos:0, posFin:6, mag:8, mag2:8});
      cargas.push({id:++cargaSeq, tipo:'P', destino:'tramo', tramo:tramos[0].id, pos:9, mag:-24, mag2:0});
      cargas.push({id:++cargaSeq, tipo:'M', destino:'nudo', nudo:D.id, mag:20, mag2:0});
      cargas.push({id:++cargaSeq, tipo:'T', destino:'tramo', tramo:tramos[2].id, pos:1.6, posFin:8.4, mag:0, mag2:6});
      cargas.push({id:++cargaSeq, tipo:'P', destino:'tramo', tramo:tramos[3].id, pos:3, mag:30, mag2:0});
      cargas.push({id:++cargaSeq, tipo:'M', destino:'nudo', nudo:G.id, mag:-10, mag2:0});
      cargas.push({id:++cargaSeq, tipo:'U', destino:'tramo', tramo:tramos[3].id, pos:5, posFin:12, mag:6, mag2:6});
    }
  }
];

function abrirEjemplos(){
  const el = document.getElementById('ejLista');
  // Un solo ejemplo a la vista; los demás siguen en el código como casos de
  // verificación, que es lo que contrasta la consola (CLAUDE.md §4).
  if(el) el.innerHTML = EJEMPLOS.slice(0,1).map((e,i)=>
      '<button type="button" class="ej-item" onclick="cargarEjemplo(\'' + e.id + '\')">'
    + '<div class="ej-cab"><span class="ej-num">' + (i+1) + '</span><span class="ej-nom">' + e.nom + '</span></div>'
    + '<div class="ej-desc">' + e.desc + '</div>'
    + '<div class="ej-ref"><b>Referencia:</b> ' + e.esperado + '</div>'
    + '</button>').join('');
  document.getElementById('ejModal').classList.add('show');
}
function cerrarEjemplos(){ document.getElementById('ejModal').classList.remove('show'); }

// ── Verificación automática de cada ejemplo (propuesta 5, 2026-09-08) ──
// Cada caso lleva comprobaciones resueltas a mano: reacciones, extremos de
// M, momento nulo en rótulas y extremos libres, y N distinta de cero en un
// tramo inclinado. Si alguna se desvía más del 0.1 %, avisa por consola.
function _reaccionDe(r, nombre, tipo){
  for(let j=0;j<r.inc.length;j++){ const u = r.inc[j]; if(u.n.nombre === nombre && u.tipo === tipo) return r.val[j]; }
  return null;
}
function _momentoEnNudo(r, nombre){
  for(const t of r.internas){
    if(t.desde.nombre === nombre && t.subs.length) return polyVal(t.subs[0].cM, t.subs[0].sa);
  }
  for(const t of r.internas){
    if(t.hasta.nombre === nombre && t.subs.length){ const su = t.subs[t.subs.length-1]; return polyVal(su.cM, su.sb); }
  }
  return null;
}
function _maxAbsSerie(t, clave){
  const campo = {N:'cN', V:'cV', M:'cM'}[clave];
  let m = 0;
  t.subs.forEach(su=>{ for(let i=0;i<=12;i++){ const v = Math.abs(polyVal(su[campo], su.sa + (su.sb-su.sa)*i/12)); if(v > m) m = v; } });
  return m;
}
const VERIFICACIONES = {
  simple(r){
    const g = gruposDireccion(r)[0], e = extremosSerie(g, 'M');
    return [
      {q:'R_yA', esp:12.5, obt:_reaccionDe(r,'A','Ry')},
      {q:'R_yC', esp:17.5, obt:_reaccionDe(r,'C','Ry')},
      {q:'M_max', esp:30.625, obt:e.mx && e.mx.v},
      {q:'x(M_max)', esp:4.5, obt:e.mx && e.mx.x, tol:0.01}
    ];
  },
  // Ojo: reNombrar bautiza los nudos por orden de creación (A, B, C, D…), no
  // con las letras de las variables de `armar`. En este ejemplo el apoyo
  // móvil (x = 7) es C y el extremo del voladizo es D.
  triangular(r){
    return [
      {q:'M en A (apoyo fijo)', esp:0, obt:_momentoEnNudo(r,'A'), abs:1e-6},
      {q:'M en D (extremo libre)', esp:0, obt:_momentoEnNudo(r,'D'), abs:1e-6},
      {q:'M en C (apoyo movil, voladizo de 1 m con 0.5 T)', esp:-0.5*1, obt:_momentoEnNudo(r,'C')}
    ];
  },
  rotula(r){
    let sumRy = 0; r.inc.forEach((u,j)=>{ if(u.tipo==='Ry') sumRy += r.val[j]; });
    return [
      {q:'R_xA', esp:-70.7107, obt:_reaccionDe(r,'A','Rx')},
      {q:'suma R_y', esp:120.7107, obt:sumRy},
      {q:'M en la rotula C', esp:0, obt:_momentoEnNudo(r,'C'), abs:1e-6}
    ];
  },
  portico(r){
    const inclinado = r.internas.find(t=>Math.abs(t.ang) > 1 && Math.abs(Math.abs(t.ang)-90) > 1);
    return [
      {q:'M en A (apoyo fijo)', esp:0, obt:_momentoEnNudo(r,'A'), abs:1e-6},
      {q:'M en E (apoyo movil, extremo)', esp:0, obt:_momentoEnNudo(r,'E'), abs:1e-6},
      {q:'N no nula en el tramo inclinado', esp:'>0', obt:inclinado ? _maxAbsSerie(inclinado,'N') : null}
    ];
  }
};
function comprobarEjemploFI(id, r){
  const fn = VERIFICACIONES[id];
  if(!fn || !r || r.error) return;
  let desvios = 0;
  fn(r).forEach(c=>{
    let mal;
    if(c.obt === null || c.obt === undefined) mal = true;
    else if(c.esp === '>0') mal = !(c.obt > 1e-6);
    else if(c.abs !== undefined) mal = Math.abs(c.obt - c.esp) > c.abs;
    else mal = Math.abs(c.obt - c.esp) > (c.tol || 1e-3)*Math.max(1, Math.abs(c.esp));
    if(mal){ desvios++; console.warn('Ejemplo ' + id + ': ' + c.q + ' se desvía de la referencia', {esperado:c.esp, obtenido:c.obt}); }
  });
  return desvios;
}

// Sin argumento carga el primero, para no romper llamadas antiguas.
function cargarEjemplo(id){
  const ej = EJEMPLOS.find(e=>e.id === id) || EJEMPLOS[0];
  registrarCambio();
  nodos=[]; tramos=[]; cargas=[]; pesos=[]; nodoSeq=0; tramoSeq=0; cargaSeq=0;
  pesoSeq=0; pesoActivo=null; R=null;
  selNodos=[]; selTramos=[]; selCargas=[]; selNodo=null; selTramo=null;
  // Nudo en coordenada EXACTA: addNodo engancha a la rejilla, y su paso
  // depende del zoom, así que un ejemplo cargado con la vista alejada se
  // armaba en posiciones equivocadas.
  const N = (x,y)=>{
    const n = {id:++nodoSeq, x:x, y:y, nombre:'', apoyo:'libre', rotula:false};
    nodos.push(n); return n;
  };
  ej.armar(N);
  reNombrar(); centrar(); refrescar(); calcular();
  comprobarEjemploFI(ej.id, R);
  cerrarEjemplos();
}
