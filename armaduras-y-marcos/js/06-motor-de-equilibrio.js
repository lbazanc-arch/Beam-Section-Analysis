// ═══════════════════════════════════════════════════════════
//  MOTOR: sistema global de equilibrio
// ═══════════════════════════════════════════════════════════
function resolverSistema(A, b){
  // Gauss con pivoteo parcial. A: n x n, b: n. Devuelve x o null.
  const n = b.length;
  const M = A.map((f,i)=>f.slice().concat([b[i]]));
  for(let col=0; col<n; col++){
    let piv = col;
    for(let f=col+1; f<n; f++) if(Math.abs(M[f][col]) > Math.abs(M[piv][col])) piv = f;
    if(Math.abs(M[piv][col]) < 1e-10) return null;   // singular
    [M[col], M[piv]] = [M[piv], M[col]];
    for(let f=0; f<n; f++){
      if(f===col) continue;
      const k = M[f][col]/M[col][col];
      if(k===0) continue;
      for(let c=col; c<=n; c++) M[f][c] -= k*M[col][c];
    }
  }
  return M.map((f,i)=>f[n]/f[i][i] !== undefined ? f[n]/M[i][i] : 0).map((_,i)=>M[i][n]/M[i][i]);
}

function gradosApoyo(n){ return n.apoyo === 'fijo' ? 2 : (n.apoyo === 'movil' ? 1 : 0); }

// ═══════════════════════════════════════════════════════════
//  SIMETRÍA DE LA ESTRUCTURA
//  Comprueba, respecto a un eje vertical, que coincidan la geometría, las
//  cargas y (si ya se resolvió) las reacciones. Es un criterio pedagógico:
//  no cambia el cálculo, pero permite anticipar sin resolver todo el sistema
//  que las barras que se reflejan entre sí soportan la misma fuerza.
function analizarSimetria(res){
  if(nodos.length < 2) return {simetrica:false, motivo:'Se necesitan al menos dos nudos para evaluar la simetría.'};
  const xs = nodos.map(n=>n.x);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const envergadura = xMax - xMin;
  if(envergadura < 1e-9) return {simetrica:false, motivo:'Todos los nudos comparten la misma coordenada x.'};
  const eje = (xMin + xMax) / 2;
  const epsPos = Math.max(1e-6, envergadura * 1e-6);
  const epsF = Math.max(1e-9, 1e-6 * escalaDelProblema());

  // 1) Correspondencia geométrica: cada nudo con su reflejo especular
  const espejo = {};
  for(const n of nodos){
    const xm = 2*eje - n.x;
    const cand = nodos.filter(m=> Math.abs(m.x-xm)<=epsPos && Math.abs(m.y-n.y)<=epsPos);
    if(!cand.length){
      return {simetrica:false, fase:'geometría',
        motivo:'El nudo ' + n.nombre + ' no tiene un nudo espejo a la misma altura en el lado opuesto.'};
    }
    espejo[n.id] = cand[0].id;
  }
  for(const n of nodos){
    if(espejo[espejo[n.id]] !== n.id){
      return {simetrica:false, fase:'geometría',
        motivo:'La correspondencia especular del nudo ' + n.nombre + ' no es consistente.'};
    }
  }

  // 2) Barras: cada barra debe tener su barra reflejada
  const existeBarra = (a,b) => barras.some(x=>(x.a===a&&x.b===b)||(x.a===b&&x.b===a));
  for(const b of barras){
    const ea = espejo[b.a], eb = espejo[b.b];
    if(!existeBarra(ea, eb)){
      return {simetrica:false, fase:'geometría',
        motivo:'La barra ' + nombreBarra(b) + ' no tiene una barra reflejada en el lado opuesto.'};
    }
  }

  // 3) Cargas: en una pareja espejo, Fy debe coincidir y Fx debe ser opuesta
  //    (una carga espejada invierte su componente horizontal). Sobre el
  //    propio eje, Fx=−Fx solo se cumple si Fx=0.
  for(const n of nodos){
    const idm = espejo[n.id];
    if(idm === n.id){
      if(!esCero(n.fx||0)){
        return {simetrica:false, fase:'cargas',
          motivo:'El nudo ' + n.nombre + ' está sobre el eje de simetría pero tiene una carga horizontal.'};
      }
    } else if(idm > n.id){
      const m = nodos.find(z=>z.id===idm);
      if(Math.abs((n.fy||0)-(m.fy||0)) > epsF){
        return {simetrica:false, fase:'cargas',
          motivo:'Las cargas verticales de ' + n.nombre + ' y ' + m.nombre + ' no coinciden.'};
      }
      if(Math.abs((n.fx||0)+(m.fx||0)) > epsF){
        return {simetrica:false, fase:'cargas',
          motivo:'Las cargas horizontales de ' + n.nombre + ' y ' + m.nombre + ' no son opuestas.'};
      }
    }
  }

  // 4) Apoyos: cada nudo con apoyo necesita su espejo también apoyado, y si
  //    ambos son móviles, con la misma dirección de reacción (una dirección
  //    vertical sigue siendo vertical al reflejarse; horizontal, horizontal).
  for(const n of nodos){
    const idm = espejo[n.id];
    const m = nodos.find(z=>z.id===idm);
    if((!!n.apoyo) !== (!!m.apoyo)){
      return {simetrica:false, fase:'apoyos',
        motivo:'El nudo ' + n.nombre + (n.apoyo?' tiene apoyo':' no tiene apoyo') + ' pero su espejo '
             + m.nombre + (m.apoyo?' sí lo tiene':' no lo tiene') + '.'};
    }
    if(n.apoyo === 'movil' && m.apoyo === 'movil' && n.id !== m.id){
      const hn = n.apAng === 0, hm = m.apAng === 0;
      if(hn !== hm){
        return {simetrica:false, fase:'apoyos',
          motivo:'Los apoyos móviles de ' + n.nombre + ' y ' + m.nombre + ' no tienen la misma dirección de reacción.'};
      }
    }
  }

  // 5) Reacciones, si ya se resolvió: la componente vertical debe coincidir
  //    en cada pareja de apoyos espejo.
  if(res && res.reacciones){
    for(const n of nodos){
      if(!n.apoyo) continue;
      const idm = espejo[n.id];
      if(idm <= n.id) continue;   // cada pareja se evalúa una sola vez
      const m = nodos.find(z=>z.id===idm);
      const Rn = res.reacciones[n.id], Rm = res.reacciones[m.id];
      if(Rn && Rm && Rn.ry !== undefined && Rm.ry !== undefined){
        if(Math.abs(Rn.ry - Rm.ry) > epsF){
          return {simetrica:false, fase:'reacciones',
            motivo:'Las reacciones verticales en ' + n.nombre + ' y ' + m.nombre + ' no resultaron iguales ('
                 + dec(Rn.ry,'f') + ' vs ' + dec(Rm.ry,'f') + ' ' + unitFor + ').'};
        }
      }
    }
  }

  return {simetrica:true, eje};
}

function analizar(){
  const j = nodos.length, m = barras.length;
  const r = nodos.reduce((s,n)=>s+gradosApoyo(n), 0);

  const diag = {j, m, r, suma:m+r, req:2*j};
  if(j < 2 || m < 1) return {error:'Hace falta al menos dos nudos y una barra.', diag};
  if(m + r < 2*j)  return {error:'inestable', diag};
  if(m + r > 2*j)  return {error:'hiperestatica', diag};

  // Incógnitas: [fuerzas de barra (m)] + [reacciones (r)]
  const idxReac = [];   // {nodo, comp:'x'|'y'}
  nodos.forEach(n=>{
    if(n.apoyo === 'fijo'){ idxReac.push({nodo:n.id, comp:'x'}); idxReac.push({nodo:n.id, comp:'y'}); }
    else if(n.apoyo === 'movil'){ idxReac.push({nodo:n.id, comp: (n.apAng===0 ? 'x' : 'y')}); }
  });
  const N = m + idxReac.length;
  const A = Array.from({length:2*j}, ()=>new Array(N).fill(0));
  const b = new Array(2*j).fill(0);

  nodos.forEach((n, i)=>{
    // fila 2i = ΣFx, fila 2i+1 = ΣFy
    barras.forEach((br, k)=>{
      let otro = null;
      if(br.a === n.id) otro = nodos.find(z=>z.id===br.b);
      else if(br.b === n.id) otro = nodos.find(z=>z.id===br.a);
      if(!otro) return;
      const dx = otro.x - n.x, dy = otro.y - n.y;
      const L = Math.hypot(dx, dy);
      if(L < 1e-9) return;
      A[2*i][k]   += dx/L;    // tracción positiva: tira del nudo hacia el otro extremo
      A[2*i+1][k] += dy/L;
    });
    idxReac.forEach((R, k)=>{
      if(R.nodo !== n.id) return;
      if(R.comp === 'x') A[2*i][m+k] += 1;
      else               A[2*i+1][m+k] += 1;
    });
    b[2*i]   = -(n.fx || 0);
    b[2*i+1] = -(n.fy || 0);
  });

  const x = resolverSistema(A, b);
  if(!x) return {error:'singular', diag};

  const fuerzas = {}, reacciones = {};
  barras.forEach((br,k)=>{ fuerzas[br.id] = x[k]; });
  idxReac.forEach((R,k)=>{
    if(!reacciones[R.nodo]) reacciones[R.nodo] = {};
    reacciones[R.nodo][R.comp === 'x' ? 'rx' : 'ry'] = x[m+k];
  });
  return {fuerzas, reacciones, diag, idxReac};
}

// ── Miembros de fuerza cero (regla 6.4) ──
function miembrosCero(){
  const out = [];
  nodos.forEach(n=>{
    const conec = barras.filter(b=>b.a===n.id||b.b===n.id);
    const sinCarga = esCero(n.fx) && esCero(n.fy);
    const sinApoyo = !n.apoyo;
    if(!sinCarga || !sinApoyo) return;
    const dirs = conec.map(b=>{
      const o = nodos.find(z=>z.id === (b.a===n.id ? b.b : b.a));
      const dx = o.x-n.x, dy = o.y-n.y, L = Math.hypot(dx,dy);
      return {barra:b, ux:dx/L, uy:dy/L};
    });
    if(conec.length === 2){
      const colineal = Math.abs(dirs[0].ux*dirs[1].uy - dirs[0].uy*dirs[1].ux) < 1e-7;
      if(!colineal) conec.forEach(b=>out.push({barra:b.id, nudo:n.nombre, regla:2}));
    } else if(conec.length === 3){
      for(let i=0;i<3;i++){
        const otros = [0,1,2].filter(k=>k!==i);
        const d1 = dirs[otros[0]], d2 = dirs[otros[1]];
        const colineal = Math.abs(d1.ux*d2.uy - d1.uy*d2.ux) < 1e-7
                      && (d1.ux*d2.ux + d1.uy*d2.uy) < 0;
        if(colineal) out.push({barra:dirs[i].barra.id, nudo:n.nombre, regla:3});
      }
    }
  });
  // sin duplicados
  const vistos = new Set(), lim = [];
  out.forEach(o=>{ if(!vistos.has(o.barra)){ vistos.add(o.barra); lim.push(o); } });
  return lim;
}

// ── Orden didáctico de nudos: siempre ≤2 incógnitas ──
function ordenNudos(){
  const conocidas = new Set();
  const pendientes = nodos.slice();
  const orden = [];
  let vueltas = 0;
  while(pendientes.length && vueltas < 400){
    vueltas++;
    let elegido = -1;
    for(let i=0;i<pendientes.length;i++){
      const n = pendientes[i];
      const conec = barras.filter(b=>b.a===n.id||b.b===n.id);
      const incog = conec.filter(b=>!conocidas.has(b.id)).length;
      if(incog <= 2){ elegido = i; break; }
    }
    if(elegido < 0) break;
    const n = pendientes.splice(elegido,1)[0];
    const conec = barras.filter(b=>b.a===n.id||b.b===n.id);
    const nuevas = conec.filter(b=>!conocidas.has(b.id));
    orden.push({nodo:n, nuevas:nuevas.map(b=>b.id)});
    nuevas.forEach(b=>conocidas.add(b.id));
  }
  return orden;
}

function nombreBarra(b){
  const na = nodos.find(n=>n.id===b.a), nb = nodos.find(n=>n.id===b.b);
  return (na && nb) ? na.nombre + nb.nombre : '?';
}
