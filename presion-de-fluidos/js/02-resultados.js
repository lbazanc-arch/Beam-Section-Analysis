// ═══════════════════════════════════════════════════════════
//  RESULTADOS EN PANTALLA
//  Misma secuencia que el informe: presiones en los puntos clave, la
//  resultante de cada tramo mojado con su centro de presión (tarjeta con
//  croquis), el equilibrio en el orden en que se hace a mano, las
//  reacciones con su nombre y su sentido, y las comprobaciones.
// ═══════════════════════════════════════════════════════════

// ── Ángulo agudo (grados) de una dirección con la horizontal y la vertical ──
function _angConEjeX(d){ return Math.acos(Math.min(1, Math.abs(d.x)))*180/Math.PI; }
function _casiCero(v){ return Math.abs(v) < 1e-9; }
function _gr(v){ return (Math.round(v*100)/100).toFixed(2).replace(/\.?0+$/,'') + '^\\circ'; }

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
    const ang = _angConEjeX(c.dir);
    const fn = ec.tipo === 'Fx' ? '\\cos' : '\\sin';
    return {v:comp, lit:c.nombre + fn + '\\theta_{' + c.k + '}', sus:F + fn + ' ' + _gr(ang)};
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
    const ang = _angConEjeX(u.dir);
    const fn = ec.tipo === 'Fx' ? '\\cos' : '\\sin';
    return {j, coef, lit:s + fn + '\\theta_{' + u.n.nombre + '}', sus:s + fn + ' ' + _gr(ang), factor:fn + ' ' + _gr(ang)};
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

// ── Croquis SVG de una carga: el tramo mojado, su diagrama del lado del
//    líquido, F_R en el centro de presión y la cota z_P desde la superficie ──
function croquisCarga(c, d){
  const W2 = 230, H2 = 190, m = 22;
  const pts = (d && d.tipo === 'curvo') ? d.pts : [d.T, d.D];
  const niv = c.niv;
  // caja: tramo mojado + superficie libre + diagrama desplazado
  const xs = pts.map(p=>p.x), ys = pts.map(p=>p.y).concat([niv]);
  const p0 = pts[0], p1 = pts[pts.length-1];
  const span = Math.max(Math.max(...xs)-Math.min(...xs), Math.max(...ys)-Math.min(...ys), 1e-6);
  const dia = 0.38*span;                       // altura máxima del diagrama, en unidades del mundo
  const pMax = Math.max(1e-12, ...pts.map(p=>presionZona(c.z, p.y)));
  const ptsT = puntosTramo(c.t, 48);
  const desp = pts.map((p,i)=>{
    const idx = Math.max(0, Math.min(ptsT.length-2, Math.round(i/(pts.length-1)*(ptsT.length-1))));
    const nv = normalHaciaZona(c.t, idx, ptsT, c.z);
    const h = presionZona(c.z, p.y)/pMax*dia;
    return {x:p.x + nv.x*h, y:p.y + nv.y*h};
  });
  const todos = pts.concat(desp).concat([{x:Math.min(...xs), y:niv}, {x:Math.max(...xs), y:niv}]);
  const x0 = Math.min(...todos.map(p=>p.x)), x1 = Math.max(...todos.map(p=>p.x));
  const y0 = Math.min(...todos.map(p=>p.y)), y1 = Math.max(...todos.map(p=>p.y));
  const k = Math.min((W2-2*m)/Math.max(x1-x0,1e-6), (H2-2*m)/Math.max(y1-y0,1e-6));
  const X = x => m + (x-x0)*k + ((W2-2*m) - (x1-x0)*k)/2;
  const Y = y => H2 - m - (y-y0)*k - ((H2-2*m) - (y1-y0)*k)/2;
  const F3 = v => v.toFixed(1);
  let s = '<svg class="croq-svg" viewBox="0 0 ' + W2 + ' ' + H2 + '" xmlns="http://www.w3.org/2000/svg">';
  // superficie libre
  s += '<line x1="0" y1="' + F3(Y(niv)) + '" x2="' + W2 + '" y2="' + F3(Y(niv)) + '" stroke="#2f7fb5" stroke-width="1.4"/>';
  s += '<text x="' + (c.z===1 ? 4 : W2-4) + '" y="' + F3(Y(niv)-3) + '" font-size="8" fill="#1f6b96" text-anchor="' + (c.z===1?'start':'end') + '">superficie libre · zona ' + c.z + '</text>';
  // diagrama
  const poly = pts.map(p=>F3(X(p.x)) + ',' + F3(Y(p.y))).concat(desp.slice().reverse().map(p=>F3(X(p.x)) + ',' + F3(Y(p.y)))).join(' ');
  s += '<polygon points="' + poly + '" fill="rgba(192,57,43,.14)" stroke="#c0392b" stroke-width="1"/>';
  // flechas del diagrama
  const nfl = Math.min(6, pts.length-1);
  for(let i=1;i<=nfl;i++){
    const q = Math.round(i/(nfl+1)*(pts.length-1));
    const a = desp[q], b = pts[q];
    if(Math.hypot(X(a.x)-X(b.x), Y(a.y)-Y(b.y)) < 8) continue;
    s += '<line x1="' + F3(X(a.x)) + '" y1="' + F3(Y(a.y)) + '" x2="' + F3(X(b.x)) + '" y2="' + F3(Y(b.y)) + '" stroke="#c0392b" stroke-width=".9" marker-end="url(#fl' + c.k + ')"/>';
  }
  s += '<defs><marker id="fl' + c.k + '" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#c0392b"/></marker>'
     + '<marker id="fr' + c.k + '" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 z" fill="#8f1d12"/></marker></defs>';
  // tramo
  s += '<polyline points="' + pts.map(p=>F3(X(p.x)) + ',' + F3(Y(p.y))).join(' ') + '" fill="none" stroke="#1b1f24" stroke-width="3.2" stroke-linecap="round"/>';
  // nombres de los extremos
  const nomT = d.T && d.T.nombre ? d.T.nombre : '', nomD = d.D && d.D.nombre ? d.D.nombre : '';
  if(nomT) s += '<text x="' + F3(X(p0.x)+5) + '" y="' + F3(Y(p0.y)-5) + '" font-size="9" font-weight="700" fill="#0b3f3a">' + nomT + '</text>';
  if(nomD) s += '<text x="' + F3(X(p1.x)+5) + '" y="' + F3(Y(p1.y)+11) + '" font-size="9" font-weight="700" fill="#0b3f3a">' + nomD + '</text>';
  // resultante en P
  const Px = X(c.P.x), Py = Y(c.P.y), Lf = 46;
  s += '<line x1="' + F3(Px - c.dir.x*Lf) + '" y1="' + F3(Py + c.dir.y*Lf) + '" x2="' + F3(Px - c.dir.x*7) + '" y2="' + F3(Py + c.dir.y*7) + '" stroke="#8f1d12" stroke-width="2.2" marker-end="url(#fr' + c.k + ')"/>';
  s += '<circle cx="' + F3(Px) + '" cy="' + F3(Py) + '" r="2.6" fill="#8f1d12"/>';
  s += '<text x="' + F3(Px - c.dir.x*(Lf+4)) + '" y="' + F3(Py + c.dir.y*(Lf+4) + (c.dir.y > 0.5 ? 9 : (c.dir.y < -0.5 ? -3 : 3))) + '" font-size="9" font-weight="700" fill="#8f1d12" text-anchor="' + (c.dir.x > 0.3 ? 'end' : (c.dir.x < -0.3 ? 'start' : 'middle')) + '">F<tspan font-size="7" dy="2">' + c.k + '</tspan><tspan dy="-2"> = ' + dec(c.F,'f') + ' ' + unitFor + '</tspan></text>';
  s += '<text x="' + F3(Px + 6) + '" y="' + F3(Py + 3) + '" font-size="8.5" font-style="italic" fill="#8f1d12">P</text>';
  // cota z_P
  const lado = (c.z === 1) ? -1 : 1;
  const xc = (lado < 0) ? m*0.55 : W2 - m*0.55;
  s += '<line x1="' + F3(xc) + '" y1="' + F3(Y(niv)) + '" x2="' + F3(xc) + '" y2="' + F3(Py) + '" stroke="#1b1f24" stroke-width=".9"/>';
  s += '<line x1="' + F3(Px) + '" y1="' + F3(Py) + '" x2="' + F3(xc) + '" y2="' + F3(Py) + '" stroke="#1b1f24" stroke-width=".6" stroke-dasharray="2,2"/>';
  [Y(niv), Py].forEach(yy=>{ s += '<line x1="' + F3(xc-3) + '" y1="' + F3(yy+3) + '" x2="' + F3(xc+3) + '" y2="' + F3(yy-3) + '" stroke="#1b1f24" stroke-width=".9"/>'; });
  s += '<text x="' + F3(xc + lado*(-4)) + '" y="' + F3((Y(niv)+Py)/2 + 3) + '" font-size="8.5" font-weight="600" fill="#1b1f24" text-anchor="' + (lado<0 ? 'start' : 'end') + '">z<tspan font-size="6.5" dy="2">P</tspan><tspan dy="-2"> = ' + dec(c.zP,'len') + ' ' + unitLen + '</tspan></text>';
  s += '</svg>';
  return s;
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
  cargas.forEach(c=>{
    const d = c.des;
    h += '<div class="fig-card"><div class="fig-card-datos">'
      + '<div class="fig-card-h"><b>' + kx(c.nombre) + ' · tramo ' + nomTramo(c.t) + ' · zona ' + c.z + '</b>'
      + '<span class="hint-sm" style="margin:0">' + (d ? (d.tipo === 'curvo' ? 'placa curva' : (d.horizontal ? 'placa horizontal' : (Math.abs(d.angPlaca-90) < 1e-6 ? 'placa vertical' : 'placa inclinada ' + d.angPlaca.toFixed(1) + '°'))) : '') + '</span></div>';
    if(!d){
      h += '<div class="hint-sm">Resultante por integración: ' + kx('F = ' + f(c.F)) + ' ' + uF + '.</div>';
    } else if(d.tipo === 'recto'){
      h += '<div class="proc-block" style="padding:9px 12px">';
      d.bandas.forEach((bd,i)=>{
        const pre = d.bandas.length > 1 ? '<div class="proc-sub">Capa ' + (i+1) + ' (γ = ' + f(bd.g) + ')</div>' : '';
        h += pre;
        if(bd.Fr > 1e-12)
          h += '<div class="eq-row"><div class="eq-body">' + kx('F_{\\square} = b\\,L\\,p_{\\min} = ' + nl(c.b) + '\\,(' + nl(bd.l) + ')(' + f(Math.min(bd.p0,bd.p1)) + ') = ' + f(bd.Fr) + '\\ \\text{' + uF + '}\\quad\\text{a}\\ L/2 = ' + nl(bd.sR)) + '</div></div>';
        if(bd.Ft > 1e-12)
          h += '<div class="eq-row"><div class="eq-body">' + kx('F_{\\triangle} = \\tfrac12\\,b\\,L\\,(p_{\\max}-p_{\\min}) = \\tfrac12\\,' + nl(c.b) + '\\,(' + nl(bd.l) + ')(' + f(Math.abs(bd.p1-bd.p0)) + ') = ' + f(bd.Ft) + '\\ \\text{' + uF + '}\\quad\\text{a}\\ ' + (bd.p1 >= bd.p0 ? '2L/3' : 'L/3') + ' = ' + nl(bd.sT)) + '</div></div>';
      });
      const sumaF = d.bandas.map(bd=>f(bd.F)).join(' + ');
      h += '<div class="eq-row"><div class="eq-body">' + kx(c.nombre + ' = ' + (d.bandas.length > 1 ? sumaF : d.bandas.map(bd=>(bd.Fr>1e-12?f(bd.Fr):'') + (bd.Fr>1e-12&&bd.Ft>1e-12?' + ':'') + (bd.Ft>1e-12?f(bd.Ft):'')).join('')) + ' = ' + f(d.F) + '\\ \\text{' + uF + '}') + '</div></div>';
      // centro de presión por momentos desde el extremo menos profundo
      const terms = [];
      d.bandas.forEach(bd=>{ if(bd.Fr>1e-12) terms.push(f(bd.Fr) + '(' + nl(bd.s0 + bd.sR) + ')'); if(bd.Ft>1e-12) terms.push(f(bd.Ft) + '(' + nl(bd.s0 + bd.sT) + ')'); });
      h += '<div class="eq-row"><div class="eq-body">' + kx('s_P = \\dfrac{\\sum F_i s_i}{' + c.nombre + '} = \\dfrac{' + terms.join(' + ') + '}{' + f(d.F) + '} = ' + nl(d.sP) + '\\ \\text{' + uL + '}') + '</div></div>'
        + '<div class="hint-sm">' + kx('s_P') + ' desde ' + (d.T.nombre ? d.T.nombre : 'la superficie libre') + '.</div>'
        + (d.gzA ? '<div class="eq-row"><div class="eq-body">' + kx('\\gamma\\,\\bar z\\,A = ' + f(d.gzA.g) + '\\,(' + nl(d.gzA.zBar) + ')(' + nl(d.gzA.A) + ') = ' + f(d.gzA.F) + '\\ \\text{' + uF + '}\\quad\\checkmark') + '</div></div>' : '');
      h += '</div>';
    } else {
      h += '<div class="proc-block" style="padding:9px 12px">';
      h += '<div class="proc-sub">Componente horizontal (proyección vertical, ' + nl(d.yTop - d.yBot) + ' ' + uL + ')</div>';
      d.bandasH.forEach((bd,i)=>{
        if(bd.Fr > 1e-12) h += '<div class="eq-row"><div class="eq-body">' + kx('F_{h\\square} = b\\,h\\,p_{\\text{sup}} = ' + nl(c.b) + '(' + nl(bd.h) + ')(' + f(bd.p0) + ') = ' + f(bd.Fr)) + '</div></div>';
        if(bd.Ft > 1e-12) h += '<div class="eq-row"><div class="eq-body">' + kx('F_{h\\triangle} = \\tfrac12\\,b\\,h\\,(p_{\\text{inf}}-p_{\\text{sup}}) = \\tfrac12\\,' + nl(c.b) + '(' + nl(bd.h) + ')(' + f(bd.p1-bd.p0) + ') = ' + f(bd.Ft)) + '</div></div>';
      });
      h += '<div class="eq-row"><div class="eq-body">' + kx('F_h = ' + f(Math.abs(d.Fh)) + '\\ \\text{' + uF + '}\\ (\\text{hacia la ' + d.sentidoH + '})') + '</div></div>';
      h += '<div class="proc-sub" style="margin-top:6px">Componente vertical (peso del bloque de líquido sobre la placa)</div>';
      if(d.segmento){
        h += '<div class="eq-row"><div class="eq-body">' + kx('A_{\\text{bloque}} = A_{\\text{trapecio}} ' + (d.segmento.haciaArriba ? '-' : '+') + ' A_{\\text{segmento}} = ' + nl(d.segmento.Atrap) + (d.segmento.haciaArriba ? ' - ' : ' + ') + nl(d.segmento.Aseg) + ' = ' + nl(d.segmento.A) + '\\ \\text{' + uL + '}^2') + '</div></div>'
          + '<div class="hint-sm">Segmento circular: ' + kx('A = \\tfrac{R^2}{2}(\\varphi - \\sin\\varphi)') + ' con ' + kx('R = ' + nl(d.arc.R)) + ' ' + uL + ' y ' + kx('\\varphi = ' + (d.segmento.phi*180/Math.PI).toFixed(2) + '^\\circ') + '.</div>';
      }
      h += '<div class="eq-row"><div class="eq-body">' + kx('F_v = b\\sum\\gamma_i A_i = ' + nl(c.b) + '\\,(' + d.areas.filter(a=>a.A>1e-12).map(a=>f(a.g) + '\\cdot' + nl(a.A)).join(' + ') + ') = ' + f(Math.abs(d.FvBloque)) + '\\ \\text{' + uF + '}\\ (\\text{hacia ' + d.sentidoV + '})') + '</div></div>';
      h += '<div class="eq-row"><div class="eq-body">' + kx(c.nombre + ' = \\sqrt{F_h^2 + F_v^2} = \\sqrt{' + f(Math.abs(d.Fh)) + '^2 + ' + f(Math.abs(d.Fv)) + '^2} = ' + f(d.F) + '\\ \\text{' + uF + '}\\qquad \\theta = ' + d.theta.toFixed(2) + '^\\circ') + '</div></div>';
      h += '<div class="eq-row"><div class="eq-body">' + kx('O_c = (' + nl(d.arc.cx) + ';\\ ' + nl(d.arc.cy) + ')\\qquad z_P = ' + nl(d.zP) + '\\ \\text{' + uL + '}') + '</div></div>';
      h += '</div>';
    }
    h += '</div><div class="fig-card-dib">' + (d ? croquisCarga(c, d) : '') + '</div></div>';
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
  h += '<div class="hint-sm">Comprobación con la integral numérica del programa'
    + (cargas.every(c=>!c.des || c.des.coincide) ? ' ✓' : ' <b style="color:#c0392b">(discrepancia: revisa la geometría)</b>') + '.</div>';
  h += '</div>';

  // ═══ 3 · Equilibrio ═══
  const plan = r.plan;
  h += '<div class="res-section"><div class="res-title"><div class="num">3</div>'
    + 'Equilibrio de la compuerta</div>'
    + '<div class="proc-block proc-cols">'
    + '<div class="proc-col"><div class="proc-sub">Incógnitas (' + r.diag.inc + ')</div>'
    + r.inc.map(u=>'<div class="eq-row"><div class="eq-body">' + kx(simbIncognita(u)) + ' <span class="hint-sm" style="display:inline">— ' + descIncognita(u) + ' en ' + u.n.nombre + (u.tipo==='R' || u.tipo==='T' ? ' (' + anguloIncognita(u).toFixed(1) + '°)' : '') + '</span></div></div>').join('')
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
    h += '<tr><td><b>'+kx(simbIncognita(u))+'</b></td><td>'+descIncognita(u)+' en <b>'+u.n.nombre+'</b></td>'
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
    + (r.cierra ? '✓ Con todas las fuerzas (líquido, reacciones y tope) las tres sumas son nulas.'
                : '⚠ El equilibrio no cierra; revisa apoyos y caras mojadas.') + '</div>';
  const planas = cargas.filter(c=>c.des && c.des.tipo==='recto' && !c.des.horizontal);
  if(planas.length)
    h += '<div class="hint-sm">Centro de presión bajo el centro de la parte mojada: '
      + planas.map(c=>kx('z_{P' + c.k + '} = ' + nl(c.zP) + ' > \\bar z = ' + nl(c.des.zBar))).join(', ') + ' ✓</div>';
  h += '</div></div>';
  return h;
}
