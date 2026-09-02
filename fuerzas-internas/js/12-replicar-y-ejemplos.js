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
      cargas.push({id:++cargaSeq, tipo:'P',  destino:'tramo', tramo:tramos[3].id, pos:2, mag:P*c, mag2:0});
      cargas.push({id:++cargaSeq, tipo:'PX', destino:'tramo', tramo:tramos[3].id, pos:2, mag:P*c, mag2:0});
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
  cerrarEjemplos();
}
