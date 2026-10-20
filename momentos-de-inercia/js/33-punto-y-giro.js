// ══════════════════════════════════════════════════════════════════════
//  VENTANA «PUNTO Y GIRO DE EJES» AL PULSAR CALCULAR (solo 2D)
// ══════════════════════════════════════════════════════════════════════
// (2026-10-20, petición del profesor: el mismo criterio que «Tramos de la
// solución» de fuerzas internas.) Antes de resolver se piden, los dos
// opcionales, un punto de análisis P y un ángulo de giro de ejes θ (desde +x,
// positivo antihorario):
//   · Con P: Steiner desde C hasta P, ejes principales en P y, si hay θ, los
//     ejes girados θ desde los x-y de P sin girar (computeExtraPoint, 24-).
//   · Sin P y con θ: el giro se aplica en el centroide C, a los ejes paralelos
//     a x-y (giroEnCentroide, 24-). Los principales siguen su procedimiento.
//   · Sin nada: el cálculo de siempre.
// Lo elegido vive en extraPoint y axisAngle (00-), que ya se guardaban en el
// archivo; el giro en C es axisAngle sin extraPoint. Los campos que había en
// los resultados para escribir P y θ se quitaron: solo se piden aquí.

function calcularConOpciones(){
  if(modoEspacio === '3d') return calculate();          // el 3D de masas no lo usa
  if(!figures.length){ aviso('Agrega al menos una figura.'); return; }
  const m = document.getElementById('calcOpcModal');
  if(!m){ calculate(); return; }
  const pon = (id, v) => { const el = document.getElementById(id); if(el) el.value = (v === null || v === undefined) ? '' : decFix(v, id === 'coAng' ? 'ang' : 'len'); };
  pon('coX', extraPoint ? extraPoint.x : null);
  pon('coY', extraPoint ? extraPoint.y : null);
  pon('coAng', (axisAngle !== null && isFinite(axisAngle)) ? axisAngle : null);
  m.querySelectorAll('.calcop-u').forEach(el => { el.textContent = unitLabel || unit; });
  m.classList.add('show');
  pintarOpcionesCalc();
}
function cerrarOpcionesCalc(){
  const m = document.getElementById('calcOpcModal');
  if(m) m.classList.remove('show');
}

// Lee los tres campos. Un campo vacío es «no se pide»; uno con texto que no es
// un número, un error (el 0 SÍ es un valor válido).
function _leerOpcionesCalc(){
  const lee = id => {
    const el = document.getElementById(id);
    const t = el ? String(el.value).trim() : '';
    if(t === '') return {vacio:true};
    const v = parseFloat(t.replace(',', '.'));
    return isFinite(v) ? {v} : {error:true};
  };
  const x = lee('coX'), y = lee('coY'), a = lee('coAng');
  const out = {p:null, ang:null, error:''};
  if(x.error || y.error) out.error = 'Las coordenadas de P tienen que ser números.';
  else if(x.vacio !== y.vacio) out.error = 'Escribe las dos coordenadas de P, o ninguna.';
  else if(!x.vacio) out.p = {x:x.v, y:y.v};
  if(a.error) out.error = out.error || 'El ángulo θ tiene que ser un número.';
  else if(!a.vacio) out.ang = a.v;
  return out;
}

// Centroide de la sección sin pasar por calculate(): la vista previa lo
// necesita antes de resolver.
function _centroideRapido(){
  let A = 0, Qx = 0, Qy = 0;
  for(const fig of figures){
    const a = figArea(fig)*fig.sign;
    A += a; Qx += a*fig.cy; Qy += a*fig.cx;
  }
  return Math.abs(A) > 1e-12 ? {x:Qy/A, y:Qx/A} : null;
}

function pintarOpcionesCalc(){
  const o = _leerOpcionesCalc();
  const res = document.getElementById('coRes');
  const u = unitLabel || unit;
  if(res){
    let t = '<div class="calcop-res-t">Se calculará</div><ul class="calcop-lista">'
      + '<li>Centroide <b>C</b>, inercias centroidales y ejes principales</li>';
    if(o.p) t += '<li>En <b>P(' + decStr(o.p.x,'len') + '; ' + decStr(o.p.y,'len') + ')</b> ' + u
      + ': Steiner y ejes principales</li>';
    if(o.ang !== null) t += '<li>Ejes girados <b>θ = ' + decStr(o.ang,'ang') + '°</b> en '
      + (o.p ? '<b>P</b>' : 'el centroide <b>C</b>') + '</li>';
    t += '</ul>';
    if(o.error) t += '<div class="calcop-err">' + o.error + '</div>';
    res.innerHTML = t;
  }
  _dibujarPreviaCalc(o);
}

// La sección con el origen, el centroide C, el punto P y los ejes girados θ.
function _dibujarPreviaCalc(o){
  const cv = document.getElementById('coPrev');
  if(!cv) return;
  const dpr = window.devicePixelRatio || 1;
  const W = cv.clientWidth || 380, H = cv.clientHeight || 220;
  cv.width = Math.round(W*dpr); cv.height = Math.round(H*dpr);
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.fillStyle = '#fbfcfe'; c.fillRect(0, 0, W, H);
  const b = figuresBBox();
  if(!b) return;
  const C = _centroideRapido();
  let x0 = Math.min(b.x0, 0), x1 = Math.max(b.x1, 0), y0 = Math.min(b.y0, 0), y1 = Math.max(b.y1, 0);
  if(o.p){ x0 = Math.min(x0, o.p.x); x1 = Math.max(x1, o.p.x); y0 = Math.min(y0, o.p.y); y1 = Math.max(y1, o.p.y); }
  const m = o.ang !== null ? 44 : 26;            // con giro, aire para los ejes u-v
  const sc = Math.min((W - 2*m)/Math.max(x1 - x0, 1e-9), (H - 2*m)/Math.max(y1 - y0, 1e-9));
  const ox = (W - (x1 - x0)*sc)/2 - x0*sc, oy = (H + (y1 - y0)*sc)/2 + y0*sc;
  const X = x => ox + x*sc, Y = y => oy - y*sc;

  // Ejes x-y por el origen
  c.strokeStyle = '#9aa4b2'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(6, Y(0)); c.lineTo(W - 6, Y(0)); c.moveTo(X(0), H - 6); c.lineTo(X(0), 6); c.stroke();
  c.fillStyle = '#66727e'; c.font = '700 10px Inter, sans-serif';
  c.fillText('x', W - 14, Y(0) - 5); c.fillText('y', X(0) + 5, 14);

  // Figuras: primero las que suman, luego los huecos encima
  const trazar = fig => {
    const def = FIG_DEFS[fig.type]; if(!def || !def.draw) return false;
    c.save();
    c.translate(X(fig.cx), Y(fig.cy));
    c.rotate(-(fig.rotation || 0)*Math.PI/180);
    c.scale(sc, -sc);
    c.beginPath();
    try{ def.draw(c, fig.dims); }catch(e){ c.restore(); return false; }
    c.restore();
    return true;
  };
  for(const pasada of [1, -1]){
    for(const fig of figures){
      if(fig.sign !== pasada || !trazar(fig)) continue;
      c.fillStyle = pasada === 1 ? 'rgba(13,58,143,.22)' : '#fbfcfe';
      c.fill();
      c.strokeStyle = pasada === 1 ? 'rgba(13,58,143,.85)' : 'rgba(192,57,43,.8)';
      c.lineWidth = 1.2; c.stroke();
    }
  }

  // Ejes girados θ en P o en C
  const punto = (px, py, col, letra) => {
    c.fillStyle = col; c.beginPath(); c.arc(X(px), Y(py), 3.6, 0, 2*Math.PI); c.fill();
    c.font = '800 11px Inter, sans-serif'; c.fillText(letra, X(px) + 6, Y(py) - 6);
  };
  const base = o.p || C;
  if(base && o.ang !== null){
    const a = o.ang*Math.PI/180;
    const bx = X(base.x), by = Y(base.y);
    // Los ejes no salen del recuadro: el semieje se acorta hasta el borde más
    // cercano en su dirección, con aire para la letra.
    const hasta = (ux, uy) => {
      let t = Infinity; const m2 = 16;
      if(ux > 1e-9) t = Math.min(t, (W - m2 - bx)/ux); else if(ux < -1e-9) t = Math.min(t, (m2 - bx)/ux);
      if(uy > 1e-9) t = Math.min(t, (H - m2 - by)/uy); else if(uy < -1e-9) t = Math.min(t, (m2 - by)/uy);
      return t;
    };
    // Cada semieje mide lo que cabe en su dirección: el positivo (el que lleva
    // la letra) y el negativo por separado, para que un punto junto al borde
    // no deje los dos ejes en un par de píxeles.
    const Lmax = 0.36*Math.min(W, H);
    const rArco = 22;
    // Halo blanco debajo, para que los ejes se lean sobre el relleno de la sección.
    const trazo = (x0, y0, x1, y1, col, ancho, raya) => {
      c.setLineDash(raya || []);
      c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = ancho + 2.6;
      c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
      c.strokeStyle = col; c.lineWidth = ancho;
      c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
      c.setLineDash([]);
    };
    trazo(bx, by, bx + Math.min(rArco + 20, hasta(1, 0)), by, '#3d4550', 1, [4, 3]);
    c.font = '800 11px Inter, sans-serif';
    for(const [ang, et] of [[a, 'u'], [a + Math.PI/2, 'v']]){
      const ux = Math.cos(ang), uy = -Math.sin(ang);
      const Lp = Math.max(14, Math.min(Lmax, hasta(ux, uy)/1.1)), Ln = Math.max(0, Math.min(Lmax, hasta(-ux, -uy)));
      trazo(bx - Ln*ux, by - Ln*uy, bx + Lp*ux, by + Lp*uy, '#0d3a8f', 1.7, [6, 3]);
      c.fillStyle = '#0d3a8f';
      c.fillText(et, bx + (Lp + 6)*ux - 3, by + (Lp + 6)*uy + 4);
    }
    if(Math.abs(o.ang % 360) > 0.5){
      c.strokeStyle = '#c0392b'; c.lineWidth = 1.4;
      c.beginPath(); c.arc(bx, by, rArco, 0, -a, o.ang > 0); c.stroke();
      c.fillStyle = '#c0392b';
      c.fillText('θ', bx + (rArco + 9)*Math.cos(a/2) - 3, by - (rArco + 9)*Math.sin(a/2) + 4);
    }
  }
  if(C) punto(C.x, C.y, '#b45309', 'C');
  if(o.p) punto(o.p.x, o.p.y, '#c0392b', 'P');
}

function aplicarOpcionesCalc(){
  const o = _leerOpcionesCalc();
  if(o.error){ pintarOpcionesCalc(); aviso(o.error, 'error'); return; }
  extraPoint = o.p;
  axisAngle = o.ang;
  // Sin punto, el giro se ve en el centroide: el lienzo y el círculo de Mohr
  // de la sección lo dibujan desde mohrTheta (05-, 23-).
  mohrTheta = (!extraPoint && axisAngle !== null) ? axisAngle : 0;
  cerrarOpcionesCalc();
  calculate();
}
