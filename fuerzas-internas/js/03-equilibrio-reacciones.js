// ═══════════════════════════════════════════════════════════
//  EQUILIBRIO: reacciones
// ═══════════════════════════════════════════════════════════
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
  if(tramos.length < 1) return {error:'sin-viga'};
  const cad = cadena();
  if(cad.length !== tramos.length) return {error:'no-cadena'};

  const acc = todasLasAcciones();
  // incógnitas de reacción
  const inc = [];
  nodos.forEach(n=>{
    const g = GRADOS[n.apoyo||'libre'];
    // El apoyo MÓVIL tiene una sola reacción y puede estar orientado: su
    // dirección la marca apAng (90° = vertical, el caso de siempre). Los
    // demás mantienen sus componentes cartesianas.
    if(n.apoyo === 'movil'){
      inc.push({n, tipo:'Ry', ang:angReaccion(n)});
      return;
    }
    if(g >= 1) inc.push({n, tipo:'Ry'});
    if(g >= 2) inc.push({n, tipo:'Rx'});
    if(g >= 3) inc.push({n, tipo:'M'});
  });
  const rotulas = nodos.filter(n=>n.rotula && !esExtremo(n));
  const nEq = 3 + rotulas.length;
  const diag = {inc:inc.length, eq:nEq, rot:rotulas.length};
  if(inc.length !== nEq) return {error:'determinacion', diag, acc, inc};

  const A = Array.from({length:nEq}, ()=>new Array(inc.length).fill(0));
  const b = new Array(nEq).fill(0);
  const dir = u => {
    // Una reacción orientada actúa a lo largo de su ángulo, no según los ejes.
    if(u.ang !== undefined) return {x:Math.cos(u.ang), y:Math.sin(u.ang), m:0};
    return u.tipo==='Rx' ? {x:1,y:0,m:0} : (u.tipo==='Ry' ? {x:0,y:1,m:0} : {x:0,y:0,m:1});
  };
  inc.forEach((u,j)=>{
    const d = dir(u);
    A[0][j] = d.x; A[1][j] = d.y;
    A[2][j] = u.n.x*d.y - u.n.y*d.x + d.m;
  });
  let sx=0, sy=0, sm=0;
  acc.forEach(a=>{ sx+=a.fx; sy+=a.fy; sm += a.x*a.fy - a.y*a.fx + a.m; });
  b[0]=-sx; b[1]=-sy; b[2]=-sm;

  // una ecuación por rótula: momentos a un lado
  rotulas.forEach((rt,k)=>{
    const lado = ladoDeRotula(rt, cad);
    inc.forEach((u,j)=>{
      if(lado.nodos.indexOf(u.n.id) < 0) return;
      const d = dir(u);
      A[3+k][j] = (u.n.x-rt.x)*d.y - (u.n.y-rt.y)*d.x + d.m;
    });
    let m = 0;
    acc.forEach(a=>{
      if(!accionEnLado(a.carga, lado)) return;
      m += (a.x-rt.x)*a.fy - (a.y-rt.y)*a.fx + a.m;
    });
    b[3+k] = -m;
  });

  const x = resolverSistema(A,b);
  if(!x) return {error:'singular', diag, acc, inc};
  const val = {};
  inc.forEach((u,j)=>{ val[j] = x[j]; });
  return {acc, inc, val, diag, cad, rotulas, A, b};
}

function esExtremo(n){
  const c = tramos.filter(t=>t.a===n.id || t.b===n.id).length;
  return c <= 1;
}
// ¿Cae esta carga en el lado de la rótula que se aísla? Una carga sobre un
// tramo se decide por el tramo; una carga sobre un NUDO (por ejemplo un par
// aplicado en D) no tiene tramo y se decide por el nudo. Antes se miraba solo
// el tramo, y un par de nudo quedaba fuera de la ecuación de la rótula: las
// reacciones salían con el momento de la rótula distinto de cero.
function accionEnLado(c, lado){
  if(!c) return false;
  if(c.destino === 'nudo') return lado.nodos.indexOf(c.nudo) >= 0;
  return lado.tramos.indexOf(c.tramo) >= 0;
}
function ladoDeRotula(rt, cad){
  // se toma la parte de la cadena a partir de la rótula hacia el final
  const idx = cad.findIndex(e=>e.desde.id===rt.id);
  const trs = [], nds = [];
  if(idx < 0) return {nodos:nds, tramos:trs};
  for(let i=idx;i<cad.length;i++){
    trs.push(cad[i].t.id);
    if(nds.indexOf(cad[i].hasta.id) < 0) nds.push(cad[i].hasta.id);
  }
  return {nodos:nds, tramos:trs};
}

// ═══════════════════════════════════════════════════════════
//  FUERZAS INTERNAS sobre el eje local de cada tramo
//  En una sección se corta y se toma la parte anterior de la cadena:
//    N = −(Σ F)·û      V = −(Σ F)·n̂      M = −Σ M respecto a la sección
// ═══════════════════════════════════════════════════════════
function fuerzasInternas(res){
  const N = 80;
  const salida = [];
  // Acciones PUNTUALES (cargas concentradas, momentos y reacciones).
  // Las distribuidas NO entran aquí: se integran aparte según el tramo,
  // porque incluir además su resultante total las contaba dos veces.
  const puntuales = res.acc.filter(a => a.carga.tipo !== 'U' && a.carga.tipo !== 'T');
  res.inc.forEach((u,j)=>{
    const v = res.val[j];
    if(u.ang !== undefined)
      puntuales.push({x:u.n.x, y:u.n.y, fx:v*Math.cos(u.ang), fy:v*Math.sin(u.ang),
                      m:0, reac:true, nodo:u.n});
    else if(u.tipo==='Rx') puntuales.push({x:u.n.x, y:u.n.y, fx:v, fy:0, m:0, reac:true, nodo:u.n});
    else if(u.tipo==='Ry') puntuales.push({x:u.n.x, y:u.n.y, fx:0, fy:v, m:0, reac:true, nodo:u.n});
    else puntuales.push({x:u.n.x, y:u.n.y, fx:0, fy:0, m:v, reac:true, nodo:u.n});
  });
  const posPuntual = puntuales.map(a=>({a, s:posicionEnCadena(a, res.cad)}));
  salida.puntuales = posPuntual;   // lo usa el DCL del método de ecuaciones

  let acumL = 0;
  res.cad.forEach((e)=>{
    const g = geoTramo(e.t);
    const invert = (e.desde.id !== e.t.a);
    const ux = invert ? -g.ux : g.ux, uy = invert ? -g.uy : g.uy;
    const nx = -uy, ny = ux;

    // Fuerzas internas en la sección a distancia s del nudo inicial del tramo.
    // Es EXACTAMENTE el cálculo validado del muestreo; se extrae a una función
    // para que el ajuste polinómico de los subtramos use el mismo motor.
    const corteEn = (s)=>{
      const P = {x:e.desde.x + ux*s, y:e.desde.y + uy*s};
      let Fx=0, Fy=0, Mo=0;
      const sGlobal = acumL + s;

      // 1) acciones puntuales situadas antes de la sección
      posPuntual.forEach(o=>{
        if(o.s === null || o.s >= sGlobal - 1e-9) return;
        Fx += o.a.fx; Fy += o.a.fy;
        Mo += (o.a.x-P.x)*o.a.fy - (o.a.y-P.y)*o.a.fx + (o.a.m||0);
      });

      // 2) cargas distribuidas: solo la parte del trozo cargado que queda
      //    antes de la sección. El trozo va de s1 a s2 dentro del tramo.
      cargasConPeso().filter(c=>c.tipo==='U'||c.tipo==='T').forEach(c=>{
        const z = trozoCargado(c);
        if(!z || z.len <= 1e-12) return;
        const posTramo = res.cad.findIndex(x=>x.t.id===c.tramo);
        const posActual = res.cad.findIndex(x=>x.t.id===e.t.id);
        if(posTramo < 0 || posTramo > posActual) return;
        const gc = z.g;
        const inv = (res.cad[posTramo].desde.id !== gc.a.id ? true : false);
        // límites del trozo medidos EN EL SENTIDO DEL RECORRIDO
        let r1 = inv ? (gc.L - z.s2) : z.s1;
        let r2 = inv ? (gc.L - z.s1) : z.s2;
        // hasta dónde alcanza la sección dentro de este tramo
        const hasta = (posTramo < posActual) ? gc.L : s;
        const corte = Math.min(r2, hasta);
        if(corte <= r1 + 1e-12) return;
        const w1 = c.mag, w2 = (c.tipo==='U') ? c.mag : (c.mag2||0);
        // magnitudes en los extremos del trozo, según el sentido del recorrido
        const wIni = inv ? w2 : w1, wFinT = inv ? w1 : w2;
        const largo = r2 - r1;
        const wEn = u => wIni + (wFinT-wIni)*((u-r1)/largo);
        const wa = wEn(r1), wb = wEn(corte);
        const trozo = corte - r1;
        const Fp = (wa+wb)/2*trozo;
        const dc = (Math.abs(wa+wb)<1e-12) ? trozo/2 : trozo*(wa+2*wb)/(3*(wa+wb));
        const origen = res.cad[posTramo].desde;
        const dirx = inv ? -gc.ux : gc.ux, diry = inv ? -gc.uy : gc.uy;
        const Q = {x:origen.x + dirx*(r1+dc), y:origen.y + diry*(r1+dc)};
        // La resultante actúa según la orientación de la carga; el momento
        // se toma en su forma general, porque con una carga perpendicular
        // sobre un tramo inclinado la componente horizontal ya no es nula.
        const dd = dirCarga(c, gc);
        const Fcx = Fp*dd.x, Fcy = Fp*dd.y;
        Fx += Fcx; Fy += Fcy;
        Mo += (Q.x-P.x)*Fcy - (Q.y-P.y)*Fcx;
      });

      // Convenio estándar de estática: V positiva gira el segmento en sentido horario,
      // es decir V = +(ΣF)·n̂ del trozo anterior. N positiva en tracción y
      // M positiva cóncava hacia arriba se mantienen como estaban.
      return {x:P.x, y:P.y, N:-(Fx*ux + Fy*uy), V:(Fx*nx + Fy*ny), M:-Mo};
    };

    const puntos = [];
    for(let i=0;i<=N;i++){
      // se evalúa ligeramente dentro del tramo: justo en el nudo hay saltos
      // y el valor de un extremo depende del lado desde el que se mire
      const bruto = g.L*i/N;
      const eps = g.L*1e-4;
      const sv = Math.min(g.L-eps, Math.max(eps, bruto));
      const r = corteEn(sv);
      puntos.push({s:bruto, x:r.x, y:r.y, N:r.N, V:r.V, M:r.M});
    }

    // ── Subtramos del método de ecuaciones: se corta en cada discontinuidad
    //    (cargas puntuales o momentos interiores, y bordes de distribuidas).
    //    Dentro de cada subtramo N, V son polinomios de grado ≤ 2 y M de
    //    grado ≤ 3, así que interpolar en 4 puntos interiores es EXACTO.
    const cortes = [0, g.L];
    const marcar = v => { if(v > 1e-9 && v < g.L-1e-9 &&
      !cortes.some(c=>Math.abs(c-v)<1e-9)) cortes.push(v); };
    posPuntual.forEach(o=>{
      if(o.s === null) return;
      const sl = o.s - acumL;
      if(sl > -1e-9 && sl < g.L+1e-9) marcar(sl);
    });
    cargas.filter(c=>(c.tipo==='U'||c.tipo==='T') && c.tramo===e.t.id).forEach(c=>{
      const z = trozoCargado(c);
      if(!z || z.len <= 1e-12) return;
      const inv = (e.desde.id !== z.g.a.id);
      marcar(inv ? (z.g.L - z.s2) : z.s1);
      marcar(inv ? (z.g.L - z.s1) : z.s2);
    });
    cortes.sort((a,b)=>a-b);

    const limpiarPoly = c => {
      if(!c) return [0,0,0,0];
      const m = Math.max(1, ...c.map(v=>Math.abs(v)));
      return c.map(v => (Math.abs(v) < 1e-7*m || Math.abs(v) < 1e-9) ? 0 : v);
    };
    const subs = [];
    for(let q=0;q<cortes.length-1;q++){
      const sa = cortes[q], sb = cortes[q+1];
      if(sb - sa < 1e-9) continue;
      // 4 puntos interiores; x medido desde el nudo inicial del TRAMO
      const ss = [0.08, 0.36, 0.64, 0.92].map(t=>sa + (sb-sa)*t);
      const AN=[], VV=[], MM=[], A=[];
      ss.forEach(sv=>{
        const r = corteEn(sv);
        AN.push(r.N); VV.push(r.V); MM.push(r.M);
        A.push([1, sv, sv*sv, sv*sv*sv]);
      });
      subs.push({sa, sb,
        cN: limpiarPoly(resolverSistema(A, AN)),
        cV: limpiarPoly(resolverSistema(A, VV)),
        cM: limpiarPoly(resolverSistema(A, MM))});
    }

    salida.push({tramo:e.t, nombre:nomTramo(e.t), L:g.L, ang:g.ang,
                 invert, s0:acumL, puntos, subs,
                 desde:e.desde, hasta:e.hasta, ux, uy});
    acumL += g.L;
  });
  return salida;
}

// posición acumulada de un punto sobre la cadena (o null si no cae en ella)
function posicionEnCadena(a, cad){
  let acum = 0;
  for(const e of cad){
    const g = geoTramo(e.t);
    const invert = (e.desde.id !== e.t.a);
    const ux = invert ? -g.ux : g.ux, uy = invert ? -g.uy : g.uy;
    const s = (a.x-e.desde.x)*ux + (a.y-e.desde.y)*uy;
    const perp = Math.abs((a.x-e.desde.x)*(-uy) + (a.y-e.desde.y)*ux);
    if(s >= -1e-7 && s <= g.L+1e-7 && perp < 1e-6) return acum + Math.max(0, s);
    acum += g.L;
  }
  return null;
}
