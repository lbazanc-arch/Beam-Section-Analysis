// ═══════════════════════════════════════════════════════════
//  INFORME LaTeX · desarrollo de cada corte, tablas y diagramas
//  Sigue el procedimiento de análisis del curso (Hibbeler, cap. 7;
//  Rodríguez, cap. 8 PUCP): reacciones → cortes por tramos → funciones
//  N(x), V(x), M(x) → diagramas → comprobaciones.
//  Todo lo que se escribe se contrasta contra los polinomios que calculó
//  el motor, así que el desarrollo y el resultado no pueden discrepar.
// ═══════════════════════════════════════════════════════════

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
                   : (Math.abs(ac.m) > EPS ? 'par: sin brazo' : '--')});
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
    const wTxt = (Math.abs(wA - wB) < 1e-9)
      ? '$w=' + dec(Math.abs(wA),'fuerza') + '$ ' + uW
      : '$w$: ' + dec(Math.abs(wA),'fuerza') + ' a ' + dec(Math.abs(wB),'fuerza') + ' ' + uW;
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
        // Resultante nula (la carga cambia de signo y se compensa). El motor
        // de cálculo la trata como fuerza nula en el centro del trozo, y aquí
        // se refleja lo mismo para que el desarrollo coincida con los diagramas.
        acc.push({nom:etiq + ', completa (resultante nula)', mag:wTxt + ' $\\Rightarrow W=0$',
                  pos:Lz(g1) + '--' + Lz(g2), brazo:'--'});
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
    enNudo.push({nom:nombreAccion(ac), Fpar, Fper, m:ac.m || 0});
  });
  const {N0, V0, M0} = info.ctes;
  const nn = escLatex(gg.desde.nombre), np = escLatex(prev.recorrido);
  const uF = escLatex(unitFor), uM = escLatex(unidadMomento());
  const g = (D*180/Math.PI).toFixed(1);
  let out = '\\porque{Todo lo que hay antes del nudo ' + nn + ' se sustituye por las tres '
    + 'solicitaciones que ese nudo transmite. Se conocen del tramo anterior (' + np + '), pero '
    + 'están referidas a SUS ejes: el tramo nuevo gira $\\Delta=' + g + '^\\circ$, así que '
    + 'hay que proyectarlas sobre el eje y la normal nuevos'
    + (enNudo.length ? ', y sumar las acciones aplicadas justo en ' + nn : '') + '.}\n';
  out += '\\noindent{\\footnotesize Al final del tramo ' + np + ': $N^- = ' + dec(Nm,'fuerza')
    + '$, $V^- = ' + dec(Vm,'fuerza') + '$ ' + uF + ', $M^- = ' + dec(Mm,'momento') + '$ ' + uM
    + '. Proyectando con $\\Delta = ' + g + '^\\circ$:}\n';
  const extraN = enNudo.filter(e=>Math.abs(e.Fpar) > EPS).map(e=>(e.Fpar > 0 ? ' - ' : ' + ') + dec(Math.abs(e.Fpar),'fuerza')).join('');
  const extraV = enNudo.filter(e=>Math.abs(e.Fper) > EPS).map(e=>(e.Fper < 0 ? ' - ' : ' + ') + dec(Math.abs(e.Fper),'fuerza')).join('');
  const extraM = enNudo.filter(e=>Math.abs(e.m) > EPS).map(e=>(e.m > 0 ? ' - ' : ' + ') + dec(Math.abs(e.m),'momento')).join('');
  out += _alineada([
    'N_0 &= N^-\\cos\\Delta - V^-\\sin\\Delta' + (extraN ? ' \\underbrace{' + extraN + '}_{\\text{en } ' + nn + '}' : '')
      + ' = ' + dec(N0,'fuerza') + '\\ \\text{' + uF + '}',
    'V_0 &= N^-\\sin\\Delta + V^-\\cos\\Delta' + (extraV ? ' \\underbrace{' + extraV + '}_{\\text{en } ' + nn + '}' : '')
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
  out += figCaption('DCL del trozo situado antes de la sección $S$ (abscisa $' + sb
       + '$ desde ' + escLatex(gg.desde.nombre) + '). En la cara cortada se dibujan $N$, $V$ y $M$ '
       + 'en su sentido positivo; las cargas repartidas se muestran con su resultante $W$ (línea de trazos).');

  if(info.ctes) out += bloqueQuiebre(R, grupos, gg, info);

  // Tabla de acciones con su brazo
  if(acc.length){
    out += '\\noindent{\\footnotesize Acciones sobre el trozo (posición y brazo medidos desde '
      + escLatex(gg.desde.nombre) + ' y hasta el corte; $F_{\\perp}$ positiva hacia arriba de la '
      + 'normal, $F_{\\parallel}$ positiva en el sentido de avance, par positivo antihorario):}\\\\[2pt]\n';
    out += '{\\footnotesize\\begin{center}\\begin{tabular}{p{4.6cm}p{5.2cm}lc}\n\\hline\n'
      + 'Acción & Magnitud & Posición [' + uL + '] & Brazo al corte \\\\\n\\hline\n';
    acc.forEach(f=>{ out += f.nom + ' & ' + f.mag + ' & ' + f.pos + ' & ' + f.brazo + ' \\\\\n'; });
    out += '\\hline\n\\end{tabular}\\end{center}}\n';
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
      out += '\\porque{Como la sección cae dentro de la carga, NO se puede usar la resultante de '
        + 'toda la carga: solo actúa la parte comprendida entre su inicio y el corte, y esa parte '
        + 'depende de $' + sb + '$. Se descompone en un rectángulo de altura $w_1$ (resultante '
        + '$w_1(' + sb + '-d)$ a la mitad del trozo) y un triángulo (resultante '
        + '$\\tfrac12 k(' + sb + '-d)^2$, a un tercio del trozo desde el corte).}\n';
    } else {
      out += '\\porque{La sección cae dentro de la carga repartida: solo actúa la parte comprendida '
        + 'entre su inicio y el corte. Su resultante vale $w\\,(' + sb + ' - d)$ y pasa por la mitad de '
        + 'ese trozo, a $\\tfrac12(' + sb + ' - d)$ del corte. Por eso $V$ resulta lineal y $M$ parabólico.'
        + (hayProy ? ' Al ser el tramo inclinado, la intensidad se proyecta sobre la normal '
          + '($w_{\\perp} = ' + dec(Math.abs(w.w1p),'fuerza') + '$) y sobre el eje ($w_{\\parallel} = '
          + dec(Math.abs(w.wA*w.cu),'fuerza') + '$ ' + uW + ').' : '') + '}\n';
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

  // Valores en los extremos y ceros interiores
  const ext = [];
  if(gN.some(v=>Math.abs(v) > 5e-9))
    ext.push('$N(' + Lz(a) + ') = ' + dec(polyVal(gN,a),'fuerza') + '$, $N(' + Lz(b) + ') = ' + dec(polyVal(gN,b),'fuerza') + '$ ' + uF);
  ext.push('$V(' + Lz(a) + ') = ' + dec(polyVal(gV,a),'fuerza') + '$, $V(' + Lz(b) + ') = ' + dec(polyVal(gV,b),'fuerza') + '$ ' + uF);
  ext.push('$M(' + Lz(a) + ') = ' + dec(polyVal(gM,a),'momento') + '$, $M(' + Lz(b) + ') = ' + dec(polyVal(gM,b),'momento') + '$ ' + uM);
  const cerosV = raicesEn(gV, a, b).filter(x=>x > a + 1e-6 && x < b - 1e-6);
  cerosV.forEach(x=>{
    ext.push('$V = 0$ en $' + sb + ' = ' + Lz(x) + '$: allí $M$ es extremo, $M = ' + dec(polyVal(gM,x),'momento') + '$ ' + uM);
  });
  const cerosM = raicesEn(gM, a, b).filter(x=>x > a + 1e-6 && x < b - 1e-6);
  cerosM.forEach(x=>{
    ext.push('$M = 0$ en $' + sb + ' = ' + Lz(x) + '$ (punto de inflexión de la elástica)');
  });
  out += '\\noindent{\\footnotesize Evaluando en los extremos del intervalo: ' + ext.join('; ') + '.}\\\\[3pt]\n';
  return out;
}

// ── Tabla de valores en los nudos: antes y después ──
// En un nudo con carga puntual el valor salta, así que una sola columna
// mentía. Se dan las dos caras del nudo.
function tablaNudosGrupo(R, gg){
  const pts = [];
  gg.tramos.forEach(t2=>{
    t2.subs.forEach(su=>{
      pts.push({x: t2.s0 - gg.s0 + su.sa, t:t2, su, loc:su.sa});
      pts.push({x: t2.s0 - gg.s0 + su.sb, t:t2, su, loc:su.sb});
    });
  });
  const claves = [...new Set(pts.map(p=>+p.x.toFixed(4)))].sort((a,b)=>a-b);
  if(!claves.length) return '';
  const val = (x, campo, lado) => {
    const cand = pts.filter(p=>Math.abs(p.x-x) < 1e-6);
    const el = (lado < 0)
      ? cand.filter(p=>Math.abs(p.loc - p.su.sb) < 1e-9)[0] || cand[0]
      : cand.filter(p=>Math.abs(p.loc - p.su.sa) < 1e-9)[0] || cand[0];
    if(!el) return '--';
    return dec(polyVal(el.su[campo], el.loc), campo==='cM' ? 'momento' : 'fuerza');
  };
  const hayN = gg.tramos.some(t2=>t2.subs.some(su=>su.cN.some(v=>Math.abs(v)>5e-9)));
  let out = '\\noindent{\\footnotesize Valores en las secciones notables del tramo ' + escLatex(gg.recorrido)
          + ', a cada lado del punto ($^-$ justo antes, $^+$ justo después; $N$, $V$ en '
          + escLatex(unitFor) + ' y $M$ en ' + escLatex(unidadMomento()) + '):}\\\\[2pt]\n';
  out += '{\\footnotesize\\begin{center}\\begin{tabular}{c' + (hayN?'cc':'') + 'cccc}\n\\hline\n'
       + '$' + gg.simbolo + '$ [' + escLatex(unitLen) + '] '
       + (hayN ? '& $N^-$ & $N^+$ ' : '')
       + '& $V^-$ & $V^+$ & $M^-$ & $M^+$ \\\\\n\\hline\n';
  claves.forEach(x=>{
    out += dec(x,'len') + ' '
      + (hayN ? '& ' + val(x,'cN',-1) + ' & ' + val(x,'cN',+1) + ' ' : '')
      + '& ' + val(x,'cV',-1) + ' & ' + val(x,'cV',+1) + ' '
      + '& ' + val(x,'cM',-1) + ' & ' + val(x,'cM',+1) + ' \\\\\n';
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
  let out = '\\noindent{\\footnotesize Puntos singulares del momento en el tramo ' + escLatex(gg.recorrido) + ':}\\\\[2pt]\n';
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

// ── Forma de los diagramas: grado de w, V y M en cada intervalo ──
function tablaFormaGrupo(R, gg){
  const grado = c => c.reduce((g,v,i)=>Math.abs(v) > 5e-9 ? i : g, -1);
  const nom = ['nula', 'constante', 'lineal', 'parábola', 'cúbica'];
  const nomW = g => g < 0 ? 'sin carga' : (g === 0 ? 'uniforme' : 'lineal');
  let out = '\\noindent{\\footnotesize Forma que debe tener cada diagrama, según las relaciones '
    + '$dV/d' + gg.simbolo + ' = -w$ y $dM/d' + gg.simbolo + ' = V$ (cada integración sube un grado):}\\\\[2pt]\n';
  out += '{\\footnotesize\\begin{center}\\begin{tabular}{cccc}\n\\hline\n'
    + 'Intervalo [' + escLatex(unitLen) + '] & Carga $w$ & $V$ & $M$ \\\\\n\\hline\n';
  gg.tramos.forEach(t2=>{
    const off = t2.s0 - gg.s0;
    t2.subs.forEach(su=>{
      const gV = grado(su.cV), gM = grado(su.cM);
      const gW = gV - 1;
      out += dec(off+su.sa,'len') + '--' + dec(off+su.sb,'len') + ' & ' + nomW(gW)
        + ' & ' + (gV < 0 ? 'nula' : nom[gV]) + ' & ' + (gM < 0 ? 'nulo' : nom[gM]) + ' \\\\\n';
    });
  });
  out += '\\hline\n\\end{tabular}\\end{center}}\n';
  return out;
}

// ── Comprobación por el método de las áreas ──
function tablaAreasGrupo(R, gg){
  const uF = escLatex(unitFor), uM = escLatex(unidadMomento());
  let out = '\\noindent{\\footnotesize Tramo ' + escLatex(gg.recorrido) + ': en cada intervalo, el cambio de '
    + '$V$ es el área de la carga (con signo cambiado) y el cambio de $M$ es el área bajo el diagrama de '
    + '$V$. Valores en ' + uF + ' y ' + uM + ':}\\\\[2pt]\n';
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

// ── Puntos donde hay que cortar y por qué ──
function tablaCortesGrupo(R, gg){
  const EPS = 1e-6;
  const puntos = new Map();
  const marca = (x, motivo) => {
    const k = +x.toFixed(4);
    if(!puntos.has(k)) puntos.set(k, []);
    if(puntos.get(k).indexOf(motivo) < 0) puntos.get(k).push(motivo);
  };
  gg.tramos.forEach(t2=>{
    const off = t2.s0 - gg.s0;
    t2.subs.forEach(su=>{ marca(off+su.sa, null); marca(off+su.sb, null); });
    let ac = off;
    const nd = [t2.desde, t2.hasta];
    nd.forEach((n,i)=>{
      const x = i === 0 ? off : off + t2.L;
      let m = 'nudo ' + escLatex(n.nombre);
      if(n.apoyo && n.apoyo !== 'libre') m += ' (apoyo)';
      if(n.rotula) m += ' (rótula)';
      marca(x, m);
    });
  });
  (R.internas.puntuales || []).forEach(o=>{
    if(o.s === null || o.s < gg.s0 - EPS || o.s > gg.s0 + gg.L + EPS) return;
    const ac = o.a;
    if(ac.reac) return;                         // ya cuenta como apoyo
    marca(o.s - gg.s0, Math.abs(ac.m) > 1e-9 && Math.hypot(ac.fx,ac.fy) < 1e-9 ? 'momento aplicado' : 'carga puntual');
  });
  cargasConPeso().filter(c=>c.tipo==='U'||c.tipo==='T').forEach(c=>{
    const el = gg.tramos.find(t2=>t2.tramo && t2.tramo.id === c.tramo);
    if(!el) return;
    const z = trozoCargado(c); if(!z || z.len <= 1e-12) return;
    const inv = !!el.invert, offT = el.s0 - gg.s0;
    marca(offT + (inv ? z.g.L - z.s2 : z.s1), 'empieza carga repartida');
    marca(offT + (inv ? z.g.L - z.s1 : z.s2), 'termina carga repartida');
  });
  const xs = [...puntos.keys()].sort((a,b)=>a-b);
  let out = '{\\footnotesize\\begin{center}\\begin{tabular}{cl}\n\\hline\n'
    + '$' + gg.simbolo + '$ [' + escLatex(unitLen) + '] & Motivo del corte \\\\\n\\hline\n';
  xs.forEach(x=>{
    const ms = puntos.get(x).filter(Boolean);
    out += dec(x,'len') + ' & ' + (ms.length ? ms.join(', ') : 'cambio de expresión') + ' \\\\\n';
  });
  out += '\\hline\n\\end{tabular}\\end{center}}\n';
  return out;
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
  let out = '{\\footnotesize\\begin{center}\\begin{tabular}{p{8.2cm}lc}\n\\hline\n'
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
  const bloques = [];
  cargasConPeso().filter(c=>c.tipo==='U'||c.tipo==='T').forEach(c=>{
    const el = gg.tramos.find(t2=>t2.tramo && t2.tramo.id === c.tramo);
    if(!el) return;
    const z = trozoCargado(c); if(!z || z.len <= 1e-12) return;
    const inv = !!el.invert, offT = el.s0 - gg.s0;
    const g1 = offT + (inv ? z.g.L - z.s2 : z.s1), g2 = offT + (inv ? z.g.L - z.s1 : z.s2);
    const wFin = (c.tipo === 'U') ? c.mag : (c.mag2 || 0);
    const wA = inv ? wFin : c.mag, wB = inv ? c.mag : wFin;
    const dd = dirCarga(c, z.g);
    const cp = dd.x*nx + dd.y*ny;
    if(Math.abs(cp) < 1e-9) return;
    bloques.push({g1, g2, w1:wA*cp, w2:wB*cp, wA, wB, cp});
    wmax = Math.max(wmax, Math.abs(wA*cp), Math.abs(wB*cp));
  });
  bloques.forEach(bq=>{
    const alt = 0.55;
    // el bloque se levanta EN CONTRA del sentido de la carga
    const h1 = -alt*bq.w1/wmax, h2 = -alt*bq.w2/wmax;
    const x1 = X(bq.g1), x2 = X(bq.g2);
    out += '\\draw[color=bsaDist, fill=bsaDist!12] (' + F(x1) + ',0) -- (' + F(x1) + ',' + F(h1)
         + ') -- (' + F(x2) + ',' + F(h2) + ') -- (' + F(x2) + ',0) -- cycle;\n';
    const n = Math.max(2, Math.min(8, Math.round((x2-x1)/0.7)));
    for(let i=0;i<=n;i++){
      const t = i/n, xi = x1 + (x2-x1)*t, hi = h1 + (h2-h1)*t;
      if(Math.abs(hi) < 0.10) continue;
      const sg = Math.sign(hi);
      out += '\\draw[-{Latex[length=1.4mm]}, color=bsaDist, line width=.7pt] (' + F(xi) + ',' + F(hi)
           + ') -- (' + F(xi) + ',' + F(0.04*sg) + ');\n';
    }
    tzOcuparTrazo(x1, h1, x2, h2, 0.08);
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
                             'black!60', {maxNiveles:2});
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
