// ═══════════════════════════════════════════════════════════
//  INFORME LaTeX · desarrollo de cada corte, tablas y diagramas
//  Sigue el procedimiento de análisis del curso (Hibbeler, cap. 7;
//  Rodríguez, cap. 8 PUCP): reacciones → cortes por tramos → funciones
//  N(x), V(x), M(x) → diagramas → comprobaciones.
//  Todo lo que se escribe se contrasta contra los polinomios que calculó
//  el motor, así que el desarrollo y el resultado no pueden discrepar.
// ═══════════════════════════════════════════════════════════

// ── Explicaciones que se dan UNA sola vez ──
// El mismo «¿Por qué?» salía en cada corte y en cada quiebre: cuatro veces el
// de la proyección en el nudo y tres el de la carga cortada. Una explicación
// conceptual se da la primera vez que aparece esa situación y después se calla;
// repetirla no enseña nada y sepulta lo que sí cambia de un corte a otro.
// `construirLatex` vacía este registro al empezar cada informe.
let _yaDicho = {};
function _primeraVez(clave){
  if(_yaDicho[clave]) return false;
  _yaDicho[clave] = true;
  return true;
}

// ── Numeración de las tablas ──
// Las figuras llevaban su «Figura N» y las tablas no, así que no había manera
// de citarlas desde el texto. `construirLatex` reinicia el contador.
let _tabN = 0;
function tablaCaption(txt){
  _tabN++;
  return '\\noindent{\\footnotesize\\textbf{Tabla ' + _tabN + '.} ' + txt + '}\\\\[2pt]\n';
}

// ── Punto respecto al que se toman los momentos en el equilibrio global ──
// El motor plantea la ecuación respecto al origen del plano. Si ahí hay un
// nudo, se le llama por su nombre: «ΣM_A = 0» dice por sí solo dónde se toman
// los momentos, y sobra la aclaración entre paréntesis.
function nudoDelOrigen(){
  return nodos.find(n=>Math.abs(n.x) < 1e-9 && Math.abs(n.y) < 1e-9) || null;
}
function nombreOrigen(){
  const n = nudoDelOrigen();
  return n ? escLatex(n.nombre) : 'O';
}

// ── Aritmética de polinomios en coeficientes crecientes [c0, c1, c2, c3] ──
function _pMul(a, b){
  const r = new Array(a.length + b.length - 1).fill(0);
  a.forEach((x,i)=>b.forEach((y,j)=>{ r[i+j] += x*y; }));
  return r;
}
function _pAdd(a, b){
  const n = Math.max(a.length, b.length), r = [];
  for(let i=0;i<n;i++) r.push((a[i]||0) + (b[i]||0));
  return r;
}
function _pEsc(a, k){ return a.map(v=>v*k); }
function _pPot(base, n){ let r=[1]; for(let i=0;i<n;i++) r = _pMul(r, base); return r; }
function _pIgual(p, q, a, b){
  let m = 1;
  for(let i=0;i<=6;i++){ const x = a+(b-a)*i/6;
    m = Math.max(m, Math.abs(polyVal(p,x)), Math.abs(polyVal(q,x))); }
  for(let i=0;i<=6;i++){ const x = a+(b-a)*i/6;
    if(Math.abs(polyVal(p,x) - polyVal(q,x)) > 1e-6*m) return false; }
  return true;
}

// Suma de términos con su signo. Cada término es {v, tex}: v da el signo y
// tex es la expresión en valor absoluto (por ejemplo «5.00\,(x - 4.00)»).
function _sumaTex(terms, ceroTxt){
  if(!terms.length) return ceroTxt || '0';
  return terms.map((t,i)=>(i===0 ? (t.v<0?'-':'') : (t.v<0?' - ':' + ')) + t.tex).join('');
}
// Ecuación larga partida en filas de align*, para que no se salga del margen.
function _alineada(filas){
  return '\\begin{align*}\n' + filas.join(' \\\\\n') + '\n\\end{align*}\n';
}
function _fila(izq, terms, cola, porFila, sep){
  const n = porFila || 4;
  const sp = (sep === undefined) ? ' &= ' : sep;
  if(!terms.length) return izq + sp + (cola || '0');
  let s = izq + sp;
  terms.forEach((t,i)=>{
    const sg = (i===0) ? (t.v<0?'-':'') : (t.v<0?' - ':' + ');
    if(i > 0 && i % n === 0) s += ' \\\\\n &\\qquad ';
    s += sg + t.tex;
  });
  return s + (cola || '');
}

// ── Nombre de una acción puntual, tal como se cita en el desarrollo ──
function nombreAccion(ac){
  const EPS = 1e-9;
  if(ac.reac){
    // La incógnita viene adjunta desde el motor: se usa el MISMO nombre que en
    // el desarrollo y en el resumen de reacciones. Un móvil orientado es R_A.
    if(ac.inc){
      const s = simbReaccion(ac.inc);
      const esMom = (ac.inc.tipo === 'M' && ac.inc.ang === undefined);
      return {tex:s, txt:(esMom ? 'Momento de empotramiento $' : 'Reacción $') + s + '$'};
    }
    const n = escLatex(ac.nodo ? ac.nodo.nombre : '?');
    const hayF = Math.hypot(ac.fx, ac.fy) > EPS;
    if(!hayF) return {tex:'M_{' + n + '}', txt:'Momento de empotramiento $M_{' + n + '}$'};
    if(Math.abs(ac.fx) > EPS && Math.abs(ac.fy) > EPS)
      return {tex:'R_{' + n + '}', txt:'Reacción $R_{' + n + '}$'};
    const comp = Math.abs(ac.fx) > EPS ? 'x' : 'y';
    return {tex:'R_{' + comp + n + '}', txt:'Reacción $R_{' + comp + n + '}$'};
  }
  if(Math.abs(ac.m) > EPS && Math.hypot(ac.fx, ac.fy) < EPS)
    return {tex:'M_{\\text{apl}}', txt:'Momento aplicado'};
  return {tex:'P', txt:'Carga puntual'};
}

// ── Términos del equilibrio del trozo situado ANTES del corte ──
// Devuelve, para el subtramo [a, b] del grupo, la lista de términos que
// forman N, V y M con su brazo, más la tabla de acciones y los polinomios.
// Convenio (trozo de la izquierda, ejes locales del tramo):
//   N = −Σ F∥        V = +Σ F⊥        M = Σ F⊥·(x − d) − Σ (pares antihorarios)
function terminosCorte(R, gg, seg, sub){
  const EPS = 1e-9;
  const sb = gg.simbolo;
  const off = seg.s0 - gg.s0;
  const a = off + sub.sa, b = off + sub.sb;
  const t0 = gg.tramos[0];
  const ux = t0.ux, uy = t0.uy, nx = -uy, ny = ux;
  const sIni = gg.s0, primero = (gg.idx === 0);
  const tN=[], tV=[], tM=[], acc=[], wAct=[], wRes=[];
  const Fz = v => dec(Math.abs(v),'fuerza');
  const Mz = v => dec(Math.abs(v),'momento');
  const Lz = v => dec(v,'len');
  const uF = escLatex(unitFor), uM = escLatex(unidadMomento()), uW = escLatex(uDist());
  const brazo = d => (Math.abs(d) < 1e-6 ? sb : '(' + sb + ' - ' + Lz(d) + ')');
  const brazoTxt = d => '$' + (Math.abs(d) < 1e-6 ? sb : sb + ' - ' + Lz(d)) + '$';
  const conSigno = (v, dt) => (v < 0 ? '-' : '+') + dec(Math.abs(v), dt);

  // A · Lo que llega por el nudo de quiebre (solo a partir del segundo grupo)
  let ctes = null;
  if(!primero){
    const su0 = t0.subs[0];
    const N0 = polyVal(su0.cN,0), V0 = polyVal(su0.cV,0), M0 = polyVal(su0.cM,0);
    ctes = {N0, V0, M0};
    if(Math.abs(N0) > EPS) tN.push({v:N0, tex:Fz(N0), poly:[N0]});
    if(Math.abs(V0) > EPS){
      tV.push({v:V0, tex:Fz(V0), poly:[V0]});
      tM.push({v:V0, tex:Fz(V0) + '\\,' + sb, poly:[0, V0]});
    }
    if(Math.abs(M0) > EPS) tM.push({v:M0, tex:Mz(M0), poly:[M0]});
    acc.push({nom:'Solicitaciones que llegan por el nudo ' + escLatex(gg.desde.nombre),
              mag:'$N_0=' + dec(N0,'fuerza') + '$, $V_0=' + dec(V0,'fuerza')
                 + '$, $M_0=' + dec(M0,'momento') + '$',
              pos:Lz(0), brazo:'$' + sb + '$ (para $V_0$)'});
  }

  // B · Acciones puntuales situadas antes del corte (reacciones, cargas, pares)
  (R.internas.puntuales || []).forEach(o=>{
    if(o.s === null) return;
    if(primero ? (o.s < sIni - EPS) : (o.s <= sIni + EPS)) return;
    if(o.s > seg.s0 + sub.sa + EPS) return;
    const ac = o.a, d = o.s - sIni;
    const Fpar = ac.fx*ux + ac.fy*uy, Fper = ac.fx*nx + ac.fy*ny;
    if(Math.abs(Fpar) < EPS && Math.abs(Fper) < EPS && Math.abs(ac.m) < EPS) return;
    const nom = nombreAccion(ac);
    if(Math.abs(Fpar) > EPS) tN.push({v:-Fpar, tex:Fz(Fpar), poly:[-Fpar]});
    if(Math.abs(Fper) > EPS){
      tV.push({v:Fper, tex:Fz(Fper), poly:[Fper]});
      tM.push({v:Fper, tex:Fz(Fper) + '\\,' + brazo(d), poly:_pEsc([-d, 1], Fper)});
    }
    if(Math.abs(ac.m) > EPS) tM.push({v:-ac.m, tex:Mz(ac.m), poly:[-ac.m]});
    const mag = [];
    if(Math.abs(Fper) > EPS) mag.push('$F_{\\perp}=' + conSigno(Fper,'fuerza') + '$');
    if(Math.abs(Fpar) > EPS) mag.push('$F_{\\parallel}=' + conSigno(Fpar,'fuerza') + '$');
    if(Math.abs(ac.m) > EPS) mag.push('$M=' + conSigno(ac.m,'momento') + '$');
    acc.push({nom:nom.txt, mag:mag.join(', '), pos:Lz(d),
              brazo: Math.abs(Fper) > EPS ? brazoTxt(d)
                   : (Math.abs(ac.m) > EPS ? 'par: sin brazo' : '--'),
              // Datos en bruto para escribir la proyección a la vista, con su
              // pequeño desarrollo, en vez de dar solo el resultado en una tabla.
              proy: {tex:nom.tex, fx:ac.fx, fy:ac.fy, Fper, Fpar, m:ac.m || 0, d}});
  });

  // C · Cargas repartidas del grupo: completas antes del corte, o cortadas
  cargasConPeso().filter(c=>c.tipo==='U'||c.tipo==='T').forEach(c=>{
    const el = gg.tramos.find(t2=>t2.tramo && t2.tramo.id === c.tramo);
    if(!el) return;
    const z = trozoCargado(c);
    if(!z || z.len <= 1e-12) return;
    const inv = !!el.invert, offT = el.s0 - gg.s0;
    const g1 = offT + (inv ? z.g.L - z.s2 : z.s1);
    const g2 = offT + (inv ? z.g.L - z.s1 : z.s2);
    const wFin = (c.tipo === 'U') ? c.mag : (c.mag2 || 0);
    const wA = inv ? wFin : c.mag, wB = inv ? c.mag : wFin;
    const dd = dirCarga(c, z.g);
    const cp = dd.x*nx + dd.y*ny, cu = dd.x*ux + dd.y*uy;   // proyecciones del sentido
    const len = g2 - g1;
    const etiq = (c.tipo === 'U' ? 'Repartida uniforme' : 'Repartida variable')
               + ' (tramo ' + escLatex(nomTramo(el.tramo)) + ')';
    // Con signos distintos en los extremos el valor absoluto miente ("2.00 a
    // 2.00" para una carga que va de -2 a +2), justo el caso que deja par y
    // resultante nula: ahí se escriben con su signo. Con el mismo signo en
    // los dos extremos el texto no cambia.
    const wCruza = (wA*wB < 0);
    const wNum = v => dec(wCruza ? v : Math.abs(v), 'fuerza');
    const wTxt = (Math.abs(wA - wB) < 1e-9)
      ? '$w=' + wNum(wA) + '$ ' + uW
      : '$w$: ' + wNum(wA) + ' a ' + wNum(wB) + ' ' + uW;
    if(g2 <= a + 1e-6){
      // Completa antes del corte: cuenta como su resultante en el centroide
      const A = (wA + wB)/2*len;                 // resultante, con el signo de w
      const Q1 = len*len*(wA + 2*wB)/6;          // primer momento respecto de g1
      const Ap = A*cp, Au = A*cu;
      if(Math.abs(A) > EPS){
        const cen = g1 + Q1/A;
        if(Math.abs(Ap) > EPS){
          tV.push({v:Ap, tex:Fz(Ap), poly:[Ap]});
          tM.push({v:Ap, tex:Fz(Ap) + '\\,' + brazo(cen), poly:_pEsc([-cen, 1], Ap)});
        }
        if(Math.abs(Au) > EPS) tN.push({v:-Au, tex:Fz(Au), poly:[-Au]});
        wRes.push({g1, g2, wA, wB, cen, W:A, dd, parcial:false});
        acc.push({nom:etiq + ', completa', mag:wTxt + ' $\\Rightarrow W=' + dec(Math.abs(A),'fuerza')
                  + '$ ' + uF, pos:'centroide en ' + Lz(cen), brazo:brazoTxt(cen)});
      } else {
        // Resultante nula (la carga cambia de signo y se compensa), pero el
        // efecto NO es nulo: queda un PAR, el primer momento del diagrama de
        // carga. Sin resultante no hay centroide al que llevarla, así que el
        // término general A(x - g1) - Q1 se reduce a la constante -cp*Q1.
        const Mpar = -cp*Q1;
        if(Math.abs(Mpar) > EPS){
          tM.push({v:Mpar, tex:Mz(Mpar), poly:[Mpar]});
          acc.push({nom:etiq + ', completa (resultante nula: par)',
                    mag:wTxt + ' $\\Rightarrow W=0$, $M=' + conSigno(-Mpar,'momento') + '$ ' + uM,
                    pos:Lz(g1) + '--' + Lz(g2), brazo:'par: sin brazo'});
        } else {
          acc.push({nom:etiq + ', completa (resultante nula)', mag:wTxt + ' $\\Rightarrow W=0$',
                    pos:Lz(g1) + '--' + Lz(g2), brazo:'--'});
        }
      }
      return;
    }
    if(g1 <= a + 1e-6 && g2 >= b - 1e-6){
      // Cortada: solo actúa la parte entre g1 y la sección. Se descompone en
      // un rectángulo (intensidad inicial) y un triángulo (lo que crece).
      const k = (wB - wA)/len;
      const w1p = wA*cp, kp = k*cp, w1u = wA*cu, ku = k*cu;
      const base = [-g1, 1];
      if(Math.abs(w1p) > EPS){
        tV.push({v:w1p, tex:Fz(w1p) + '\\,' + brazo(g1), poly:_pEsc(base, w1p)});
        tM.push({v:w1p, tex:Fz(w1p) + '\\,' + brazo(g1) + '\\cdot\\tfrac{1}{2}' + brazo(g1),
                 poly:_pEsc(_pPot(base,2), w1p/2)});
      }
      if(Math.abs(kp) > EPS){
        tV.push({v:kp, tex:'\\tfrac{1}{2}\\,' + Fz(kp) + '\\,' + brazo(g1) + '^{2}',
                 poly:_pEsc(_pPot(base,2), kp/2)});
        tM.push({v:kp, tex:'\\tfrac{1}{2}\\,' + Fz(kp) + '\\,' + brazo(g1) + '^{2}\\cdot\\tfrac{1}{3}' + brazo(g1),
                 poly:_pEsc(_pPot(base,3), kp/6)});
      }
      if(Math.abs(w1u) > EPS) tN.push({v:-w1u, tex:Fz(w1u) + '\\,' + brazo(g1), poly:_pEsc(base, -w1u)});
      if(Math.abs(ku) > EPS) tN.push({v:-ku, tex:'\\tfrac{1}{2}\\,' + Fz(ku) + '\\,' + brazo(g1) + '^{2}',
                                      poly:_pEsc(_pPot(base,2), -ku/2)});
      wAct.push({c, el, g1, g2, wA, wB, k, cp, cu, w1p, kp});
      wRes.push({g1, g2, wA, wB, k, dd, parcial:true});
      if(Math.abs(wA) > EPS)
        acc.push({nom:etiq + ', rectángulo hasta el corte',
                  mag:'$' + dec(Math.abs(wA),'fuerza') + '\\,' + brazo(g1) + '$ ' + uF,
                  pos:'desde ' + Lz(g1), brazo:'$\\tfrac{1}{2}' + brazo(g1) + '$'});
      if(Math.abs(k) > EPS)
        acc.push({nom:etiq + ', triángulo hasta el corte',
                  mag:'$\\tfrac{1}{2}\\cdot' + dec(Math.abs(k),'fuerza') + '\\,' + brazo(g1) + '^{2}$ ' + uF,
                  pos:'desde ' + Lz(g1), brazo:'$\\tfrac{1}{3}' + brazo(g1) + '$'});
    }
  });

  const suma = ts => ts.reduce((p,t)=>_pAdd(p, t.poly), [0]);
  const pN = suma(tN), pV = suma(tV), pM = suma(tM);
  const gN = desplazarPoly(sub.cN, off), gV = desplazarPoly(sub.cV, off), gM = desplazarPoly(sub.cM, off);
  const ok = _pIgual(pN, gN, a, b) && _pIgual(pV, gV, a, b) && _pIgual(pM, gM, a, b);
  if(!ok) console.warn('Informe LaTeX: el desarrollo del corte no reproduce el polinomio',
                       {grupo:gg.recorrido, a, b, pN, gN, pV, gV, pM, gM});
  return {sb, a, b, tN, tV, tM, acc, ctes, wAct, wRes, gN, gV, gM, ok};
}

// ── Cómo se acota el ángulo del quiebre (R21: desde el eje más cercano) ──
// El alumno mide el ángulo de la barra nueva con la horizontal o con la
// vertical —el que sea menor— y con ESE ángulo escribe la proyección. Modos:
//   'recto': la barra nueva es paralela o perpendicular a la que llega; no hay
//            ángulo que dibujar y proyectar es solo un cambio de signo.
//   'eje':   solo una de las dos barras es inclinada (deLlega dice cuál); un
//            solo θ, agudo, de esa barra con su eje más cercano. cos D y sin D se
//            escriben como ±cos θ o ±sin θ (cN, sN = {tex, val}).
//   'dos':   las dos barras inclinadas (cumbrera): θ₁ y θ₂ con sus ejes y el
//            giro θ = f(θ₁, θ₂), que es el que entra en la fórmula de siempre.
function anguloQuiebre(u1, u2, D){
  const EPS = 1e-9;
  const agudo = u => { const conH = Math.acos(Math.min(1, Math.abs(u.x)))*180/Math.PI; const desdeV = conH > 45; return {phi: desdeV ? 90 - conH : conH, desdeV}; };
  const a2 = agudo(u2);
  const cD = Math.cos(D), sD = Math.sin(D);
  const ejeLlega = Math.abs(u1.x) < EPS || Math.abs(u1.y) < EPS;
  const ejeSale = a2.phi < 1e-6;
  if(ejeLlega && ejeSale){
    const cf = v => Math.abs(v) < EPS ? {tex:'', val:0} : (v > 0 ? {tex:'1', val:1} : {tex:'-1', val:-1});
    return {modo:'recto', cN:cf(cD), sN:cf(sD), grados:Math.abs(D*180/Math.PI)};
  }
  if(ejeLlega !== ejeSale){   // exactamente una barra inclinada: su ángulo basta
    const inc = ejeLlega ? a2 : agudo(u1);
    const r = inc.phi*Math.PI/180, c = Math.cos(r), s = Math.sin(r);
    const cands = [[c,'\\cos\\theta'],[-c,'-\\cos\\theta'],[s,'\\sin\\theta'],[-s,'-\\sin\\theta']];
    const busca = v => { const m = cands.find(k => Math.abs(k[0]-v) < 1e-7); return m ? {tex:m[1], val:m[0]} : null; };
    const cN = busca(cD), sN = busca(sD);
    if(cN && sN) return {modo:'eje', phi:inc.phi, desdeV:inc.desdeV, deLlega:!ejeLlega, cN, sN};
    console.warn('Informe LaTeX: el ángulo del quiebre no reproduce la proyección', {phi:inc.phi, D});
  }
  const a1 = agudo(u1), gD = Math.abs(D*180/Math.PI);
  const rel = [['\\theta_1 + \\theta_2', a1.phi + a2.phi], ['\\theta_2 - \\theta_1', a2.phi - a1.phi], ['\\theta_1 - \\theta_2', a1.phi - a2.phi],
               ['90^\\circ - \\theta_1 - \\theta_2', 90 - a1.phi - a2.phi], ['90^\\circ + \\theta_1 - \\theta_2', 90 + a1.phi - a2.phi],
               ['90^\\circ - \\theta_1 + \\theta_2', 90 - a1.phi + a2.phi], ['90^\\circ + \\theta_1 + \\theta_2', 90 + a1.phi + a2.phi],
               ['180^\\circ - \\theta_1 - \\theta_2', 180 - a1.phi - a2.phi]].find(k => Math.abs(k[1] - gD) < 1e-6);
  return {modo:'dos', phi1:a1.phi, desdeV1:a1.desdeV, phi2:a2.phi, desdeV2:a2.desdeV, rel: rel ? rel[0] : null};
}
// Escribe «a·N⁻ ± b·V⁻» a partir de coeficientes {tex, val}: '' es cero (el
// término no se escribe), '1'/'-1' dejan el símbolo solo, y '±cosθ'/'±sinθ' van
// pegados al símbolo. Si todo es cero, escribe 0.
function _terminosProy(pares){
  const partes = [];
  pares.forEach(([k, sym])=>{
    if(!k || k.tex === '') return;
    let neg = false, cuerpo = k.tex;
    if(cuerpo.charAt(0) === '-'){ neg = true; cuerpo = cuerpo.slice(1); }
    partes.push({neg, t: (cuerpo === '1') ? sym : sym + cuerpo});
  });
  if(!partes.length) return '0';
  return partes.map((q, i) => (i === 0 ? (q.neg ? '-' : '') : (q.neg ? ' - ' : ' + ')) + q.t).join('');
}

// ── DCL del nudo de quiebre ──
// Es un cuerpo libre de verdad: en cada barra, las TRES solicitaciones con su
// flecha —N por el eje, V perpendicular y M como arco—, no una lista de valores
// al lado. A la izquierda, lo que LLEGA referido a los ejes del tramo anterior;
// a la derecha, lo que SALE, ya proyectado sobre los ejes nuevos. Entre las dos,
// el ángulo θ de la barra nueva con su eje más cercano (R21), de donde salen el seno y el coseno.
// Cada flecha se dibuja sobre SU barra, en el SENTIDO REAL cuando ya se conoce.
// El rotulo lleva SOLO el nombre de la solicitacion (R21), nunca su valor: el
// superindice es del convenio de signos, no un sentido. Los valores van debajo.
// ── Sentidos reales sobre el nudo (cuerpo libre del pasador) ──
// Se deducen del convenio del curso y la tercera ley. Con N > 0 (tracción) la
// barra TIRA del nudo hacia ella: −û en la barra que llega, +û en la que sale.
// Con V > 0 la cara del tramo izquierdo lleva la cortante hacia −n̂; sobre el
// nudo va la opuesta, +n̂ desde la barra que llega y −n̂ desde la que sale.
// Con M > 0 (cóncavo hacia arriba) la cara derecha del tramo izquierdo lleva
// el par antihorario; sobre el nudo, horario desde la barra que llega y
// antihorario desde la que sale. Valor negativo ⇒ sentido contrario. Con eso
// el nudo cierra: Σ(barra que llega) + Σ(barra que sale) + cargas del nudo = 0,
// y `bloqueQuiebre` lo comprueba numéricamente.
function tikzNudoQuiebre(u1, u2, nom, ang, Nm, Vm, Mm, N0, V0, M0, enNudo){
  const F = n => n.toFixed(3);
  const n1 = {x:-u1.y, y:u1.x}, n2 = {x:-u2.y, y:u2.x};
  const sg = v => (v >= 0 ? 1 : -1);
  // La barra tiene que dar para las tres solicitaciones seguidas sin que se
  // toquen: V en 0.95, N de 1.70 a 2.50 y el arco de M más allá, en 2.95.
  const L = 3.5;
  tzReiniciar();
  let o = '';
  o += '\\draw[line width=1.5pt, color=bsaMuted] (' + F(-u1.x*L) + ',' + F(-u1.y*L) + ') -- (0,0);\n';
  o += '\\draw[line width=1.7pt, color=bsaAcc2] (0,0) -- (' + F(u2.x*L) + ',' + F(u2.y*L) + ');\n';
  tzOcuparTrazo(-u1.x*L, -u1.y*L, 0, 0, 0.09);
  tzOcuparTrazo(0, 0, u2.x*L, u2.y*L, 0.09);
  o += '\\filldraw[color=bsaAcc2] (0,0) circle (0.07);\n';
  tzOcupar(-0.13, -0.13, 0.13, 0.13);
  o += tzTexto(-n2.x*0.34, -n2.y*0.34, '\\textbf{' + nom + '}',
               'font=\\small, color=bsaAcc2', -n2.x, -n2.y);
  // Ángulo del quiebre acotado desde el eje más cercano (R21). En modo 'eje' hay
  // un solo θ, el de la barra nueva; en modo 'dos' (cumbrera) también θ₁, el de
  // la barra que llega; en modo 'recto' no hay ángulo que dibujar.
  const arcoEje = (u, etiqueta) => {
    const conH = Math.acos(Math.min(1, Math.abs(u.x)))*180/Math.PI, desdeV = conH > 45;
    const rayDeg = desdeV ? (u.y >= 0 ? 90 : -90) : (u.x >= 0 ? 0 : 180);
    let endDeg = Math.atan2(u.y, u.x)*180/Math.PI;
    while(endDeg - rayDeg > 180) endDeg -= 360;
    while(endDeg - rayDeg < -180) endDeg += 360;
    const cr = Math.cos(rayDeg*Math.PI/180), sr = Math.sin(rayDeg*Math.PI/180);
    let q = '\\draw[dotted, color=bsaMuted] (0,0) -- (' + F(cr*1.05) + ',' + F(sr*1.05) + ');\n';
    q += '\\draw[-{Latex[length=1.5mm]}, color=bsaCarga, line width=.8pt] (' + F(cr*0.78) + ',' + F(sr*0.78)
       + ') arc (' + F(rayDeg) + ':' + F(endDeg) + ':0.78);\n';
    const am = (rayDeg + endDeg)/2*Math.PI/180;
    tzOcupar(-0.85, -0.85, 0.85, 0.85);
    q += tzTexto(Math.cos(am)*1.30, Math.sin(am)*1.30, etiqueta, 'font=\\small, color=bsaCarga', Math.cos(am), Math.sin(am));
    return q;
  };
  if(ang.modo === 'eje') o += arcoEje(ang.deLlega ? {x:-u1.x, y:-u1.y} : u2, '$\\theta = ' + ang.phi.toFixed(1) + '^\\circ$');
  if(ang.modo === 'dos'){
    o += arcoEje({x:-u1.x, y:-u1.y}, '$\\theta_1 = ' + ang.phi1.toFixed(1) + '^\\circ$');
    o += arcoEje(u2, '$\\theta_2 = ' + ang.phi2.toFixed(1) + '^\\circ$');
  }

  // Una terna de solicitaciones sobre una barra. s = +1 la que sale, s = −1 la
  // que llega. dN, dV, dM son los sentidos con valor POSITIVO (ver cabecera);
  // el signo del valor los invierte. El rótulo lleva solo el nombre (R21).
  const terna = (u, n, s, col, sN, sV, sM, vN, vV, vM, dN, dV, dM) => {
    let q = '';
    const ex = u.x*s, ey = u.y*s;
    const flecha = (ax, ay, bx, by, tex) => {
      q += '\\draw[-{Latex[length=2mm]}, color=' + col + ', line width=1.2pt] ('
         + F(ax) + ',' + F(ay) + ') -- (' + F(bx) + ',' + F(by) + ');\n';
      tzOcuparTrazo(ax, ay, bx, by, 0.07);
      const dx = bx-ax, dy = by-ay;
      q += tzTexto(bx+dx*0.32, by+dy*0.32, '{\\scriptsize' + tex + '}', 'color=' + col, dx, dy);
    };
    // Una solicitación nula no es una fuerza sobre el cuerpo libre: no se
    // dibuja. Un arco con «M = 0.00» al lado confunde más de lo que explica.
    const NULO = 5e-4;
    // El hueco del arco de M se reserva ANTES de rotular V y N: si no, el rótulo
    // de N (que busca sitio hacia el extremo de la barra) acaba dentro del arco.
    if(Math.abs(vM) > NULO) tzOcupar(ex*2.95-0.36, ey*2.95-0.36, ex*2.95+0.36, ey*2.95+0.36);
    // V: perpendicular a la barra, desde el eje hacia el lado que marque el sentido
    if(Math.abs(vV) > NULO){
      const kV = dV*sg(vV);
      flecha(ex*0.95, ey*0.95, ex*0.95 + n.x*0.80*kV, ey*0.95 + n.y*0.80*kV,
             '$' + sV + '$');
    }
    // N: sobre el eje, entre 1.70 y 2.50; la punta va donde diga el sentido
    if(Math.abs(vN) > NULO){
      const kN = dN*sg(vN);             // +1 hacia afuera del nudo, −1 hacia él
      if(kN > 0) flecha(ex*1.70, ey*1.70, ex*2.50, ey*2.50, '$' + sN + '$');
      else       flecha(ex*2.50, ey*2.50, ex*1.70, ey*1.70, '$' + sN + '$');
    }
    // M: arco sobre la barra; antihorario si dM·signo > 0, horario si no
    if(Math.abs(vM) > NULO){
      const cx = ex*2.95, cy = ey*2.95, kM = dM*sg(vM);
      q += '\\draw[-{Latex[length=1.8mm]}, color=' + col + ', line width=1.1pt] ('
         + F(cx+0.30) + ',' + F(cy) + ') arc (0:' + (kM > 0 ? '300' : '-300') + ':0.30);\n';
      tzOcupar(cx-0.36, cy-0.36, cx+0.36, cy+0.36);
      q += tzTexto(cx - n.x*0.64, cy - n.y*0.64,
                   '{\\scriptsize$' + sM + '$}', 'color=' + col, -n.x, -n.y);
    }
    return q;
  };
  // llega: N⁻>0 tira hacia la barra (dN=+1 sobre −û, es decir "afuera"), V⁻>0
  // hacia +n̂, M⁻>0 horario. Sale: N₀>0 afuera (+û), V₀>0 hacia −n̂, M₀>0
  // antihorario.
  o += terna(u1, n1, -1, 'bsaMuted', 'N^-', 'V^-', 'M^-', Nm, Vm, Mm, +1, +1, -1);
  o += terna(u2, n2, +1, 'bsaReac', 'N_0', 'V_0', 'M_0', N0, V0, M0, +1, -1, +1);

  // ── Cargas aplicadas justo en el nudo ──
  // Estaban en el DCL global y en las ecuaciones de proyección, pero no en la
  // figura del nudo: sin ellas el nudo dibujado no cierra.
  (enNudo || []).forEach(e=>{
    const Fm = Math.hypot(e.fx || 0, e.fy || 0);
    if(Fm > 1e-9){
      const ex = e.fx/Fm, ey = e.fy/Fm;
      o += '\\draw[-{Latex[length=2mm]}, color=bsaCarga, line width=1.2pt] ('
         + F(-ex*1.05) + ',' + F(-ey*1.05) + ') -- (' + F(-ex*0.14) + ',' + F(-ey*0.14) + ');\n';
      tzOcuparTrazo(-ex*1.05, -ey*1.05, -ex*0.14, -ey*0.14, 0.07);
      o += tzTexto(-ex*1.32, -ey*1.32, '{\\scriptsize$' + dec(Fm,'fuerza') + '$}',
                   'color=bsaCarga', -ex, -ey);
    }
    if(Math.abs(e.m || 0) > 1e-9){
      o += '\\draw[-{Latex[length=1.7mm]}, color=bsaMomento, line width=1.1pt] (0.48,0) arc (0:'
         + (e.m > 0 ? '300' : '-300') + ':0.48);\n';
      tzOcupar(-0.52, -0.52, 0.52, 0.52);
      o += tzTexto(-n1.x*0.95 - u1.x*0.3, -n1.y*0.95 - u1.y*0.3,
                   '{\\scriptsize$M_{\\text{apl}} = ' + dec(Math.abs(e.m),'momento') + '$}',
                   'color=bsaMomento', -n1.x, -n1.y);
    }
  });
  // Marco de referencia (û, n̂) del tramo nuevo, en la esquina más despejada y
  // NO sobre el nudo: dice cuál es el sentido positivo de N₀ y V₀ sin que se
  // confunda con una fuerza (R21). La esquina es la que queda angularmente más
  // lejos de las dos barras y de las cargas del nudo.
  {
    const dirs = [Math.atan2(-u1.y,-u1.x), Math.atan2(u2.y,u2.x)].map(v=>v*180/Math.PI);
    (enNudo || []).forEach(e=>{ const Fm = Math.hypot(e.fx || 0, e.fy || 0); if(Fm > 1e-9) dirs.push(Math.atan2(-e.fy,-e.fx)*180/Math.PI); });
    const sep = (p, q) => Math.abs(((p - q) % 360 + 540) % 360 - 180);
    // Esquinas ordenadas por hueco angular; se toma la primera cuya caja no choca
    // con nada ya reservado (rótulos, flechas, arcos), probando dos radios.
    const orden = [45, 135, 225, 315].map(e=>({e, hueco:Math.min(...dirs.map(d => sep(e, d)))})).sort((p, q)=>q.hueco - p.hueco);
    let ox = null, oy = null;
    for(const r of [4.1, 4.9]){
      for(const c of orden){
        const x = r*Math.cos(c.e*Math.PI/180), y = r*Math.sin(c.e*Math.PI/180);
        if(!tzChoca({x0:x-0.95, y0:y-0.95, x1:x+0.95, y1:y+0.95})){ ox = x; oy = y; break; }
      }
      if(ox !== null) break;
    }
    if(ox === null){ ox = 4.9*Math.cos(orden[0].e*Math.PI/180); oy = 4.9*Math.sin(orden[0].e*Math.PI/180); }
    o += '\\draw[-{Latex[length=1.5mm]}, color=bsaAcc, line width=.7pt] (' + F(ox) + ',' + F(oy) + ') -- (' + F(ox+u2.x*0.7) + ',' + F(oy+u2.y*0.7) + ');\n';
    o += '\\draw[-{Latex[length=1.5mm]}, color=bsaAcc, line width=.7pt] (' + F(ox) + ',' + F(oy) + ') -- (' + F(ox+n2.x*0.7) + ',' + F(oy+n2.y*0.7) + ');\n';
    o += '\\fill[bsaAcc] (' + F(ox) + ',' + F(oy) + ') circle (0.8pt);\n';
    tzOcupar(ox-0.15, oy-0.15, ox+0.15, oy+0.15);
    tzOcuparTrazo(ox, oy, ox+u2.x*0.7, oy+u2.y*0.7, 0.05);
    tzOcuparTrazo(ox, oy, ox+n2.x*0.7, oy+n2.y*0.7, 0.05);
    o += tzTexto(ox+u2.x*0.92, oy+u2.y*0.92, '{\\scriptsize$\\hat{u}$}', 'color=bsaAcc', u2.x, u2.y);
    o += tzTexto(ox+n2.x*0.92, oy+n2.y*0.92, '{\\scriptsize$\\hat{n}$}', 'color=bsaAcc', n2.x, n2.y);
  }
  return o;
}

// ── Solicitaciones en el nudo de quiebre: de dónde salen N0, V0 y M0 ──
// Al cambiar de dirección, lo que llega del tramo anterior se proyecta
// sobre los ejes nuevos. Se muestra la rotación y las acciones del nudo.
function bloqueQuiebre(R, grupos, gg, info){
  const EPS = 1e-9;
  const prev = grupos[gg.idx - 1];
  if(!prev || !info.ctes) return '';
  const segP = prev.tramos[prev.tramos.length - 1];
  const subP = segP.subs[segP.subs.length - 1];
  const Nm = polyVal(subP.cN, subP.sb), Vm = polyVal(subP.cV, subP.sb), Mm = polyVal(subP.cM, subP.sb);
  const u1 = {x:segP.ux, y:segP.uy}, u2 = {x:gg.tramos[0].ux, y:gg.tramos[0].uy};
  const D = Math.atan2(u1.x*u2.y - u1.y*u2.x, u1.x*u2.x + u1.y*u2.y);
  const cD = Math.cos(D), sD = Math.sin(D);
  const Nr = Nm*cD - Vm*sD, Vr = Nm*sD + Vm*cD;
  const nx = -u2.y, ny = u2.x;
  let dN = 0, dV = 0, dM = 0; const enNudo = [];
  (R.internas.puntuales || []).forEach(o=>{
    if(o.s === null || Math.abs(o.s - gg.s0) > EPS) return;
    const ac = o.a;
    const Fpar = ac.fx*u2.x + ac.fy*u2.y, Fper = ac.fx*nx + ac.fy*ny;
    dN += -Fpar; dV += Fper; dM += -(ac.m || 0);
    enNudo.push({nom:nombreAccion(ac), Fpar, Fper, m:ac.m || 0, fx:ac.fx, fy:ac.fy});
  });
  // Autocontrol del cuerpo libre del nudo con los sentidos que se dibujan:
  // Σ(barra que llega) + Σ(barra que sale) + cargas del nudo debe ser cero.
  {
    const {N0:n0, V0:v0, M0:m0} = info.ctes;
    const n1x = -u1.y, n1y = u1.x;
    let sx = -Nm*u1.x + Vm*n1x + n0*u2.x - v0*nx;
    let sy = -Nm*u1.y + Vm*n1y + n0*u2.y - v0*ny;
    let sm = -Mm + m0;
    enNudo.forEach(e=>{ sx += e.fx || 0; sy += e.fy || 0; sm += e.m || 0; });
    if(Math.max(Math.abs(sx), Math.abs(sy), Math.abs(sm)) > 1e-5)
      console.warn('Informe LaTeX: el DCL del nudo no cierra', {nudo:gg.desde.nombre, sx, sy, sm});
  }
  const {N0, V0, M0} = info.ctes;
  const nn = escLatex(gg.desde.nombre), np = escLatex(prev.recorrido);
  const uF = escLatex(unitFor), uM = escLatex(unidadMomento());
  const g = (D*180/Math.PI).toFixed(1);
  const ang = anguloQuiebre(u1, u2, D);
  const ejeTxt = v => (v ? 'vertical' : 'horizontal');
  const recto90 = ang.modo === 'recto' && Math.abs(ang.grados - 90) < 1;
  let out = '';
  if(_primeraVez('quiebre'))
    out += '\\porque{En un quiebre, todo lo que hay antes del nudo se sustituye por las tres '
      + 'solicitaciones que ese nudo transmite. Se conocen del tramo anterior, pero están '
      + 'referidas a SUS ejes: el tramo nuevo cambia de dirección, así que hay que '
      + 'proyectarlas sobre el eje y la normal nuevos —con el ángulo que la barra nueva '
      + 'forma con la horizontal o con la vertical, el que sea menor— y sumar las acciones '
      + 'aplicadas justo en el nudo. En el DCL del nudo las flechas van en el sentido real y el nombre '
      + 'conserva el convenio: $N^-$, $V^-$, $M^-$ lo que llega; $N_0$, $V_0$, $M_0$ lo que sale.}\n';
  const fraseAng = ang.modo === 'eje'
    ? '$\\theta$: barra ' + (ang.deLlega ? 'que llega' : 'nueva') + ', desde la ' + ejeTxt(ang.desdeV) + '.'
    : ang.modo === 'recto'
    ? 'Barras ' + (recto90 ? 'perpendiculares' : 'paralelas') + ': sin ángulo.'
    : '$\\theta_1$, $\\theta_2$ desde su eje más cercano; $\\theta$ es el giro entre barras.';
  out += '\\begin{center}\\begin{tikzpicture}\n'
       + tikzNudoQuiebre(u1, u2, nn, ang, Nm, Vm, Mm, N0, V0, M0, enNudo)
       + '\\end{tikzpicture}\\\\[2pt]\n{\\footnotesize\\color{bsaMuted} DCL del nudo ' + nn
       + ': en gris lo que llega por ' + np + ', en verde lo que sale al tramo nuevo'
       + (enNudo.length ? ', en rojo y violeta las cargas del nudo' : '') + '. ' + fraseAng + '}\\end{center}\\vspace{2pt}\n';
  let proy;
  if(ang.modo === 'eje')
    proy = 'Proyectando con $\\theta = ' + ang.phi.toFixed(1) + '^\\circ$ (ángulo de la barra ' + (ang.deLlega ? 'que llega' : 'nueva') + ' con la ' + ejeTxt(ang.desdeV) + '):';
  else if(ang.modo === 'recto')
    proy = 'La barra nueva es ' + (recto90 ? 'perpendicular' : 'paralela') + ' a la anterior ($\\theta = ' + ang.grados.toFixed(0) + '^\\circ$), así que:';
  else
    proy = 'Con $\\theta_1 = ' + ang.phi1.toFixed(1) + '^\\circ$ (' + ejeTxt(ang.desdeV1) + ') y $\\theta_2 = ' + ang.phi2.toFixed(1) + '^\\circ$ (' + ejeTxt(ang.desdeV2)
         + '), el giro entre barras es $\\theta = ' + (D < 0 ? '-' : '') + (ang.rel ? '(' + ang.rel + ') = ' : '') + g + '^\\circ$'
         + (D < 0 ? ' (negativo: horario)' : '') + '. Proyectando:';
  out += '\\noindent{\\footnotesize Al final del tramo ' + np + ': $N^- = ' + dec(Nm,'fuerza')
    + '$, $V^- = ' + dec(Vm,'fuerza') + '$ ' + uF + ', $M^- = ' + dec(Mm,'momento') + '$ ' + uM
    + '. ' + proy + '}\n';
  const extraN = enNudo.filter(e=>Math.abs(e.Fpar) > EPS).map(e=>(e.Fpar > 0 ? ' - ' : ' + ') + dec(Math.abs(e.Fpar),'fuerza')).join('');
  const extraV = enNudo.filter(e=>Math.abs(e.Fper) > EPS).map(e=>(e.Fper < 0 ? ' - ' : ' + ') + dec(Math.abs(e.Fper),'fuerza')).join('');
  const extraM = enNudo.filter(e=>Math.abs(e.m) > EPS).map(e=>(e.m > 0 ? ' - ' : ' + ') + dec(Math.abs(e.m),'momento')).join('');
  // La proyección exacta es N₀ = N⁻cos D − V⁻sin D y V₀ = N⁻sin D + V⁻cos D. Se
  // escribe con el ángulo DIBUJADO: cos D y sin D pasan a ±cosθ, ±sinθ, ±1 o 0.
  let fN, fV;
  if(ang.modo === 'dos'){
    fN = 'N^-\\cos\\theta - V^-\\sin\\theta'; fV = 'N^-\\sin\\theta + V^-\\cos\\theta';
  } else {
    const neg = k => ({tex: k.tex === '' ? '' : (k.tex.charAt(0) === '-' ? k.tex.slice(1) : '-' + k.tex), val: -k.val});
    fN = _terminosProy([[ang.cN, 'N^-'], [neg(ang.sN), 'V^-']]);
    fV = _terminosProy([[ang.sN, 'N^-'], [ang.cN, 'V^-']]);
    // Autocontrol: la fórmula escrita debe dar lo mismo que el giro exacto.
    const eN = Nm*ang.cN.val - Vm*ang.sN.val, eV = Nm*ang.sN.val + Vm*ang.cN.val;
    if(Math.max(Math.abs(eN - Nr), Math.abs(eV - Vr)) > 1e-6)
      console.warn('Informe LaTeX: el ángulo del quiebre no reproduce la proyección', {nudo:gg.desde.nombre, eN, Nr, eV, Vr});
  }
  out += _alineada([
    'N_0 &= ' + fN + (extraN ? ' \\underbrace{' + extraN + '}_{\\text{en } ' + nn + '}' : '')
      + ' = ' + dec(N0,'fuerza') + '\\ \\text{' + uF + '}',
    'V_0 &= ' + fV + (extraV ? ' \\underbrace{' + extraV + '}_{\\text{en } ' + nn + '}' : '')
      + ' = ' + dec(V0,'fuerza') + '\\ \\text{' + uF + '}',
    'M_0 &= M^-' + (extraM ? ' \\underbrace{' + extraM + '}_{\\text{par en } ' + nn + '}' : '')
      + ' = ' + dec(M0,'momento') + '\\ \\text{' + uM + '}'
  ]);
  const res = Math.max(Math.abs(N0 - (Nr + dN)), Math.abs(V0 - (Vr + dV)), Math.abs(M0 - (Mm + dM)));
  if(res > 1e-5) console.warn('Informe LaTeX: nudo de quiebre no cierra', {nudo:gg.desde.nombre, res});
  return out;
}

// ── Desarrollo completo de un corte: DCL, acciones, ecuaciones y funciones ──
function desarrolloCorte(R, grupos, gg, seg, sub, figCaption){
  const info = terminosCorte(R, gg, seg, sub);
  const {sb, a, b, tN, tV, tM, acc, wAct, gN, gV, gM} = info;
  const uF = escLatex(unitFor), uM = escLatex(unidadMomento()), uL = escLatex(unitLen), uW = escLatex(uDist());
  const Lz = v => dec(v,'len');
  let out = '';

  out += '\\noindent{\\bfseries Corte en $' + Lz(a) + ' \\le ' + sb + ' \\le ' + Lz(b) + '$\\,' + uL + '}\\\\[2pt]\n';
  out += '\\begin{center}\\begin{tikzpicture}\n' + tikzDCLSub(R, gg, seg, sub, info)
       + '\\end{tikzpicture}\\end{center}\n';
  out += figCaption('DCL del trozo antes de la sección $S$ (abscisa $' + sb + '$ desde ' + escLatex(gg.desde.nombre) + ').');

  // El quiebre se explica UNA vez por nudo, en el primer corte del grupo.
  // Repetirlo en cada corte era lo que sobraba: los números son los mismos.
  const esPrimerCorte = (seg === gg.tramos[0] && sub === gg.tramos[0].subs[0]);
  if(info.ctes && esPrimerCorte) out += bloqueQuiebre(R, grupos, gg, info);

  // ── Proyección de cada acción sobre los ejes del tramo ──
  // Antes era una tabla de cuatro columnas con el resultado ya hecho. Ahora se
  // escribe el pequeño desarrollo de cada proyección, que es lo que el alumno
  // tiene que saber hacer. En un tramo horizontal no hay nada que proyectar.
  const EPS = 1e-9;
  if(gg.inclinado && esPrimerCorte){
    const th = gg.ang*Math.PI/180, co = Math.cos(th), si = Math.sin(th);
    const filasP = [];
    acc.forEach(f=>{
      const p = f.proy;
      if(!p) return;
      if(Math.abs(p.Fper) < EPS && Math.abs(p.Fpar) < EPS) return;
      const Fs = p.tex;
      let ePer, ePar, vPer, vPar;
      if(Math.abs(p.fx) < EPS){
        ePer = Fs + '\\cos\\theta';  ePar = Fs + '\\sin\\theta';
        vPer = p.fy*co;              vPar = p.fy*si;
      } else if(Math.abs(p.fy) < EPS){
        ePer = '-' + Fs + '\\sin\\theta'; ePar = Fs + '\\cos\\theta';
        vPer = -p.fx*si;                  vPar = p.fx*co;
      } else {
        ePer = Fs + '_y\\cos\\theta - ' + Fs + '_x\\sin\\theta';
        ePar = Fs + '_x\\cos\\theta + ' + Fs + '_y\\sin\\theta';
        vPer = p.Fper;                    vPar = p.Fpar;
      }
      filasP.push(Fs + ': \\quad F_{\\perp} &= ' + ePer + ' = ' + dec(vPer,'fuerza')
        + '\\ \\text{' + uF + '} & F_{\\parallel} &= ' + ePar + ' = ' + dec(vPar,'fuerza')
        + '\\ \\text{' + uF + '}');
    });
    if(filasP.length){
      out += '\\noindent{\\footnotesize Cada fuerza se proyecta sobre el eje del tramo y sobre su '
        + 'normal, con $\\theta = ' + gg.ang.toFixed(1) + '^\\circ$ ($F_{\\perp}$ positiva hacia '
        + 'arriba de la normal, $F_{\\parallel}$ en el sentido de avance):}\n';
      out += _alineada(filasP);
    }
  }

  // Ley de la carga cortada
  wAct.forEach(w=>{
    const hayProy = Math.abs(Math.abs(w.cp) - 1) > 1e-6 || Math.abs(w.cu) > 1e-6;
    if(Math.abs(w.k) > 1e-9){
      out += '\\noindent{\\footnotesize La carga repartida cortada varía linealmente; su intensidad '
        + 'en la sección es:}\n';
      out += '$$w(' + sb + ') = ' + polyTex([w.wA - w.k*w.g1, w.k], 'fuerza', sb) + '\\ \\text{' + uW + '}'
        + (hayProy ? '\\qquad w_{\\perp} = ' + polyTex([(w.wA - w.k*w.g1)*w.cp, w.k*w.cp], 'fuerza', sb)
                   + ',\\quad w_{\\parallel} = ' + polyTex([(w.wA - w.k*w.g1)*w.cu, w.k*w.cu], 'fuerza', sb) : '')
        + '$$\n';
      if(_primeraVez('w-cortada-variable'))
        out += '\\porque{Como la sección cae dentro de la carga, NO se puede usar la resultante de '
          + 'toda la carga: solo actúa la parte comprendida entre su inicio y el corte, y esa parte '
          + 'depende de la abscisa. Se descompone en un rectángulo de altura $w_1$ (resultante '
          + '$w_1(x-d)$ a la mitad del trozo) y un triángulo (resultante '
          + '$\\tfrac12 k(x-d)^2$, a un tercio del trozo desde el corte).}\n';
    } else {
      // La proyección lleva números propios de este corte, así que va fuera de
      // la caja conceptual: la caja se escribe una vez, los números siempre.
      if(hayProy)
        out += '\\noindent{\\footnotesize En este tramo inclinado la intensidad se proyecta sobre la '
          + 'normal ($w_{\\perp} = ' + dec(Math.abs(w.w1p),'fuerza') + '$) y sobre el eje '
          + '($w_{\\parallel} = ' + dec(Math.abs(w.wA*w.cu),'fuerza') + '$ ' + uW + ').}\\\\[2pt]\n';
      if(_primeraVez('w-cortada-uniforme'))
        out += '\\porque{La sección cae dentro de la carga repartida: solo actúa la parte comprendida '
          + 'entre su inicio y el corte. Su resultante vale $w\\,(x - d)$ y pasa por la mitad de '
          + 'ese trozo, a $\\tfrac12(x - d)$ del corte. Por eso $V$ resulta lineal y $M$ parabólico.}\n';
    }
  });

  // Ecuaciones de equilibrio del trozo, con todos los términos
  out += '\\noindent{\\footnotesize Equilibrio del trozo:}\n';
  const filas = [];
  const negN = tN.map(t=>({v:-t.v, tex:t.tex}));
  if(tN.length || gN.some(v=>Math.abs(v) > 5e-9)){
    filas.push(_fila('\\xrightarrow{+}\\ \\sum F_{\\parallel} = 0:\\quad', negN, (tN.length ? ' + N = 0' : 'N = 0'), 4, ' & '));
    filas.push(_fila('N(' + sb + ')', tN, (tN.length > 2 ? ' \\\\\n &= ' : ' = ') + polyTex(gN,'fuerza',sb) + '\\ \\text{' + uF + '}'));
  }
  filas.push(_fila('+\\!\\uparrow\\ \\sum F_{\\perp} = 0:\\quad', tV, (tV.length ? ' - V = 0' : 'V = 0'), 4, ' & '));
  filas.push(_fila('V(' + sb + ')', tV, (tV.length > 2 ? ' \\\\\n &= ' : ' = ') + polyTex(gV,'fuerza',sb) + '\\ \\text{' + uF + '}'));
  // Momentos respecto del corte S, antihorario positivo: la M interna del
  // trozo izquierdo es antihoraria, y cada fuerza hacia arriba situada a la
  // izquierda del corte da momento horario (por eso entra con signo cambiado).
  let filaM = '\\circlearrowleft\\!+\\ \\sum M_{S} = 0:\\quad M &';
  tM.forEach((t,i)=>{
    if(i > 0 && i % 3 === 0) filaM += ' \\\\\n &\\qquad ';
    filaM += (t.v < 0 ? ' + ' : ' - ') + t.tex;
  });
  filas.push(filaM + ' = 0');
  filas.push(_fila('M(' + sb + ')', tM, (tM.length > 1 ? ' \\\\\n &= ' : ' = ') + polyTex(gM,'momento',sb) + '\\ \\text{' + uM + '}', 3));
  out += _alineada(filas);

  // Funciones resultantes, destacadas
  out += '\\resultado{'
    + (gN.some(v=>Math.abs(v) > 5e-9) ? '$N(' + sb + ') = ' + polyTex(gN,'fuerza',sb) + '$ ' + uF + '\\quad ' : '')
    + '$V(' + sb + ') = ' + polyTex(gV,'fuerza',sb) + '$ ' + uF
    + '\\quad $M(' + sb + ') = ' + polyTex(gM,'momento',sb) + '$ ' + uM + '}\n';

  // ── Valores en los extremos y en los puntos singulares ──
  // Iban en una frase corrida de tres líneas; en tabla se comparan de un
  // vistazo y se leen igual que la tabla de secciones notables del tramo.
  const cerosV = raicesEn(gV, a, b).filter(x=>x > a + 1e-6 && x < b - 1e-6);
  const cerosM = raicesEn(gM, a, b).filter(x=>x > a + 1e-6 && x < b - 1e-6);
  const hayNn = gN.some(v=>Math.abs(v) > 5e-9);
  const puntos = [{x:a, nota:''}]
    .concat(cerosV.map(x=>({x, nota:'$V = 0$: aquí $M$ es extremo'})))
    .concat(cerosM.map(x=>({x, nota:'$M = 0$: punto de inflexión'})))
    .concat([{x:b, nota:''}])
    .sort((p,q)=>p.x - q.x);
  const hayNota = puntos.some(p=>p.nota);
  out += tablaCaption('Valores de la ley en los extremos del intervalo'
    + (hayNota ? ' y en sus puntos singulares' : '') + '.');
  out += '{\\footnotesize\\begin{center}\\begin{tabular}{r' + (hayNn?'r':'') + 'rr'
    + (hayNota ? 'l' : '') + '}\n\\hline\n'
    + '$' + sb + '$ [' + uL + '] & ' + (hayNn ? '$N$ [' + uF + '] & ' : '')
    + '$V$ [' + uF + '] & $M$ [' + uM + ']'
    + (hayNota ? ' & ' : '') + ' \\\\\n\\hline\n';
  puntos.forEach(p=>{
    out += dec(p.x,'len') + ' & '
      + (hayNn ? dec(polyVal(gN,p.x),'fuerza') + ' & ' : '')
      + dec(polyVal(gV,p.x),'fuerza') + ' & ' + dec(polyVal(gM,p.x),'momento')
      + (hayNota ? ' & {\\scriptsize\\color{bsaMuted}' + p.nota + '}' : '') + ' \\\\\n';
  });
  out += '\\hline\n\\end{tabular}\\end{center}}\n';
  return out;
}

// ── Tabla de valores en los nudos: antes y después ──
// En un nudo con carga puntual el valor salta, así que una sola columna
// mentía. Se dan las dos caras del nudo.
// Antes eran seis columnas ($N^-$, $N^+$, $V^-$, $V^+$, $M^-$, $M^+$) y filas
// enteras de guiones donde el valor no saltaba. Ahora hay una columna por
// magnitud, con un solo número cuando el valor es continuo y «antes → después»
// solo donde de verdad salta, que es lo que hay que ver.
function tablaNudosGrupo(R, gg){
  const pts = [];
  gg.tramos.forEach(t2=>{
    t2.subs.forEach(su=>{
      pts.push({x: t2.s0 - gg.s0 + su.sa, su, loc:su.sa, cara:'+'});
      pts.push({x: t2.s0 - gg.s0 + su.sb, su, loc:su.sb, cara:'-'});
    });
  });
  // Las claves se redondean a 4 decimales; hay que buscar con el MISMO
  // redondeo. Comparando la clave redondeada contra la abscisa sin redondear,
  // una sección en 3.605551 no casaba con su clave 3.6056 y la fila entera
  // salía con guiones: era el «no se comprende» de esta tabla.
  const cl = v => +v.toFixed(4);
  const claves = [...new Set(pts.map(p=>cl(p.x)))].sort((a,b)=>a-b);
  if(!claves.length) return '';
  const celda = (x, campo) => {
    const cand = pts.filter(p=>cl(p.x) === x);
    if(!cand.length) return '--';
    const dt = (campo === 'cM') ? 'momento' : 'fuerza';
    const a = cand.filter(p=>p.cara === '-')[0];
    const d = cand.filter(p=>p.cara === '+')[0];
    const va = a ? polyVal(a.su[campo], a.loc) : null;
    const vd = d ? polyVal(d.su[campo], d.loc) : null;
    if(va === null) return dec(vd, dt);
    if(vd === null) return dec(va, dt);
    if(Math.abs(va - vd) < 5e-4) return dec(va, dt);
    return '$' + dec(va, dt) + ' \\rightarrow ' + dec(vd, dt) + '$';   // salto
  };
  // Nombre del nudo, si la sección cae en uno: sitúa la fila sin contar cotas.
  const nombrePunto = x => {
    let nom = '';
    gg.tramos.forEach(t2=>{
      const off = t2.s0 - gg.s0;
      if(cl(off) === x) nom = t2.desde.nombre;
      if(cl(off + t2.L) === x) nom = t2.hasta.nombre;
    });
    return nom ? '\\,(' + escLatex(nom) + ')' : '';
  };
  const haySalto = claves.some(x=>['cN','cV','cM'].some(c=>celda(x,c).indexOf('rightarrow') >= 0));
  const hayN = gg.tramos.some(t2=>t2.subs.some(su=>su.cN.some(v=>Math.abs(v)>5e-9)));
  let out = tablaCaption('Valores en las secciones notables del tramo '
          + escLatex(gg.recorrido) + '. $N$ y $V$ en ' + escLatex(unitFor) + ', $M$ en '
          + escLatex(unidadMomento())
          + (haySalto ? '. Donde la magnitud salta se escribe el valor justo antes '
             + '$\\rightarrow$ justo después del punto' : '') + '.');
  out += '{\\footnotesize\\begin{center}\\begin{tabular}{c' + (hayN?'c':'') + 'cc}\n\\hline\n'
       + '$' + gg.simbolo + '$ [' + escLatex(unitLen) + '] '
       + (hayN ? '& $N$ ' : '') + '& $V$ & $M$ \\\\\n\\hline\n';
  claves.forEach(x=>{
    out += dec(x,'len') + nombrePunto(x) + ' '
      + (hayN ? '& ' + celda(x,'cN') + ' ' : '')
      + '& ' + celda(x,'cV') + ' & ' + celda(x,'cM') + ' \\\\\n';
  });
  out += '\\hline\n\\end{tabular}\\end{center}}\n';
  return out;
}

// ── Puntos singulares del momento: ceros y extremos ──
function tablaSingulares(R, gg){
  const filas = [];
  gg.tramos.forEach(t2=>{
    const off = t2.s0 - gg.s0;
    t2.subs.forEach(su=>{
      raicesEn(su.cM, su.sa, su.sb).forEach(v=>{
        if(v < su.sa + 1e-6 || v > su.sb - 1e-6) return;
        filas.push({x:off+v, tipo:'$M = 0$', m:0, v:polyVal(su.cV, v)});
      });
      raicesEn(su.cV, su.sa, su.sb).forEach(v=>{
        if(v < su.sa + 1e-6 || v > su.sb - 1e-6) return;
        const mv = polyVal(su.cM, v);
        const antes = polyVal(su.cV, Math.max(su.sa, v-1e-3));
        filas.push({x:off+v, tipo: antes > 0 ? '$M$ máximo ($V$ pasa de $+$ a $-$)' : '$M$ mínimo ($V$ pasa de $-$ a $+$)',
                    m:mv, v:0});
      });
    });
  });
  if(!filas.length) return '';
  filas.sort((a,b)=>a.x-b.x);
  let out = tablaCaption('Puntos singulares del momento en el tramo ' + escLatex(gg.recorrido) + '.');
  out += '{\\footnotesize\\begin{center}\\begin{tabular}{lccc}\n\\hline\n'
       + 'Condición & $' + gg.simbolo + '$ [' + escLatex(unitLen) + '] & $M$ [' + escLatex(unidadMomento())
       + '] & $V$ [' + escLatex(unitFor) + '] \\\\\n\\hline\n';
  filas.forEach(f=>{
    out += f.tipo + ' & ' + dec(f.x,'len') + ' & ' + dec(f.m,'momento')
         + ' & ' + dec(f.v,'fuerza') + ' \\\\\n';
  });
  out += '\\hline\n\\end{tabular}\\end{center}}\n';
  return out;
}

// ── Comprobación por el método de las áreas ──
function tablaAreasGrupo(R, gg){
  const uF = escLatex(unitFor), uM = escLatex(unidadMomento());
  let out = tablaCaption('Tramo ' + escLatex(gg.recorrido) + ': en cada intervalo, el cambio de '
    + '$V$ es el área de la carga (con signo cambiado) y el cambio de $M$ es el área bajo el diagrama de '
    + '$V$. Valores en ' + uF + ' y ' + uM + '.');
  out += '{\\footnotesize\\begin{center}\\begin{tabular}{crrrrrr}\n\\hline\n'
    + 'Intervalo & $V_{\\text{ini}}$ & $V_{\\text{fin}}$ & $\\Delta V = -\\!\\int w$ & '
    + '$M_{\\text{ini}}$ & $M_{\\text{fin}}$ & $\\Delta M = \\int V$ \\\\\n\\hline\n';
  const saltos = [];
  let prev = null;
  gg.tramos.forEach(t2=>{
    const off = t2.s0 - gg.s0;
    t2.subs.forEach(su=>{
      const Vi = polyVal(su.cV,su.sa), Vf = polyVal(su.cV,su.sb);
      const Mi = polyVal(su.cM,su.sa), Mf = polyVal(su.cM,su.sb);
      if(prev){
        const dV = Vi - prev.V, dM = Mi - prev.M;
        const partes = [];
        if(Math.abs(dV) > 1e-7) partes.push('$V$ salta $' + dec(dV,'fuerza') + '$ ' + uF + ' (fuerza puntual)');
        if(Math.abs(dM) > 1e-7) partes.push('$M$ salta $' + dec(dM,'momento') + '$ ' + uM + ' (par aplicado)');
        if(partes.length) saltos.push('En $' + gg.simbolo + ' = ' + dec(off+su.sa,'len') + '$: ' + partes.join(' y ') + '.');
      }
      out += dec(off+su.sa,'len') + '--' + dec(off+su.sb,'len') + ' & ' + dec(Vi,'fuerza') + ' & ' + dec(Vf,'fuerza')
        + ' & ' + dec(Vf-Vi,'fuerza') + ' & ' + dec(Mi,'momento') + ' & ' + dec(Mf,'momento')
        + ' & ' + dec(polyIntDef(su.cV,su.sa,su.sb),'momento') + ' \\\\\n';
      prev = {V:Vf, M:Mf};
    });
  });
  out += '\\hline\n\\end{tabular}\\end{center}}\n';
  if(saltos.length)
    out += '\\noindent{\\footnotesize ' + saltos.join(' ') + '}\\\\[2pt]\n';
  return out;
}

// ── Cuántos intervalos se analizan en este grupo ──
// Antes iba una tabla con la abscisa y el motivo de cada corte, repetida en
// cada tramo. El motivo ya se ve en la figura del modelo y en el desarrollo
// de cada corte, así que basta con anunciar cuántos intervalos hay; la
// situación que obliga a cortar se explica una sola vez, al abrir el paso 2.
function fraseCortesGrupo(R, gg){
  let n = 0;
  gg.tramos.forEach(t2=>{ n += t2.subs.length; });
  return '\\noindent{\\footnotesize Las acciones sobre este tramo obligan a cortar en \\textbf{'
    + n + ' intervalo' + (n === 1 ? '' : 's') + '}, que se analizan a continuación.}\\\\[3pt]\n';
}

// ── Comprobaciones finales: extremo libre/apoyo, rótulas, apoyos articulados ──
function comprobacionesFinales(R, grupos){
  const EPS = 1e-9;
  const uF = escLatex(unitFor), uM = escLatex(unidadMomento());
  const filas = [];
  const gL = grupos[grupos.length - 1];
  const segL = gL.tramos[gL.tramos.length - 1], subL = segL.subs[segL.subs.length - 1];
  const Nm = polyVal(subL.cN, subL.sb), Vm = polyVal(subL.cV, subL.sb), Mm = polyVal(subL.cM, subL.sb);
  const ux = segL.ux, uy = segL.uy, nx = -uy, ny = ux;
  const sFin = gL.s0 + gL.L;
  let dN = 0, dV = 0, dM = 0; const quien = [];
  (R.internas.puntuales || []).forEach(o=>{
    if(o.s === null || Math.abs(o.s - sFin) > 1e-6) return;
    const ac = o.a;
    dN += -(ac.fx*ux + ac.fy*uy); dV += (ac.fx*nx + ac.fy*ny); dM += -(ac.m || 0);
    quien.push(nombreAccion(ac).txt.replace(/^Reacción /, '').replace(/^Momento de empotramiento /, ''));
  });
  const fin = escLatex(gL.hasta.nombre);
  const cierre = quien.length ? ' más lo aplicado en ' + fin + ' (' + quien.join(', ') + ')' : '';
  filas.push({q:'Al pasar el extremo ' + fin + ' ya no queda viga: $V$' + cierre + ' debe anularse',
              v:'$' + dec(Vm,'fuerza') + (quien.length ? ' + (' + dec(dV,'fuerza') + ')' : '') + ' = ' + dec(Vm+dV,'fuerza') + '$ ' + uF,
              ok:Math.abs(Vm + dV) < 1e-5*Math.max(1, Math.abs(Vm))});
  filas.push({q:'Lo mismo para $M$' + cierre,
              v:'$' + dec(Mm,'momento') + (quien.length ? ' + (' + dec(dM,'momento') + ')' : '') + ' = ' + dec(Mm+dM,'momento') + '$ ' + uM,
              ok:Math.abs(Mm + dM) < 1e-5*Math.max(1, Math.abs(Mm))});
  if(Math.abs(Nm) > EPS || Math.abs(dN) > EPS)
    filas.push({q:'Lo mismo para $N$' + cierre,
                v:'$' + dec(Nm,'fuerza') + ' + (' + dec(dN,'fuerza') + ') = ' + dec(Nm+dN,'fuerza') + '$ ' + uF,
                ok:Math.abs(Nm + dN) < 1e-5*Math.max(1, Math.abs(Nm))});
  // rótulas: M = 0
  (R.rotulas || []).forEach(rt=>{
    R.internas.forEach(seg=>{
      if(seg.desde.id !== rt.id) return;
      const su = seg.subs[0];
      const m = polyVal(su.cM, su.sa);
      filas.push({q:'En la rótula ' + escLatex(rt.nombre) + ' el momento debe ser nulo',
                  v:'$M = ' + dec(m,'momento') + '$ ' + uM, ok:Math.abs(m) < 1e-5});
    });
  });
  // apoyos articulados en los extremos de la cadena: M = 0
  const primero = R.internas[0], ultimo = R.internas[R.internas.length - 1];
  [{n:primero.desde, su:primero.subs[0], x:primero.subs[0].sa},
   {n:ultimo.hasta, su:ultimo.subs[ultimo.subs.length-1], x:ultimo.subs[ultimo.subs.length-1].sb}].forEach(e=>{
    if(!e.n || !(e.n.apoyo === 'simple' || e.n.apoyo === 'movil')) return;
    const m = polyVal(e.su.cM, e.x);
    filas.push({q:'El apoyo articulado ' + escLatex(e.n.nombre) + ' está en un extremo: no transmite momento',
                v:'$M_{' + escLatex(e.n.nombre) + '} = ' + dec(m,'momento') + '$ ' + uM, ok:Math.abs(m) < 1e-5});
  });
  let out = tablaCaption('Condiciones de borde: lo que $N$, $V$ y $M$ deben cumplir '
      + 'en los extremos, en las rótulas y en los apoyos articulados.')
    + '{\\footnotesize\\begin{center}\\begin{tabular}{p{8.2cm}lc}\n\\hline\n'
    + 'Comprobación & Valor & Resultado \\\\\n\\hline\n';
  filas.forEach(f=>{
    out += f.q + ' & ' + f.v + ' & ' + (f.ok ? '{\\color{bsaVerde}\\bfseries cumple}' : '{\\color{bsaCarga}\\bfseries revisar}') + ' \\\\\n';
  });
  out += '\\hline\n\\end{tabular}\\end{center}}\n';
  return out;
}

// ── Esquema del grupo desarrollado sobre su eje, para encabezar los diagramas ──
// Nudos, apoyos, reacciones y cargas se dibujan en los ejes locales del
// tramo (perpendicular = vertical del dibujo), con la misma escala X que
// los diagramas que van debajo: así cada salto queda bajo su causa.
function tikzEsquemaGrupo(R, gg, W){
  const EPS = 1e-9;
  const L = gg.L || 1;
  const X = s => (s/L)*W;
  const F = n => n.toFixed(3);
  const t0 = gg.tramos[0];
  const ux = t0.ux, uy = t0.uy, nx = -uy, ny = ux;
  const uF = escLatex(unitFor), uM = escLatex(unidadMomento()), uW = escLatex(uDist());
  tzReiniciar();
  let out = '';
  // eje
  out += '\\draw[line width=2pt, color=bsaAcc2] (0,0) -- (' + F(W) + ',0);\n';
  // nudos y apoyos
  const nds = [{n:gg.desde, s:0}];
  let ac = 0;
  gg.tramos.forEach(t2=>{ ac += t2.L; nds.push({n:t2.hasta, s:ac}); });
  nds.forEach(e=>{
    const x = X(e.s);
    out += '\\filldraw[color=bsaAcc2] (' + F(x) + ',0) circle (0.05);\n';
    out += '\\node[above, font=\\scriptsize\\bfseries, color=bsaAcc2] at (' + F(x) + ',0.08) {' + escLatex(e.n.nombre) + '};\n';
    tzOcupar(x-0.15, 0.08, x+0.15, 0.36);
    if(e.n.apoyo && e.n.apoyo !== 'libre') out += tikzApoyo(x, 0, e.n.apoyo, 0.8);
    if(e.n.rotula){
      out += '\\filldraw[fill=white, draw=bsaAcc2, line width=.8pt] (' + F(x) + ',0) circle (0.09);\n';
    }
  });
  // cargas repartidas (componente perpendicular)
  let wmax = 1e-9;
  const bloques = [], axiales = [];
  cargasConPeso().filter(c=>c.tipo==='U'||c.tipo==='T').forEach(c=>{
    const el = gg.tramos.find(t2=>t2.tramo && t2.tramo.id === c.tramo);
    if(!el) return;
    const z = trozoCargado(c); if(!z || z.len <= 1e-12) return;
    const inv = !!el.invert, offT = el.s0 - gg.s0;
    const g1 = offT + (inv ? z.g.L - z.s2 : z.s1), g2 = offT + (inv ? z.g.L - z.s1 : z.s2);
    const wFin = (c.tipo === 'U') ? c.mag : (c.mag2 || 0);
    const wA = inv ? wFin : c.mag, wB = inv ? c.mag : wFin;
    const dd = dirCarga(c, z.g);
    const cp = dd.x*nx + dd.y*ny, cu = dd.x*ux + dd.y*uy;
    if(Math.abs(cp) < 1e-9){
      // Repartida puramente axial (por ejemplo horizontal sobre una viga
      // horizontal): no levanta bloque, pero sí empuja a lo largo del eje.
      if(Math.abs(cu) > 1e-9) axiales.push({g1, g2, w:wA*cu, w2:wB*cu});
      return;
    }
    bloques.push({g1, g2, w1:wA*cp, w2:wB*cp, wA, wB, cp});
    wmax = Math.max(wmax, Math.abs(wA*cp), Math.abs(wB*cp));
  });
  axiales.forEach(az=>{
    const x1 = X(az.g1), x2 = X(az.g2), y = 0.30;
    const sg = Math.sign(az.w) || 1;
    const n = Math.max(2, Math.min(7, Math.round((x2-x1)/0.9)));
    for(let i=0;i<=n;i++){
      const xi = x1 + (x2-x1)*i/n;
      out += '\\draw[-{Latex[length=1.4mm]}, color=bsaDist, line width=.7pt] ('
           + F(xi - sg*0.34) + ',' + F(y) + ') -- (' + F(xi) + ',' + F(y) + ');\n';
    }
    tzOcuparTrazo(x1-0.34, y, x2, y, 0.09);
    out += tzTexto((x1+x2)/2, y + 0.24,
                   '$w_{\\parallel}=' + dec(Math.abs(az.w),'fuerza')
                   + (Math.abs(az.w - az.w2) > 1e-9 ? '\\to' + dec(Math.abs(az.w2),'fuerza') : '')
                   + '$\\,' + uW, 'font=\\tiny, color=bsaDist!70!black', 0, 1);
  });
  bloques.forEach(bq=>{
    const alt = 0.55;
    // el bloque se levanta EN CONTRA del sentido de la carga
    const h1 = -alt*bq.w1/wmax, h2 = -alt*bq.w2/wmax;
    const x1 = X(bq.g1), x2 = X(bq.g2);
    out += '\\draw[color=bsaDist] (' + F(x1) + ',0) -- (' + F(x1) + ',' + F(h1)
         + ') -- (' + F(x2) + ',' + F(h2) + ') -- (' + F(x2) + ',0) -- cycle;\n';
    const n = Math.max(2, Math.min(8, Math.round((x2-x1)/0.7)));
    for(let i=0;i<=n;i++){
      const t = i/n, xi = x1 + (x2-x1)*t, hi = h1 + (h2-h1)*t;
      if(Math.abs(hi) < 0.10) continue;
      const sg = Math.sign(hi);
      out += '\\draw[-{Latex[length=1.4mm]}, color=bsaDist, line width=.7pt] (' + F(xi) + ',' + F(hi)
           + ') -- (' + F(xi) + ',' + F(0.04*sg) + ');\n';
    }
    tzOcuparBloque({x:x1, y:0}, {x:x2, y:0}, 0, 1, h1, h2);
    const lado = (Math.abs(h1) >= Math.abs(h2) ? Math.sign(h1) : Math.sign(h2)) || 1;
    const txt = (Math.abs(bq.wA - bq.wB) < 1e-9)
      ? '$w=' + dec(Math.abs(bq.w1),'fuerza') + '$\\,' + uW
      : '$w=' + dec(Math.abs(bq.w1),'fuerza') + '\\to' + dec(Math.abs(bq.w2),'fuerza') + '$\\,' + uW;
    out += tzTexto((x1+x2)/2, (Math.abs(h1) >= Math.abs(h2) ? h1 : h2) + lado*0.22, txt,
                   'font=\\tiny, color=bsaDist!70!black', 0, lado);
  });
  // acciones puntuales del grupo (incluidos sus dos nudos extremos)
  (R.internas.puntuales || []).forEach(o=>{
    if(o.s === null || o.s < gg.s0 - 1e-6 || o.s > gg.s0 + gg.L + 1e-6) return;
    const acn = o.a, x = X(o.s - gg.s0);
    const Fper = acn.fx*nx + acn.fy*ny, Fpar = acn.fx*ux + acn.fy*uy;
    const col = acn.reac ? 'bsaReac' : 'bsaCarga';
    const nom = nombreAccion(acn);
    const esApoyo = acn.reac && acn.nodo && acn.nodo.apoyo && acn.nodo.apoyo !== 'libre';
    // En un tramo inclinado lo que se dibuja son las COMPONENTES sobre la
    // normal y el eje, y el rótulo debe decirlo para no confundir con el valor total.
    const comp = (sufijo) => gg.inclinado ? nom.tex.replace(/\}$/, ',' + sufijo + '}') : nom.tex;
    if(Math.abs(Fper) > EPS){
      // hacia arriba: nace abajo y termina en el nudo (o bajo el apoyo)
      const ini = Fper > 0 ? (esApoyo ? -1.45 : -0.95) : 0.95;
      const fin = Fper > 0 ? (esApoyo ? -0.62 : -0.10) : 0.10;
      out += '\\draw[-{Latex[length=2mm]}, color=' + col + ', line width=1.1pt] (' + F(x) + ',' + F(ini)
           + ') -- (' + F(x) + ',' + F(fin) + ');\n';
      tzOcuparTrazo(x, ini, x, fin, 0.07);
      const lab = acn.reac ? '$' + comp('\\perp') + '=' + dec(Math.abs(Fper),'fuerza') + '$'
                : (gg.inclinado ? '$F_{\\perp}=' : '') + dec(Math.abs(Fper),'fuerza') + (gg.inclinado ? '$' : '') + '\\,' + uF;
      out += tzTexto(x, ini + (Fper > 0 ? -0.20 : 0.20), lab, 'font=\\tiny, color=' + col, 0, Fper > 0 ? -1 : 1);
    }
    if(Math.abs(Fpar) > EPS){
      const y = 0.22, s = Fpar > 0 ? 1 : -1;
      out += '\\draw[-{Latex[length=2mm]}, color=' + col + ', line width=1.1pt] (' + F(x - s*0.85) + ',' + F(y)
           + ') -- (' + F(x - s*0.10) + ',' + F(y) + ');\n';
      tzOcuparTrazo(x - s*0.85, y, x - s*0.10, y, 0.07);
      const lab = acn.reac ? '$' + comp('\\parallel') + '=' + dec(Math.abs(Fpar),'fuerza') + '$'
                : (gg.inclinado ? '$F_{\\parallel}=' : '') + dec(Math.abs(Fpar),'fuerza') + (gg.inclinado ? '$' : '') + '\\,' + uF;
      out += tzTexto(x - s*1.05, y, lab, 'font=\\tiny, color=' + col, -s, 0);
    }
    if(Math.abs(acn.m) > EPS){
      const colM = acn.reac ? 'bsaReac' : 'bsaMomento';
      const arc = acn.m > 0 ? '(0:300:0.28)' : '(0:-300:0.28)';
      out += '\\draw[-{Latex[length=1.8mm]}, color=' + colM + ', line width=1pt] (' + F(x+0.28) + ',0) arc ' + arc + ';\n';
      tzOcupar(x-0.34, -0.34, x+0.34, 0.34);
      const lab = acn.reac ? '$' + nom.tex + '=' + dec(Math.abs(acn.m),'momento') + '$' : dec(Math.abs(acn.m),'momento') + '\\,' + uM;
      out += tzTexto(x + 0.55, 0.42, lab, 'font=\\tiny, color=' + colM, 1, 1);
    }
  });
  return out;
}

// ── Diagrama continuo de un GRUPO (N, V o M) ──
// Usa las mismas ramas que la pantalla, así que los saltos salen verticales
// y no como rampas. Marca los valores en los extremos de cada rama, los
// puntos donde la función se anula y los extremos de M, y acota bajo el eje
// la abscisa de cada uno.
function tikzDiagramaGrupo(R, gg, clave, color, W, HH, titulo){
  const sb0 = gg.simbolo;
  const ramas = muestrearSerie(R, clave, gg.tramos, gg.s0);
  let vmax = 1e-9;
  ramas.forEach(rm=>{
    if(rm.salto){ vmax = Math.max(vmax, Math.abs(rm.de), Math.abs(rm.a)); }
    else rm.pts.forEach(p=>{ vmax = Math.max(vmax, Math.abs(p.v)); });
  });
  const L = gg.L || 1;
  const X = x => (x/L)*W;
  const Y = v => (v/vmax)*HH;
  const F = n => n.toFixed(3);

  let out = '';
  let d = '', trazo = '';
  ramas.forEach(rm=>{
    if(rm.salto){
      trazo += ' -- (' + F(X(rm.x)) + ',' + F(Y(rm.a)) + ')';
      d     += ' -- (' + F(X(rm.x)) + ',' + F(Y(rm.a)) + ')';
      return;
    }
    const p = rm.pts;
    if(!trazo){
      d = '(' + F(X(p[0].x)) + ',0) -- (' + F(X(p[0].x)) + ',' + F(Y(p[0].v)) + ')';
      trazo = '(' + F(X(p[0].x)) + ',' + F(Y(p[0].v)) + ')';
    } else {
      trazo += ' -- (' + F(X(p[0].x)) + ',' + F(Y(p[0].v)) + ')';
      d     += ' -- (' + F(X(p[0].x)) + ',' + F(Y(p[0].v)) + ')';
    }
    for(let i=1;i<p.length;i++){
      trazo += ' -- (' + F(X(p[i].x)) + ',' + F(Y(p[i].v)) + ')';
      d     += ' -- (' + F(X(p[i].x)) + ',' + F(Y(p[i].v)) + ')';
    }
  });
  d += ' -- (' + F(W) + ',0) -- cycle';
  out += '\\fill[' + color + '!14] ' + d + ';\n';
  out += '\\draw[' + color + ', line width=1.1pt] ' + trazo + ';\n';
  out += '\\draw[black!55, line width=.7pt] (0,0) -- (' + F(W) + ',0);\n';
  // título del eje
  out += '\\node[anchor=east, font=\\scriptsize\\bfseries, color=' + color + '] at (-0.12,' + F(HH*0.62) + ') {' + titulo + '};\n';
  out += '\\node[anchor=east, font=\\tiny, color=black!55] at (-0.08,0) {0};\n';

  // divisiones entre tramos del grupo y nombres de nudo (con hueco reservado)
  tzReiniciar();
  let ac = 0;
  const nudosX = [];
  gg.tramos.forEach(t2=>{ nudosX.push({x:ac, nom:t2.desde.nombre}); ac += t2.L; });
  nudosX.push({x:L, nom:gg.hasta.nombre});
  nudosX.forEach(nd=>{
    out += '\\draw[black!25, dashed, line width=.4pt] (' + F(X(nd.x)) + ',' + F(-HH-0.25)
         + ') -- (' + F(X(nd.x)) + ',' + F(HH+0.25) + ');\n';
    out += '\\node[font=\\tiny, color=bsaAcc2, below] at (' + F(X(nd.x)) + ',' + F(-HH-0.28)
         + ') {' + escLatex(nd.nom) + '};\n';
    tzOcupar(X(nd.x)-0.16, -HH-0.55, X(nd.x)+0.16, -HH-0.28);
  });

  // etiquetas: extremos de rama y los dos lados de cada salto (sin repetir)
  const et = etiquetasSerie(ramas).filter(e=>Math.abs(e.v) > 1e-7);
  const vistos = [];
  et.forEach(e=>{
    if(vistos.some(q=>Math.abs(q.x - e.x) < 1e-6 && Math.abs(q.v - e.v) < 5e-3*Math.max(1, Math.abs(e.v)))) return;
    vistos.push(e);
    out += tzTexto(X(e.x), Y(e.v) + (e.v>=0 ? 0.20 : -0.20), dec(e.v, clave==='M'?'momento':'fuerza'),
                   'font=\\scriptsize, color=' + color, 0, e.v>=0 ? 1 : -1);
  });
  // abscisas notables: ceros de la función y, para M, los extremos
  const marcas = [];
  gg.tramos.forEach(t2=>{
    const off2 = t2.s0 - gg.s0;
    t2.subs.forEach(su=>{
      const c = clave==='N' ? su.cN : (clave==='V' ? su.cV : su.cM);
      raicesEn(c, su.sa, su.sb).forEach(v=>{
        const xg = off2 + v;
        if(xg < 1e-6 || xg > L-1e-6) return;
        marcas.push({x:xg, tipo:'cero'});
      });
      if(clave === 'M'){
        raicesEn(su.cV, su.sa, su.sb).forEach(v=>{
          const xg = off2 + v;
          if(xg < 1e-6 || xg > L-1e-6) return;
          const antes = polyVal(su.cV, Math.max(su.sa, v-1e-3));
          marcas.push({x:xg, tipo: antes > 0 ? 'max' : 'min', v:polyVal(su.cM, v)});
        });
      }
    });
  });
  marcas.sort((a,b)=>a.x-b.x);
  marcas.forEach(mk=>{
    const col = mk.tipo === 'cero' ? 'black!65' : color;
    const guia = mk.tipo === 'cero' ? 'black!35' : color + '!45';
    out += '\\fill[' + col + '] (' + F(X(mk.x)) + ',' + F(mk.tipo==='cero' ? 0 : Y(mk.v))
         + ') circle (0.055);\n';
    out += '\\draw[' + guia + ', dashed, line width=.4pt] (' + F(X(mk.x)) + ',' + F(mk.tipo==='cero' ? 0 : Y(mk.v))
         + ') -- (' + F(X(mk.x)) + ',' + F(-HH-0.62) + ');\n';
  });
  if(marcas.length){
    // primero los rótulos de abscisa (se apartan hacia abajo si chocan) y
    // después la cadena de cotas, ya por debajo de todos ellos
    marcas.forEach(mk=>{
      const et2 = mk.tipo === 'cero' ? '$' + sb0 + '=' + dec(mk.x,'len') + '$'
        : (mk.tipo === 'max' ? 'máx' : 'mín') + ' $' + sb0 + '=' + dec(mk.x,'len') + '$';
      out += tzTexto(X(mk.x), -HH-0.72, et2, 'font=\\tiny, color=' +
                     (mk.tipo==='cero'?'black!65':color), 0, -1);
    });
    const xs = [0, ...marcas.map(m=>m.x), L];
    const cc = tzCadenaCotas([...new Set(xs.map(v=>+v.toFixed(4)))], X, -HH-1.30,
                             'black!60', {maxNiveles:4});
    out += cc.tikz;
  }
  return out;
}

// ── Esquema + N + V + M del grupo, apilados y alineados en una sola figura ──
function tikzDiagramasGrupo(R, gg){
  const L = gg.L || 1;
  const W = Math.min(13.2, Math.max(10.0, L*1.0));
  const HH = 1.75;
  const uF = escLatex(unitFor), uM = escLatex(unidadMomento());
  const hayN = gg.tramos.some(t2=>t2.subs.some(su=>su.cN.some(v=>Math.abs(v)>5e-9)));
  let out = '\\begin{scope}\n' + tikzEsquemaGrupo(R, gg, W) + '\\end{scope}\n';
  let y = -(2.05 + HH + 0.55);
  const series = [];
  if(hayN) series.push({k:'N', col:'bsaVerde', tit:'$N$ [' + uF + ']'});
  series.push({k:'V', col:'bsaCarga', tit:'$V$ [' + uF + ']'});
  series.push({k:'M', col:'bsaMomento', tit:'$M$ [' + uM + ']'});
  series.forEach(se=>{
    out += '\\begin{scope}[yshift=' + y.toFixed(2) + 'cm]\n'
         + tikzDiagramaGrupo(R, gg, se.k, se.col, W, HH, se.tit) + '\\end{scope}\n';
    y -= (2*HH + 2.95);
  });
  return out;
}

// ── Convenio de signos, en figura ──
// Reproduce los esquemas clásicos de manual: bloques con degradado y la
// cara del corte ondulada, y sobre esa cara la solicitación en su sentido
// POSITIVO. Ojo con la normal: en tracción, la fuerza sobre cada cara
// apunta HACIA el corte (cada trozo tira del otro), no hacia afuera.
function tikzConvenio(){
  const H = 0.70;          // alto del bloque
  const W = 1.85;          // ancho del bloque
  const G = 2.10;          // hueco: debe dar sitio a las flechas y sus rótulos

  const onda = (x, y0, y1) =>
      ' .. controls (' + (x+0.13).toFixed(3) + ',' + (y0+(y1-y0)*0.30).toFixed(3)
    + ') and (' + (x-0.13).toFixed(3) + ',' + (y0+(y1-y0)*0.70).toFixed(3)
    + ') .. (' + x.toFixed(3) + ',' + y1.toFixed(3) + ')';

  const bloque = (x, y, ondIzq, ondDer) => {
    let p = '\\shade[left color=bsaAcc2!62, right color=bsaAcc2!18, draw=bsaAcc2!75, '
          + 'line width=.6pt] (' + x.toFixed(3) + ',' + y.toFixed(3) + ')';
    p += ' -- (' + (x+W).toFixed(3) + ',' + y.toFixed(3) + ')';
    p += ondDer ? onda(x+W, y, y+H)
                : ' -- (' + (x+W).toFixed(3) + ',' + (y+H).toFixed(3) + ')';
    p += ' -- (' + x.toFixed(3) + ',' + (y+H).toFixed(3) + ')';
    p += ondIzq ? onda(x, y+H, y)
                : ' -- (' + x.toFixed(3) + ',' + y.toFixed(3) + ')';
    p += ' -- cycle;\n';
    return p;
  };
  const pie = (yc, txt) => '\\node[font=\\small, color=black, align=center] at ('
      + (W + G/2).toFixed(2) + ',' + yc.toFixed(2) + ') {' + txt + '};\n';

  let out = '';
  const FL = 'line width=1.6pt';

  // ══ Fuerza normal positiva (tracción) ══
  let y = 0;
  out += bloque(0, y, false, true) + bloque(W+G, y, true, false);
  out += '\\draw[-{Latex[length=2.6mm]}, color=black, ' + FL + '] ('
       + (W+0.10).toFixed(2) + ',' + (y+H/2).toFixed(2) + ') -- ('
       + (W+G/2-0.06).toFixed(2) + ',' + (y+H/2).toFixed(2) + ');\n';
  out += '\\draw[-{Latex[length=2.6mm]}, color=black, ' + FL + '] ('
       + (W+G-0.10).toFixed(2) + ',' + (y+H/2).toFixed(2) + ') -- ('
       + (W+G/2+0.06).toFixed(2) + ',' + (y+H/2).toFixed(2) + ');\n';
  out += '\\node[font=\\bfseries] at (' + (W+G*0.28).toFixed(2) + ','
       + (y+H/2+0.34).toFixed(2) + ') {N};\n';
  out += '\\node[font=\\bfseries] at (' + (W+G*0.72).toFixed(2) + ','
       + (y+H/2+0.34).toFixed(2) + ') {N};\n';
  out += pie(y-0.42, 'Fuerza normal positiva: tracción');

  // ══ Fuerza cortante positiva ══
  y = -2.35;
  out += bloque(0, y, false, true) + bloque(W+G, y, true, false);
  out += '\\draw[-{Latex[length=2.6mm]}, color=black, ' + FL + '] ('
       + (W+G*0.30).toFixed(2) + ',' + (y+H+0.34).toFixed(2) + ') -- ('
       + (W+G*0.30).toFixed(2) + ',' + (y-0.34).toFixed(2) + ');\n';
  out += '\\draw[-{Latex[length=2.6mm]}, color=black, ' + FL + '] ('
       + (W+G*0.70).toFixed(2) + ',' + (y-0.34).toFixed(2) + ') -- ('
       + (W+G*0.70).toFixed(2) + ',' + (y+H+0.34).toFixed(2) + ');\n';
  out += '\\node[font=\\bfseries] at (' + (W+G*0.30+0.26).toFixed(2) + ','
       + (y+H*0.20).toFixed(2) + ') {V};\n';
  out += '\\node[font=\\bfseries] at (' + (W+G*0.70-0.26).toFixed(2) + ','
       + (y+H*0.80).toFixed(2) + ') {V};\n';
  out += pie(y-0.62, 'Fuerza cortante positiva: gira el trozo en sentido horario');

  // ══ Momento positivo ══
  y = -5.05;
  out += bloque(0, y, false, true) + bloque(W+G, y, true, false);
  const arco = (xIni, xFin, haciaCentro) => {
    const yA = y - 0.38, yB = y + H + 0.80;
    const cx1 = xIni + haciaCentro*0.20, cy1 = yA + (yB-yA)*0.38;
    const cx2 = xFin + haciaCentro*0.26, cy2 = yA + (yB-yA)*0.78;
    return '\\draw[-{Latex[length=3.2mm]}, color=bsaAcc, line width=1.9pt] ('
      + xIni.toFixed(2) + ',' + yA.toFixed(2) + ') .. controls ('
      + cx1.toFixed(2) + ',' + cy1.toFixed(2) + ') and ('
      + cx2.toFixed(2) + ',' + cy2.toFixed(2) + ') .. ('
      + xFin.toFixed(2) + ',' + yB.toFixed(2) + ');\n';
  };
  out += arco(W+G*0.42, W+G*0.29, +1);
  out += arco(W+G*0.58, W+G*0.71, -1);
  out += '\\node[font=\\bfseries] at (' + (W+G*0.29).toFixed(2) + ','
       + (y+H+1.02).toFixed(2) + ') {M};\n';
  out += '\\node[font=\\bfseries] at (' + (W+G*0.71).toFixed(2) + ','
       + (y+H+1.02).toFixed(2) + ') {M};\n';
  out += pie(y-0.62, 'Momento flector positivo: comprime las fibras superiores');
  return out;
}
