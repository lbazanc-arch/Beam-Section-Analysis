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
  // Sobre un tramo curvo solo hay ley cerrada para la repartida UNIFORME
  // vertical, horizontal, inclinada o radial (la ventana no deja poner otras;
  // pueden llegar de un archivo).
  if(cargas.some(c=>(c.tipo==='U'||c.tipo==='T') && esArco(tramos.find(t=>t.id===c.tramo))
     && ((c.tipo==='T' && Math.abs((c.mag2||0) - c.mag) > 1e-12) || dirDeCarga(c) === 'axial')))
    return {error:'arco-carga'};
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
  // Cuerdas, bielas y topes (22-): una incógnita cada uno, su fuerza axial.
  incognitasDeVinculos().forEach(u=>inc.push(u));
  const nVin = inc.filter(u=>u.tipo === 'V').length;
  const rotulas = ecuacionesDeRotula(cad);
  const nEq = 3 + rotulas.length;
  const diag = {inc:inc.length, eq:nEq, rot:rotulas.length, vin:nVin};
  if(inc.length !== nEq) return {error:'determinacion', diag, acc, inc};

  const A = Array.from({length:nEq}, ()=>new Array(inc.length).fill(0));
  const b = new Array(nEq).fill(0);
  // Cada incógnita, como las fuerzas que hace con valor unidad y su nudo
  // (`fuerzasUnitarias`, 22-): una reacción, una sola; un vínculo entre dos nudos,
  // dos iguales y opuestas, que se anulan en el equilibrio global.
  inc.forEach((u,j)=>{
    fuerzasUnitarias(u).forEach(f=>{
      A[0][j] += f.fx; A[1][j] += f.fy;
      A[2][j] += f.n.x*f.fy - f.n.y*f.fx + f.m;
    });
  });
  let sx=0, sy=0, sm=0;
  acc.forEach(a=>{ sx+=a.fx; sy+=a.fy; sm += a.x*a.fy - a.y*a.fx + a.m; });
  b[0]=-sx; b[1]=-sy; b[2]=-sm;

  // una ecuación por rótula: momentos a un lado
  rotulas.forEach((rt,k)=>{
    const lado = ladoDeRotula(rt, cad);
    inc.forEach((u,j)=>{
      // Solo las fuerzas aplicadas en un nudo de ese lado: de un vínculo entre
      // dos nudos, la del extremo que cae en él.
      fuerzasUnitarias(u).forEach(f=>{
        if(lado.nodos.indexOf(f.n.id) < 0) return;
        A[3+k][j] += (f.n.x-rt.x)*f.fy - (f.n.y-rt.y)*f.fx + f.m;
      });
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
  const res = {acc, inc, val, diag, cad, rotulas, A, b, estructura:est};
  res.avisosVin = avisosDeVinculos(res);     // cuerda comprimida, tope traccionado (22-)
  return res;
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
    // Un vínculo (22-) actúa en su nudo, o en sus dos nudos con fuerzas iguales y
    // opuestas; cada fuerza va a la cadena de su nudo y se nombra igual.
    if(u.tipo === 'V'){
      fuerzasUnitarias(u).forEach(f=>puntuales.push({x:f.n.x, y:f.n.y, fx:v*f.fx, fy:v*f.fy, m:0,
                                                     reac:true, nodo:f.n, inc:u}));
      return;
    }
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

  // Repartidas que actúan antes de la sección: completas en los tramos de la
  // cadena anteriores al de índice `posActual`, y en ese, la parte hasta `uCut`
  // (distancia en el sentido del recorrido). Devuelve la fuerza y el momento
  // respecto de P. Una repartida sobre un ARCO se integra (`fuerzaRepartidaArco`,
  // 02-); en un tramo recto, con las integrales exactas de siempre.
  const _cargasRep = cargasConPeso().filter(c=>c.tipo==='U'||c.tipo==='T');
  const repartidasAntes = (P, posActual, uCut)=>{
    let Fx=0, Fy=0, Mo=0;
    _cargasRep.forEach(c=>{
      const z = trozoCargado(c);
      if(!z || z.len <= 1e-12) return;
      const posTramo = cc.cad.findIndex(x=>x.t.id===c.tramo);
      if(posTramo < 0 || posTramo > posActual) return;
      const gc = z.g;
      const inv = (cc.cad[posTramo].desde.id !== gc.a.id ? true : false);
      if(gc.arco){
        let a = z.s1, b = z.s2;
        if(posTramo === posActual){ if(!inv) b = Math.min(b, uCut); else a = Math.max(a, gc.L - uCut); }
        if(b <= a + 1e-12) return;
        const rr = fuerzaRepartidaArco(c, z, a, b, P);
        Fx += rr.Fx; Fy += rr.Fy; Mo += rr.Mo;
        return;
      }
      {
        const s = uCut;
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
      }
    });
    return {Fx, Fy, Mo};
  };
  // Acciones puntuales situadas antes de la posición `sGlobal` de la cadena:
  // fuerza y momento respecto de P.
  const puntualesAntes = (P, sGlobal)=>{
    let Fx=0, Fy=0, Mo=0;
    posPuntual.forEach(o=>{
      if(o.s === null || o.s >= sGlobal - 1e-9) return;
      Fx += o.a.fx; Fy += o.a.fy;
      Mo += (o.a.x-P.x)*o.a.fy - (o.a.y-P.y)*o.a.fx + (o.a.m||0);
    });
    return {Fx, Fy, Mo};
  };

  let acumL = 0;
  cc.cad.forEach((e, idxE)=>{
    const g = geoTramo(e.t);
    const invert = (e.desde.id !== e.t.a);
    // Un tramo CURVO tiene su propio camino (`_internasDeArco`): N, V y M en
    // función de θ, con senos y cosenos, en vez de polinomios en x.
    if(g.arco){
      salida.push(_internasDeArco(e, g, invert, idxE, acumL, cc, N, posPuntual, puntualesAntes, repartidasAntes));
      acumL += g.L;
      return;
    }
    const ux = invert ? -g.ux : g.ux, uy = invert ? -g.uy : g.uy;
    const nx = -uy, ny = ux;

    // Fuerzas internas en la sección a distancia s del nudo inicial del tramo.
    // Es EXACTAMENTE el cálculo validado del muestreo; se extrae a una función
    // para que el ajuste polinómico de los subtramos use el mismo motor.
    const corteEn = (s)=>{
      const P = {x:e.desde.x + ux*s, y:e.desde.y + uy*s};
      const sGlobal = acumL + s;
      // 1) acciones puntuales situadas antes de la sección y 2) la parte de las
      //    cargas distribuidas que queda antes de ella.
      const p1 = puntualesAntes(P, sGlobal), p2 = repartidasAntes(P, idxE, s);
      const Fx = p1.Fx + p2.Fx, Fy = p1.Fy + p2.Fy, Mo = p1.Mo + p2.Mo;
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
    // Sobre un arco: el punto tiene que estar a la distancia R del centro y
    // dentro del ángulo que barre el tramo; s = R·θ desde el nudo de entrada.
    if(g.arco){
      const ar = arcoRecorrido(e, g);
      const dx = a.x - ar.cx, dy = a.y - ar.cy;
      if(Math.abs(Math.hypot(dx, dy) - ar.R) < 1e-6*Math.max(1, ar.R)){
        let phi = ar.sg*(Math.atan2(dy, dx) - ar.a0);
        phi = ((phi % (2*Math.PI)) + 2*Math.PI) % (2*Math.PI);
        if(2*Math.PI - phi < 1e-9) phi = 0;
        const s = ar.R*phi;
        if(s <= g.L + 1e-7) return acum + Math.min(s, g.L);
      }
      acum += g.L;
      continue;
    }
    const ux = invert ? -g.ux : g.ux, uy = invert ? -g.uy : g.uy;
    const s = (a.x-e.desde.x)*ux + (a.y-e.desde.y)*uy;
    const perp = Math.abs((a.x-e.desde.x)*(-uy) + (a.y-e.desde.y)*ux);
    if(s >= -1e-7 && s <= g.L+1e-7 && perp < 1e-6) return acum + Math.max(0, s);
    acum += g.L;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════
//  TRAMOS CURVOS: N, V y M en función de θ (2026-10-25, petición del profesor)
//  En un arco las leyes no son polinomios: con cargas concentradas, pares, la
//  repartida de dirección fija (vertical, horizontal, peso propio; por unidad
//  de longitud de arco) y la radial uniforme, cada una es una combinación de
//      1,  θ,  cos θ,  sen θ,  θ cos θ,  θ sen θ
//  con θ en radianes desde el nudo de ENTRADA del recorrido, medido en el centro
//  del arco. Los coeficientes se escriben a mano a partir del equilibrio del
//  trozo (no se ajustan: en un intervalo corto esa base está muy mal
//  condicionada) y se contrastan con el equilibrio numérico en cada subtramo.
//  Convenio: N = −(ΣF)·û, V = (ΣF)·n̂, M = −ΣM respecto del corte, con û la
//  tangente en el sentido del recorrido y n̂ = û girado 90° antihorario, el mismo
//  de los tramos rectos.
// ═══════════════════════════════════════════════════════════
// El arco en el sentido del recorrido: centro, radio, ángulo a0 del radio que va
// al nudo de entrada y sentido sg del giro (+1 antihorario).
function arcoRecorrido(e, g){
  const A = g.arco, inv = (e.desde.id !== e.t.a), sgD = A.d >= 0 ? 1 : -1;
  return {cx:A.cx, cy:A.cy, R:A.R, a0: inv ? A.t1 + A.d : A.t1, sg: inv ? -sgD : sgD, L:g.L};
}
// Punto, tangente û y normal n̂ del arco a la distancia u del nudo de entrada.
function puntoArcoRec(ar, u){
  const al = ar.a0 + ar.sg*u/ar.R, c = Math.cos(al), s = Math.sin(al);
  return {x:ar.cx + ar.R*c, y:ar.cy + ar.R*s, ux:-ar.sg*s, uy:ar.sg*c, nx:-ar.sg*c, ny:-ar.sg*s, al};
}
function _leyesVacias(){ return {N:[0,0,0,0,0,0], V:[0,0,0,0,0,0], M:[0,0,0,0,0,0]}; }
function _sumaLeyes(A, B){ ['N','V','M'].forEach(k=>{ for(let i=0;i<6;i++) A[k][i] += B[k][i]; }); return A; }
// Con α = a0 + sg·θ (el ángulo del radio en el corte): a·cos α + b·sen α en la
// base de θ, y lo mismo multiplicado por (θ − θ1).
function _trigArco(ar){
  const c0 = Math.cos(ar.a0), s0 = Math.sin(ar.a0), sg = ar.sg;
  return {
    ab:(f, a, b)=>{ f[2] += a*c0 + b*s0; f[3] += sg*(-a*s0 + b*c0); },
    abTheta:(f, a, b, th1)=>{
      const C = a*c0 + b*s0, D = sg*(-a*s0 + b*c0);
      f[4] += C; f[5] += D; f[2] -= th1*C; f[3] -= th1*D;
    }
  };
}
// Una fuerza constante (Fx, Fy) con momento K respecto del centro del arco:
// todo lo que actúa antes del subtramo (puntuales, repartidas ya completas).
//   N = sg(Fx sen α − Fy cos α),  V = −sg(Fx cos α + Fy sen α),
//   M = −K + R(Fy cos α − Fx sen α).
function _leyesConstante(ar, Fx, Fy, K){
  const L = _leyesVacias(), T = _trigArco(ar), sg = ar.sg, R = ar.R;
  T.ab(L.N, -sg*Fy, sg*Fx);
  T.ab(L.V, -sg*Fx, -sg*Fy);
  L.M[0] += -K; T.ab(L.M, R*Fy, -R*Fx);
  return L;
}
// Repartida de dirección fija d̂ e intensidad w por unidad de arco, que empieza
// en θ1 y sigue más allá del corte: F = wR(θ − θ1)·d̂.
function _leyesRepFija(ar, w, dx, dy, th1){
  const L = _leyesVacias(), T = _trigArco(ar), sg = ar.sg, R = ar.R;
  const al1 = ar.a0 + sg*th1, wR = w*R, wR2 = w*R*R;
  T.abTheta(L.N, -sg*wR*dy, sg*wR*dx, th1);
  T.abTheta(L.V, -sg*wR*dx, -sg*wR*dy, th1);
  L.M[0] += wR2*sg*(dy*Math.sin(al1) + dx*Math.cos(al1));
  T.ab(L.M, -wR2*sg*dx, -wR2*sg*dy);
  T.abTheta(L.M, wR2*dy, -wR2*dx, th1);
  return L;
}
// Repartida radial uniforme q (positiva hacia el centro) desde θ1: todas sus
// fuerzas pasan por el centro.  N = −qR[1 − cos(α − α1)], V = qR sen(α − α1),
// M = sg·qR²[1 − cos(α − α1)].
function _leyesRepRadial(ar, q, th1){
  const L = _leyesVacias(), T = _trigArco(ar), sg = ar.sg, R = ar.R;
  const al1 = ar.a0 + sg*th1, ca = Math.cos(al1), sa = Math.sin(al1);
  L.N[0] += -q*R;       T.ab(L.N, q*R*ca, q*R*sa);
  T.ab(L.V, -q*R*sa, q*R*ca);
  L.M[0] += sg*q*R*R;   T.ab(L.M, -sg*q*R*R*ca, -sg*q*R*R*sa);
  return L;
}
// Lo que aporta una repartida activa en el subtramo; null si no tiene ley
// cerrada (variable o tangente sobre un arco: la ventana no las deja poner).
function _leyesRepartidaArco(ar, c, g, th1){
  const d = dirDeCarga(c);
  if(c.tipo === 'T' && Math.abs((c.mag2 || 0) - c.mag) > 1e-12) return null;
  if(d === 'axial') return null;
  if(d === 'perp') return _leyesRepRadial(ar, c.mag, th1);
  const dd = dirCarga(c, g);
  return _leyesRepFija(ar, c.mag, dd.x, dd.y, th1);
}
function _internasDeArco(e, g, invert, idxE, acumL, cc, N, posPuntual, puntualesAntes, repartidasAntes){
  const ar = arcoRecorrido(e, g), L = g.L, R = ar.R, C = {x:ar.cx, y:ar.cy};
  // Equilibrio numérico del trozo hasta u: el mismo de los tramos rectos.
  const corteEn = u=>{
    const P = puntoArcoRec(ar, u);
    const p1 = puntualesAntes(P, acumL + u), p2 = repartidasAntes(P, idxE, u);
    const Fx = p1.Fx + p2.Fx, Fy = p1.Fy + p2.Fy, Mo = p1.Mo + p2.Mo;
    return {x:P.x, y:P.y, N:-(Fx*P.ux + Fy*P.uy), V:(Fx*P.nx + Fy*P.ny), M:-Mo};
  };
  // Repartidas de este arco (con el peso propio), con sus límites en el
  // sentido del recorrido.
  const propias = cargasConPeso().filter(c=>(c.tipo==='U'||c.tipo==='T') && c.tramo===e.t.id).map(c=>{
    const z = trozoCargado(c);
    if(!z || z.len <= 1e-12) return null;
    return {c, z, r1: invert ? L - z.s2 : z.s1, r2: invert ? L - z.s1 : z.s2};
  }).filter(Boolean);
  const cortes = [0, L];
  const marcar = v=>{ if(v > 1e-9 && v < L - 1e-9 && !cortes.some(x=>Math.abs(x - v) < 1e-9)) cortes.push(v); };
  posPuntual.forEach(o=>{
    if(o.s === null) return;
    const sl = o.s - acumL;
    if(sl > -1e-9 && sl < L + 1e-9) marcar(sl);
  });
  propias.forEach(p=>{ marcar(p.r1); marcar(p.r2); });
  cortes.sort((a,b)=>a - b);
  const limpiar = f=>{ const m = Math.max(1e-12, ...f.map(Math.abs)); return f.map(v=>Math.abs(v) < 1e-10*Math.max(1, m) ? 0 : v); };
  const subs = [];
  for(let q=0;q<cortes.length-1;q++){
    const sa = cortes[q], sb = cortes[q+1];
    if(sb - sa < 1e-9) continue;
    // Lo constante en el subtramo, reducido al centro del arco: las puntuales
    // hasta su inicio (incluidas las de ese punto), las repartidas de los tramos
    // anteriores y las de este arco que ya terminaron.
    const pc = puntualesAntes(C, acumL + sa + 2e-9);
    const rp = repartidasAntes(C, idxE - 1, Infinity);
    let Fx = pc.Fx + rp.Fx, Fy = pc.Fy + rp.Fy, K = pc.Mo + rp.Mo;
    const leyes = _leyesVacias();
    let cerrada = true;
    propias.forEach(p=>{
      if(p.r2 <= sa + 1e-9){
        const rr = fuerzaRepartidaArco(p.c, p.z, p.z.s1, p.z.s2, C);
        Fx += rr.Fx; Fy += rr.Fy; K += rr.Mo;
      } else if(p.r1 <= sa + 1e-9){
        const l = _leyesRepartidaArco(ar, p.c, g, p.r1/R);
        if(l) _sumaLeyes(leyes, l); else cerrada = false;
      }
    });
    _sumaLeyes(leyes, _leyesConstante(ar, Fx, Fy, K));
    const su = {sa, sb, trig:true, R, fN:limpiar(leyes.N), fV:limpiar(leyes.V), fM:limpiar(leyes.M), cerrada};
    // Se contrasta con el equilibrio numérico: si la ley escrita no lo
    // reproduce, el informe diría otra cosa que el cálculo.
    [0.15, 0.5, 0.85].forEach(t=>{
      const u = sa + (sb - sa)*t, r = corteEn(u);
      const esc = Math.max(1, Math.abs(r.N), Math.abs(r.V), Math.abs(r.M));
      ['N','V','M'].forEach(k=>{
        const va = trigVal(su['f' + k], u/R);
        if(Math.abs(va - r[k]) > 1e-6*esc)
          console.warn('Tramo curvo: la ley de ' + k + ' no reproduce el equilibrio', nomTramo(e.t), {u, ley:va, equilibrio:r[k]});
      });
    });
    subs.push(su);
  }
  const puntos = [];
  for(let i=0;i<=N;i++){
    const bruto = L*i/N, eps = L*1e-4;
    const u = Math.min(L - eps, Math.max(eps, bruto));
    const su = subs.find(z=>u >= z.sa - 1e-12 && u <= z.sb + 1e-12) || subs[subs.length-1];
    const P = puntoArcoRec(ar, u), th = u/R;
    puntos.push({s:bruto, x:P.x, y:P.y, N:trigVal(su.fN, th), V:trigVal(su.fV, th), M:trigVal(su.fM, th)});
  }
  const dx = e.hasta.x - e.desde.x, dy = e.hasta.y - e.desde.y, c = Math.hypot(dx, dy) || 1e-9;
  return {tramo:e.t, nombre:nomTramo(e.t), L, ang:Math.atan2(dy, dx)*180/Math.PI,
          invert, s0:acumL, puntos, subs, desde:e.desde, hasta:e.hasta,
          ux:dx/c, uy:dy/c, cadena:cc.id, idx:idxE, arco:ar};
}
