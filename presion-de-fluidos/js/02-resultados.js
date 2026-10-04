// ═══════════════════════════════════════════════════════════
//  RESULTADOS EN PANTALLA
//  Misma secuencia que el informe: presiones en los puntos clave, la
//  resultante de cada tramo mojado con su centro de presión (tarjeta con
//  croquis), el equilibrio en el orden en que se hace a mano, las
//  reacciones con su nombre y su sentido, y las comprobaciones.
// ═══════════════════════════════════════════════════════════

// ── El ángulo de una dirección se dice como en todo el proyecto: el agudo con
//    el eje MÁS CERCANO (bsaAnguloAgudoEje, core), con seno o coseno según el
//    eje, y con la letra que le da la figura (letraAngulo, 07-). Antes se medía
//    siempre con la horizontal y las ecuaciones escribían θ_k mientras la
//    figura decía φ (2026-09-14) ──
function _trigDir(ec, d){
  const ag = bsaAnguloAgudoEje(d.x, d.y);
  const fn = ((ec.tipo === 'Fx') !== ag.desdeV) ? '\\cos' : '\\operatorname{sen}';
  return {fn, ang: ag.grados};
}
function _casiCero(v){ return Math.abs(v) < 1e-9; }
// Dirección de una reacción o de un tope inclinados, para la pantalla: «(a
// 45.00° de la vertical)», el mismo ángulo agudo que la figura y las
// ecuaciones; nunca el de 0 a 360 (anguloIncognita), que salía hasta el
// 2026-09-14. Sobre un eje no hace falta decir nada.
function _dirAgudoHtml(u){
  if(u.tipo !== 'R' && u.tipo !== 'T') return '';
  if(bsaAnguloAgudoEje(u.dir.x, u.dir.y).grados < 1e-6) return '';
  return ' (a ' + bsaTextoAnguloAgudo(u.dir.x, u.dir.y) + ')';
}
function _gr(v){ return dec(v,'ang') + '^\\circ'; }   // con los decimales de ÁNGULOS

// ── Términos de cada ecuación, en LaTeX (los comparten pantalla y PDF) ──
// Cada término es {v, lit, sus}: v da el signo real, `lit` es la expresión
// con símbolos y `sus` la misma con los números (ambas en valor absoluto).
function terminosCarga(ec, c){
  const F = dec(c.F,'f');
  if(ec.tipo === 'Fx' || ec.tipo === 'Fy'){
    const comp = ec.tipo === 'Fx' ? c.Fx : c.Fy;
    if(_casiCero(comp/Math.max(1,c.F))) return null;
    const d = ec.tipo === 'Fx' ? Math.abs(c.dir.x) : Math.abs(c.dir.y);
    if(Math.abs(d-1) < 1e-9) return {v:comp, lit:c.nombre, sus:F};
    const {fn, ang} = _trigDir(ec, c.dir);
    return {v:comp, lit:c.nombre + fn + letraAngulo(c.dir), sus:F + fn + ' ' + _gr(ang)};
  }
  // momento respecto del centro de la ecuación
  const br = brazoRespecto(ec.centro, c.P, c.dir);
  if(br.brazo < 1e-7*Math.max(1, c.len)) return null;
  return {v:br.m*c.F, lit:c.nombre + '\\,d_{' + c.k + '}', sus:F + '\\,(' + dec(br.brazo,'len') + ')', brazo:br.brazo};
}
function terminosIncognita(ec, u, j){
  const s = simbIncognita(u);
  if(ec.tipo === 'Fx' || ec.tipo === 'Fy'){
    const coef = ec.tipo === 'Fx' ? u.dir.x : u.dir.y;
    if(_casiCero(coef)) return null;
    if(Math.abs(Math.abs(coef)-1) < 1e-9) return {j, coef, lit:s, sus:s, factor:'1'};
    const {fn, ang} = _trigDir(ec, u.dir);
    return {j, coef, lit:s + fn + letraAngulo(u.dir), sus:s + fn + ' ' + _gr(ang), factor:fn + ' ' + _gr(ang)};
  }
  const br = brazoRespecto(ec.centro, u.n, u.dir);
  if(br.brazo < 1e-7*Math.max(1, Math.abs(u.n.x), Math.abs(u.n.y))) return null;
  return {j, coef:br.m, lit:s + '\\,d_{' + u.n.nombre + '}', sus:s + '\\,(' + dec(br.brazo,'len') + ')', factor:'(' + dec(br.brazo,'len') + ')', brazo:br.brazo};
}
function _sumaTerminos(lista, clave){
  if(!lista.length) return '0';
  return lista.map((t,i)=>{
    const neg = t.v < 0;
    return (i===0 ? (neg ? '-' : '') : (neg ? ' - ' : ' + ')) + t[clave];
  }).join('');
}
// Icono del convenio de cada ecuación (R12).
function _iconoEc(ec){
  return ec.tipo === 'Fx' ? '\\xrightarrow{+}\\ ' : (ec.tipo === 'Fy' ? '+\\!\\uparrow\\ ' : '\\circlearrowleft\\!+\\ ');
}
// Arma una ecuación del plan: literal, sustituida (con las incógnitas ya
// conocidas puestas con su valor y signo) y el despeje de la pendiente.
function ecuacionDelPaso(r, paso){
  asignarLetrasAngulos(r);      // las mismas letras en pantalla y en el PDF
  const ec = r.plan.ecs[paso.e];
  const cargasT = ec.ts.map(t=>terminosCarga(ec, t.carga)).filter(Boolean);
  const incT = ec.us.map(u=>terminosIncognita(ec, r.inc[u.j], u.j)).filter(Boolean);
  const lit = [];
  incT.forEach(t=>lit.push({v: t.coef, lit: t.lit}));
  cargasT.forEach(t=>lit.push({v: t.v, lit: t.lit}));
  // sustituida: las conocidas con su valor (signo real), la pendiente en símbolo
  const sus = [];
  let sumaConocida = 0;
  const pendiente = j => (paso.tipo === 'despeje' && j === paso.j)
                      || (paso.tipo === 'sistema' && paso.libres && paso.libres.indexOf(j) >= 0);
  incT.forEach(t=>{
    if(pendiente(t.j)){ sus.push({v: t.coef, sus: t.sus}); return; }
    const v = r.val[t.j];
    const vv = t.coef * v;
    sumaConocida += vv;
    sus.push({v: vv, sus: dec(Math.abs(v),'f') + (t.factor === '1' ? '' : t.factor)});
  });
  cargasT.forEach(t=>{ sumaConocida += t.v; sus.push({v: t.v, sus: t.sus}); });
  let despeje = null;
  if(paso.tipo === 'despeje'){
    const t = incT.find(q=>q.j === paso.j);
    const u = r.inc[paso.j];
    const valor = r.val[paso.j];
    despeje = {simb: simbIncognita(u), valor, factor: t ? t.factor : '1', coef: t ? t.coef : 1, sumaConocida};
  }
  return {ec, icono:_iconoEc(ec), literal:_sumaTerminos(lit,'lit') + ' = 0',
          sustituida:_sumaTerminos(sus,'sus') + ' = 0', despeje, incT, cargasT};
}


// ── Leyenda de los tramos (2026-10-03): el lienzo acota solo las proyecciones
//    Δx y Δy; la longitud real de cada tramo (y el radio de un arco) va aquí,
//    al lado, como pidió el profesor para no cargar la figura de cotas. ──
function datosTramosLeyenda(){
  return tramos.filter(t=>nodo(t.a) && nodo(t.b)).map(t=>{
    const arc = arcoDeTramo(t);
    return {t, nom: nomTramo(t), L: longitudTramo(t), R: arc ? arc.R : null};
  });
}
function leyendaTramosHtml(){
  const ds = datosTramosLeyenda();
  if(!ds.length) return '';
  return '<div class="hint-sm" style="margin:0 0 8px"><b>Leyenda · longitud de los tramos:</b> '
    + ds.map(d=>kx('L_{' + d.nom + '} = ' + dec(d.L,'len')) + ' ' + unitLen
      + (d.R !== null ? ' (arco, ' + kx('R = ' + dec(d.R,'len')) + ' ' + unitLen + ')' : '')).join(' · ') + '</div>';
}

// ── Resultante única del líquido (2026-10-03): ecuación y resultado; el porqué
//    y la figura acotada van al informe LaTeX. La calcula resultanteUnica (01-). ──
function resultanteUnicaHtml(r){
  const ru = r.resultante;
  if(!ru) return '';
  const uF = unitFor, uL = unitLen, f = v=>dec(v,'f'), nl = v=>dec(v,'len');
  const fila = tx => '<div class="eq-row"><div class="eq-body">' + kx(tx) + '</div></div>';
  const suma = (lista) => lista.length > 1 ? lista.map((v,i)=>(i===0 ? (v<0?'-':'') : (v<0?' - ':' + ')) + f(Math.abs(v))).join('') + ' = ' : '';
  let h = '<div class="proc-block res-unica" style="padding:9px 12px;margin-top:8px;border-left:3px solid ' + COL_RES + '">'
    + '<div class="proc-sub" style="color:' + COL_RES + '">Resultante única del líquido</div>';
  const fx = r.cargas.map(c=>c.Fx).filter(v=>!_casiCero(v)), fy = r.cargas.map(c=>c.Fy).filter(v=>!_casiCero(v));
  h += fila('R_x = \\sum F_x = ' + suma(fx) + f(ru.Rx) + '\\ \\text{' + uF + '}');
  h += fila('R_y = \\sum F_y = ' + suma(fy) + f(ru.Ry) + '\\ \\text{' + uF + '}');
  if(ru.par){
    h += fila('M = \\sum M_O = ' + f(ru.Mo) + '\\ \\text{' + uF + '}\\cdot\\text{' + uL + '}');
    h += '<div class="hint-sm">Las fuerzas se anulan: el líquido equivale a un par, sin línea de acción.</div></div>';
    return h;
  }
  const ag = ru.ag;
  h += fila('R = \\sqrt{R_x^2 + R_y^2} = ' + f(ru.F) + '\\ \\text{' + uF + '}\\qquad \\theta = \\tan^{-1}\\dfrac{|R_' + (ag.desdeV ? 'x' : 'y') + '|}{|R_' + (ag.desdeV ? 'y' : 'x') + '|} = '
    + _gr(ag.grados) + '\\ \\text{(con la ' + (ag.desdeV ? 'vertical' : 'horizontal') + ')}\\ ' + iconoSentidoTex(ru.dir.x, ru.dir.y).replace(/\$/g,''));
  if(ru.corta){
    const N = ru.N.nombre;
    const ts = ru.terminos.filter(q=>q.brazo > 1e-9).map((q,i)=>(i===0 ? (q.m<0?'-':'') : (q.m<0?' - ':' + ')) + f(q.c.F) + '(' + nl(q.brazo) + ')');
    h += fila('\\circlearrowleft{+}\\ \\sum M_{' + N + '} = ' + (ts.join('') || '0') + ' = ' + f(ru.MN) + '\\ \\text{' + uF + '}\\cdot\\text{' + uL + '}');
    if(ru.recto){
      const otro = ru.otro.nombre;
      h += fila('R_n = R\\,\\operatorname{sen}\\beta = ' + f(ru.F) + '\\,\\operatorname{sen}' + _gr(ru.beta) + ' = ' + f(Math.abs(ru.Rn)) + '\\ \\text{' + uF + '}');
      h += fila('s = \\dfrac{|\\sum M_{' + N + '}|}{R_n} = \\dfrac{' + f(Math.abs(ru.MN)) + '}{' + f(Math.abs(ru.Rn)) + '} = ' + nl(ru.s) + '\\ \\text{' + uL + '}');
      h += '<div class="hint-sm">' + kx('\\beta') + ': ángulo entre ' + kx('R') + ' y el tramo ' + N + otro + '; ' + kx('s') + ' desde ' + N + ' sobre ' + N + otro + '.</div>';
    } else {
      h += fila('d = \\dfrac{|\\sum M_{' + N + '}|}{R} = ' + nl(ru.dR) + '\\ \\text{' + uL + '}\\qquad P_R = (' + nl(ru.P.x) + ';\\ ' + nl(ru.P.y) + ')');
      h += '<div class="hint-sm">' + kx('d') + ': distancia de ' + N + ' a la línea de acción, que corta el arco ' + nomTramo(ru.t) + ' en ' + kx('P_R') + '.</div>';
    }
  } else {
    h += fila('\\sum M_O = ' + f(ru.Mo) + '\\ \\text{' + uF + '}\\cdot\\text{' + uL + '}\\qquad P_R = (' + nl(ru.P.x) + ';\\ ' + nl(ru.P.y) + ')');
    h += '<div class="hint-sm">Su línea de acción no corta la compuerta; ' + kx('P_R') + ' es su punto más cercano a las fuerzas.</div>';
  }
  if(ru.zR !== null) h += fila('z_R = ' + nl(ru.zR) + '\\ \\text{' + uL + '}\\ \\text{bajo la superficie libre}');
  h += '</div>';
  // el esquema de todo el conjunto, con R acotada donde actúa (2026-10-04)
  return '<div class="fig-card"><div class="fig-card-datos">' + h + '</div><div class="fig-card-dib" style="flex-basis:340px">' + esquemaResultanteSVG(r, false) + '</div></div>';
}

function renderResultados(r){
  const uF = unitFor, uL = unitLen;
  const f = v=>dec(v,'f'), nl = v=>dec(v,'len');
  const cargas = r.cargas;
  cargas.forEach(c=>{ c.des = desarrolloCarga(c); });
  const hayCurvo = cargas.some(c=>c.des && c.des.tipo === 'curvo');
  const hayCapas = [1,2].some(z=>capasOrdenadas(z).length > 1);
  const dosLados = cargas.some(c=>c.z===1) && cargas.some(c=>c.z===2);
  let h = '';

  // ═══ 1 · Presión en los puntos clave ═══
  h += '<div class="res-section"><div class="res-title"><div class="num">1</div>'
    + 'Presión en los puntos clave</div>'
    + '<div class="proc-block" style="padding:8px 12px;margin-bottom:8px"><div class="eq-row"><div class="eq-body">'
    + kx('p = \\gamma\\,h' + (hayCapas ? '\\qquad p = \\sum\\gamma_i h_i' : '')) + '</div></div></div>'
    + '<table class="tabla"><thead><tr><th>Fuerza</th><th>Tramo</th><th>Zona</th><th>Extremo</th>'
    + '<th class="r">h (' + uL + ')</th><th class="r">p (' + uPres() + ')</th></tr></thead><tbody>';
  cargas.forEach(c=>{
    const d = c.des;
    const filas = [];
    if(d && d.tipo === 'recto'){
      filas.push({nom: d.T.nombre || 'corte con la superficie', hh: d.bandas[0].h0, p: d.bandas[0].p0});
      d.bandas.forEach((bd,i)=>{ if(i>0) filas.push({nom:'cambio de capa', hh:bd.h0, p:bd.p0}); });
      const ult = d.bandas[d.bandas.length-1];
      filas.push({nom: d.D.nombre || '', hh: ult.h1, p: ult.p1});
    } else if(d){
      filas.push({nom: d.T.nombre || 'corte con la superficie', hh: c.niv - d.yTop, p: presionZona(c.z, d.yTop)});
      filas.push({nom: 'punto más profundo', hh: c.niv - d.yBot, p: presionZona(c.z, d.yBot)});
    }
    filas.forEach((fl,i)=>{
      h += '<tr>' + (i===0 ? '<td rowspan="'+filas.length+'"><b>' + kx(c.nombre) + '</b></td><td rowspan="'+filas.length+'">' + nomTramo(c.t) + '</td><td rowspan="'+filas.length+'">' + c.z + '</td>' : '')
        + '<td>' + fl.nom + '</td><td class="r">' + nl(fl.hh) + '</td><td class="r">' + f(fl.p) + '</td></tr>';
    });
  });
  h += '</tbody></table>'
    + '<div class="hint-sm">La presión es siempre positiva; el sentido lo lleva la fuerza (flechas del lienzo), no el número.</div></div>';

  // ═══ 2 · Resultante de cada tramo mojado ═══
  h += '<div class="res-section"><div class="res-title"><div class="num">2</div>'
    + 'Resultante de cada tramo mojado y su centro de presión</div>';
  h += leyendaTramosHtml();
  cargas.forEach(c=>{
    const d = c.des;
    h += '<div class="fig-card"><div class="fig-card-datos">'
      + '<div class="fig-card-h"><b>' + kx(c.nombre) + ' · tramo ' + nomTramo(c.t) + ' · zona ' + c.z + '</b>'
      + '<span class="hint-sm" style="margin:0">' + (d ? (d.tipo === 'curvo' ? 'placa curva' : (d.horizontal ? 'placa horizontal' : (Math.abs(d.angPlaca-90) < 1e-6 ? 'placa vertical' : 'placa inclinada ' + dec(d.angPlaca,'ang') + '°'))) : '') + '</span></div>';
    if(!d){
      h += '<div class="hint-sm">Resultante por integración: ' + kx('F = ' + f(c.F)) + ' ' + uF + '.</div>';
    } else if(d.tipo === 'recto'){
      // fórmula y resultado (2026-10-04); la sustitución, en el informe
      const fl = tx => '<div class="eq-row"><div class="eq-body">' + kx(tx) + '</div></div>';
      h += '<div class="proc-block" style="padding:9px 12px">';
      d.bandas.forEach((bd,i)=>{
        if(d.bandas.length > 1) h += '<div class="proc-sub">Capa ' + (i+1) + ' (γ = ' + f(bd.g) + ')</div>';
        if(bd.Fr > 1e-12) h += fl('F_{\\square} = b\\,L\\,p_{\\min} = ' + f(bd.Fr) + '\\ \\text{' + uF + '}\\qquad s = ' + nl(bd.s0 + bd.sR) + '\\ \\text{' + uL + '}');
        if(bd.Ft > 1e-12) h += fl('F_{\\triangle} = \\tfrac12\\,b\\,L\\,(p_{\\max}-p_{\\min}) = ' + f(bd.Ft) + '\\ \\text{' + uF + '}\\qquad s = ' + nl(bd.s0 + bd.sT) + '\\ \\text{' + uL + '}');
      });
      h += fl(c.nombre + ' = \\sum F_i = ' + f(d.F) + '\\ \\text{' + uF + '}' + (d.gzA ? '\\qquad \\gamma\\,\\bar z\\,A = ' + f(d.gzA.F) + '\\ \\checkmark' : ''));
      h += fl('s_P = \\dfrac{\\sum F_i\\,s_i}{' + c.nombre + '} = ' + nl(d.sP) + '\\ \\text{' + uL + '}\\qquad z_P = ' + nl(c.zP) + '\\ \\text{' + uL + '}');
      h += '<div class="hint-sm">' + kx('s') + ' sobre el tramo, desde ' + (d.T.nombre ? d.T.nombre : 'la superficie libre') + '.</div></div>';
    } else {
      const fl = tx => '<div class="eq-row"><div class="eq-body">' + kx(tx) + '</div></div>';
      h += '<div class="proc-block" style="padding:9px 12px">';
      d.bandasH.forEach((bd,i)=>{
        if(d.bandasH.length > 1) h += '<div class="proc-sub">Capa ' + (i+1) + '</div>';
        if(bd.Fr > 1e-12) h += fl('F_{h\\square} = b\\,h\\,p_{\\text{sup}} = ' + f(bd.Fr) + '\\ \\text{' + uF + '}');
        if(bd.Ft > 1e-12) h += fl('F_{h\\triangle} = \\tfrac12\\,b\\,h\\,(p_{\\text{inf}}-p_{\\text{sup}}) = ' + f(bd.Ft) + '\\ \\text{' + uF + '}');
      });
      h += fl('F_h = \\sum F_{h,i} = ' + f(Math.abs(d.Fh)) + '\\ \\text{' + uF + '}\\ (\\text{hacia la ' + d.sentidoH + '})');
      h += fl('F_v = b\\sum\\gamma_i A_i = ' + f(Math.abs(d.FvBloque)) + '\\ \\text{' + uF + '}\\ (\\text{hacia ' + d.sentidoV + '})');
      h += fl(c.nombre + ' = \\sqrt{F_h^2 + F_v^2} = ' + f(d.F) + '\\ \\text{' + uF + '}\\qquad \\theta = ' + dec(d.theta,'ang') + '^\\circ\\qquad z_P = ' + nl(d.zP) + '\\ \\text{' + uL + '}');
      h += '<div class="hint-sm">' + kx('F_h') + ' sobre la proyección vertical; ' + kx('F_v') + ', peso del bloque de líquido sobre la placa; ' + kx(c.nombre) + ' pasa por el centro del arco.</div></div>';
    }
    h += '</div><div class="fig-card-dib" style="flex-basis:290px">' + (d ? esquemaCargaSVG(c, d) : '') + '</div></div>';
  });
  // tabla resumen (R4)
  let SX=0, SY=0;
  h += '<table class="tabla" style="margin-top:6px"><thead><tr><th>Fuerza</th><th>Tramo · zona</th>'
    + '<th class="r">L mojada (' + uL + ')</th><th class="r">p máx (' + uPres() + ')</th>'
    + '<th class="r">F (' + uF + ')</th><th class="r">z<sub>P</sub> (' + uL + ')</th>'
    + '<th class="r">F<sub>x</sub> (' + uF + ')</th><th class="r">F<sub>y</sub> (' + uF + ')</th><th>Sentido</th></tr></thead><tbody>';
  cargas.forEach(c=>{
    SX += c.Fx; SY += c.Fy;
    h += '<tr><td><b>'+kx(c.nombre)+'</b></td><td>'+nomTramo(c.t)+' · '+c.z+'</td>'
      + '<td class="r">'+nl(c.len)+'</td><td class="r">'+f(c.pMax)+'</td>'
      + '<td class="r"><b>'+f(c.F)+'</b></td><td class="r">'+nl(c.zP)+'</td>'
      + '<td class="r">'+f(c.Fx)+'</td><td class="r">'+f(c.Fy)+'</td><td>' + iconoSentidoHtml(c.dir.x, c.dir.y) + '</td></tr>';
  });
  h += '<tr class="fila-total"><td colspan="6">Σ del líquido</td>'
    + '<td class="r">'+f(SX)+'</td><td class="r">'+f(SY)+'</td><td></td></tr></tbody></table>';
  // Peso propio: ecuación y resultado; el porqué del centroide va al PDF.
  if(r.pesos && r.pesos.length){
    h += '<div class="proc-block" style="padding:9px 12px;margin-top:8px"><div class="proc-sub">Peso propio de la compuerta</div>';
    r.pesos.forEach(c=>{
      h += '<div class="eq-row"><div class="eq-body">' + kx(c.nombre + ' = q\\,b\\,L = ' + f(c.q) + '\\,(' + nl(c.b) + ')(' + nl(c.len) + ') = ' + f(c.F) + '\\ \\text{' + uF + '}\\quad\\text{en}\\ G_{' + c.k.slice(1) + '} = (' + nl(c.G.x) + ';\\ ' + nl(c.G.y) + ')') + '</div></div>';
    });
    h += '</div>';
  }
  h += resultanteUnicaHtml(r);
  h += '<div class="hint-sm">Comprobación con la integral numérica del programa'
    + (cargas.every(c=>!c.des || c.des.coincide) ? ' ✓' : ' <b style="color:#c0392b">(discrepancia: revisa la geometría)</b>') + '.</div>';
  h += '</div>';

  // ═══ 3 · Equilibrio ═══
  const plan = r.plan;
  h += '<div class="res-section"><div class="res-title"><div class="num">3</div>'
    + 'Equilibrio de la compuerta</div>'
    + '<div class="proc-block proc-cols">'
    + '<div class="proc-col"><div class="proc-sub">Incógnitas (' + r.diag.inc + ')</div>'
    + r.inc.map(u=>'<div class="eq-row"><div class="eq-body">' + kx(simbIncognita(u)) + ' <span class="hint-sm" style="display:inline">— ' + descIncognita(u) + ' en ' + u.n.nombre + _dirAgudoHtml(u) + '</span></div></div>').join('')
    + '</div>'
    + '<div class="proc-col"><div class="proc-sub">Ecuaciones (' + r.diag.eq + ')</div>'
    + '<div class="eq-row"><div class="eq-body">' + kx('\\sum F_x = 0,\\quad \\sum F_y = 0,\\quad \\sum M_{' + plan.centro.nombre + '} = 0') + '</div></div>'
    + (r.diag.rot ? '<div class="eq-row"><div class="eq-body">' + kx('\\sum M_{\\text{rótula}} = 0') + ' <span class="hint-sm" style="display:inline">(solo las fuerzas de un lado)</span></div></div>' : '')
    + '</div></div>';
  h += '<div class="proc-block">';
  plan.pasos.forEach(paso=>{
    if(paso.tipo === 'despeje' || paso.tipo === 'comprobacion'){
      // La ecuación con sus números y, debajo, el resultado. La sustitución paso
      // a paso y el despeje intermedio son procedimiento: van en el PDF.
      const q = ecuacionDelPaso(r, paso);
      h += '<div class="eq-row"><div class="eq-body">' + kx(q.icono + q.ec.nombre.replace(' = 0','') + ':\\quad ' + q.sustituida + '\\qquad(' + paso.num + ')') + '</div></div>';
      if(q.despeje){
        const dp = q.despeje;
        h += '<div class="eq-row"><div class="eq-body">' + kx('\\phantom{' + q.icono + '}\\boxed{' + dp.simb + ' = ' + f(dp.valor) + '\\ \\text{' + uF + '}}') + '</div></div>';
        if(dp.valor < 0)
          h += '<div class="hint-sm">Signo negativo: ' + kx(dp.simb) + ' actúa al revés de lo supuesto' + (r.inc[paso.j].tipo === 'T' ? '; el tope no tira, la compuerta se separa' : '') + '.</div>';
      }
      if(paso.tipo === 'comprobacion') h += '<div class="hint-sm">Sirve de comprobación.</div>';
    } else if(paso.tipo === 'sistema'){
      paso.grupo.forEach(g=>{
        const q = ecuacionDelPaso(r, {tipo:'sistema', e:g.e, libres:paso.libres});
        h += '<div class="eq-row"><div class="eq-body">' + kx(q.icono + q.ec.nombre.replace(' = 0','') + ':\\quad ' + q.sustituida + '\\qquad(' + g.num + ')') + '</div></div>';
      });
      h += '<div class="hint-sm">Solución del sistema:</div>'
        + '<div class="eq-row"><div class="eq-body">' + kx(paso.libres.map(j=>'\\boxed{' + simbIncognita(r.inc[j]) + ' = ' + f(r.val[j]) + '\\ \\text{' + uF + '}}').join('\\qquad')) + '</div></div>';
    }
  });
  h += '</div></div>';

  // ═══ 4 · Reacciones ═══
  h += '<div class="res-section"><div class="res-title"><div class="num">4</div>'
    + 'Reacciones y fuerza del tope</div>'
    + '<table class="tabla"><thead><tr><th>Fuerza</th><th>Qué es</th>'
    + '<th class="r">Valor (' + uF + ')</th><th>Sentido real</th></tr></thead><tbody>';
  r.inc.forEach((u,j)=>{
    const v = r.val[j];
    const s = sentidoRealIncognita(u, v);
    h += '<tr><td><b>'+kx(simbIncognita(u))+'</b></td><td>'+descIncognita(u)+' en <b>'+u.n.nombre+'</b>'+_dirAgudoHtml(u)+'</td>'
      + '<td class="r"><b>'+f(Math.abs(v))+'</b></td>'
      + '<td>' + iconoSentidoHtml(s.x, s.y) + (u.tipo==='T' ? (v >= 0 ? ' empuja a la compuerta' : ' <b style="color:#c0392b">se separa</b>') : '') + '</td></tr>';
  });
  h += '</tbody></table>'
    + '<div class="hint-sm">Magnitud y sentido real (flecha).</div>';
  if(r.topesSueltos.length){
    h += '<div class="verdict bad"><div class="verdict-t">Tope que no trabaja</div>'
      + r.topesSueltos.map(u=>kx(simbIncognita(u))).join(', ') + ' &lt; 0: el tope solo empuja, así que <b>la compuerta se abre</b>.</div>';
  } else if(r.inc.some(u=>u.tipo==='T')){
    h += '<div class="verdict ok"><div class="verdict-t">Tope</div>Fuerza positiva: el tope empuja (cero = a punto de abrirse).</div>';
  }
  h += '</div>';

  // ═══ 5 · Comprobación ═══
  const rs = r.residuo;
  const cero = v => (Math.abs(v) < 1e-6*rs.ref) ? '0' : f(v);
  h += '<div class="res-section"><div class="res-title"><div class="num">5</div>Comprobación</div>'
    + '<div class="proc-block"><div class="eq-row"><div class="eq-body">'
    + kx('\\sum F_x = ' + cero(rs.cx) + ' \\qquad \\sum F_y = ' + cero(rs.cy) + ' \\qquad \\sum M_{O} = ' + cero(rs.cm)) + '</div></div>'
    + '<div class="hint-sm" style="color:' + (r.cierra?'#15803d':'#c0392b') + '">'
    + (r.cierra ? '✓ Con todas las fuerzas (líquido' + (r.pesos && r.pesos.length ? ', peso propio' : '') + ', reacciones y tope) las tres sumas son nulas.'
                : '⚠ El equilibrio no cierra; revisa apoyos y caras mojadas.') + '</div>';
  const planas = cargas.filter(c=>c.des && c.des.tipo==='recto' && !c.des.horizontal);
  if(planas.length)
    h += '<div class="hint-sm">Centro de presión bajo el centro de la parte mojada: '
      + planas.map(c=>kx('z_{P' + c.k + '} = ' + nl(c.zP) + ' > \\bar z = ' + nl(c.des.zBar))).join(', ') + ' ✓</div>';
  h += '</div></div>';
  return h;
}
