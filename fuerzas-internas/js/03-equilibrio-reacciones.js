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
  // Cadena principal y ramas (01-). Un anillo cerrado o una pieza suelta no se
  // resuelven: el primero es hiperestático por dentro y la segunda no es una
  // sola estructura.
  const est = descomponerEnCadenas();
  if(est.error) return {error:est.error};
  const cad = est.cadenas[0].cad;

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
  const rotulas = ecuacionesDeRotula(cad);
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
  return {acc, inc, val, diag, cad, rotulas, A, b, estructura:est};
}

// Una ecuación de momento nulo por cada tramo que sale de una rótula, menos el
// que va hacia el arranque de la cadena principal (2026-10-04). Con dos tramos
// es la de siempre: el propio nudo. Con tres o más (una rótula en una
// bifurcación: todas las piezas articuladas en el nudo) hay una por cada lado
// que no contiene el arranque; cada una es un objeto que HEREDA del nudo
// (nombre, x, y, id…) y lleva su `lado` y su `etiqueta` («C,CD»), y
// `ladoDeRotula` devuelve ese lado. Así quien recorre R.rotulas no cambia.
function ecuacionesDeRotula(cad){
  const raiz = cad && cad.length ? cad[0].desde.id : null;
  const ady = _adyacencia(), out = [];
  nodos.forEach(n=>{
    if(!n.rotula || esExtremo(n)) return;
    const lados = (ady[n.id] || []).filter(z=>!nudosMasAlla(z, (z.a === n.id) ? z.b : z.a).has(raiz));
    if(lados.length <= 1){ out.push(n); return; }
    lados.forEach(z=>{
      const o = nodo((z.a === n.id) ? z.b : z.a);
      const e = Object.create(n);
      e.lado = _ladoPorTramo(n, z);
      e.etiqueta = n.nombre + ',' + n.nombre + o.nombre;
      out.push(e);
    });
  });
  return out;
}
// Lo que hay al otro lado de la rótula `rt` saliendo por el tramo `sale`.
function _ladoPorTramo(rt, sale){
  const ady = _adyacencia(), trs = [sale.id], nds = [];
  const vistosT = new Set([sale.id]);
  const cola = [(sale.a === rt.id) ? sale.b : sale.a]; nds.push(cola[0]);
  while(cola.length){
    const id = cola.shift();
    (ady[id] || []).forEach(z=>{
      if(vistosT.has(z.id)) return;
      vistosT.add(z.id); trs.push(z.id);
      const o = (z.a === id) ? z.b : z.a;
      if(o !== rt.id && nds.indexOf(o) < 0){ nds.push(o); cola.push(o); }
    });
  }
  return {nodos:nds, tramos:trs};
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
  if(rt && rt.lado) return rt.lado;      // una de las ecuaciones de una bifurcación
  // Se toma la parte de la estructura que queda al otro lado de la rótula
  // desde el arranque de la cadena principal (cad[0].desde): en una cadena,
  // de la rótula hacia el final; con ramas, incluidas las que cuelgan de esa
  // parte. Los nudos van en orden de recorrido desde la rótula, sin ella.
  const trs = [], nds = [];
  const raiz = cad && cad.length ? cad[0].desde.id : null;
  const ady = _adyacencia();
  const sale = (ady[rt.id] || []).find(z=>{
    const o = (z.a === rt.id) ? z.b : z.a;
    return !nudosMasAlla(z, o).has(raiz);
  });
  if(!sale || raiz === rt.id) return {nodos:nds, tramos:trs};
  return _ladoPorTramo(rt, sale);
}

// ═══════════════════════════════════════════════════════════
//  FUERZAS INTERNAS sobre el eje local de cada tramo
//  En una sección se corta y se toma la parte anterior de la cadena:
//    N = −(Σ F)·û      V = −(Σ F)·n̂      M = −Σ M respecto a la sección
// ═══════════════════════════════════════════════════════════
function fuerzasInternas(res){
  const N = 80;
  // Acciones PUNTUALES (cargas concentradas, momentos y reacciones).
  // Las distribuidas NO entran aquí: se integran aparte según el tramo,
  // porque incluir además su resultante total las contaba dos veces.
  const puntuales = res.acc.filter(a => a.carga.tipo !== 'U' && a.carga.tipo !== 'T');
  res.inc.forEach((u,j)=>{
    const v = res.val[j];
    // Se adjunta la incógnita (inc:u) para que el informe pueda nombrar la
    // reacción igual en todas partes: un apoyo móvil orientado es R_A, no
    // R_{yA}, y sin este dato no hay forma de distinguirlo desde la acción.
    if(u.ang !== undefined)
      puntuales.push({x:u.n.x, y:u.n.y, fx:v*Math.cos(u.ang), fy:v*Math.sin(u.ang),
                      m:0, reac:true, nodo:u.n, inc:u});
    else if(u.tipo==='Rx') puntuales.push({x:u.n.x, y:u.n.y, fx:v, fy:0, m:0, reac:true, nodo:u.n, inc:u});
    else if(u.tipo==='Ry') puntuales.push({x:u.n.x, y:u.n.y, fx:0, fy:v, m:0, reac:true, nodo:u.n, inc:u});
    else puntuales.push({x:u.n.x, y:u.n.y, fx:0, fy:0, m:v, reac:true, nodo:u.n, inc:u});
  });
  // Cada acción se reparte a la cadena donde está: su tramo o su nudo. La
  // unión de una rama con su madre es de la madre.
  const est = res.estructura || {cadenas:[{id:0, cad:res.cad, padre:null, union:null}]};
  const cadDeTramo = {}, cadDeNudo = {};
  est.cadenas.forEach(c=>{
    c.cad.forEach(e=>{ cadDeTramo[e.t.id] = c.id; });
    [c.cad[0].desde].concat(c.cad.map(e=>e.hasta)).forEach(n=>{
      if(c.union && n.id === c.union.id) return;
      if(cadDeNudo[n.id] === undefined) cadDeNudo[n.id] = c.id;
    });
  });
  const cadDeAccion = a => {
    if(a.reac) return cadDeNudo[a.nodo.id];
    const c = a.carga;
    if(!c) return 0;
    return (c.destino === 'nudo') ? cadDeNudo[c.nudo] : cadDeTramo[c.tramo];
  };
  const porCadena = est.cadenas.map(()=>[]);
  puntuales.forEach(a=>{ const k = cadDeAccion(a); porCadena[k === undefined ? 0 : k].push(a); });
  // Las repartidas (como resultantes, `res.acc`) solo hacen falta para el
  // equivalente de una rama: dentro de su cadena se integran aparte.
  const repartidasDe = k => res.acc.filter(a=>a.carga && (a.carga.tipo === 'U' || a.carga.tipo === 'T')
                                        && cadDeTramo[a.carga.tramo] === k);
  // Las ramas se resuelven antes que su madre (tienen un índice mayor): la madre
  // necesita lo que cada rama le transmite en la unión.
  const resultados = new Array(est.cadenas.length);
  for(let k = est.cadenas.length - 1; k >= 0; k--){
    const cc = est.cadenas[k];
    const lista = porCadena[k].slice();
    est.cadenas.forEach(h=>{ if(h.padre === k) lista.push(resultados[h.id].equivalente); });
    const r = _internasDeCadena(res, cc, lista, N);
    r.id = cc.id; r.cad = cc.cad; r.padre = cc.padre; r.union = cc.union;
    if(cc.union){
      // Lo que la rama transmite a su madre en X: la suma de todo lo que actúa
      // sobre ella (puntuales, ramas suyas y repartidas), con su momento en X.
      const X = cc.union;
      let fx = 0, fy = 0, m = 0;
      lista.concat(repartidasDe(k)).forEach(a=>{
        fx += a.fx; fy += a.fy;
        m += (a.x - X.x)*a.fy - (a.y - X.y)*a.fx + (a.m || 0);
      });
      // Se nombra por el tramo que llega a X, en el sentido del recorrido (HC).
      const eU = cc.cad[cc.cad.length - 1];
      r.equivalente = {x:X.x, y:X.y, fx, fy, m,
                       rama:{cadena:k, union:X, tramo:eU.t, nombre:eU.desde.nombre + eU.hasta.nombre}};
    }
    resultados[k] = r;
  }
  // Orden de los tramos: el mismo del cálculo, las ramas antes que la cadena a
  // la que se unen (la principal al final). Así el informe y la pantalla
  // desarrollan cada rama antes de usar lo que transmite. Con una sola cadena
  // no cambia nada.
  const salida = [];
  for(let k = resultados.length - 1; k >= 0; k--) resultados[k].forEach(s=>salida.push(s));
  salida.puntuales = resultados[0].puntuales;   // los de la cadena principal
  salida.cadenas = resultados;
  return salida;
}

// N, V y M de los tramos de UNA cadena, con las acciones puntuales que actúan
// sobre ella (incluidas las que le transmiten sus ramas).
function _internasDeCadena(res, cc, puntuales, N){
  const salida = [];
  const posPuntual = puntuales.map(a=>({a, s:posicionEnCadena(a, cc.cad)}));
  salida.puntuales = posPuntual;   // lo usa el DCL del método de ecuaciones

  let acumL = 0;
  cc.cad.forEach((e, idxE)=>{
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
        const posTramo = cc.cad.findIndex(x=>x.t.id===c.tramo);
        const posActual = cc.cad.findIndex(x=>x.t.id===e.t.id);
        if(posTramo < 0 || posTramo > posActual) return;
        const gc = z.g;
        const inv = (cc.cad[posTramo].desde.id !== gc.a.id ? true : false);
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
        // Integrales exactas del trozo cargado que queda antes del corte, en
        // la abscisa u del recorrido: I0 = ∫w du es la resultante e
        // I1 = ∫u·w du su primer momento. Antes se pasaba por el centroide
        // (I1/I0), que no existe cuando el área es nula (w cruza el cero de
        // forma simétrica): allí la carga se reducía a una fuerza nula y se
        // perdía el par que sí produce. Con las integrales el par sale solo.
        const Fp = (wa+wb)/2*trozo;                        // I0
        const I1 = r1*Fp + trozo*trozo*(wa+2*wb)/6;        // ∫u·w du
        const origen = cc.cad[posTramo].desde;
        const dirx = inv ? -gc.ux : gc.ux, diry = inv ? -gc.uy : gc.uy;
        // La resultante actúa según la orientación de la carga; el momento
        // se toma en su forma general, porque con una carga perpendicular
        // sobre un tramo inclinado la componente horizontal ya no es nula.
        const dd = dirCarga(c, gc);
        const Fcx = Fp*dd.x, Fcy = Fp*dd.y;
        Fx += Fcx; Fy += Fcy;
        // Mo = ∫ [(X(u)−Px)·w·dy − (Y(u)−Py)·w·dx] du, con X(u) = origen + δ·u:
        // la parte constante multiplica a I0 y la que crece con u, a I1.
        Mo += ((origen.x-P.x)*dd.y - (origen.y-P.y)*dd.x)*Fp
            + (dirx*dd.y - diry*dd.x)*I1;
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
    // El ajuste se hace en t = (x − sa)/h ∈ [0, 1], donde el sistema está
    // siempre bien condicionado, y luego se reescribe en potencias de x (x
    // medido desde el nudo inicial del TRAMO), que es lo que consumen los
    // diagramas y el informe. Ajustar directamente en x hacía casi singular el
    // sistema de un subtramo corto y lejano del nudo (1 cm a 4 m): el pivote
    // caía bajo el umbral de resolverSistema y el subtramo salía con N, V y M
    // nulos, así que el informe no reproducía el polinomio.
    const TS = [0.08, 0.36, 0.64, 0.92];
    const AT = TS.map(t=>[1, t, t*t, t*t*t]);
    const enX = (d, sa, h) => {
      if(!d) return null;
      const c = [0,0,0,0];
      // Σ d_k ((x − sa)/h)^k, desarrollado por el binomio
      for(let k=0;k<4;k++){
        const dk = d[k]/Math.pow(h, k);
        for(let j=0;j<=k;j++){
          const binom = [[1],[1,1],[1,2,1],[1,3,3,1]][k][j];
          c[j] += dk*binom*Math.pow(-sa, k-j);
        }
      }
      return c;
    };
    for(let q=0;q<cortes.length-1;q++){
      const sa = cortes[q], sb = cortes[q+1];
      const h = sb - sa;
      if(h < 1e-9) continue;
      const AN=[], VV=[], MM=[];
      TS.forEach(t=>{
        const r = corteEn(sa + h*t);
        AN.push(r.N); VV.push(r.V); MM.push(r.M);
      });
      // Se limpia el ruido en t, ANTES de desarrollar: un c3 de ruido anulado
      // después dejaba descompensados c0, c1 y c2, que ya lo contenían.
      subs.push({sa, sb,
        cN: enX(limpiarPoly(resolverSistema(AT, AN)), sa, h),
        cV: enX(limpiarPoly(resolverSistema(AT, VV)), sa, h),
        cM: enX(limpiarPoly(resolverSistema(AT, MM)), sa, h)});
    }

    salida.push({tramo:e.t, nombre:nomTramo(e.t), L:g.L, ang:g.ang,
                 invert, s0:acumL, puntos, subs,
                 desde:e.desde, hasta:e.hasta, ux, uy,
                 cadena:cc.id, idx:idxE});
    acumL += g.L;
  });
  return salida;
}

// Cadena (resultado de `_internasDeCadena`) a la que pertenece un tramo de
// R.internas, y sus acciones puntuales con la posición en ESA cadena. Con una
// sola cadena son R.internas y R.internas.puntuales, como siempre.
// Color de lo que transmite una rama en los DCL de pantalla.
const COL_RAMA = '#c2410c';
function cadenaDe(r, seg){
  const cs = r && r.internas && r.internas.cadenas;
  return (cs && seg && cs[seg.cadena]) ? cs[seg.cadena] : r.internas;
}
function puntualesDe(r, seg){ return cadenaDe(r, seg).puntuales || []; }
function cadDe(r, seg){ const c = cadenaDe(r, seg); return c.cad || r.cad; }
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
