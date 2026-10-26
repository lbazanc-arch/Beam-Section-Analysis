// ═══════════════════════════════════════════════════════════
//  MARCOS — INFORME LaTeX (2026-10-25)
//  Paso 1: reacciones con el marco entero (DCL global, ΣFx, ΣFy, ΣM y, si hace
//  falta, ΣM de un lado de un pasador). Paso 2: desmembrado, cuerpo a cuerpo,
//  con su DCL: lo ya conocido con su sentido real; lo que se busca, a trazos y
//  en gris, en su sentido supuesto (el positivo de la incógnita). Paso 3: el DCL
//  final de cada miembro elegido, con todas sus fuerzas en sentido real y sus
//  valores en la caja «Valores», acotado en horizontal y en vertical. Después,
//  las fuerzas internas de esos miembros con el desarrollo de siempre.
// ═══════════════════════════════════════════════════════════

// DCL de un cuerpo en TikZ. `conocidas`: Set de índices de r.unk ya resueltos
// (null: todos). Devuelve el cuerpo de un tikzpicture.
function tikzDCLCuerpoTex(R, k, conocidas){
  const c = R.cuerpos[k];
  const sabe = j => !conocidas || conocidas.has(j);
  const ejes = c.tramos.map(t=>{ const g = geoTramo(t); return ejeTramo(g, g.arco ? 32 : 1); });
  const nds = c.nudos.map(id=>nodo(id));
  const punt = [];
  R.acc.forEach(a=>{
    const cg = a.carga;
    if(cg && (cg.tipo === 'U' || cg.tipo === 'T')) return;
    const d = R.destinoAccion(a);
    if(d && d.cuerpo === k) punt.push({x:a.x, y:a.y, fx:a.fx, fy:a.fy, m:a.m || 0, nom:nombreCargaFI(cg), col:'bsaCarga', colM:'bsaMomento', sabido:true,
      val:(Math.hypot(a.fx, a.fy) > 1e-12 ? dec(Math.hypot(a.fx, a.fy),'fuerza') + '\\,\\text{' + escLatex(unitFor) + '}'
                                           : dec(Math.abs(a.m || 0),'momento') + '\\,\\text{' + escLatex(unidadMomento()) + '}')});
  });
  R.fuerzasEnCuerpo[k].forEach(f=>{
    const j = R.unk.indexOf(f.unk), s = sabe(j), q = f.unk;
    const nom = f.pin ? f.pin.nombre : simbReaccion(f.inc);
    const esM = !f.pin && f.inc.tipo === 'M' && f.inc.ang === undefined;
    // Desconocida: su fuerza a valor unidad (el sentido positivo supuesto).
    const fx = s ? f.fx : f.ua.x, fy = s ? f.fy : f.ua.y, m = s ? f.m : f.ua.m;
    punt.push({x:f.x, y:f.y, fx, fy, m, nom, sabido:s, col:s ? (f.pin ? 'bsaPin' : 'bsaReac') : 'bsaNeutro',
      colM:s ? 'bsaReac' : 'bsaNeutro',
      val:s ? (esM ? dec(Math.abs(f.m),'momento') + '\\,\\text{' + escLatex(unidadMomento()) + '}'
                   : dec(Math.hypot(f.fx, f.fy),'fuerza') + '\\,\\text{' + escLatex(unitFor) + '}') : null});
  });
  const reps = [];
  cargasConPeso().filter(cg=>(cg.tipo === 'U' || cg.tipo === 'T') && c.ids.has(cg.tramo)).forEach(cg=>{
    const z = trozoCargado(cg); if(!z || z.len <= 1e-12) return;
    const pts = [];
    for(let i=0;i<=12;i++){
      const s = z.s1 + z.len*i/12, Q = puntoEnTramo(z.g, s);
      const dd = z.g.arco ? dirRepartidaArco(cg, z.g, s) : dirCarga(cg, z.g);
      pts.push({x:Q.x, y:Q.y, dx:dd.x, dy:dd.y, w:wRepartidaEn(cg, z, s)});
    }
    reps.push({cg, pts});
  });
  // Escala
  let x0=Infinity, x1=-Infinity, y0=Infinity, y1=-Infinity;
  const mete = (x,y)=>{ x0=Math.min(x0,x); x1=Math.max(x1,x); y0=Math.min(y0,y); y1=Math.max(y1,y); };
  ejes.forEach(e=>e.forEach(q=>mete(q.x, q.y)));
  punt.forEach(p=>mete(p.x, p.y));
  const s = Math.min(7/Math.max(x1 - x0, 1e-6), 6/Math.max(y1 - y0, 1e-6), 2.2);
  const X = x=>(x - x0)*s, Y = y=>(y - y0)*s, F = v=>v.toFixed(3);
  tzReiniciar();
  const valores = [], pend = [];
  let out = '';
  // repartidas: bloque que sigue el eje, levantado en contra de la carga
  reps.forEach(q=>{
    const base = q.pts.map(p=>({x:X(p.x), y:Y(p.y)}));
    const sg = Math.sign(q.pts[0].w || 1);
    const cola = q.pts.map((p, i)=>({x:base[i].x - p.dx*0.5*sg, y:base[i].y - p.dy*0.5*sg}));
    out += '\\draw[bsaDist, line join=round] ' + base.map(p=>'(' + F(p.x) + ',' + F(p.y) + ')').join(' -- ') + ' -- '
         + cola.slice().reverse().map(p=>'(' + F(p.x) + ',' + F(p.y) + ')').join(' -- ') + ' -- cycle;\n';
    for(let i=0;i<=12;i+=3){
      out += '\\draw[-{Latex[length=1.5mm]}, bsaDist, line width=.7pt] (' + F(cola[i].x) + ',' + F(cola[i].y) + ') -- ('
           + F(base[i].x - q.pts[i].dx*0.04*sg) + ',' + F(base[i].y - q.pts[i].dy*0.04*sg) + ');\n';
    }
    for(let i=1;i<=12;i++) tzOcuparBloque(base[i-1], base[i], -q.pts[i].dx*sg, -q.pts[i].dy*sg, 0.5, 0.5);
    const nom = nombreCargaFI(q.cg), w0 = q.pts[0].w, w1 = q.pts[12].w;
    valores.push({nom, val:dec(Math.abs(w0),'fuerza') + (Math.abs(w1 - w0) > 1e-9 ? '\\to' + dec(Math.abs(w1),'fuerza') : '') + '\\,\\text{' + escLatex(uDist()) + '}'});
    const m = cola[6], pm = q.pts[6];
    pend.push({x:m.x - pm.dx*0.18*sg, y:m.y - pm.dy*0.18*sg, txt:'$' + nom + '$', opts:'font=\\tiny, color=bsaDist!70!black', dir:[-pm.dx*sg, -pm.dy*sg]});
  });
  // el cuerpo
  ejes.forEach(e=>{
    out += '\\draw[line width=1.6pt, color=bsaAcc2, line join=round, line cap=round] ' + e.map(q=>'(' + F(X(q.x)) + ',' + F(Y(q.y)) + ')').join(' -- ') + ';\n';
    e.forEach((q, i)=>{ if(i) tzOcuparTrazo(X(e[i-1].x), Y(e[i-1].y), X(q.x), Y(q.y), 0.06); });
  });
  const pinIds = new Set(R.pines.filter(p=>p.cuerpos.indexOf(k) >= 0).map(p=>p.n.id));
  nds.forEach(n=>{
    const hueco = pinIds.has(n.id) || n.rotula;
    out += '\\filldraw[fill=' + (hueco ? 'white' : 'bsaAcc2') + ', draw=bsaAcc2, line width=.8pt] (' + F(X(n.x)) + ',' + F(Y(n.y)) + ') circle (' + (hueco ? 0.08 : 0.05) + ');\n';
    tzOcupar(X(n.x)-0.1, Y(n.y)-0.1, X(n.x)+0.1, Y(n.y)+0.1);
  });
  // fuerzas y pares
  punt.forEach(p=>{
    const x = X(p.x), y = Y(p.y), Fm = Math.hypot(p.fx, p.fy);
    if(Fm > 1e-12){
      const ex = p.fx/Fm, ey = p.fy/Fm;
      out += '\\draw[-{Latex[length=2mm]}, ' + p.col + ', line width=1pt' + (p.sabido ? '' : ', dashed') + '] ('
           + F(x - ex*0.85) + ',' + F(y - ey*0.85) + ') -- (' + F(x - ex*0.08) + ',' + F(y - ey*0.08) + ');\n';
      tzOcuparTrazo(x - ex*0.85, y - ey*0.85, x - ex*0.08, y - ey*0.08, 0.06);
      pend.push({x:x - ex*1.05, y:y - ey*1.05, txt:'$' + p.nom + '$', opts:'font=\\tiny, color=' + p.col, dir:[-ex, -ey]});
      if(p.val) valores.push({nom:p.nom, val:p.val});
    }
    if(Math.abs(p.m) > 1e-12){
      out += '\\draw[' + (p.m > 0 ? '-{Latex[length=1.8mm]}' : '{Latex[length=1.8mm]}-') + ', ' + p.colM + ', line width=.9pt'
           + (p.sabido ? '' : ', dashed') + '] (' + F(x + 0.32) + ',' + F(y) + ') arc (0:300:0.32);\n';
      tzOcuparArco(x, y, 0.32, 0.05);
      pend.push({x:x + 0.52, y:y + 0.45, txt:'$' + p.nom + '$', opts:'font=\\tiny, color=' + p.colM, dir:[1, 1]});
      if(p.val) valores.push({nom:p.nom, val:p.val});
    }
  });
  // nombres de nudo
  nds.forEach(n=>{
    const x = X(n.x), y = Y(n.y), e = 0.2;
    pend.unshift({x:x + e, y:y + e, txt:escLatex(n.nombre), opts:'font=\\scriptsize\\bfseries, color=bsaAcc2', dir:[1, 1],
      candidatos:[{x:x+e, y:y+e}, {x:x-e, y:y+e}, {x:x+e, y:y-e}, {x:x-e, y:y-e}, {x:x+2*e, y:y}, {x:x-2*e, y:y}]});
  });
  pend.forEach(q=>{ out += q.candidatos ? tzTextoEn(q.candidatos, q.txt, q.opts, q.dir[0], q.dir[1]) : tzTexto(q.x, q.y, q.txt, q.opts, q.dir[0], q.dir[1]); });
  // Cotas: los nudos y los puntos de las fuerzas, en horizontal (abajo) y en vertical (a la derecha).
  const xs = nds.map(n=>n.x).concat(punt.filter(p=>Math.hypot(p.fx, p.fy) > 1e-12).map(p=>p.x));
  const ys = nds.map(n=>n.y).concat(punt.filter(p=>Math.hypot(p.fx, p.fy) > 1e-12).map(p=>p.y));
  const ext = tzExtension();
  out += tzCadenaLibre(xs, 'x', {pos:X, lado:-1, borde:ext.y0, color:'bsaMuted'}).tikz;
  out += tzCadenaLibre(ys, 'y', {pos:Y, lado:1, borde:tzExtension().x1, color:'bsaMuted'}).tikz;
  return out + leyendaFigFI(valores);
}

// Una ecuación del plan (26-) en filas de align*: como mucho tres términos por
// fila (las de un lado de un pasador llevan muchas reacciones y se salían).
function _filaEcTex(R, eq, conocidas){
  const {ts, cte, esM} = terminosEcuacion(R, eq, conocidas);
  const piezas = ts.map(t=>({neg:t.neg, tex:t.tex}));
  if(Math.abs(cte) > 5e-10*Math.max(1, Math.abs(cte))) piezas.push({neg:cte < 0, tex:dec(Math.abs(cte), esM ? 'momento' : 'fuerza')});
  let s = cabeceraEcuacion(eq).replace(' = 0', '') + ' = 0:\\quad & ';
  if(!piezas.length) return s + '0 = 0';
  piezas.forEach((q, i)=>{
    if(i && i % 3 === 0) s += ' \\\\\n &\\qquad ';
    s += (i ? (q.neg ? ' - ' : ' + ') : (q.neg ? '-' : '')) + q.tex;
  });
  return s + ' = 0';
}
function _valorTex(q){
  const esM = q.tipo === 'reac' && q.u.tipo === 'M' && q.u.ang === undefined;
  return simboloIncognita(q) + ' = ' + dec(q.valor, esM ? 'momento' : 'fuerza') + '\\ \\text{' + escLatex(esM ? unidadMomento() : unitFor) + '}';
}
// Los valores en filas de a tres, para que no se salgan del papel.
function _valoresTex(qs){
  const filas = [];
  for(let i=0;i<qs.length;i+=3) filas.push(qs.slice(i, i+3).map(_valorTex).join(',\\qquad '));
  return '\\begin{gather*}\n' + filas.join(' \\\\\n') + '\n\\end{gather*}\n';
}

// GIE = 3b − (vi + ve), con lo que se cuenta en cada sumando (24-, gieMarco).
function gieTex(){
  const g = gieMarco();
  const lst = a=>a.map(q=>escLatex(q.nombre) + ': ' + q.v
    + (q.n ? ' (' + q.n + ' barras' + (q.desl ? ', deslizante' : '') + ')' : ' (' + escLatex(q.tipo.toLowerCase()) + ')')).join('; ');
  return '\\subpaso{Grado de indeterminación estática}\n'
    + '\\[ \\text{GIE} = 3b - (v_i + v_e) = 3(' + g.b + ') - (' + g.sVi + ' + ' + g.sVe + ') = ' + g.gie
    + '\\quad\\Rightarrow\\quad \\text{' + escLatex(g.lectura) + '} \\]\n'
    + '{\\small\\noindent $b = ' + g.b + '$: ' + g.nombres.map(escLatex).join(', ') + (g.bielas ? ' y ' + g.bielas + ' entre nudos (biela o cuerda)' : '')
    + '\\\\\n$v_i$: ' + (g.vi.length ? lst(g.vi) : '0') + '\\\\\n$v_e$: ' + lst(g.ve) + '\\par}\n';
}

// ── Paso 1: reacciones con el marco entero ──
function pasoReaccionesMarcoTex(R, figCaption){
  const pr = planReaccionesMarco(R);
  let out = '\\begin{center}\\bsaEncajar{\\begin{tikzpicture}[scale=1]\n' + tikzViga(true) + '\\end{tikzpicture}}\\end{center}\n';
  out += figCaption('DCL del marco completo.');
  if(!pr.completo) out += '\\noindent Con el marco entero no bastan: las reacciones salen del desmembrado.\\par\n';
  // La de un lado de un pasador lleva antes, en su fila, qué miembros son ese lado.
  const filas = pr.filas.map(fl=>(fl.titulo === 'lado' ? '&\\text{Lado ' + escLatex(fl.nombreLado) + ':} \\\\\n' : '') + _filaEcTex(R, fl, null));
  out += '\\begin{align*}\n' + filas.join(' \\\\[6pt]\n') + '\n\\end{align*}\n';
  if(pr.completo) out += _valoresTex(R.unk.filter(q=>q.tipo === 'reac'));
  return {tex:out, completo:pr.completo};
}

// ── Paso 2: desmembrado ──
function desmembradoTex(R, completo, figCaption){
  const pp = planPasadoresMarco(R, completo ? R.inc.map((u, j)=>j) : []);
  if(!pp.pasos.length && !pp.resto.length) return '\\noindent No hay pasadores entre miembros.\\par\n';
  let out = '';
  pp.pasos.forEach(ps=>{
    const g = ps.grupo;
    // El título y su DCL en una minipage: el título no queda solo al pie de la página.
    const tit = '\\subpaso{' + (g.tipo === 'cuerpo' ? 'Miembro ' : 'Pasador ') + escLatex(g.nombre) + '}\n';
    if(g.tipo === 'cuerpo'){
      out += '\\par\\noindent\\begin{minipage}{\\linewidth}\n' + tit
        + '\\begin{center}\\bsaEncajar{\\begin{tikzpicture}\n' + tikzDCLCuerpoTex(R, g.k, ps.sabidasAntes) + '\\end{tikzpicture}}\\end{center}\n\\end{minipage}\n';
      out += figCaption('DCL del miembro ' + escLatex(g.nombre) + ': lo que se busca, a trazos en su sentido supuesto.');
    } else out += tit;
    const conU = eq=>eq.coef.some((v, j)=>ps.U.indexOf(j) >= 0 && Math.abs(v) > EPS_PLAN);
    const filas = ps.eqs.filter(conU).map(eq=>_filaEcTex(R, eq, ps.sabidasAntes))
      .concat(ps.eqs.filter(eq=>!conU(eq)).map(eq=>_filaEcTex(R, eq, ps.sabidasAntes) + '\\quad\\checkmark'));
    out += '\\begin{align*}\n' + filas.join(' \\\\[6pt]\n') + '\n\\end{align*}\n';
    out += _valoresTex(ps.U.map(j=>R.unk[j]));
  });
  if(pp.resto.length){
    out += '\\noindent Las que quedan salen del sistema completo de ecuaciones del desmembrado:\n';
    out += _valoresTex(pp.resto.map(j=>R.unk[j]));
  }
  return out;
}

// ── Paso 3: DCL final de cada miembro elegido ──
function dclFinalesTex(R, figCaption){
  let out = '';
  R.cuerpos.filter(c=>cuerpoEnSolucion(R, c.k)).forEach(c=>{
    out += '\\par\\noindent\\begin{minipage}{\\linewidth}\n{\\bfseries Miembro ' + escLatex(c.nombre) + '}\n'
      + '\\begin{center}\\bsaEncajar{\\begin{tikzpicture}\n' + tikzDCLCuerpoTex(R, c.k, null) + '\\end{tikzpicture}}\\end{center}\n\\end{minipage}\n';
    out += figCaption('DCL del miembro ' + escLatex(c.nombre) + ' con sus fuerzas en sentido real. Cotas en ' + escLatex(unitLen) + '.');
  });
  return out;
}
