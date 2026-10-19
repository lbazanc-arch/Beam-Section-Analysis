// ═══════════════════════════════════════════════════════════
//  MÉTODO DE LAS ÁREAS CON FIGURAS CONOCIDAS (2026-10-18, petición del profesor)
//  Sin integrales. El área del diagrama de carga da el cambio de V y el área
//  del diagrama de V da el cambio de M, y cada área es una figura conocida:
//    rectángulo b·h · triángulo ½·b·h · semiparábola ⅔·b·h · enjuta ⅓·b·h
//    · segmento parabólico ⅔·b·f, con la flecha f = (w₂ − w₁)·b/8.
//  Bajo una carga variable V es una parábola con su vértice donde w = 0:
//   · vértice en un extremo del intervalo: rectángulo + semiparábola si la curva
//     se aleja del eje, rectángulo + enjuta si se acerca; nunca se resta;
//   · vértice dentro: el intervalo se parte ahí y vale lo anterior;
//   · vértice fuera (carga trapezoidal): trapecio de la cuerda + segmento.
//  Donde V = 0 el intervalo también se parte: ahí M tiene su máximo o mínimo.
//  En cada punto, las acciones concentradas hacen saltar V (y N) y los pares, M.
//  Un solo modelo (`areasDeGrupo`) lo escriben la pantalla y el PDF, y se
//  contrasta con los polinomios del motor (avisa por consola si no coincide).
// ═══════════════════════════════════════════════════════════

// Componente con nombre: P_{2} → P_{2,\perp}.
function _arComp(nom, c){ return /\}$/.test(nom) ? nom.replace(/\}$/, ',' + c + '}') : nom + '_{' + c + '}'; }

// Figuras de una función lineal de ya a yb sobre una base len (carga uniforme o
// trapezoidal, o V bajo carga uniforme). Con el mismo signo en los extremos:
// rectángulo de la menor + triángulo de la diferencia, los dos del mismo lado.
function _arFigsLineal(ya, yb, len, tol){
  if(Math.abs(ya) < tol && Math.abs(yb) < tol) return [];
  if(Math.abs(ya - yb) < tol) return [{tipo:'rect', b:len, h:ya, val:ya*len, base:0}];
  if(Math.abs(ya) < tol) return [{tipo:'tri', b:len, h:yb, val:yb*len/2, base:0, lado:'fin'}];
  if(Math.abs(yb) < tol) return [{tipo:'tri', b:len, h:ya, val:ya*len/2, base:0, lado:'ini'}];
  if(ya*yb > 0){
    const ini = Math.abs(ya) <= Math.abs(yb);
    const menor = ini ? ya : yb, otro = ini ? yb : ya;
    return [{tipo:'rect', b:len, h:menor, val:menor*len, base:0},
            {tipo:'tri', b:len, h:otro - menor, val:(otro - menor)*len/2, base:menor, lado: ini ? 'fin' : 'ini'}];
  }
  // La carga cambia de sentido dentro del intervalo (raro): rectángulo y
  // triángulo con su signo.
  return [{tipo:'rect', b:len, h:ya, val:ya*len, base:0},
          {tipo:'tri', b:len, h:yb - ya, val:(yb - ya)*len/2, base:ya, lado:'fin'}];
}
function _arPolyLineal(f, xp, xq){
  if(f.tipo === 'rect') f.poly = [[xp,0],[xq,0],[xq,f.h],[xp,f.h]];
  else f.poly = (f.lado === 'ini') ? [[xp,f.base],[xq,f.base],[xp,f.base + f.h]]
                                   : [[xp,f.base],[xq,f.base],[xq,f.base + f.h]];
}
// Fórmula de la figura con sus números: (b)(h), ½(b)(h)…
function _arFormula(f){
  const B = '(' + dec(f.b,'len') + ')', H = '(' + dec(f.h,'fuerza') + ')';
  const k = {rect:'', tri:'\\tfrac{1}{2}', semi:'\\tfrac{2}{3}', enjuta:'\\tfrac{1}{3}', seg:'\\tfrac{2}{3}'}[f.tipo];
  return k + B + H;
}
const _AR_FIGURA = {rect:'rectángulo', tri:'triángulo', semi:'semiparábola', enjuta:'enjuta parabólica', seg:'segmento parabólico'};

// ── El modelo del método para un grupo (tramos seguidos en la misma recta) ──
function areasDeGrupo(R, gg){
  const EPS = 1e-9;
  const L = gg.L || 1;
  const tolX = 1e-6*Math.max(1, L);
  const sb = gg.simbolo;
  const t0 = gg.tramos[0];
  const ux = t0.ux, uy = t0.uy, nx = -uy, ny = ux;
  const uF = escLatex(unitFor), uM = escLatex(unidadMomento()), uL = escLatex(unitLen);
  const conU = (s, u) => s + '\\ \\text{' + u + '}';

  const subsG = [];
  let vEsc = 1, nEsc = 1, mEsc = 1, wEsc = 1;
  gg.tramos.forEach(t=>{
    const off = t.s0 - gg.s0;
    t.subs.forEach(su=>{
      subsG.push({t, su, off, a:off + su.sa, b:off + su.sb});
      [su.sa, su.sb].forEach(s=>{
        vEsc = Math.max(vEsc, Math.abs(polyVal(su.cV,s)));
        nEsc = Math.max(nEsc, Math.abs(polyVal(su.cN,s)));
        mEsc = Math.max(mEsc, Math.abs(polyVal(su.cM,s)));
        wEsc = Math.max(wEsc, Math.abs(polyDerVal(su.cV,s)), Math.abs(polyDerVal(su.cN,s)));
      });
    });
  });
  const tol = {V:1e-7*vEsc, N:1e-7*nEsc, M:1e-7*mEsc, w:1e-7*wEsc};
  const hayN = gg.tramos.some(t=>t.subs.some(su=>su.cN.some(v=>Math.abs(v) > 5e-9)));
  // ¿Hay carga paralela al eje? Entonces la perpendicular se llama ⊥ y la otra ∥.
  const hayAx = subsG.some(g=>Math.abs(polyDerVal(g.su.cN, g.su.sa)) > tol.w || Math.abs(polyDerVal(g.su.cN, g.su.sb)) > tol.w);

  // Nudos del grupo y nombre de cada punto: el nudo o su abscisa.
  const nudos = [];
  let ac = 0;
  gg.tramos.forEach(t=>{ nudos.push({x:ac, n:t.desde}); ac += t.L; });
  nudos.push({x:ac, n:gg.hasta});
  const nudoEn = x => { const p = nudos.find(q=>Math.abs(q.x - x) < tolX); return p ? p.n : null; };
  const nomPunto = x => { const n = nudoEn(x); return n ? escLatex(n.nombre) : dec(x,'len'); };

  // Acciones concentradas en un punto, con lo que hacen saltar.
  const punt = puntualesDe(R, t0);
  const accionesEn = x => punt.filter(o=>o.s !== null && Math.abs(o.s - (gg.s0 + x)) < tolX).map(o=>{
    const a = o.a, Fper = a.fx*nx + a.fy*ny, Fpar = a.fx*ux + a.fy*uy, m = a.m || 0;
    const nm = nombreAccion(a);
    const obl = Math.abs(Fper) > EPS && Math.abs(Fpar) > EPS;
    return {V:Fper, N:-Fpar, M:-m,
            nV: obl ? _arComp(nm.tex, '\\perp') : nm.tex,
            nN: obl ? _arComp(nm.tex, '\\parallel') : nm.tex,
            nM: nm.texM || nm.tex,
            // Para la figura: la fuerza en los ejes del tramo, su nombre y su familia.
            Fpar, Fper, m, nF: nm.tex, tipo: a.reac ? 'reac' : (a.rama ? 'rama' : 'carga')};
  }).filter(e=>Math.abs(e.V) > EPS || Math.abs(e.N) > EPS || Math.abs(e.M) > EPS);

  const MAGS = hayN ? ['N','V','M'] : ['V','M'];
  const DT = {N:'fuerza', V:'fuerza', M:'momento'};
  const UN = {N:uF, V:uF, M:uM};
  const val = (g, m, s) => polyVal(g.su['c' + m], s);
  const etq = (m, x, lado) => m + '_{' + nomPunto(x) + '}' + (lado ? '^{' + lado + '}' : '');

  // ¿Salta cada magnitud en cada punto de unión de dos intervalos, y al final?
  const saltos = subsG.map((g, i)=>{
    const sig = subsG[i + 1];
    const acc = accionesEn(g.b);
    const s = {};
    MAGS.forEach(m=>{
      s[m] = sig ? Math.abs(val(sig, m, sig.su.sa) - val(g, m, g.su.sb)) > tol[m]
                 : Math.abs(acc.reduce((p, e)=>p + e[m], 0)) > tol[m];
    });
    return {acc, s};
  });
  const ladoFin = (i, m) => saltos[i].s[m] ? '-' : '';

  const bloques = [], puntos = [], figsV = [], figsW = [], ceros = [];
  // Las acciones concentradas que se usan en el desarrollo, para dibujarlas en la
  // figura con el mismo nombre (2026-10-18, petición del profesor): cargas, pares,
  // reacciones, lo que transmite una rama y lo que llega del tramo anterior.
  const figAcc = [];
  const meterAcc = (x, acc) => acc.forEach(e=>figAcc.push({x, Fpar:e.Fpar, Fper:e.Fper, m:e.m, nF:e.nF, nM:e.nM, tipo:e.tipo}));
  let nA = 0, nW = 0, nP = 0;
  const avisar = (que, datos) => console.warn('Informe LaTeX: el método de las áreas no reproduce ' + que,
                                              Object.assign({grupo:gg.recorrido}, datos));

  // Fila de un salto: el valor de antes y, debajo de cada acción, su nombre.
  const filaSalto = (m, texD, antes, acc, d, inicio) => {
    const ts = acc.filter(e=>Math.abs(e[m]) > EPS);
    let s = texD + ' &= ';
    // El signo va fuera de la llave: así se lee como resta o suma, no como número negativo.
    const termino = (e, k) => (e[m] < 0 ? (k ? ' - ' : '-') : (k ? ' + ' : '')) + '\\underbrace{' + dec(Math.abs(e[m]), DT[m]) + '}_{' + e['n' + m] + '}';
    if(inicio){
      if(!ts.length) return texD + ' &= 0';
      // Una sola acción: su valor ya es el resultado, no se repite.
      if(ts.length === 1) return s + termino(ts[0], 0) + '\\ \\text{' + UN[m] + '}';
      s += ts.map(termino).join('');
    } else {
      s += dec(antes, DT[m]);
      ts.forEach(e=>{ s += termino(e, 1); });
    }
    return s + ' = ' + conU(dec(d, DT[m]), UN[m]);
  };

  // ── Arranque ──
  const g0 = subsG[0];
  const cur = {};
  if(gg.primero){
    const acc = accionesEn(0);
    meterAcc(0, acc);
    const filas = [];
    MAGS.forEach(m=>{
      const d = val(g0, m, g0.su.sa);
      const suma = acc.reduce((p, e)=>p + e[m], 0);
      if(Math.abs(suma - d) > 1e-6*Math.max(1, Math.abs(d))) avisar('el valor inicial de ' + m, {d, suma});
      // Con alguna acción, «justo después» (+): el empotramiento se llama M_A y
      // el momento interno que deja, M_A^+.
      const lado = acc.some(e=>Math.abs(e[m]) > EPS) ? '+' : '';
      filas.push(filaSalto(m, etq(m, 0, lado), 0, acc, d, true));
      cur[m] = {v:d, tex:etq(m, 0, lado)};
    });
    bloques.push({tipo:'punto', x:0, filas});
    puntos.push({x:0, v:Object.fromEntries(MAGS.map(m=>[m, [cur[m].v]]))});
  } else {
    MAGS.forEach(m=>{ cur[m] = {v:val(g0, m, g0.su.sa), tex:m + '_0'}; });
    // Lo que llega por el nudo de arranque, en su sentido POSITIVO sobre la cara
    // izquierda del tramo: N₀ hacia atrás, V₀ hacia +n̂ y M₀ horario.
    figAcc.push({x:0, tipo:'llega', N0:cur.N ? cur.N.v : 0, V0:cur.V.v, M0:cur.M.v});
    puntos.push({x:0, v:Object.fromEntries(MAGS.map(m=>[m, [cur[m].v]]))});
  }

  // ── Intervalos ──
  subsG.forEach((g, i)=>{
    const {su, off, a, b} = g;
    const len = b - a;
    const filas = [];
    const ini = {}; MAGS.forEach(m=>{ ini[m] = val(g, m, su.sa); });
    MAGS.forEach(m=>{
      if(Math.abs(ini[m] - cur[m].v) > 1e-6*Math.max(1, Math.abs(ini[m]))) avisar('el arranque del intervalo (' + m + ')', {a, ini:ini[m], cur:cur[m].v});
    });
    const fin = {}; MAGS.forEach(m=>{ fin[m] = val(g, m, su.sb); });
    const texFin = m => etq(m, b, ladoFin(i, m));

    // Carga perpendicular: su área es el cambio de V.
    const wa = -polyDerVal(su.cV, su.sa), wb = -polyDerVal(su.cV, su.sb);
    const fW = _arFigsLineal(wa, wb, len, tol.w);
    if(fW.length){
      nW++;
      const nom = hayAx ? 'A_{\\perp' + nW + '}' : 'A_{w' + nW + '}';
      const Aw = fW.reduce((p, f)=>p + f.val, 0);
      fW.forEach(f=>{ _arPolyLineal(f, a, b); f.nombre = nom; figsW.push(f); });
      filas.push(nom + ' &= ' + fW.map(_arFormula).join(' + ') + ' = ' + conU(dec(Aw,'fuerza'), uF));
      filas.push(texFin('V') + ' &= ' + cur.V.tex + ' - ' + nom + ' = ' + dec(cur.V.v,'fuerza')
        + (Aw < 0 ? ' + ' : ' - ') + dec(Math.abs(Aw),'fuerza') + ' = ' + conU(dec(fin.V,'fuerza'), uF));
      if(Math.abs(cur.V.v - Aw - fin.V) > 1e-6*Math.max(1, vEsc)) avisar('el cambio de V', {a, b, Aw, Va:cur.V.v, Vb:fin.V});
      cur.V = {v:fin.V, tex:texFin('V')};
    }
    // Carga paralela al eje: su área es el cambio de N.
    if(hayN){
      const pa = -polyDerVal(su.cN, su.sa), pb = -polyDerVal(su.cN, su.sb);
      const fP = _arFigsLineal(pa, pb, len, tol.w);
      if(fP.length){
        nP++;
        const nom = 'A_{\\parallel' + nP + '}';
        const Ap = fP.reduce((p, f)=>p + f.val, 0);
        filas.push(nom + ' &= ' + fP.map(_arFormula).join(' + ') + ' = ' + conU(dec(Ap,'fuerza'), uF));
        filas.push(texFin('N') + ' &= ' + cur.N.tex + ' - ' + nom + ' = ' + dec(cur.N.v,'fuerza')
          + (Ap < 0 ? ' + ' : ' - ') + dec(Math.abs(Ap),'fuerza') + ' = ' + conU(dec(fin.N,'fuerza'), uF));
        if(Math.abs(cur.N.v - Ap - fin.N) > 1e-6*Math.max(1, nEsc)) avisar('el cambio de N', {a, b, Ap});
        cur.N = {v:fin.N, tex:texFin('N')};
      }
    }

    // Área de V, por piezas: se parte donde V = 0 y en el vértice de la parábola.
    const c1 = su.cV[1] || 0, c2 = su.cV[2] || 0;
    const parab = Math.abs(c2)*len*len > 1e-7*vEsc;
    const sv = parab ? -c1/(2*c2) : null;
    const zs = raicesEn(su.cV, su.sa, su.sb).filter(s=>s > su.sa + tolX && s < su.sb - tolX);
    let cortes = [su.sa, su.sb].concat(zs);
    if(parab && sv > su.sa + tolX && sv < su.sb - tolX) cortes.push(sv);
    cortes.sort((p, q)=>p - q);
    cortes = cortes.filter((v, k)=>k === 0 || v - cortes[k-1] > tolX);
    const esCero = s => zs.some(z=>Math.abs(z - s) < tolX);

    // Dónde se anula V: con la carga uniforme, por triángulos semejantes; con la
    // variable, con el área de carga hasta ese punto (rectángulo + triángulo).
    if(zs.length){
      const xs = zs.map(z=>off + z);
      const Va = ini.V;
      if(!parab){
        const w = (Va - fin.V)/len;
        filas.push(sb + '_0 &= ' + (Math.abs(a) > tolX ? dec(a,'len') + ' + ' : '') + '\\frac{' + dec(Va,'fuerza') + '}{' + dec(w,'fuerza') + '} = '
          + conU(dec(xs[0],'len'), uL));
      } else {
        const us = zs.map(z=>z - su.sa);
        filas.push('V = 0:\\quad ' + polyTex([Va, -wa, c2], 'fuerza', 'u') + ' &= 0 \\;\\Rightarrow\\; u = '
          + us.map(u=>dec(u,'len')).join(';\\ ') + ',\\quad ' + sb + '_0 = '
          + xs.map(x=>dec(x,'len')).join(';\\ ') + '\\ \\text{' + uL + '}');
      }
    }

    for(let k = 0; k < cortes.length - 1; k++){
      const p = cortes[k], q = cortes[k+1], lp = q - p;
      const xp = off + p, xq = off + q;
      let Vp = polyVal(su.cV, p), Vq = polyVal(su.cV, q);
      if(esCero(p)) Vp = 0;
      if(esCero(q)) Vq = 0;
      const curva = (de, a2) => { const pts = []; for(let j=0;j<=24;j++){ const x = de + (a2 - de)*j/24; pts.push([x, polyVal(su.cV, x - off)]); } return pts; };
      let figs;
      if(!parab){
        figs = _arFigsLineal(Vp, Vq, lp, tol.V);
        figs.forEach(f=>_arPolyLineal(f, xp, xq));
      } else {
        const enP = Math.abs(sv - p) < tolX, enQ = Math.abs(sv - q) < tolX;
        if(enP || enQ){
          const Vv = enP ? Vp : Vq, Vo = enP ? Vq : Vp;
          const xv = enP ? xp : xq, xo = enP ? xq : xp;
          figs = [];
          if(Math.abs(Vv) >= Math.abs(Vo)){
            // La curva se aleja del eje: rectángulo hasta Vo y semiparábola encima.
            if(Math.abs(Vo) > tol.V) figs.push({tipo:'rect', b:lp, h:Vo, val:Vo*lp, poly:[[xp,0],[xq,0],[xq,Vo],[xp,Vo]]});
            figs.push({tipo:'semi', b:lp, h:Vv - Vo, val:2/3*lp*(Vv - Vo), poly:curva(xv, xo).concat([[xv, Vo]])});
          } else {
            // Se acerca al eje: rectángulo hasta Vv y enjuta encima.
            if(Math.abs(Vv) > tol.V) figs.push({tipo:'rect', b:lp, h:Vv, val:Vv*lp, poly:[[xp,0],[xq,0],[xq,Vv],[xp,Vv]]});
            figs.push({tipo:'enjuta', b:lp, h:Vo - Vv, val:lp*(Vo - Vv)/3, poly:curva(xv, xo).concat([[xo, Vv]])});
          }
        } else {
          // Vértice fuera: trapecio de la cuerda + segmento parabólico.
          figs = _arFigsLineal(Vp, Vq, lp, tol.V);
          figs.forEach(f=>_arPolyLineal(f, xp, xq));
          const wp = -polyDerVal(su.cV, p), wq = -polyDerVal(su.cV, q);
          const fl = (wq - wp)*lp/8;
          figs.push({tipo:'seg', b:lp, h:fl, val:2/3*lp*fl, poly:curva(xp, xq), wp, wq});
        }
      }
      const area = figs.reduce((s, f)=>s + f.val, 0);
      const exacta = polyIntDef(su.cV, p, q);
      if(Math.abs(area - exacta) > 1e-6*Math.max(1, mEsc)) avisar('el área de V', {p, q, area, exacta, figs:figs.map(f=>f.tipo)});
      figs.forEach(f=>{ f.nombre = 'A_{' + (++nA) + '}'; f.signo = (f.val >= 0 ? 1 : -1); figsV.push(f); });

      const Mq = polyVal(su.cM, q);
      if(Math.abs(cur.M.v + area - Mq) > 1e-6*Math.max(1, mEsc)) avisar('el cambio de M', {p, q, area, Mp:cur.M.v, Mq});
      // Nombre de M al final de la pieza: su nudo, su extremo (V = 0) o su abscisa.
      let texMq, nota = '';
      if(Math.abs(q - su.sb) < tolX) texMq = texFin('M');
      else if(esCero(q)){
        const vAntes = polyVal(su.cV, q - 1e-4*len), vDesp = polyVal(su.cV, q + 1e-4*len);
        const ext = (vAntes > 0 && vDesp < 0) ? '\\text{máx}' : ((vAntes < 0 && vDesp > 0) ? '\\text{mín}' : null);
        texMq = ext ? 'M_{' + ext + '}' : etq('M', xq, '');
        nota = ext ? ' \\quad (' + sb + ' = ' + dec(xq,'len') + ')' : '';
        ceros.push({x:xq, M:Mq, ext});
        puntos.push({x:xq, v:Object.fromEntries(MAGS.map(m=>[m, [m === 'V' ? 0 : polyVal(su['c' + m], q)]])), cero:true, ext});
      } else texMq = etq('M', xq, '');

      figs.forEach(f=>{
        if(f.tipo === 'seg')
          filas.push('f &= \\tfrac{1}{8}(' + dec(f.wq,'fuerza') + ' - ' + (f.wp < 0 ? '(' + dec(f.wp,'fuerza') + ')' : dec(f.wp,'fuerza'))
            + ')(' + dec(lp,'len') + ') = ' + dec(f.h,'fuerza'));
        filas.push(f.nombre + ' &= ' + _arFormula(f) + ' = ' + conU(dec(f.val,'momento'), uM));
      });
      const rot = (Math.abs(q - su.sb) < tolX) && (() => { const n = nudoEn(b); return n && n.rotula; })();
      if(figs.length)
        filas.push(texMq + ' &= ' + cur.M.tex + figs.map(f=>' + ' + f.nombre).join('') + ' = ' + dec(cur.M.v,'momento')
          + figs.map(f=>(f.val < 0 ? ' - ' : ' + ') + dec(Math.abs(f.val),'momento')).join('') + ' = '
          + conU(dec(Mq,'momento'), uM) + (rot && Math.abs(Mq) < 1e-6*Math.max(1, mEsc) ? '\\ \\checkmark' : '') + nota);
      else
        filas.push(texMq + ' &= ' + cur.M.tex + ' = ' + conU(dec(Mq,'momento'), uM) + nota);
      cur.M = {v:Mq, tex:texMq};
    }
    // Sin carga, V no cambia: conserva su nombre.
    if(!fW.length) cur.V = {v:fin.V, tex:cur.V.tex};
    if(hayN && Math.abs(cur.N.v - fin.N) < tol.N) cur.N = {v:fin.N, tex:cur.N.tex};
    bloques.push({tipo:'intervalo', xa:a, xb:b, filas});

    // ── Paso por el punto final del intervalo ──
    const sig = subsG[i + 1];
    const sal = saltos[i];
    if(sig){
      meterAcc(b, sal.acc);
      const desp = {}; MAGS.forEach(m=>{ desp[m] = val(sig, m, sig.su.sa); });
      const hay = MAGS.some(m=>sal.s[m]) || sal.acc.length;
      MAGS.forEach(m=>{
        const suma = sal.acc.reduce((p, e)=>p + e[m], 0);
        if(Math.abs(fin[m] + suma - desp[m]) > 1e-6*Math.max(1, Math.abs(desp[m]), Math.abs(fin[m]))) avisar('el salto de ' + m, {x:b, antes:fin[m], suma, despues:desp[m]});
      });
      if(hay){
        const filasP = [];
        MAGS.forEach(m=>{
          if(!sal.s[m]) return;
          filasP.push(filaSalto(m, etq(m, b, '+'), fin[m], sal.acc, desp[m], false));
          cur[m] = {v:desp[m], tex:etq(m, b, '+')};
        });
        if(filasP.length) bloques.push({tipo:'punto', x:b, filas:filasP});
      }
      puntos.push({x:b, v:Object.fromEntries(MAGS.map(m=>[m, sal.s[m] ? [fin[m], desp[m]] : [fin[m]]]))});
    } else {
      // Final del grupo. En el extremo de la cadena (sin rama que la continúe)
      // todo debe quedar en cero: es la comprobación del método.
      const ch = cadenaDe(R, g.t);
      const finCadena = (g.t.idx === undefined || g.t.idx === ch.length - 1) && !ch.union;
      const despF = {};
      MAGS.forEach(m=>{ despF[m] = fin[m] + sal.acc.reduce((p, e)=>p + e[m], 0); });
      if(finCadena){
        meterAcc(b, sal.acc);
        const filasP = [];
        MAGS.forEach(m=>{
          const ok = Math.abs(despF[m]) < 1e-6*Math.max(1, m === 'M' ? mEsc : (m === 'N' ? nEsc : vEsc));
          if(!ok) avisar('el cierre en el extremo (' + m + ')', {x:b, valor:despF[m]});
          if(sal.s[m]) filasP.push(filaSalto(m, etq(m, b, '+'), fin[m], sal.acc, despF[m], false) + (ok ? '\\ \\checkmark' : ''));
          else filasP.push(etq(m, b, '') + ' &= ' + conU(dec(fin[m], DT[m]), UN[m]) + (ok ? '\\ \\checkmark' : ''));
        });
        bloques.push({tipo:'punto', x:b, filas:filasP, cierre:true});
      }
      puntos.push({x:b, v:Object.fromEntries(MAGS.map(m=>[m, (finCadena && sal.s[m]) ? [fin[m], despF[m]] : [fin[m]]]))});
    }
  });

  puntos.sort((p, q)=>p.x - q.x);
  return {gg, L, sb, hayN, MAGS, bloques, puntos, figsV, figsW, ceros, figAcc,
          nudos:nudos.map(p=>({x:p.x, nom:p.n.nombre, rotula:!!p.n.rotula})),
          ramasV: muestrearSerie(R, 'V', gg.tramos, gg.s0)};
}

// Lo que llega al arranque de un grupo cuyo tramo anterior no se eligió (20-):
// N, V y M justo después de su nudo, como dato. Lo usan los dos métodos del PDF.
function bloqueArranque(R, gg){
  if(gg.primero || gg.anterior) return '';
  const t0 = gg.tramos[0], su = t0.subs[0];
  const ch = cadenaDe(R, t0), prev = (t0.idx > 0) ? ch[t0.idx - 1] : null;
  const uF = escLatex(unitFor), uM = escLatex(unidadMomento());
  const N0 = polyVal(su.cN, su.sa), V0 = polyVal(su.cV, su.sa), M0 = polyVal(su.cM, su.sa);
  const hayN = gg.tramos.some(t=>t.subs.some(s=>s.cN.some(v=>Math.abs(v) > 5e-9)));
  return '\\noindent En $' + escLatex(gg.desde.nombre) + '$' + (prev ? ', desde $' + escLatex(prev.nombre) + '$' : '') + ':\n'
    + '\\[' + (hayN ? 'N_0 = ' + dec(N0,'fuerza') + '\\ \\text{' + uF + '},\\qquad ' : '')
    + 'V_0 = ' + dec(V0,'fuerza') + '\\ \\text{' + uF + '},\\qquad M_0 = ' + dec(M0,'momento') + '\\ \\text{' + uM + '}\\]\n';
}

// ── Figura: diagrama de carga y de V con sus áreas (pantalla, SVG) ──
function _arCentroide(poly){
  let A = 0, cx = 0, cy = 0;
  for(let i=0;i<poly.length;i++){
    const [x1, y1] = poly[i], [x2, y2] = poly[(i+1) % poly.length];
    const c = x1*y2 - x2*y1;
    A += c; cx += (x1 + x2)*c; cy += (y1 + y2)*c;
  }
  if(Math.abs(A) < 1e-12){
    const n = poly.length || 1;
    return {x:poly.reduce((s, p)=>s + p[0], 0)/n, y:poly.reduce((s, p)=>s + p[1], 0)/n};
  }
  return {x:cx/(3*A), y:cy/(3*A)};
}
// Las acciones concentradas de la figura: flechas (fuerzas, en los ejes del
// tramo: dx a lo largo, dy hacia +n̂) y arcos (pares), con su nombre, su color y
// la lista de valores para la leyenda. Las cargas, las reacciones y lo que
// transmite una rama, en su sentido real y con su módulo; lo que llega del tramo
// anterior (N₀, V₀, M₀), en su sentido positivo y con su signo, como en los DCL.
function _arConcentradas(m){
  const EPS = 1e-9;
  const uF = escLatex(unitFor), uM = escLatex(unidadMomento());
  const COL = {carga:['#c62828','bsaCarga'], par:['#8b5cf6','bsaMomento'], reac:['#1a7f37','bsaReac'],
               rama:[COL_RAMA,'orange!80!black'], llega:['#0b57d0','bsaAcc']};
  const flechas = [], arcos = [], valores = [];
  const val = (nom, v, u) => { if(!valores.some(q=>q.nom === nom)) valores.push({nom, val:v + '\\,\\text{' + u + '}'}); };
  m.figAcc.forEach(e=>{
    if(e.tipo === 'llega'){
      if(m.hayN && Math.abs(e.N0) > EPS){ flechas.push({x:e.x, dx:-1, dy:0, sale:true, nom:'N_0', col:COL.llega}); val('N_0', dec(e.N0,'fuerza'), uF); }
      if(Math.abs(e.V0) > EPS){ flechas.push({x:e.x, dx:0, dy:1, nom:'V_0', col:COL.llega}); val('V_0', dec(e.V0,'fuerza'), uF); }
      if(Math.abs(e.M0) > EPS){ arcos.push({x:e.x, ccw:false, nom:'M_0', col:COL.llega}); val('M_0', dec(e.M0,'momento'), uM); }
      return;
    }
    const F = Math.hypot(e.Fpar, e.Fper);
    if(F > EPS){
      flechas.push({x:e.x, dx:e.Fpar/F, dy:e.Fper/F, nom:e.nF, col:COL[e.tipo]});
      val(e.nF, dec(F,'fuerza'), uF);
    }
    if(Math.abs(e.m) > EPS){
      arcos.push({x:e.x, ccw:e.m > 0, nom:e.nM, col:(e.tipo === 'carga' ? COL.par : COL[e.tipo])});
      val(e.nM, dec(Math.abs(e.m),'momento'), uM);
    }
  });
  return {flechas, arcos, valores};
}
// Un nombre de LaTeX sencillo (P_{1}, R_{yA}, V_0) en texto de SVG, con su subíndice.
function _arTexSVG(tex, tam){
  const mm = String(tex).match(/^([A-Za-z]+)(?:_(?:\{(.*)\}|(.)))?$/);
  if(!mm) return escaparHTML(tex);
  const sub = (mm[2] || mm[3] || '').replace(/\\text\{([^}]*)\}/g, '$1').replace(/\\perp/g, '⊥')
    .replace(/\\parallel/g, '∥').replace(/[\\{}]/g, '');
  return escaparHTML(mm[1]) + (sub ? '<tspan font-size="' + (tam*0.72).toFixed(1) + '" dy="3">' + escaparHTML(sub) + '</tspan>' : '');
}

function _arSVG(m){
  const W = 640, ML = 40, MR = 18, Wp = W - ML - MR;
  const X = x => ML + x/m.L*Wp;
  const f = v => v.toFixed(1);
  const cajas = [];
  const choca = c => cajas.some(o=>c.x0 < o.x1 && c.x1 > o.x0 && c.y0 < o.y1 && c.y1 > o.y0);
  // Rótulo «A₁» en el centroide de su figura; si la figura es chica, afuera, con guía.
  const rotulo = (nom, cx, cy, poly, Y, haciaArriba, col) => {
    const m2 = nom.match(/^A_\{(.+)\}$/), sub = m2 ? m2[1].replace(/\\perp/g,'⊥').replace(/\\parallel/g,'∥') : '';
    const w = 9 + 6*sub.length, h = 13;
    let xs = poly.map(p=>X(p[0])), ys = poly.map(p=>Y(p[1]));
    const bw = Math.max(...xs) - Math.min(...xs), bh = Math.max(...ys) - Math.min(...ys);
    let tx = X(cx), ty = Y(cy), guia = false;
    if(bw < w + 6 || bh < h + 2){
      guia = true;
      ty = haciaArriba ? Math.min(...ys) - 12 : Math.max(...ys) + 14;
    }
    let c = {x0:tx - w/2, x1:tx + w/2, y0:ty - h/2, y1:ty + h/2};
    for(let k=0;k<8 && choca(c);k++){
      guia = true;
      ty += haciaArriba ? -14 : 14;
      c = {x0:tx - w/2, x1:tx + w/2, y0:ty - h/2, y1:ty + h/2};
    }
    cajas.push(c);
    let s = '';
    if(guia) s += '<line x1="' + f(X(cx)) + '" y1="' + f(Y(cy)) + '" x2="' + f(tx) + '" y2="' + f(haciaArriba ? c.y1 : c.y0) + '" stroke="#8a96a3" stroke-width=".7"/>';
    s += '<text x="' + f(tx) + '" y="' + f(ty + 4) + '" font-family="Inter,sans-serif" font-size="11.5" font-weight="800" fill="' + col
      + '" text-anchor="middle" font-style="italic">A<tspan font-size="8.5" dy="3">' + sub + '</tspan></text>';
    return s;
  };
  let s = '', y = 22;
  const capas = [];
  const conc = _arConcentradas(m);
  // Un texto donde no pise a otro: se aparta en la dirección `dy` (±1).
  const ponerTexto = (html, x, y1, w, dy, col) => {
    let c = {x0:x - w/2, x1:x + w/2, y0:y1 - 7, y1:y1 + 7};
    for(let k=0;k<10 && choca(c);k++){ y1 += 13*dy; c = {x0:x - w/2, x1:x + w/2, y0:y1 - 7, y1:y1 + 7}; }
    cajas.push(c);
    return '<text x="' + f(x) + '" y="' + f(y1 + 4) + '" font-family="Inter,sans-serif" font-size="12" font-weight="800" fill="' + col
      + '" text-anchor="middle" font-style="italic">' + html + '</text>';
  };
  const anchoNom = tex => { const mm = String(tex).match(/^([A-Za-z]+)(?:_(?:\{(.*)\}|(.)))?$/); return mm ? 9*mm[1].length + 6*((mm[2]||mm[3]||'').replace(/\\[a-z]+|[{}]/g,'x').length) + 4 : 30; };
  // Banda de la carga: las repartidas (w positiva hacia abajo, dibujada sobre la
  // línea) y las acciones concentradas (2026-10-18), cada una con su nombre.
  if(m.figsW.length || conc.flechas.length || conc.arcos.length){
    let wp = 0, wn = 0;
    m.figsW.forEach(g=>g.poly.forEach(p=>{ wp = Math.max(wp, p[1]); wn = Math.max(wn, -p[1]); }));
    const AL = 36;
    const arriba = fl => fl.sale ? fl.dy > 0.2 : fl.dy < -0.2;     // ¿la flecha queda sobre la línea?
    const abajo = fl => fl.sale ? fl.dy < -0.2 : fl.dy > 0.2;
    const Hb = 56, k = (wp + wn) > 1e-12 ? Hb/(wp + wn) : 0;
    const sobre = Math.max(wp*k, conc.flechas.some(arriba) ? AL + 18 : 0, conc.arcos.length ? 36 : 0, 14);
    const bajo = Math.max(wn*k, conc.flechas.some(abajo) ? AL + 18 : 0, 8);
    const y0 = y + sobre;
    const Y = v => y0 - v*k;
    m.figsW.forEach(g=>{
      s += '<polygon points="' + g.poly.map(p=>f(X(p[0])) + ',' + f(Y(p[1]))).join(' ') + '" fill="#e0a83c" fill-opacity=".28" stroke="#b8860b" stroke-width=".9" stroke-dasharray="3 2"/>';
    });
    s += '<line x1="' + f(X(0)) + '" y1="' + f(y0) + '" x2="' + f(X(m.L)) + '" y2="' + f(y0) + '" stroke="#26415e" stroke-width="2.2"/>';
    if(m.figsW.length)
      s += '<text x="' + (ML - 8) + '" y="' + f(y0 - Math.max(wp*k, 20)*0.45) + '" font-family="Inter,sans-serif" font-size="12" font-weight="800" fill="#8a6508" text-anchor="end" font-style="italic">w</text>';
    // Rótulas: el nudo hueco sobre la línea.
    m.nudos.forEach(nd=>{
      if(nd.rotula) s += '<circle cx="' + f(X(nd.x)) + '" cy="' + f(y0) + '" r="4.6" fill="#fff" stroke="#26415e" stroke-width="1.8"/>';
    });
    // Fuerzas: llegan al punto (o salen, N₀), con el nombre más allá de la cola.
    conc.flechas.forEach(fl=>{
      const ex = fl.dx, ey = -fl.dy;                       // dirección en pantalla
      const px = X(fl.x), py = y0;
      const ini = fl.sale ? {x:px + ex*3, y:py + ey*3} : {x:px - ex*AL, y:py - ey*AL};
      const fin = fl.sale ? {x:px + ex*AL, y:py + ey*AL} : {x:px - ex*3, y:py - ey*3};
      const hx = fin.x - ex*8, hy = fin.y - ey*8, nx2 = -ey, ny2 = ex;
      s += '<line x1="' + f(ini.x) + '" y1="' + f(ini.y) + '" x2="' + f(hx) + '" y2="' + f(hy) + '" stroke="' + fl.col[0] + '" stroke-width="2.2" stroke-linecap="round"/>'
        + '<path d="M ' + f(fin.x) + ' ' + f(fin.y) + ' L ' + f(hx + nx2*4) + ' ' + f(hy + ny2*4) + ' L ' + f(hx - nx2*4) + ' ' + f(hy - ny2*4) + ' Z" fill="' + fl.col[0] + '"/>';
      const lejos = fl.sale ? fin : ini;                    // el extremo libre de la flecha
      const ux2 = fl.sale ? ex : -ex, uy2 = fl.sale ? ey : -ey;
      const w = anchoNom(fl.nom);
      capas.push(ponerTexto(_arTexSVG(fl.nom, 12), lejos.x + ux2*(w/2 + 4), lejos.y + uy2*12, w, uy2 >= 0 ? 1 : -1, fl.col[0]));
    });
    // Pares: un arco alrededor del punto, en su sentido, con el nombre arriba.
    conc.arcos.forEach(ar=>{
      const cx = X(ar.x), cy = y0, r = 14, a0 = -40*Math.PI/180, a1 = 220*Math.PI/180;
      const P = t => ({x:cx + r*Math.cos(t), y:cy - r*Math.sin(t)});
      const de = ar.ccw ? P(a0) : P(a1), a = ar.ccw ? P(a1) : P(a0);
      const tf = ar.ccw ? a1 : a0;
      const tx = ar.ccw ? -Math.sin(tf) : Math.sin(tf), ty = ar.ccw ? -Math.cos(tf) : Math.cos(tf);
      s += '<path d="M ' + f(de.x) + ' ' + f(de.y) + ' A ' + r + ' ' + r + ' 0 1 ' + (ar.ccw ? 0 : 1) + ' ' + f(a.x) + ' ' + f(a.y)
        + '" fill="none" stroke="' + ar.col[0] + '" stroke-width="2"/>'
        + '<path d="M ' + f(a.x + tx*6) + ' ' + f(a.y + ty*6) + ' L ' + f(a.x - tx*2 - ty*4) + ' ' + f(a.y - ty*2 + tx*4)
        + ' L ' + f(a.x - tx*2 + ty*4) + ' ' + f(a.y - ty*2 - tx*4) + ' Z" fill="' + ar.col[0] + '"/>';
      cajas.push({x0:cx - r - 2, x1:cx + r + 2, y0:cy - r - 2, y1:cy + r + 2});
      const w = anchoNom(ar.nom);
      capas.push(ponerTexto(_arTexSVG(ar.nom, 12), cx + r + w/2 + 2, cy - r - 6, w, -1, ar.col[0]));
    });
    // Un rótulo por carga (el trapecio son dos figuras con un solo nombre).
    const vistos = {};
    m.figsW.forEach(g=>{
      const hermanas = m.figsW.filter(o=>o.nombre === g.nombre);
      if(vistos[g.nombre]) return;
      vistos[g.nombre] = true;
      const poly = [].concat(...hermanas.map(o=>o.poly));
      const area = hermanas.reduce((p, o)=>p + Math.abs(o.val), 0) || 1;
      const cx = hermanas.reduce((p, o)=>p + _arCentroide(o.poly).x*Math.abs(o.val), 0)/area;
      const cy = hermanas.reduce((p, o)=>p + _arCentroide(o.poly).y*Math.abs(o.val), 0)/area;
      capas.push(rotulo(g.nombre, cx, cy, poly, Y, g.val >= 0, '#8a6508'));
    });
    y = y0 + bajo + 26;
  }
  // Banda de V.
  let vp = 0, vn = 0;
  m.ramasV.forEach(r=>{
    if(r.salto){ vp = Math.max(vp, r.de, r.a); vn = Math.max(vn, -r.de, -r.a); }
    else r.pts.forEach(p=>{ vp = Math.max(vp, p.v); vn = Math.max(vn, -p.v); });
  });
  const Hv = 150, kv = Hv/Math.max(1e-9, vp + vn), yv0 = y + vp*kv;
  const Yv = v => yv0 - v*kv;
  const yTop = 10, yBot = yv0 + vn*kv;
  // Las guías de los nudos van debajo de todo: si no, cruzaban las flechas.
  let guias = '';
  m.nudos.forEach(nd=>{
    guias += '<line x1="' + f(X(nd.x)) + '" y1="' + yTop + '" x2="' + f(X(nd.x)) + '" y2="' + f(yBot + 6) + '" stroke="#c9d1db" stroke-width=".8" stroke-dasharray="4 3"/>';
  });
  s = guias + s;
  m.figsV.forEach(g=>{
    const col = g.val >= 0 ? '#2563eb' : '#d94f5c';
    s += '<polygon points="' + g.poly.map(p=>f(X(p[0])) + ',' + f(Yv(p[1]))).join(' ') + '" fill="' + col + '" fill-opacity="'
      + (g.tipo === 'seg' ? '.30' : '.15') + '" stroke="#26415e" stroke-width=".8" stroke-dasharray="3 2"/>';
  });
  // Contorno de V con sus saltos.
  let d = '';
  m.ramasV.forEach(r=>{
    if(r.salto) d += ' L ' + f(X(r.x)) + ' ' + f(Yv(r.a));
    else r.pts.forEach((p, i)=>{ d += (d ? ' L ' : 'M ') + f(X(p.x)) + ' ' + f(Yv(p.v)); });
  });
  s += '<path d="' + d + '" fill="none" stroke="#1b1f24" stroke-width="1.6"/>';
  s += '<line x1="' + f(X(0)) + '" y1="' + f(yv0) + '" x2="' + f(X(m.L)) + '" y2="' + f(yv0) + '" stroke="#26415e" stroke-width="1.2"/>';
  s += '<text x="' + (ML - 8) + '" y="' + f(yv0 - 4) + '" font-family="Inter,sans-serif" font-size="12" font-weight="800" fill="#26415e" text-anchor="end" font-style="italic">V</text>';
  m.figsV.forEach(g=>{
    const c = _arCentroide(g.poly);
    capas.push(rotulo(g.nombre, c.x, c.y, g.poly, Yv, g.val >= 0, g.val >= 0 ? '#1e3a8a' : '#9b2c2c'));
  });
  // Donde V = 0: la marca y su abscisa.
  m.ceros.forEach(z=>{
    s += '<circle cx="' + f(X(z.x)) + '" cy="' + f(yv0) + '" r="3" fill="#1b1f24"/>';
    const c = {x0:X(z.x) - 30, x1:X(z.x) + 30, y0:yBot + 8, y1:yBot + 20};
    cajas.push(c);
    capas.push('<text x="' + f(X(z.x)) + '" y="' + f(yBot + 18) + '" font-family="Inter,sans-serif" font-size="10" fill="#1b1f24" text-anchor="middle"><tspan font-style="italic">' + m.sb + '</tspan> = ' + dec(z.x,'len') + '</text>');
  });
  m.nudos.forEach(nd=>{
    capas.push('<text x="' + f(X(nd.x)) + '" y="' + f(yBot + (m.ceros.length ? 34 : 20)) + '" font-family="Inter,sans-serif" font-size="12.5" font-weight="800" fill="#26415e" text-anchor="middle">' + escaparHTML(nd.nom) + '</text>');
  });
  const H = yBot + (m.ceros.length ? 44 : 30);
  const yMin = Math.min(0, ...cajas.map(c=>c.y0 - 4));
  const yMax = Math.max(H, ...cajas.map(c=>c.y1 + 4));
  return '<svg viewBox="0 ' + f(yMin) + ' ' + W + ' ' + f(yMax - yMin) + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Áreas de carga y de V">'
    + '<rect x="0" y="' + f(yMin) + '" width="' + W + '" height="' + f(yMax - yMin) + '" fill="#fff"/>' + s + capas.join('') + '</svg>';
}

// ── Pantalla ──
function _arTitHtml(m, b){
  const nd = x => { const p = m.nudos.find(q=>Math.abs(q.x - x) < 1e-6*Math.max(1, m.L)); return p ? p.nom : null; };
  if(b.tipo === 'punto'){
    const n = nd(b.x);
    return 'En ' + (n ? escaparHTML(n) : kx(m.sb + ' = ' + dec(b.x,'len')) + ' ' + unitLen);
  }
  const na = nd(b.xa), nb = nd(b.xb);
  return (na && nb ? 'De ' + escaparHTML(na) + ' a ' + escaparHTML(nb) + ' · ' : '')
    + kx(dec(b.xa,'len') + ' \\le ' + m.sb + ' \\le ' + dec(b.xb,'len')) + ' ' + unitLen;
}
function _arTablaFilas(m, celda){
  return m.puntos.map(p=>{
    const nd = m.nudos.find(q=>Math.abs(q.x - p.x) < 1e-6*Math.max(1, m.L));
    return {nom: nd ? nd.nom : (p.cero ? (p.ext ? 'M ' + p.ext.replace(/\\text\{(.+)\}/, '$1') : 'V = 0') : ''),
            x:dec(p.x,'len'), cel:m.MAGS.map(mg=>celda(p.v[mg], mg === 'M' ? 'momento' : 'fuerza'))};
  });
}
function renderMetodoAreas(r){
  let h = '<div class="hint-sm" style="margin-bottom:8px">El área de la carga da el cambio de V y el área de V, el de M. '
    + 'Rectángulo ' + kx('b\\,h') + ', triángulo ' + kx('\\tfrac12 b\\,h') + ', semiparábola ' + kx('\\tfrac23 b\\,h')
    + ', enjuta ' + kx('\\tfrac13 b\\,h') + ', segmento parabólico ' + kx('\\tfrac23 b\\,f') + '.</div>';
  const uF = escLatex(unitFor), uM = escLatex(unidadMomento());
  gruposSolucion(r).forEach(gg=>{
    const m = areasDeGrupo(r, gg);
    h += '<div class="sub-tramo-cab">Tramo ' + gg.recorrido + ' — '
      + (gg.oblicuo ? 'inclinado ' + dec(gg.ang,'ang') + '°' : (gg.vertical ? 'vertical' : 'horizontal'))
      + ' · L = ' + dec(gg.L,'len') + ' ' + unitLen + ' · <i>' + gg.simbolo + '</i> desde ' + gg.desde.nombre + '</div>';
    if(!gg.primero){
      const su = gg.tramos[0].subs[0];
      const ch = cadenaDe(r, gg.tramos[0]), prev = gg.tramos[0].idx > 0 ? ch[gg.tramos[0].idx - 1] : null;
      h += '<div class="ar-bloque"><div class="ar-tit">En ' + gg.desde.nombre + (prev ? ', desde ' + prev.nombre : '') + '</div>'
        + '<div class="eq-row"><div class="eq-body">' + kx((m.hayN ? 'N_0 = ' + dec(polyVal(su.cN, su.sa),'fuerza') + '\\ \\text{' + uF + '},\\quad ' : '')
          + 'V_0 = ' + dec(polyVal(su.cV, su.sa),'fuerza') + '\\ \\text{' + uF + '},\\quad M_0 = '
          + dec(polyVal(su.cM, su.sa),'momento') + '\\ \\text{' + uM + '}') + '</div></div></div>';
    }
    const vals = _arConcentradas(m).valores;
    h += '<div class="ar-fig">' + _arSVG(m)
      + (vals.length ? '<div class="ar-valores">' + vals.map(v=>kx(v.nom + ' = ' + v.val)).join(' &nbsp;·&nbsp; ') + '</div>' : '')
      + '</div>';
    m.bloques.forEach(b=>{
      h += '<div class="ar-bloque"><div class="ar-tit">' + _arTitHtml(m, b) + '</div>'
        + b.filas.map(f=>'<div class="eq-row"><div class="eq-body">' + kx(f.replace(/&/g, '')) + '</div></div>').join('') + '</div>';
    });
    const celda = (vv, dt) => vv.length > 1 ? dec(vv[0], dt) + ' → ' + dec(vv[1], dt) : dec(vv[0], dt);
    h += '<table class="tabla"><thead><tr><th>Punto</th><th class="r">' + gg.simbolo + ' [' + unitLen + ']</th>'
      + m.MAGS.map(mg=>'<th class="r">' + mg + ' [' + (mg === 'M' ? uMom() : unitFor) + ']</th>').join('') + '</tr></thead><tbody>'
      + _arTablaFilas(m, celda).map(fl=>'<tr><td><b>' + escaparHTML(fl.nom) + '</b></td><td class="r">' + fl.x + '</td>'
          + fl.cel.map(c=>'<td class="r">' + c + '</td>').join('') + '</tr>').join('')
      + '</tbody></table>';
  });
  return h;
}

// ── PDF ──
function _arTikz(m){
  // Hasta 12 cm: al costado va la caja «Valores» de las acciones concentradas.
  const W = Math.min(12.0, Math.max(9.5, m.L*1.2));
  const X = x => x/m.L*W;
  const F = v => v.toFixed(3);
  let out = '';
  tzReiniciar();
  const poly = (pts, Y) => pts.map(p=>'(' + F(X(p[0])) + ',' + F(Y(p[1])) + ')').join(' -- ') + ' -- cycle';
  const etiq = nom => '$' + nom + '$';
  const rot = [];
  const conc = _arConcentradas(m);
  let yTop = 0;
  let yBase = 0;
  if(m.figsW.length || conc.flechas.length || conc.arcos.length){
    let wp = 0, wn = 0;
    m.figsW.forEach(g=>g.poly.forEach(p=>{ wp = Math.max(wp, p[1]); wn = Math.max(wn, -p[1]); }));
    const AL = 0.8;
    const arriba = fl => fl.sale ? fl.dy > 0.2 : fl.dy < -0.2;
    const abajo = fl => fl.sale ? fl.dy < -0.2 : fl.dy > 0.2;
    const Hb = 1.2, k = (wp + wn) > 1e-12 ? Hb/(wp + wn) : 0, y0 = 0;
    const sobre = Math.max(wp*k, conc.flechas.some(arriba) ? AL + 0.55 : 0, conc.arcos.length ? 0.75 : 0, 0.3);
    const bajo = Math.max(wn*k, conc.flechas.some(abajo) ? AL + 0.55 : 0, 0.15);
    const Y = v => y0 + v*k;
    m.figsW.forEach(g=>{ out += '\\fill[bsaDist!30] ' + poly(g.poly, Y) + ';\n'
                              + '\\draw[bsaDist!80!black, dashed, line width=.3pt] ' + poly(g.poly, Y) + ';\n'; });
    out += '\\draw[bsaAcc2, line width=1.4pt] (0,' + F(y0) + ') -- (' + F(W) + ',' + F(y0) + ');\n';
    if(m.figsW.length)
      out += '\\node[anchor=east, font=\\scriptsize\\bfseries, color=bsaDist!70!black] at (-0.12,' + F(y0 + Math.max(wp*k, 0.4)*0.5) + ') {$w$};\n';
    tzOcuparTrazo(0, y0, W, y0, 0.05);
    // Rótulas, acciones concentradas y pares (2026-10-18): con el nombre del desarrollo.
    m.nudos.forEach(nd=>{
      if(nd.rotula) out += '\\filldraw[fill=white, draw=bsaAcc2, line width=.7pt] (' + F(X(nd.x)) + ',' + F(y0) + ') circle (0.075);\n';
    });
    conc.flechas.forEach(fl=>{
      const ex = fl.dx, ey = fl.dy, px = X(fl.x);
      const ini = fl.sale ? {x:px + ex*0.06, y:y0 + ey*0.06} : {x:px - ex*AL, y:y0 - ey*AL};
      const fin = fl.sale ? {x:px + ex*AL, y:y0 + ey*AL} : {x:px - ex*0.06, y:y0 - ey*0.06};
      out += '\\draw[-{Stealth[length=2mm,width=1.5mm]}, line width=.9pt, color=' + fl.col[1] + '] ('
        + F(ini.x) + ',' + F(ini.y) + ') -- (' + F(fin.x) + ',' + F(fin.y) + ');\n';
      tzOcuparTrazo(ini.x, ini.y, fin.x, fin.y, 0.07);
      const lejos = fl.sale ? fin : ini, ux2 = fl.sale ? ex : -ex, uy2 = fl.sale ? ey : -ey;
      // Fuera de la reserva de su propia flecha, que si no lo empujaba lejos.
      rot.push({x:lejos.x + ux2*0.42, y:lejos.y + uy2*0.36, txt:etiq(fl.nom), col:fl.col[1], dx:ux2, dy:uy2});
    });
    conc.arcos.forEach(ar=>{
      const px = X(ar.x), a0 = ar.ccw ? -40 : 220, a1 = ar.ccw ? 220 : -40;
      out += '\\draw[-{Stealth[length=1.7mm,width=1.4mm]}, line width=.75pt, color=' + ar.col[1] + '] ([shift={(' + a0 + ':0.3)}]'
        + F(px) + ',' + F(y0) + ') arc[start angle=' + a0 + ', end angle=' + a1 + ', radius=0.3];\n';
      tzOcupar(px - 0.34, y0 - 0.34, px + 0.34, y0 + 0.34);
      rot.push({x:px + 0.55, y:y0 + 0.52, txt:etiq(ar.nom), col:ar.col[1], dx:1, dy:1});
    });
    const vistos = {};
    m.figsW.forEach(g=>{
      if(vistos[g.nombre]) return;
      vistos[g.nombre] = true;
      const her = m.figsW.filter(o=>o.nombre === g.nombre);
      const area = her.reduce((p, o)=>p + Math.abs(o.val), 0) || 1;
      const cx = her.reduce((p, o)=>p + _arCentroide(o.poly).x*Math.abs(o.val), 0)/area;
      const cy = her.reduce((p, o)=>p + _arCentroide(o.poly).y*Math.abs(o.val), 0)/area;
      rot.push({x:X(cx), y:Y(cy), txt:etiq(g.nombre), col:'bsaDist!70!black', dy: g.val >= 0 ? 1 : -1});
    });
    yBase = -bajo - 0.6;
    yTop = sobre;
  }
  let vp = 0, vn = 0;
  m.ramasV.forEach(r=>{
    if(r.salto){ vp = Math.max(vp, r.de, r.a); vn = Math.max(vn, -r.de, -r.a); }
    else r.pts.forEach(p=>{ vp = Math.max(vp, p.v); vn = Math.max(vn, -p.v); });
  });
  const Hv = 3.0, kv = Hv/Math.max(1e-9, vp + vn), yv0 = yBase - vp*kv;
  const Yv = v => yv0 + v*kv;
  const yBot = yv0 - vn*kv;
  // Las guías de los nudos, debajo de todo lo dibujado.
  out = m.nudos.map(nd=>'\\draw[black!22, dashed, line width=.35pt] (' + F(X(nd.x)) + ',' + F(yTop + 0.15) + ') -- ('
    + F(X(nd.x)) + ',' + F(yBot - 0.12) + ');\n').join('') + out;
  m.figsV.forEach(g=>{
    const col = g.val >= 0 ? 'bsaAcc' : 'bsaCarga';
    out += '\\fill[' + col + '!' + (g.tipo === 'seg' ? '30' : '15') + '] ' + poly(g.poly, Yv) + ';\n'
         + '\\draw[black!45, dashed, line width=.3pt] ' + poly(g.poly, Yv) + ';\n';
  });
  let tr = '';
  m.ramasV.forEach(r=>{
    if(r.salto) tr += ' -- (' + F(X(r.x)) + ',' + F(Yv(r.a)) + ')';
    else r.pts.forEach(p=>{ tr += (tr ? ' -- ' : '') + '(' + F(X(p.x)) + ',' + F(Yv(p.v)) + ')'; });
  });
  out += '\\draw[black!80, line width=.9pt] ' + tr + ';\n';
  out += '\\draw[black!60, line width=.6pt] (0,' + F(yv0) + ') -- (' + F(W) + ',' + F(yv0) + ');\n';
  out += '\\node[anchor=east, font=\\scriptsize\\bfseries] at (-0.12,' + F(yv0) + ') {$V$};\n';
  tzOcuparTrazo(0, yv0, W, yv0, 0.04);
  m.figsV.forEach(g=>{
    const c = _arCentroide(g.poly);
    // Una figura donde no cabe su nombre se reserva: el rótulo sale afuera, con guía.
    const xs = g.poly.map(p=>X(p[0])), ys = g.poly.map(p=>Yv(p[1]));
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    if(x1 - x0 < 0.55 || y1 - y0 < 0.32) tzOcupar(x0, y0, x1, y1);
    rot.push({x:X(c.x), y:Yv(c.y), txt:etiq(g.nombre), col: g.val >= 0 ? 'bsaAcc2' : 'bsaCarga!80!black', dy: g.val >= 0 ? 1 : -1});
  });
  // Nombres de los nudos y abscisa de cada V = 0, debajo.
  m.nudos.forEach(nd=>{
    out += '\\node[font=\\scriptsize\\bfseries, color=bsaAcc2] at (' + F(X(nd.x)) + ',' + F(yBot - 0.32) + ') {' + escLatex(nd.nom) + '};\n';
    tzOcupar(X(nd.x) - 0.16, yBot - 0.45, X(nd.x) + 0.16, yBot - 0.2);
  });
  m.ceros.forEach(z=>{
    out += '\\fill (' + F(X(z.x)) + ',' + F(yv0) + ') circle (0.045);\n';
    out += tzTexto(X(z.x), yBot - 0.62, '$' + m.sb + ' = ' + dec(z.x,'len') + '$', 'font=\\tiny', 0, -1);
  });
  rot.forEach(r=>{ out += tzTexto(r.x, r.y, r.txt, 'font=\\small, color=' + r.col, r.dx || 0, r.dy); });
  // Valores de lo concentrado, en la caja de siempre de este tema (15-).
  out += leyendaFigFI(conc.valores);
  return out;
}

function areasTex(R, grupos, gg, figCaption){
  const m = areasDeGrupo(R, gg);
  const uL = escLatex(unitLen), uF = escLatex(unitFor), uM = escLatex(unidadMomento());
  let out = '';
  if(!gg.primero){
    if(gg.anterior){
      const su = gg.tramos[0].subs[0];
      out += bloqueQuiebre(R, grupos, gg, {ctes:{N0:polyVal(su.cN, su.sa), V0:polyVal(su.cV, su.sa), M0:polyVal(su.cM, su.sa)}});
    } else out += bloqueArranque(R, gg);
  }
  out += '\\begin{center}\\bsaEncajar{\\begin{tikzpicture}\n' + _arTikz(m) + '\\end{tikzpicture}}\\end{center}\n';
  out += figCaption('Áreas de la carga y de $V$, tramo ' + escLatex(gg.recorrido) + '.');
  const nd = x => { const p = m.nudos.find(q=>Math.abs(q.x - x) < 1e-6*Math.max(1, m.L)); return p ? escLatex(p.nom) : null; };
  m.bloques.forEach(b=>{
    let tit;
    if(b.tipo === 'punto'){
      const n = nd(b.x);
      tit = 'En ' + (n ? '$' + n + '$' : '$' + m.sb + ' = ' + dec(b.x,'len') + '$\\,' + uL);
    } else {
      const na = nd(b.xa), nb = nd(b.xb);
      tit = (na && nb ? 'De $' + na + '$ a $' + nb + '$\\quad ' : '')
        + '{\\normalfont\\small($' + dec(b.xa,'len') + ' \\le ' + m.sb + ' \\le ' + dec(b.xb,'len') + '$\\,' + uL + ')}';
    }
    out += '\\par\\noindent\\begin{minipage}{\\linewidth}\n{\\bfseries\\color{bsaAcc2}' + tit + '}\n'
      + '\\begin{align*}\n' + b.filas.join(' \\\\[3pt]\n') + '\n\\end{align*}\n\\end{minipage}\n';
  });
  // Valores en los puntos notables (R4: los resultados, en tabla).
  const celda = (vv, dt) => '$' + (vv.length > 1 ? dec(vv[0], dt) + ' \\rightarrow ' + dec(vv[1], dt) : dec(vv[0], dt)) + '$';
  const filas = _arTablaFilas(m, celda);
  out += '\\par\\medskip\n' + tablaCaption('Tramo ' + escLatex(gg.recorrido) + ': valores en los puntos notables.');
  out += '{\\footnotesize\\begin{center}\\begin{tabular}{lr' + 'r'.repeat(m.MAGS.length) + '}\n\\hline\n'
    + 'Punto & $' + m.sb + '$ [' + uL + '] & ' + m.MAGS.map(mg=>'$' + mg + '$ [' + (mg === 'M' ? uM : uF) + ']').join(' & ') + ' \\\\\n\\hline\n'
    + filas.map(fl=>escLatex(fl.nom) + ' & ' + fl.x + ' & ' + fl.cel.join(' & ') + ' \\\\\n').join('')
    + '\\hline\n\\end{tabular}\\end{center}}\n';
  return out;
}
