// ── Planteamiento del equilibrio del trozo ──
// Escribe las tres ecuaciones con sus términos: lo que llega por el nudo de
// arranque del grupo y las cargas intermedias. Decir solo que de ΣF=0 sale V
// no enseña de dónde vienen los coeficientes.
function equilibrioSub(R, gg, seg, sub, off){
  const sb = gg.simbolo;
  const ux = seg.ux, uy = seg.uy, nx = -uy, ny = ux;
  const sIni = gg.s0, sCorte = seg.s0 + sub.sa;
  const t0 = gg.tramos[0], su0 = t0.subs[0];
  const N0 = polyVal(su0.cN, 0), V0 = polyVal(su0.cV, 0), M0 = polyVal(su0.cM, 0);
  const tN = [], tV = [], tM = [];
  const add = (arr, v, txt) => {
    if(Math.abs(v) < 1e-9) return;
    arr.push((arr.length ? (v<0?' - ':' + ') : (v<0?'-':'')) + (txt || dec(Math.abs(v),'fuerza')));
  };
  add(tN, N0); add(tV, V0);
  if(Math.abs(M0) > 1e-9) tM.push((M0<0?'-':'') + dec(Math.abs(M0),'momento'));
  if(Math.abs(V0) > 1e-9)
    tM.push((tM.length ? (V0<0?' - ':' + ') : (V0<0?'-':''))
            + dec(Math.abs(V0),'fuerza') + '\\,' + sb);
  (R.internas.puntuales || []).forEach(o=>{
    if(o.s === null || o.s <= sIni + 1e-9 || o.s >= sCorte + 1e-9) return;
    const a = o.a;
    const Fpar = a.fx*ux + a.fy*uy, Fper = a.fx*nx + a.fy*ny;
    const d0 = o.s - sIni;
    add(tN, Fpar); add(tV, Fper);
    if(Math.abs(Fper) > 1e-9)
      tM.push((Fper<0?' - ':' + ') + dec(Math.abs(Fper),'fuerza')
            + '(' + sb + ' - ' + dec(d0,'len') + ')');
    if(Math.abs(a.m) > 1e-9)
      tM.push((a.m<0?' - ':' + ') + dec(Math.abs(a.m),'momento'));
  });
  const hayW = leyesDeCarga(seg, sub, off).length > 0
    || cargasConPeso().some(c=>(c.tipo==='U'||c.tipo==='T')
         && gg.tramos.some(t2=>t2.tramo && t2.tramo.id === c.tramo));
  const S = '\\sum', I = '\\int_{0}^{' + sb + '}';

  // ── Numeración local de ecuaciones: con ella el desarrollo puede decir
  //    «de acuerdo con (1) y (2), reemplazando en (3)» en vez de repetirse.
  let eqN = 0;
  const tag = () => '\\quad(' + (++eqN) + ')';

  // Polinomios de este subtramo en la abscisa del grupo: de ellos salen la
  // ley w (su derivada cambiada de signo), los valores de arranque del
  // intervalo y las antiderivadas del desarrollo.
  const gV = desplazarPoly(sub.cV, off), gM = desplazarPoly(sub.cM, off);
  const xa = off + sub.sa;
  const Va = polyVal(gV, xa), Ma = polyVal(gM, xa);
  // dentro del subtramo dV/dx = -w, así que la ley activa es exacta
  const wLey = [-(gV[1]||0), -2*(gV[2]||0), -3*(gV[3]||0)];
  const hayLey = wLey.some(v=>Math.abs(v) > 5e-9);

  let out = '';

  // ── A · De dónde salen las constantes que llegan por el nudo de arranque
  //    (solo en el primer intervalo del grupo: es el mismo dato en todos).
  //    Cada término lleva su origen bajo una llave; si además hubiera carga
  //    repartida anterior al arranque, su resultante aparece como un término
  //    más, calculado por diferencia exacta con el valor del polinomio.
  const esPrimero = (seg === gg.tramos[0] && sub === gg.tramos[0].subs[0]);
  let numCtes = {};
  if(esPrimero && (Math.abs(N0)>1e-9 || Math.abs(V0)>1e-9 || Math.abs(M0)>1e-9)){
    const cN=[], cV=[], cM=[];
    (R.internas.puntuales||[]).forEach(o=>{
      if(o.s === null || o.s > sIni + 1e-9) return;
      const a = o.a;
      const Fpar = a.fx*ux + a.fy*uy, Fper = a.fx*nx + a.fy*ny;
      const quien = a.reac
        ? ('R_{' + escLatex(a.nodo ? a.nodo.nombre : '?') + '}')
        : (Math.abs(a.m) > 1e-9 && Math.abs(Fpar)+Math.abs(Fper) < 1e-9
           ? 'M_{\\text{apl}}' : 'P');
      if(Math.abs(Fpar) > 1e-9) cN.push({v:Fpar, quien});
      if(Math.abs(Fper) > 1e-9) cV.push({v:Fper, quien});
      // el momento respecto del arranque usa el producto cruz completo, que
      // vale también cuando la acción está en un grupo de otra dirección
      const mm = a.m + (a.x - gg.desde.x)*a.fy - (a.y - gg.desde.y)*a.fx;
      if(Math.abs(mm) > 1e-9) cM.push({v:mm, quien});
    });
    const lineaCte = (nom, terms, total, dt, unidad) => {
      const suma = terms.reduce((z,t)=>z+t.v, 0);
      const resid = total - suma;
      const piezas = terms.map((t,i)=>{
        const sg = i===0 ? (t.v<0?'-':'') : (t.v<0?' - ':' + ');
        return sg + '\\underbrace{' + dec(Math.abs(t.v), dt) + '}_{' + t.quien + '}';
      });
      if(Math.abs(resid) > 1e-6)
        piezas.push((piezas.length ? (resid<0?' - ':' + ') : (resid<0?'-':''))
          + '\\underbrace{' + dec(Math.abs(resid), dt) + '}_{w\\ \\text{previa}}');
      if(!piezas.length) return '';
      const t2 = tag(); numCtes[nom] = eqN;
      return '$$' + nom + ' = ' + piezas.join('') + ' = ' + dec(total, dt)
           + '\\ \\text{' + escLatex(unidad) + '}' + t2 + '$$\n';
    };
    let bloque = '';
    if(Math.abs(N0) > 1e-9) bloque += lineaCte('N_0', cN, N0, 'fuerza', unitFor);
    if(Math.abs(V0) > 1e-9) bloque += lineaCte('V_0', cV, V0, 'fuerza', unitFor);
    if(Math.abs(M0) > 1e-9) bloque += lineaCte('M_0', cM, M0, 'momento', unidadMomento());
    if(bloque)
      out += '\\noindent{\\footnotesize Antes de cortar conviene fijar de d\\\'onde '
        + 'sale cada constante. Lo que llega por ' + escLatex(gg.desde.nombre)
        + ' se obtiene proyectando sobre el eje del tramo y su normal todo lo '
        + 'situado antes; cada t\\\'ermino indica su origen:}\\\\[2pt]\n' + bloque;
  }

  // ── B · Ley de la carga repartida activa en el intervalo, numerada
  let numLey = 0;
  if(hayLey){
    const t2 = tag(); numLey = eqN;
    out += '\\noindent{\\footnotesize La carga repartida que act\\\'ua en este '
      + 'intervalo sigue la ley:}\\\\[2pt]\n'
      + '$$w(' + sb + ') = ' + polyTex(wLey, 'fuerza', sb)
      + '\\ \\text{' + escLatex(uDist()) + '}' + t2 + '$$\n';
  }

  // ── C · Ecuaciones de equilibrio del trozo, numeradas
  out += '\\noindent{\\footnotesize Equilibrio del trozo, con lo que llega por '
       + escLatex(gg.desde.nombre) + ' y las cargas intermedias'
       + ((hayW && esPrimero)
          ? '. En las integrales $\\xi$ es la posici\\\'on de una rebanada de '
          + 'carga repartida, medida desde ' + escLatex(gg.desde.nombre) + ': esa rebanada '
          + 'vale $w(\\xi)\\,d\\xi$ y su brazo hasta el corte es $(' + sb + ' - \\xi)$'
          : '')
       + ':}\\\\[2pt]\n';
  out += '$$' + S + ' F_{\\parallel}=0:\\quad N(' + sb + ') = '
       + (tN.length ? tN.join('') : '0') + tag() + '$$\n';
  out += '$$' + S + ' F_{\\perp}=0:\\quad V(' + sb + ') = '
       + (tV.length ? tV.join('') : '0')
       + (hayW ? ' - ' + I + ' w(\\xi)\\, d\\xi' : '') + tag() + '$$\n';
  const numV = eqN;
  out += '$$' + S + ' M_{\\text{corte}}=0:\\quad M(' + sb + ') = '
       + (tM.length ? tM.join('') : '0')
       + (hayW ? ' - ' + I + ' w(\\xi)\\,(' + sb + ' - \\xi)\\, d\\xi' : '') + tag() + '$$\n';
  const numM = eqN;

  // ── D · Sustitución e integración explícitas ──
  // Con carga activa: la integral de la cortante se evalúa con su
  // antiderivada entre el inicio del intervalo y el corte, y el momento se
  // obtiene integrando dM/dx = V, que equivale a la integral con brazo.
  const antider = c => [0, c[0]||0, (c[1]||0)/2, (c[2]||0)/3];
  const evalDesde = (F, a) => {           // F(x) - F(a), como polinomio en x
    const G = F.slice();
    G[0] = (G[0]||0) - polyVal(F, a);
    return G;
  };
  if(hayLey){
    const Fw = antider(wLey);             // antiderivada de w
    const Gw = evalDesde(Fw, xa);         // Fw(x) - Fw(xa)
    const refs = numCtes['V_0'] ? '(' + numCtes['V_0'] + ') y (' + numLey + ')'
                                : '(' + numLey + ')';
    out += '\\noindent{\\footnotesize De acuerdo con ' + refs
      + ', reemplazando en (' + numV + ') e integrando desde el inicio del '
      + 'intervalo, $' + sb + '_a = ' + dec(xa,'len') + '$, donde '
      + '$V = ' + dec(Va,'fuerza') + '$, se obtiene:}\\\\[2pt]\n';
    out += '$$V(' + sb + ') = ' + dec(Va,'fuerza')
      + ' - \\int_{' + dec(xa,'len') + '}^{' + sb + '} \\big(' + polyTex(wLey,'fuerza','\\xi')
      + '\\big)\\, d\\xi = ' + dec(Va,'fuerza')
      + ' - \\Big[' + polyTex(Fw,'fuerza','\\xi') + '\\Big]_{' + dec(xa,'len') + '}^{' + sb + '}'
      + ' = ' + dec(Va,'fuerza') + ' - \\big(' + polyTex(Gw,'fuerza',sb) + '\\big)$$\n';
    const Hv = antider(gV);               // antiderivada de V
    const Gv = evalDesde(Hv, xa);
    out += '\\noindent{\\footnotesize Con $V(' + sb + ')$ ya conocido, el momento '
      + 'sale de integrar $dM/d' + sb + ' = V$ \\textemdash equivalente a la '
      + 'integral con brazo de (' + numM + ')\\textemdash{} desde $' + sb + '_a$, donde '
      + '$M = ' + dec(Ma,'momento') + '$:}\\\\[2pt]\n';
    out += '$$M(' + sb + ') = ' + dec(Ma,'momento')
      + ' + \\int_{' + dec(xa,'len') + '}^{' + sb + '} V(\\xi)\\, d\\xi = '
      + dec(Ma,'momento') + ' + \\big(' + polyTex(Gv,'momento',sb) + '\\big)$$\n';
    out += '\\noindent{\\footnotesize Reduciendo t\\\'erminos, resulta:}\\\\[2pt]\n';
  } else if(hayW){
    out += '\\noindent{\\footnotesize En este intervalo no hay carga repartida: '
      + 'las integrales de (' + numV + ') y (' + numM + ') no crecen, as\\\'i que '
      + '$V$ se mantiene constante y $M$ var\\\'ia linealmente. Evaluando las sumas:}\\\\[2pt]\n';
  } else {
    out += '\\noindent{\\footnotesize Evaluando las sumas anteriores, resulta:}\\\\[2pt]\n';
  }
  return out;
}

// ── Procedimiento: qué actúa sobre el trozo cortado ──
// El informe daba los polinomios ya resueltos, sin decir de dónde salían.
// Aquí se enumeran las acciones que quedan ANTES del corte, con su
// componente sobre el eje y perpendicular a él y con su brazo, que es lo
// que hay que sumar para obtener N, V y M.
function procedimientoSub(R, gg, seg, sub, off){
  const sb = gg.simbolo;
  const ux = seg.ux, uy = seg.uy;         // eje del tramo, sentido de recorrido
  const nx = -uy, ny = ux;                // normal
  const sIni = seg.s0 + sub.sa;           // abscisa global del inicio del subtramo
  const filas = [];

  // Acciones puntuales (reacciones y cargas concentradas) antes del corte
  (R.internas.puntuales || []).forEach(o=>{
    if(o.s === null || o.s >= sIni + 1e-9) return;
    const a = o.a;
    const Fpar = a.fx*ux + a.fy*uy;       // componente a lo largo del eje
    const Fper = a.fx*nx + a.fy*ny;       // componente perpendicular
    // Una acción sin componente sobre el eje ni perpendicular a él (una
    // reacción horizontal nula, por ejemplo) no aporta al equilibrio del
    // trozo: listarla solo añade ruido a la tabla.
    if(Math.abs(Fpar) < 1e-9 && Math.abs(Fper) < 1e-9 && Math.abs(a.m) < 1e-9) return;
    const brazo = (seg.s0 + sub.sa) - o.s; // distancia del punto al inicio del subtramo
    const nom = a.reac
      ? ('Reacci\\\'on en ' + escLatex(a.nodo ? a.nodo.nombre : '?'))
      : (Math.abs(a.m) > 1e-9 ? 'Momento aplicado' : 'Carga puntual');
    filas.push({nom,
      pos: dec(o.s - gg.s0, 'len'),
      par: Math.abs(Fpar) > 1e-9 ? dec(Fpar,'fuerza') : '--',
      per: Math.abs(Fper) > 1e-9 ? dec(Fper,'fuerza') : '--',
      brazo: (Math.abs(a.m) > 1e-9 && Math.abs(Fper) < 1e-9)
             ? 'momento ' + dec(a.m,'momento')
             : ('$' + sb + ' - ' + dec(o.s - gg.s0,'len') + '$')});
  });

  // Parte de las distribuidas que cae dentro o antes del subtramo
  cargasConPeso().filter(c=>c.tipo==='U'||c.tipo==='T').forEach(c=>{
    const z = trozoCargado(c);
    if(!z || z.len <= 1e-12) return;
    const pos = R.cad.findIndex(x=>x.t.id === c.tramo);
    if(pos < 0) return;
    const idx = R.internas.indexOf(seg);
    if(pos > idx) return;
    const w1 = c.mag, w2 = (c.tipo==='U') ? c.mag : (c.mag2||0);
    filas.push({nom: (c.tipo==='U' ? 'Distribuida uniforme' : 'Distribuida variable')
                     + ' (tramo ' + escLatex(nomTramo(R.cad[pos].t)) + ')',
      pos: dec(z.s1,'len') + '--' + dec(z.s2,'len'),
      par: '--',
      per: (c.tipo==='U') ? dec(-Math.abs(w1),'fuerza') + '/' + escLatex(unitLen)
                          : dec(-Math.abs(w1),'fuerza') + '\\ a\\ ' + dec(-Math.abs(w2),'fuerza'),
      brazo: 'resultante al centroide del bloque'});
  });

  if(!filas.length) return '';
  let out = '\\noindent{\\footnotesize Sobre el trozo situado antes del corte act\\\'uan:}\\\\[2pt]\n';
  out += '{\\footnotesize\\begin{center}\\begin{tabular}{lccc}\n\\hline\n'
       + 'Acci\\\'on & Posici\\\'on & Comp. eje & Comp. perp. \\\\\n\\hline\n';
  filas.forEach(f=>{
    out += f.nom + ' & ' + f.pos + ' & ' + f.par + ' & ' + f.per + ' \\\\\n';
  });
  out += '\\hline\n\\end{tabular}\\end{center}}\n';
  out += '\\noindent{\\footnotesize Planteando el equilibrio del trozo: '
       + '$\\sum F_{\\parallel}=0$ da $N(' + sb + ')$, $\\sum F_{\\perp}=0$ da $V('
       + sb + ')$ y $\\sum M_{\\text{corte}}=0$ da $M(' + sb + ')$, tomando como brazo '
       + 'la distancia de cada acci\\\'on al corte.}\\\\[3pt]\n';
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
    // lado -1 = justo antes ; +1 = justo después
    const cand = pts.filter(p=>Math.abs(p.x-x) < 1e-6);
    const el = (lado < 0)
      ? cand.filter(p=>Math.abs(p.loc - p.su.sb) < 1e-9)[0] || cand[0]
      : cand.filter(p=>Math.abs(p.loc - p.su.sa) < 1e-9)[0] || cand[0];
    if(!el) return '--';
    return dec(polyVal(el.su[campo], el.loc), campo==='cM' ? 'momento' : 'fuerza');
  };
  const hayN = gg.tramos.some(t2=>t2.subs.some(su=>su.cN.some(v=>Math.abs(v)>5e-9)));
  let out = '\\noindent{\\footnotesize Valores en las secciones notables, a cada lado '
          + 'del punto (antes / despu\\\'es):}\\\\[2pt]\n';
  out += '{\\footnotesize\\begin{center}\\begin{tabular}{c' + (hayN?'cc':'') + 'cccc}\n\\hline\n'
       + '$' + gg.simbolo + '$ '
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
        // si V cambia de + a -, el momento pasa por un máximo
        const antes = polyVal(su.cV, Math.max(su.sa, v-1e-3));
        filas.push({x:off+v, tipo: antes > 0 ? '$M$ m\\\'aximo' : '$M$ m\\\'inimo',
                    m:mv, v:0});
      });
    });
  });
  if(!filas.length) return '';
  filas.sort((a,b)=>a.x-b.x);
  let out = '\\noindent{\\footnotesize Puntos singulares del momento:}\\\\[2pt]\n';
  out += '{\\footnotesize\\begin{center}\\begin{tabular}{lccc}\n\\hline\n'
       + 'Condici\\\'on & $' + gg.simbolo + '$ & $M$ & $V$ \\\\\n\\hline\n';
  filas.forEach(f=>{
    out += f.tipo + ' & ' + dec(f.x,'len') + ' & ' + dec(f.m,'momento')
         + ' & ' + dec(f.v,'fuerza') + ' \\\\\n';
  });
  out += '\\hline\n\\end{tabular}\\end{center}}\n';
  return out;
}

// ── Diagrama continuo de un GRUPO (N, V o M) ──
// Usa las mismas ramas que la pantalla, así que los saltos salen verticales
// y no como rampas. Marca los valores en los extremos de cada rama, los
// puntos donde la función se anula y el máximo en valor absoluto.
function tikzDiagramaGrupo(R, gg, clave, color){
  const sb0 = gg.simbolo;
  const ramas = muestrearSerie(R, clave, gg.tramos, gg.s0);
  let vmax = 1e-9, pts = [];
  ramas.forEach(rm=>{
    if(rm.salto){ vmax = Math.max(vmax, Math.abs(rm.de), Math.abs(rm.a)); }
    else rm.pts.forEach(p=>{ vmax = Math.max(vmax, Math.abs(p.v)); pts.push(p); });
  });
  const L = gg.L || 1;
  const W = Math.min(15.0, Math.max(11.0, L*1.05));   // más ancho: los valores deben leerse
  const HH = 2.60;
  const X = x => (x/L)*W;
  const Y = v => (v/vmax)*HH;
  const F = n => n.toFixed(3);

  let out = '';
  // relleno + trazo, rama a rama
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

  // divisiones entre tramos del grupo
  let ac = 0;
  gg.tramos.forEach(t2=>{
    out += '\\draw[black!25, dashed, line width=.4pt] (' + F(X(ac)) + ',' + F(-HH-0.25)
         + ') -- (' + F(X(ac)) + ',' + F(HH+0.25) + ');\n';
    out += '\\node[font=\\tiny, color=bsaAcc2, below] at (' + F(X(ac)) + ',' + F(-HH-0.30)
         + ') {' + escLatex(t2.desde.nombre) + '};\n';
    ac += t2.L;
  });
  out += '\\node[font=\\tiny, color=bsaAcc2, below] at (' + F(W) + ',' + F(-HH-0.30)
       + ') {' + escLatex(gg.hasta.nombre) + '};\n';

  // etiquetas: extremos de rama y los dos lados de cada salto
  tzReiniciar();
  const et = etiquetasSerie(ramas).filter(e=>Math.abs(e.v) > 1e-7);
  et.forEach(e=>{
    out += tzTexto(X(e.x), Y(e.v) + (e.v>=0 ? 0.20 : -0.20), dec(e.v, clave==='M'?'momento':'fuerza'),
                   'font=\\scriptsize, color=' + color, 0, e.v>=0 ? 1 : -1);
  });
  // ── Abscisas notables: ceros de la función y, para M, los extremos ──
  // Se acotan bajo el eje con su variable, que es lo que hay que retener:
  // no basta con ver la forma, hay que saber DÓNDE ocurre.
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
        // el momento es extremo donde la cortante se anula
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
    // El color de la guía se compone aparte: 'black!65' ya lleva porcentaje,
    // así que encadenar otro '!50' produce una expresión inválida.
    const col = mk.tipo === 'cero' ? 'black!65' : color;
    const guia = mk.tipo === 'cero' ? 'black!35' : color + '!45';
    out += '\\fill[' + col + '] (' + F(X(mk.x)) + ',' + F(mk.tipo==='cero' ? 0 : Y(mk.v))
         + ') circle (0.055);\n';
    if(mk.tipo !== 'cero')
      out += '\\draw[' + guia + ', dashed, line width=.4pt] (' + F(X(mk.x)) + ',' + F(Y(mk.v))
           + ') -- (' + F(X(mk.x)) + ',' + F(-HH-0.55) + ');\n';
    else
      out += '\\draw[' + guia + ', dashed, line width=.4pt] (' + F(X(mk.x)) + ',0) -- ('
           + F(X(mk.x)) + ',' + F(-HH-0.55) + ');\n';
  });
  // cadena de cotas bajo el diagrama, con la variable del grupo
  if(marcas.length){
    const xs = [0, ...marcas.map(m=>m.x), L];
    const cc = tzCadenaCotas([...new Set(xs.map(v=>+v.toFixed(4)))], X, -HH-0.75,
                             'black!60', {maxNiveles:2});
    out += cc.tikz;
    marcas.forEach(mk=>{
      const et = mk.tipo === 'cero' ? '$' + sb0 + '=' + dec(mk.x,'len') + '$'
        : (mk.tipo === 'max' ? 'm\\\'ax' : 'm\\\'in') + ' $' + sb0 + '=' + dec(mk.x,'len') + '$';
      out += tzTexto(X(mk.x), -HH-0.44, et, 'font=\\tiny, color=' +
                     (mk.tipo==='cero'?'black!65':color), 0, 1);
    });
  }
  out += '\\node[font=\\tiny, color=black!55, left] at (0,0) {0};\n';
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

  // Cara ondulada: una S suave, como el trazo de rotura de los manuales.
  const onda = (x, y0, y1) =>
      ' .. controls (' + (x+0.13).toFixed(3) + ',' + (y0+(y1-y0)*0.30).toFixed(3)
    + ') and (' + (x-0.13).toFixed(3) + ',' + (y0+(y1-y0)*0.70).toFixed(3)
    + ') .. (' + x.toFixed(3) + ',' + y1.toFixed(3) + ')';

  // Bloque con degradado. ondIzq / ondDer dicen qué caras van onduladas.
  const bloque = (x, y, ondIzq, ondDer) => {
    // El gris neutro desentonaba con el resto del informe: se usa el azul
    // oscuro de la marca, degradado, con borde del mismo tono.
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
  // Cada cara del corte recibe la fuerza dirigida HACIA el corte.
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
  out += pie(y-0.42, 'Fuerza normal positiva');

  // ══ Fuerza cortante positiva ══
  // Igual que las otras dos: la barra se corta y sobre CADA cara actúa su
  // fuerza. En la cara izquierda hacia abajo, en la derecha hacia arriba;
  // ese par hace girar cada trozo en sentido horario.
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
  out += pie(y-0.62, 'Fuerza cortante positiva');

  // ══ Momento positivo ══
  // Los dos arcos arrancan juntos abajo, junto al corte, y SE ABREN hacia
  // arriba y hacia afuera. Antes se cerraban uno contra otro, que es el
  // sentido contrario y confundía el signo.
  y = -5.05;
  out += bloque(0, y, false, true) + bloque(W+G, y, true, false);
  // Arco alto y panzudo: arranca por debajo del bloque, se abomba hacia el
  // centro y sale por arriba apuntando hacia afuera. Con puntos de control
  // alineados salía una "V", que no se lee como un giro.
  // Arco alto y casi vertical, que se comba hacia el centro y sale por
  // arriba apuntando afuera. La apertura entre puntas es pequeña: si se
  // separan mucho el dibujo deja de leerse como un giro y parece una "V".
  // Cada flecha es un arco que se comba HACIA EL CENTRO: baja recta junto al
  // corte y sale por arriba abriéndose. Con la comba calculada a partir de
  // la separación entre puntas los dos arcos se cruzaban abajo; ahora el
  // abombamiento es un valor fijo hacia dentro y quedan separados.
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
  out += pie(y-0.62, 'Momento positivo');
  return out;
}
