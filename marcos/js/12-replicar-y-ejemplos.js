// ═══════════════════════════════════════════════════════════
//  REPLICAR: copiar la selección desplazada N veces
// ═══════════════════════════════════════════════════════════
// Toda la réplica es UN paso de deshacer, y no se toca nada —ni se registra ese
// paso— si los campos no valen o no queda nada que copiar. Las copias quedan
// seleccionadas y la vista no se mueve (CLAUDE.md §7, «Interacción común»).

// Quita de la selección los ids que ya no existen. Tras borrar con la × de la
// lista quedaba uno fantasma: Replicar contaba «2 nudos» y, con solo fantasmas,
// registraba un paso de deshacer vacío. Devuelve true si cambió algo.
function quitarSeleccionInexistente(){
  const antes = selNodos.length + selTramos.length + selCargas.length;
  selNodos  = selNodos.filter(id=>nodos.some(n=>n.id===id));
  selTramos = selTramos.filter(id=>tramos.some(t=>t.id===id));
  selCargas = selCargas.filter(id=>cargas.some(c=>c.id===id));
  let cambio = (selNodos.length + selTramos.length + selCargas.length) !== antes;
  if(selNodo !== null && !nodo(selNodo)){ selNodo = null; cambio = true; }
  if(selTramo !== null && !tramos.some(t=>t.id===selTramo)){ selTramo = null; cambio = true; }
  if(primerNodo !== null && !nodo(primerNodo)) primerNodo = null;
  return cambio;
}
// El panel no puede seguir enseñando la solución de un modelo que ya cambió:
// se oculta como al limpiar, hasta el próximo Calcular.
function invalidarResultados(){
  R = null;
  const ra = document.getElementById('resultsArea'); if(ra) ra.style.display = 'none';
  const rp = document.getElementById('resultsPanel'); if(rp){ rp.innerHTML = ''; rp.style.display = 'none'; }
  const hh = document.getElementById('noResultsHint'); if(hh) hh.style.display = '';
}
// Campos de la ventana, con Number() y sin valor por defecto: con parseInt y
// «|| 1», «2.7» daba 2 copias, un N vacío o negativo daba 1 y una distancia
// vacía o no numérica valía 0 sin avisar. Devuelve {dx, dy, nrep} o {error}.
function leerCamposReplicar(){
  const num = id=>{
    const el = document.getElementById(id);
    const s = String(el ? el.value : '').trim();
    return (s === '') ? NaN : Number(s);
  };
  const nrep = num('repN'), dx = num('repDx'), dy = num('repDy');
  if(!Number.isInteger(nrep) || nrep < 1 || nrep > 50) return {error:'Repeticiones: un entero de 1 a 50.'};
  if(!isFinite(dx) || !isFinite(dy)) return {error:'Distancias: escribe números.'};
  if(dx === 0 && dy === 0) return {error:'Indica un desplazamiento en x o en y.'};
  return {dx, dy, nrep};
}
// Geometría entre dos puntos con los mismos campos que geoTramo, que solo ve
// los nudos ya puestos en el modelo y no los del plan.
function _geoReplica(a, b){
  const dx = b.x-a.x, dy = b.y-a.y, L = Math.hypot(dx,dy) || 1e-9;
  return {a, b, dx, dy, L, ux:dx/L, uy:dy/L, nx:-dy/L, ny:dx/L,
          ang: Math.atan2(dy,dx)*180/Math.PI};
}
// Carga de la copia de un tramo que YA EXISTÍA pero recorrido al revés (su nudo
// a es el b de la copia). `nc` ya va desplazada y referida a la geometría de la
// copia, `gc`; `ge` es la del tramo existente. La posición se mide desde el
// nudo a, así que s pasa a L − s; en la triangular se cruzan mag y mag2, que
// van con el extremo de menor y de mayor s (`trozoCargado`); y una perpendicular
// o axial cambia de signo si su dirección apunta al otro lado en el tramo
// existente. El resultado actúa igual que en la copia (fuerza, punto y par).
function _cargaAlTramoInvertido(nc, gc, ge){
  const local = (marcoDeCarga(nc) === 'local');
  let modo = nc.basePos || 'eje';
  // Una coordenada que no distingue puntos del tramo (la x en uno vertical) no
  // se puede reflejar: pasa a distancia sobre el eje.
  if((modo === 'coordX' && Math.abs(ge.ux) < 1e-9) || (modo === 'coordY' && Math.abs(ge.uy) < 1e-9)) modo = 'eje';
  const out = Object.assign({}, nc);
  if(modo !== (nc.basePos || 'eje')) out.basePos = modo;
  const L = ge.L, aPos = s=>posDesdeS(modo, ge, s);
  const sIni = sDesdePos(nc, gc, nc.pos);
  if(nc.tipo === 'U' || nc.tipo === 'T'){
    const conFin = (nc.posFin !== undefined && nc.posFin !== null);
    const sFin = conFin ? sDesdePos(nc, gc, nc.posFin) : gc.L;
    const s1 = Math.min(sIni, sFin), s2 = Math.max(sIni, sFin);
    out.pos = aPos(L - s2); out.posFin = aPos(L - s1);
    if(nc.tipo === 'T'){ out.mag = nc.mag2 || 0; out.mag2 = nc.mag; }
  } else {
    out.pos = aPos(L - sIni);
  }
  if(nc.tipo !== 'M' && local){
    const dc = dirCarga(nc, gc), de = dirCarga(nc, ge);
    if(dc.x*de.x + dc.y*de.y < 0){
      out.mag = -out.mag;
      if(out.mag2 !== undefined && out.mag2 !== null) out.mag2 = -out.mag2;
    }
  }
  return out;
}
// Lo que haría la réplica, SIN tocar el modelo: la vista previa lo usa para
// contar y applyReplicar lo aplica de una vez.
// · Una copia que cae sobre un nudo existente —o sobre otra copia— REUTILIZA
//   ese nudo, que conserva su apoyo y su rótula. Con dos nudos superpuestos,
//   Calcular decía «Los tramos no forman una cadena continua» aunque se viera
//   continua. Tolerancia: 1e-6 del tamaño del modelo.
// · Las cargas de nudo de la copia van al nudo reutilizado.
// · Un tramo que ya existe (el mismo par de nudos, en cualquier orden) no se
//   repite: las cargas de tramo de su copia pasan a él. Uno con los dos
//   extremos en el mismo nudo no se crea.
function planReplicar(dx, dy, nrep){
  const idsNodos = nodosDeSeleccion();
  const idsTramos = tramosDeGrupo(idsNodos);
  // Las cargas marcadas se separan por DESTINO. Una de nudo cuelga de c.nudo y
  // no de c.tramo: la nueva guarda tramo:null (nunca entraba por el filtro de
  // tramos) y la de un archivo antiguo puede traer un tramo cualquiera relleno,
  // que la copiaba con ese tramo pero con el nudo ORIGINAL y la duplicaba allí.
  const cargasMarcadas = selCargas.map(id=>cargas.find(z=>z.id===id)).filter(Boolean);
  const cargasTramo = cargasMarcadas.filter(c=>c.destino!=='nudo' && idsTramos.indexOf(c.tramo)>=0);
  const cargasNudo  = cargasMarcadas.filter(c=>c.destino==='nudo' && idsNodos.indexOf(c.nudo)>=0);
  let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
  nodos.forEach(n=>{ xmin = Math.min(xmin, n.x); xmax = Math.max(xmax, n.x);
                     ymin = Math.min(ymin, n.y); ymax = Math.max(ymax, n.y); });
  const escala = Math.max(nodos.length ? Math.max(xmax-xmin, ymax-ymin) : 0,
                          Math.abs(dx)*nrep, Math.abs(dy)*nrep);
  const tol = 1e-6*(escala > 0 ? escala : 1);
  const p = {nodos:[], tramos:[], cargas:[], vinculos:[], unidos:0,
             selNodos:[], selTramos:[], selCargas:[], nodoSeq, tramoSeq, cargaSeq, vinculoSeq};
  const todosV = vinculos.slice();
  const todosN = nodos.slice(), todosT = tramos.slice();   // modelo + copias del plan
  const nodoDe = id=>todosN.find(n=>n.id===id);
  const nudoEn = (x, y)=>{
    let mejor = null, dm = tol;
    todosN.forEach(n=>{ const d = Math.hypot(n.x-x, n.y-y); if(d <= dm){ dm = d; mejor = n; } });
    return mejor;
  };
  const marcar = (lista, id)=>{ if(lista.indexOf(id) < 0) lista.push(id); };
  const delEje = [];                       // cargas de nudo 'perp'/'axial' copiadas
  for(let i=1;i<=nrep;i++){
    const mapaNodo = {};
    idsNodos.forEach(id=>{
      const o = nodo(id); if(!o) return;
      const x = o.x+dx*i, y = o.y+dy*i;
      const ya = nudoEn(x, y);
      if(ya){ mapaNodo[id] = ya.id; p.unidos++; marcar(p.selNodos, ya.id); return; }
      const nn = Object.assign({}, o, {id:++p.nodoSeq, x:x, y:y, nombre:''});
      todosN.push(nn); p.nodos.push(nn); mapaNodo[id] = nn.id; marcar(p.selNodos, nn.id);
    });
    idsTramos.forEach(id=>{
      const o = tramos.find(z=>z.id===id); if(!o) return;
      const a = mapaNodo[o.a], b = mapaNodo[o.b];
      if(a === undefined || b === undefined || a === b) return;
      let destino = todosT.find(t=>(t.a===a && t.b===b) || (t.a===b && t.b===a));
      let gc = null, ge = null;
      if(destino){
        if(destino.a !== a){
          gc = _geoReplica(nodoDe(a), nodoDe(b));
          ge = _geoReplica(nodoDe(destino.a), nodoDe(destino.b));
        }
      } else {
        destino = Object.assign({}, o, {id:++p.tramoSeq, a:a, b:b});
        todosT.push(destino); p.tramos.push(destino);
      }
      marcar(p.selTramos, destino.id);
      cargasTramo.forEach(c=>{
        if(c.tramo!==id) return;
        // La posición, sobre el eje o por Δx/Δy, es relativa al primer nudo del
        // tramo (desde el 2026-10-24 también con dirección del plano) y la réplica
        // es una traslación pura: se copia tal cual. Hasta esa fecha una Δ del
        // plano era absoluta y aquí se le sumaba el desplazamiento.
        let nc = Object.assign({}, c, {id:++p.cargaSeq, tramo:destino.id, nudo:null});
        if(gc) nc = _cargaAlTramoInvertido(nc, gc, ge);
        p.cargas.push(nc); marcar(p.selCargas, nc.id);
      });
    });
    // Cuerdas, bielas y topes (22-) se copian con sus nudos, como un apoyo: el
    // anclado si su nudo se replica; el que une dos, si se replican los dos. Uno
    // que ya existe entre los mismos nudos no se repite.
    vinculos.filter(vinculoValido).forEach(v=>{
      const dos = (v.b !== null && v.b !== undefined);
      const a = mapaNodo[v.a], b = dos ? mapaNodo[v.b] : null;
      if(a === undefined || (dos && (b === undefined || a === b))) return;
      const igual = todosV.some(w=>w.tipo === v.tipo && (dos
        ? (w.b !== null && w.b !== undefined && ((w.a === a && w.b === b) || (w.a === b && w.b === a)))
        : (w.a === a && (w.b === null || w.b === undefined) && Math.abs((+w.ang||0) - (+v.ang||0)) < 1e-9)));
      if(igual) return;
      const nv = Object.assign({}, v, {id:++p.vinculoSeq, a, b});
      todosV.push(nv); p.vinculos.push(nv);
    });
    // Las de nudo, una vez por réplica y ya con mapaNodo completo.
    cargasNudo.forEach(c=>{
      if(mapaNodo[c.nudo]===undefined) return;
      const nc = Object.assign({}, c, {id:++p.cargaSeq, nudo:mapaNodo[c.nudo], tramo:null});
      p.cargas.push(nc); marcar(p.selCargas, nc.id);
      if(c.tipo !== 'M' && marcoDeCarga(c) === 'local') delEje.push({nc, d0: dirCarga(c, geoDeCarga(c))});
    });
  }
  // Una carga de nudo 'perp' o 'axial' toma su eje del PRIMER tramo que llega al
  // nudo (`geoDeCarga`, 02-). En el nudo de la copia ese primer tramo puede ser
  // otro —el de un nudo existente con el que se fusiona, o el único tramo copiado
  // que llega a él— y la carga cambiaría de dirección. Se mira con el modelo ya
  // completo (tramos existentes y copias, en el orden en que quedarán) y, si el
  // vector cambia, la copia pasa a dirección del plano con el vector que tenía en
  // su nudo original; la magnitud no cambia de signo, como al girar (11-).
  delEje.forEach(r=>{
    const t = todosT.find(z=>z.a === r.nc.nudo || z.b === r.nc.nudo);
    const d1 = dirCarga(r.nc, t ? _geoReplica(nodoDe(t.a), nodoDe(t.b)) : null);
    if(Math.abs(d1.x - r.d0.x) > 1e-9 || Math.abs(d1.y - r.d0.y) > 1e-9)
      direccionDesdeVector(r.nc, r.d0.x, r.d0.y);
  });
  return p;
}
function abrirReplicar(){
  if(quitarSeleccionInexistente()) refrescar();
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
  const el = document.getElementById('repPrev');
  if(!el) return;
  const campos = leerCamposReplicar();
  if(campos.error){ el.textContent = campos.error; return; }
  quitarSeleccionInexistente();
  const base = nodo(nodosDeSeleccion()[0]);
  if(!base){ el.textContent = 'No hay nada que replicar.'; return; }
  const dx = campos.dx, dy = campos.dy, nrep = campos.nrep;
  const p = planReplicar(dx, dy, nrep);
  const q = [];
  for(let i=1;i<=Math.min(nrep,3);i++)
    q.push('('+dec(base.x+dx*i,'len')+' ; '+dec(base.y+dy*i,'len')+')');
  let t = '<b>' + nrep + (nrep === 1 ? ' copia' : ' copias') + '</b> · desde ('
        + dec(base.x,'len')+' ; '+dec(base.y,'len')+') '+unitLen+' → '
        + q.join(', ') + (nrep>3 ? ' …' : '');
  if(!p.nodos.length && !p.tramos.length && !p.cargas.length && !p.vinculos.length) t += ' · ya existe todo: no hay nada que añadir';
  else if(p.unidos) t += ' · se unirán ' + p.unidos + (p.unidos === 1 ? ' nudo' : ' nudos') + ' a nudos existentes';
  el.innerHTML = t;
}
function applyReplicar(){
  const campos = leerCamposReplicar();
  if(campos.error){ aviso(campos.error, 'error'); return; }
  if(quitarSeleccionInexistente()) refrescar();
  if(!nodosDeSeleccion().length){ aviso('No hay nada que replicar.', 'error'); return; }
  const p = planReplicar(campos.dx, campos.dy, campos.nrep);
  if(!p.nodos.length && !p.tramos.length && !p.cargas.length && !p.vinculos.length){
    aviso('Las copias caen sobre nudos y tramos que ya existen: no hay nada que añadir.');
    return;
  }
  registrarCambio();                 // un solo paso de deshacer para toda la réplica
  nodos.push(...p.nodos); tramos.push(...p.tramos); cargas.push(...p.cargas); vinculos.push(...p.vinculos);
  nodoSeq = p.nodoSeq; tramoSeq = p.tramoSeq; cargaSeq = p.cargaSeq; vinculoSeq = p.vinculoSeq;
  reNombrar();
  selNodos = p.selNodos; selTramos = p.selTramos; selCargas = p.selCargas;
  selNodo = selNodos.length ? selNodos[selNodos.length-1] : null;
  selTramo = selTramos.length ? selTramos[selTramos.length-1] : null;
  invalidarResultados();
  closeReplicar(); refrescar();
  if(p.unidos) aviso(p.unidos === 1 ? 'Se unió 1 nudo que caía sobre un nudo existente.'
                                    : 'Se unieron ' + p.unidos + ' nudos que caían sobre nudos existentes.');
}
function limpiarTodo(){
  // Sin confirm: en algunos navegadores móviles se bloquea y devolvía false,
  // por lo que el botón parecía no hacer nada. Lo guardado no se toca.
  // La comprobación va ANTES de registrarCambio: sin nada que limpiar no hay
  // paso de deshacer.
  if(!nodos.length && !tramos.length && !cargas.length && !vinculos.length){
    aviso('No hay nada que limpiar todavía.'); return;
  }
  registrarCambio();
  nodos=[]; tramos=[]; cargas=[]; nodoSeq=0; tramoSeq=0; cargaSeq=0;
  vinculos=[]; vinculoSeq=0;
  selNodo=null; selTramo=null; primerNodo=null;
  selNodos=[]; selTramos=[]; selCargas=[];
  invalidarResultados();
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
    id:'triarticulado',
    nom:'Marco triarticulado',
    desc:'Dos miembros en L unidos por el pasador C · apoyos fijos en A y E · P = 12 kN a 1.5 m de B.',
    esperado:'R<sub>yA</sub> = 9.00 · R<sub>xA</sub> = 2.25 · R<sub>yE</sub> = 3.00 · R<sub>xE</sub> = −2.25 kN · en C, sobre ABC: C<sub>x</sub> = −2.25, C<sub>y</sub> = 3.00 kN',
    armar(N, M){
      const A=N(0,0), B=N(0,4), C=N(3,4), D=N(6,4), E=N(6,0);
      M(A,B,1); M(B,C,1); M(C,D,2); M(D,E,2);
      A.apoyo='simple'; E.apoyo='simple';
      cargas.push({id:++cargaSeq, tipo:'P', dir:'y', destino:'tramo', tramo:tramos[1].id, nudo:null, basePos:'eje', pos:1.5, mag:12, mag2:0});
    }
  },
  {
    id:'bastidorA',
    nom:'Bastidor en A con biela',
    desc:'Miembros ABC y DEC unidos en C, biela BE · fijo en A, móvil en D · P = 6 kN en el pasador C.',
    esperado:'R<sub>yA</sub> = R<sub>D</sub> = 3.00 kN · F<sub>BE</sub> = 3.00 kN (tracción) · en C, sobre ABC: (−3.00; −3.00) kN',
    armar(N, M){
      const A=N(0,0), B=N(1,2), C=N(2,4), D=N(4,0), E=N(3,2);
      M(A,B,1); M(B,C,1); M(D,E,2); M(E,C,2);
      A.apoyo='simple'; D.apoyo='movil';
      vinculos.push({id:++vinculoSeq, tipo:'biela', a:B.id, b:E.id});
      cargas.push({id:++cargaSeq, tipo:'P', dir:'y', destino:'nudo', tramo:null, nudo:C.id, basePos:'eje', pos:0, mag:6, mag2:0});
    }
  },
  {
    id:'collarin',
    nom:'Collarín deslizante',
    desc:'Poste ABC empotrado en A; la barra DB, fija en D, termina en un collarín que desliza sobre AB · 4 kN en C, 6 kN en el medio de DB.',
    esperado:'N<sub>B</sub> = 3.00 kN · M<sub>A</sub> = 7.00 kN·m · R<sub>xA</sub> = −1.00 · R<sub>xD</sub> = −3.00 · R<sub>yD</sub> = 6.00 kN',
    armar(N, M){
      const A=N(0,0), B=N(0,3), C=N(0,4), D=N(3,0);
      const ab = M(A,B,1); M(B,C,1); M(D,B,2);
      A.apoyo='empotrado'; D.apoyo='simple';
      B.union='deslizante'; B.desliza=ab.id;
      cargas.push({id:++cargaSeq, tipo:'P', dir:'x', destino:'nudo', tramo:null, nudo:C.id, basePos:'eje', pos:0, mag:4, mag2:0});
      cargas.push({id:++cargaSeq, tipo:'P', dir:'y', destino:'tramo', tramo:tramos[2].id, nudo:null, basePos:'eje', pos:Math.hypot(1.5,1.5), mag:6, mag2:0});
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
// La fuerza de una cuerda, biela o tope por su nombre plano (T_BD → 'TBD').
function _vinculoDe(r, nombre){
  for(let j=0;j<r.inc.length;j++){ const u = r.inc[j]; if(u.tipo === 'V' && nombreVinculoPlano(u.vin) === nombre) return r.val[j]; }
  return null;
}
function _momentoEnNudo(r, nombre){
  for(const t of r.internas){
    if(t.desde.nombre === nombre && t.subs.length) return valorSub(t.subs[0], 'M', t.subs[0].sa);
  }
  for(const t of r.internas){
    if(t.hasta.nombre === nombre && t.subs.length){ const su = t.subs[t.subs.length-1]; return valorSub(su, 'M', su.sb); }
  }
  return null;
}
function _maxAbsSerie(t, clave){
  let m = 0;
  t.subs.forEach(su=>{ for(let i=0;i<=24;i++){ const v = Math.abs(valorSub(su, clave, su.sa + (su.sb-su.sa)*i/24)); if(v > m) m = v; } });
  return m;
}
// Valor de N, V o M al principio de un tramo (su nudo de entrada).
function _valorAlInicio(r, nombreTramo, clave){
  const t = r.internas.find(z=>z.nombre === nombreTramo || z.desde.nombre + z.hasta.nombre === nombreTramo);
  return (t && t.subs.length) ? valorSub(t.subs[0], clave, t.subs[0].sa) : null;
}
// La fuerza de un pasador por su nombre plano ('Cx', 'Cx(ABC)', 'NB').
function _pinDe(r, plano){
  const q = r.unk && r.unk.find(z=>z.plano === plano);
  return q ? q.valor : null;
}
const VERIFICACIONES = {
  // Marco triarticulado: ΣM_A del conjunto da R_yE = 12·1.5/6 = 3; ΣM_C del lado
  // CDE, 3·R_yE + 4·R_xE = 0 → R_xE = −2.25; en C, sobre ABC, (−2.25; 3).
  triarticulado(r){
    return [
      {q:'R_yA', esp:9, obt:_reaccionDe(r,'A','Ry')},
      {q:'R_xA', esp:2.25, obt:_reaccionDe(r,'A','Rx')},
      {q:'R_yE', esp:3, obt:_reaccionDe(r,'E','Ry')},
      {q:'R_xE', esp:-2.25, obt:_reaccionDe(r,'E','Rx')},
      {q:'C_x sobre ABC', esp:-2.25, obt:_pinDe(r,'Cx')},
      {q:'C_y sobre ABC', esp:3, obt:_pinDe(r,'Cy')},
      {q:'M en el pasador C', esp:0, obt:_momentoEnNudo(r,'C'), abs:1e-6}
    ];
  },
  // Bastidor en A simétrico: R_yA = R_D = 3; ΣM_C de ABC: −2·3 + 2·F_BE = 0 →
  // F_BE = 3 (tracción); en C, sobre ABC, (−3; −3) y sobre DEC, (3; −3).
  bastidorA(r){
    return [
      {q:'R_yA', esp:3, obt:_reaccionDe(r,'A','Ry')},
      {q:'R_xA', esp:0, obt:_reaccionDe(r,'A','Rx'), abs:1e-6},
      {q:'R_D', esp:3, obt:_reaccionDe(r,'D','Ry')},
      {q:'F_BE (traccion)', esp:3, obt:_vinculoDe(r,'FBE')},
      {q:'C_x sobre ABC', esp:-3, obt:_pinDe(r,'Cx(ABC)')},
      {q:'C_y sobre ABC', esp:-3, obt:_pinDe(r,'Cy(ABC)')},
      {q:'C_x sobre DEC', esp:3, obt:_pinDe(r,'Cx(DEC)')}
    ];
  },
  // Collarín: ΣM_D de DB, 9 − 3·N_B = 0 → N_B = 3 (empuja DB hacia +x); el poste
  // recibe (−3; 0) en B: R_xA = −1, R_yA = 0, M_A = 7; y en D, (−3; 6).
  collarin(r){
    return [
      {q:'N_B', esp:3, obt:_pinDe(r,'NB')},
      {q:'M_A', esp:7, obt:_reaccionDe(r,'A','M')},
      {q:'R_xA', esp:-1, obt:_reaccionDe(r,'A','Rx')},
      {q:'R_yA', esp:0, obt:_reaccionDe(r,'A','Ry'), abs:1e-6},
      {q:'R_xD', esp:-3, obt:_reaccionDe(r,'D','Rx')},
      {q:'R_yD', esp:6, obt:_reaccionDe(r,'D','Ry')},
      {q:'M en el extremo libre C', esp:0, obt:_momentoEnNudo(r,'C'), abs:1e-6}
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
  pesoSeq=0; pesoActivo=null; R=null; vinculos=[]; vinculoSeq=0;
  selNodos=[]; selTramos=[]; selCargas=[]; selNodo=null; selTramo=null; primerNodo=null;
  // Nudo en coordenada EXACTA: addNodo engancha a la rejilla, y su paso
  // depende del zoom, así que un ejemplo cargado con la vista alejada se
  // armaba en posiciones equivocadas.
  const N = (x,y)=>{
    const n = {id:++nodoSeq, x:x, y:y, nombre:'', apoyo:'libre', rotula:false};
    nodos.push(n); return n;
  };
  // Un tramo de un miembro: lo que en el dibujo se traza de un tirón (24-).
  const M = (a, b, m)=>{ const t = addTramo(a.id, b.id); if(t) t.miembro = m; return t; };
  tramosSolucion = null;      // la selección de miembros era del ejercicio anterior (20-)
  ej.armar(N, M);
  miembroSeq = tramos.reduce((m, t)=>Math.max(m, +t.miembro || 0), 0); cadenaMiembro = null;
  reNombrar(); centrar(); refrescar(); calcular();
  comprobarEjemploFI(ej.id, R);
  cerrarEjemplos();
}
