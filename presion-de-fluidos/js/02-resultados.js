// ═══════════════════════════════════════════════════════════
//  RESULTADOS
// ═══════════════════════════════════════════════════════════
function renderResultados(r){
  const uF = unitFor, uL = unitLen;
  const f = v=>dec(v,'f'), nl = v=>dec(v,'len');
  let h = '';

  h += '<div class="res-section"><div class="res-title"><div class="num">1</div>'
    + 'Presión sobre cada tramo mojado</div>'
    + '<div class="verdict"><div class="verdict-t">Idea clave</div>'
    + 'En cada tramo la presión vale ' + kx('p=\\gamma h') + ' y actúa <b>perpendicular a la superficie</b>. '
    + 'La resultante de ese tramo es el área de su diagrama de presión, y su línea de acción pasa por el '
    + 'centroide del mismo. Con varios tramos, cada uno aporta su propia resultante.</div>'
    + '<table class="tabla"><thead><tr><th>Tramo</th><th>Tipo</th>'
    + '<th class="r">Longitud (' + uL + ')</th>'
    + '<th class="r">p mín / p máx (' + uPres() + ')</th>'
    + '<th class="r">F<sub>x</sub> (' + uF + ')</th><th class="r">F<sub>y</sub> (' + uF + ')</th>'
    + '<th class="r">|F| (' + uF + ')</th></tr></thead><tbody>';
  let SX=0, SY=0;
  r.cargas.forEach(c=>{
    SX += c.Fx; SY += c.Fy;
    h += '<tr><td><b>'+nomTramo(c.t)+'</b></td><td>'+(c.t.tipo==='arco'?'Curvo':'Recto')+'</td>'
      + '<td class="r">'+nl(c.len)+'</td>'
      + '<td class="r">'+f(c.pMin)+' / '+f(c.pMax)+'</td>'
      + '<td class="r">'+f(c.Fx)+'</td><td class="r">'+f(c.Fy)+'</td>'
      + '<td class="r"><b>'+f(c.F)+'</b></td></tr>';
  });
  h += '<tr class="fila-total"><td colspan="4">Σ resultante del líquido</td>'
    + '<td class="r">'+f(SX)+'</td><td class="r">'+f(SY)+'</td>'
    + '<td class="r">'+f(Math.hypot(SX,SY))+'</td></tr></tbody></table>';
  if(!r.cargas.length)
    h += '<div class="hint-sm">Ningún tramo tiene cara mojada asignada. Actívala en el panel.</div>';
  h += '</div>';

  h += '<div class="res-section"><div class="res-title"><div class="num">2</div>'
    + 'Equilibrio de la compuerta</div>'
    + '<div class="proc-block proc-cols">'
    + '<div class="proc-col"><div class="proc-sub">Incógnitas</div>'
    + '<div class="eq-row"><div class="eq-body">' + kx('n = ' + r.diag.inc) + '</div></div></div>'
    + '<div class="proc-col"><div class="proc-sub">Ecuaciones</div>'
    + '<div class="eq-row"><div class="eq-body">'
    + kx('3' + (r.diag.rot ? ' + ' + r.diag.rot + '\\;\\text{(rótulas)}' : '') + ' = ' + r.diag.eq)
    + '</div></div></div></div>'
    + '<div class="proc-block"><div class="proc-sub">Ecuaciones planteadas</div>'
    + '<div class="eq-row"><div class="eq-body">'
    + kx('\\sum F_x = 0 \\qquad \\sum F_y = 0 \\qquad \\sum M_{O} = 0') + '</div></div>'
    + (r.diag.rot
        ? '<div class="eq-row"><div class="eq-body">'
          + kx('\\sum M_{\\text{rótula}} = 0 \\;\\text{(solo las fuerzas de un lado)}') + '</div></div>'
          + '<div class="hint-sm">Una rótula no transmite momento: por eso aporta una ecuación adicional, '
          + 'tomando momentos en ella con las fuerzas situadas a un solo lado de la cadena.</div>'
        : '')
    + '</div></div>';

  h += '<div class="res-section"><div class="res-title"><div class="num">3</div>'
    + 'Reacciones y fuerza del tope</div>'
    + '<table class="tabla"><thead><tr><th>Punto</th><th>Tipo</th><th>Dirección</th>'
    + '<th class="r">Valor (' + uF + ')</th><th>Sentido</th></tr></thead><tbody>';
  r.inc.forEach((u,j)=>{
    const v = r.val[j];
    let tipo, dirTxt;
    if(u.tipo==='Rx'){ tipo='Apoyo fijo'; dirTxt='horizontal'; }
    else if(u.tipo==='Ry'){ tipo='Apoyo fijo'; dirTxt='vertical'; }
    else if(u.tipo==='R'){ tipo='Apoyo móvil'; dirTxt=(u.ang*180/Math.PI).toFixed(0)+'°'; }
    else { tipo='<b style="color:#b45309">Tope</b>'; dirTxt=(u.ang*180/Math.PI).toFixed(0)+'°'; }
    h += '<tr><td><b>'+u.n.nombre+'</b></td><td>'+tipo+'</td><td>'+dirTxt+'</td>'
      + '<td class="r"><b>'+f(Math.abs(v))+'</b></td>'
      + '<td>'+(v>=0?'según la dirección indicada':'en sentido contrario')+'</td></tr>';
  });
  h += '</tbody></table>';

  const tope = r.inc.map((u,j)=>({u,v:r.val[j]})).filter(o=>o.u.tipo==='T');
  if(tope.length){
    h += '<div class="summary-grid" style="margin-top:11px">'
      + tope.map(o=>'<div class="summary-box hl"><div class="s-lbl">Tope en '+o.u.n.nombre+'</div>'
        + '<div class="s-val">'+f(Math.abs(o.v))+'</div><div class="s-unit">'+uF+'</div></div>').join('')
      + '<div class="summary-box"><div class="s-lbl">Empuje total X</div><div class="s-val">'+f(Math.abs(SX))+'</div><div class="s-unit">'+uF+'</div></div>'
      + '<div class="summary-box"><div class="s-lbl">Empuje total Y</div><div class="s-val">'+f(Math.abs(SY))+'</div><div class="s-unit">'+uF+'</div></div>'
      + '</div>';
  }
  h += '</div>';

  // comprobación
  let cx=0, cy=0, cm=0;
  r.cargas.forEach(c=>{ cx+=c.Fx; cy+=c.Fy; cm+=c.Mo; });
  r.inc.forEach((u,j)=>{
    const v = r.val[j];
    const d = (u.tipo==='Rx')?{x:1,y:0}:(u.tipo==='Ry')?{x:0,y:1}:{x:Math.cos(u.ang),y:Math.sin(u.ang)};
    cx += v*d.x; cy += v*d.y; cm += u.n.x*v*d.y - u.n.y*v*d.x;
  });
  const ok = Math.abs(cx)<1e-6*Math.max(1,Math.abs(SX)) && Math.abs(cy)<1e-6*Math.max(1,Math.abs(SY));
  h += '<div class="res-section"><div class="res-title"><div class="num">4</div>Comprobación</div>'
    + '<div class="proc-block"><div class="eq-row"><div class="eq-body">'
    + kx('\\sum F_x = ' + cx.toExponential(2) + ' \\qquad \\sum F_y = ' + cy.toExponential(2)
         + ' \\qquad \\sum M_{O} = ' + cm.toExponential(2)) + '</div></div>'
    + '<div class="hint-sm" style="color:' + (ok?'#15803d':'#c0392b') + '">'
    + (ok ? '✓ Las tres sumas son nulas: la compuerta queda en equilibrio con estas reacciones.'
          : '⚠ El equilibrio no cierra; revisa apoyos y caras mojadas.') + '</div></div></div>';
  return h;
}
