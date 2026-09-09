function renderResults(res, u4, u2, u1){
  currentU4=u4; currentU2=u2; currentU1=u1;
  const rp = document.getElementById('resultsPanel');
  if(rp) rp.style.display='block';
  const hint = document.getElementById('noResultsHint');
  if(hint) hint.style.display='none';
  const ra = document.getElementById('resultsArea');
  if(ra){ ra.style.display='block'; }

  setTimeout(()=>{ ra && ra.scrollIntoView({behavior:'smooth', block:'start'}); }, 150);

  const f  = v => fmtVal(v);
  const nL = v => decFix(v,'len');
  const het = res.hetero;
  const simb = matSimbolo();
  let html = '';

  // ══════════════════════════════════════════════════
  //  1 · Sección compuesta con cotas
  // ══════════════════════════════════════════════════
  html += `<div class="res-section">
    <div class="res-section-title"><div class="num" style="background:var(--grn)">✎</div>Sección compuesta — visualización con cotas</div>
    <canvas id="compositeCanvas" style="width:100%;max-width:860px;height:420px;display:block;margin:0 auto;border-radius:10px;border:1px solid var(--border);background:#fff;"></canvas>
    <div style="font-size:10px;color:var(--muted);margin-top:6px;">
      Área que <b style="color:var(--grn2)">suma</b> = sólido &nbsp;|&nbsp;
      Área que <b style="color:#c0392b">resta</b> = trama (//) &nbsp;|&nbsp; G = centroide
    </div>
  </div>`;

  // Lectura como carga distribuida (propuesta 2.4): el ejemplo guiado del §9.4.
  if(typeof ejemploActualCen !== 'undefined' && ejemploActualCen === 'carga'){
    html += `<div class="res-section"><div class="proc-block"><div class="proc-sub">Lectura como carga distribuida (Hibbeler §9.4)</div>
      <div class="eq-row"><div class="eq-body">${kx(`F_R = \\int w\\,dx = A = ${ftex(res.A)}`)}</div></div>
      <div class="eq-row"><div class="eq-body">${kx(`\\bar{x} = ${ftex(res.xbar)}\\,${utex(u1)}\\quad\\text{(línea de acción)}`)}</div></div>
    </div></div>`;
  }

  // ══════════════════════════════════════════════════
  //  2 · Propiedades de cada figura, con su croquis al lado
  // ══════════════════════════════════════════════════
  html += `<div class="res-section">
    <div class="res-section-title"><div class="num">1</div>Propiedades de cada figura</div>`;
  res.steps.forEach((s,i)=>{
    const nom = s.fig.etiqueta || s.fig.name || FIG_DEFS[s.fig.type].name;
    const signo = s.fig.sign===1
      ? '<span style="color:var(--grn2);font-weight:700">＋ Suma</span>'
      : '<span style="color:#c0392b;font-weight:700">－ Resta</span>';
    html += `<div class="fig-card">
      <div class="fig-card-datos">
        <div class="fig-card-h">
          <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${s.fig.color}"></span>
          <b>${i+1}. ${esc(nom)}</b> ${signo}
        </div>
        <table class="fig-tabla">
          <thead><tr><th>Magnitud</th><th>Símbolo</th><th style="text-align:right">Valor</th><th>Unidad</th></tr></thead>
          <tbody>
            <tr><td>Área</td><td><i>A<sub>i</sub></i></td><td class="v">${f(Math.abs(s.a))}</td><td>${u2}</td></tr>
            <tr><td>Centroide x</td><td><i>x̃<sub>i</sub></i></td><td class="v">${nL(s.xi)}</td><td>${u1}</td></tr>
            <tr><td>Centroide y</td><td><i>ỹ<sub>i</sub></i></td><td class="v">${nL(s.yi)}</td><td>${u1}</td></tr>
            ${het?`<tr><td>${matMagnitud==='densidad'?'Densidad':'Peso específico'}</td><td><i>${simb}<sub>i</sub></i></td><td class="v">${s.mat?_matValTxt(s.mat):'—'}</td><td>${s.mat?esc(_matUniTxt(s.mat)):'—'}</td></tr>
            <tr><td>Peso</td><td><i>W<sub>i</sub></i></td><td class="v">${f(Math.abs(s.w))}</td><td>—</td></tr>`:''}
          </tbody>
        </table>
      </div>
      <div class="fig-card-dib">${croquisFigura(s.fig, i)}</div>
    </div>`;
  });
  html += `</div>`;

  // ══════════════════════════════════════════════════
  //  3 · Tabla resumen
  // ══════════════════════════════════════════════════
  html += `<div class="res-section">
    <div class="res-section-title"><div class="num">2</div>Tabla resumen de figuras</div>
    <div style="overflow-x:auto;">
    <table class="tabla-res">
      <thead><tr>
        <th>N°</th><th>Figura</th><th style="text-align:center">Signo</th>
        ${het?`<th style="text-align:center">${simb}<sub>i</sub></th>`:''}
        <th>A<sub>i</sub><br><span>(${u2})</span></th>
        <th>x̃<sub>i</sub><br><span>(${u1})</span></th>
        <th>ỹ<sub>i</sub><br><span>(${u1})</span></th>
        <th>A<sub>i</sub>x̃<sub>i</sub></th>
        <th>A<sub>i</sub>ỹ<sub>i</sub></th>
        ${het?`<th>W<sub>i</sub>x̃<sub>i</sub></th><th>W<sub>i</sub>ỹ<sub>i</sub></th>`:''}
      </tr></thead><tbody>`;
  res.steps.forEach((s,i)=>{
    const nom = s.fig.etiqueta || s.fig.name || FIG_DEFS[s.fig.type].name;
    html += `<tr>
      <td>${i+1}</td>
      <td><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${s.fig.color};margin-right:5px"></span>${esc(nom)}</td>
      <td style="text-align:center;font-weight:800;color:${s.fig.sign>0?'var(--grn2)':'#c0392b'}">${s.fig.sign>0?'＋':'－'}</td>
      ${het?`<td style="text-align:center;font-weight:700;color:var(--grn2)">${s.gLabel}</td>`:''}
      <td class="v">${f(s.a)}</td>
      <td class="v">${nL(s.xi)}</td>
      <td class="v">${nL(s.yi)}</td>
      <td class="v">${f(s.ax)}</td>
      <td class="v">${f(s.ay)}</td>
      ${het?`<td class="v">${f(s.wx)}</td><td class="v">${f(s.wy)}</td>`:''}
    </tr>`;
  });
  html += `<tr class="fila-total">
      <td colspan="${het?4:3}">Σ (Total)</td>
      <td class="v">${f(res.A)}</td><td>—</td><td>—</td>
      <td class="v">${f(res.Qy)}</td><td class="v">${f(res.Qx)}</td>
      ${het?`<td class="v">${f(res.Wx)}</td><td class="v">${f(res.Wy)}</td>`:''}
    </tr></tbody></table></div>`;
  if(het){
    html += `<div style="font-size:10.5px;color:var(--muted);margin-top:8px;line-height:1.6">
      W<sub>i</sub> = ${simb}<sub>i</sub> · A<sub>i</sub> &nbsp;·&nbsp; ` +
      MATS.map(m=>`<b style="color:var(--grn2)">${simb}${m.id}</b> = ${_matValTxt(m)} ${esc(_matUniTxt(m))}`).join(' &nbsp; ') + `</div>`;
  }
  html += `</div>`;

  // ══════════════════════════════════════════════════
  //  4 · Área, centroide y centro de gravedad
  // ══════════════════════════════════════════════════
  html += `<div class="res-section">
    <div class="res-section-title"><div class="num">3</div>${het?'Centroide, centro de gravedad y área de la sección':'Centroide y área de la sección compuesta'}</div>
    <div class="proc-block proc-cols">
      <div class="proc-col">
        <div class="proc-sub">Área total</div>
        <div class="eq-row"><div class="eq-body">${kx(`A_{total} = \\sum A_{i} = ${ftex(res.A)}\\,${utex(u2)}`)}</div></div>
      </div>
      <div class="proc-col">
        <div class="proc-sub">Coordenadas del centroide C</div>
        <div class="eq-row"><div class="eq-body">${kx(`\\bar{x} = \\dfrac{\\sum A_{i}\\tilde{x}_{i}}{\\sum A_{i}} = \\dfrac{${ftex(res.Qy)}}{${ftex(res.A)}} = ${kres(ftex(res.xbar)+'\\,'+utex(u1))}`)}</div></div>
        <div class="eq-row"><div class="eq-body">${kx(`\\bar{y} = \\dfrac{\\sum A_{i}\\tilde{y}_{i}}{\\sum A_{i}} = \\dfrac{${ftex(res.Qx)}}{${ftex(res.A)}} = ${kres(ftex(res.ybar)+'\\,'+utex(u1))}`)}</div></div>
      </div>`;
  if(het){
    html += `
      <div class="proc-col">
        <div class="proc-sub">Coordenadas del centro de gravedad G</div>
        <div class="eq-row"><div class="eq-body">${kx(`\\sum W_{i} = \\sum ${simb}_{i}A_{i} = ${kres(ftex(res.W))}`)}</div></div>
        <div class="eq-row"><div class="eq-body">${kx(`x_{G} = \\dfrac{\\sum W_{i}\\tilde{x}_{i}}{\\sum W_{i}} = \\dfrac{${ftex(res.Wx)}}{${ftex(res.W)}} = ${kres(ftex(res.xg)+'\\,'+utex(u1))}`)}</div></div>
        <div class="eq-row"><div class="eq-body">${kx(`y_{G} = \\dfrac{\\sum W_{i}\\tilde{y}_{i}}{\\sum W_{i}} = \\dfrac{${ftex(res.Wy)}}{${ftex(res.W)}} = ${kres(ftex(res.yg)+'\\,'+utex(u1))}`)}</div></div>
      </div>`;
  }
  html += `</div>
    <div class="summary-grid">
      <div class="summary-box"><div class="s-lbl">Área total A</div><div class="s-val">${f(res.A)}</div><div class="s-unit">${u2}</div></div>
      <div class="summary-box"><div class="s-lbl">Peso total ΣW</div><div class="s-val">${f(res.W)}</div><div class="s-unit">—</div></div>
      <div class="summary-box highlight"><div class="s-lbl">${het?'x̄ (centroide)':'x̄ = x_G'}</div><div class="s-val">${nL(res.xbar)}</div><div class="s-unit">${u1}</div></div>
      <div class="summary-box highlight"><div class="s-lbl">${het?'ȳ (centroide)':'ȳ = y_G'}</div><div class="s-val">${nL(res.ybar)}</div><div class="s-unit">${u1}</div></div>
    </div>`;
  if(het){
    html += `<div class="summary-grid">
      <div class="summary-box highlight" style="border-color:#c0392b"><div class="s-lbl">x_G</div><div class="s-val">${nL(res.xg)}</div><div class="s-unit">${u1}</div></div>
      <div class="summary-box highlight" style="border-color:#c0392b"><div class="s-lbl">y_G</div><div class="s-val">${nL(res.yg)}</div><div class="s-unit">${u1}</div></div>
      <div class="summary-box" style="border-color:#c0392b"><div class="s-lbl">Separación C–G</div><div class="s-val">${nL(res.sep)}</div><div class="s-unit">${u1}</div></div>
      <div class="summary-box"><div class="s-lbl">Figuras</div><div class="s-val">${res.steps.length}</div><div class="s-unit">—</div></div>
    </div>`;
  }
  html += `<div class="proc-block" style="border-left:3px solid ${het?'#c0392b':'var(--grn)'};padding-left:12px;margin-top:10px;">
      <div style="font-size:11.5px;line-height:1.65;color:var(--muted)">${
        het ? `Cuerpo <b style="color:#c0392b">heterogéneo</b>: G a ${nL(res.sep)} ${u1} de C.`
            : `Cuerpo <b style="color:var(--grn2)">homogéneo</b>: C = G = centro de masa.`
      }</div>
    </div>
  </div>`;

  // ══════════════════════════════════════════════════
  //  5 · Sección resuelta
  // ══════════════════════════════════════════════════
  html += `<div class="res-section">
    <div class="res-section-title"><div class="num">4</div>Sección resuelta — ubicación de ${het?'C y G':'C'}</div>
    <canvas id="finalCanvas" style="width:100%;max-width:860px;height:400px;display:block;margin:0 auto;border-radius:10px;border:1px solid var(--border);background:#fff;"></canvas>
    <div style="font-size:10px;color:var(--muted);margin-top:6px;">
      Sección con los huecos ya descontados. <b style="color:#b8860c">C</b> = centro geométrico (centroide)${het?` &nbsp;·&nbsp; <b style="color:#c0392b">G</b> = centro de gravedad y centro de masa`:``}
    </div>

  </div>`;

  // Se escribe DENTRO de #resultsPanel, no en #resultsArea. Si se escribiera en
  // resultsArea se destruiría el propio #resultsPanel y el segundo cálculo
  // fallaría con "rp is null". Mismo patrón que el Cap. 10.
  const cont = document.getElementById('resultsPanel');
  if(cont) cont.innerHTML = html;
  try{ if(cont) renderKatex(cont); }catch(e){ console.warn('KaTeX:',e); }
  setTimeout(()=>{ try{ drawCompositeFigure('compositeCanvas'); }catch(e){}
                   try{ drawSeccionFinal('finalCanvas'); }catch(e){} }, 90);
}

function rotateInertia(Ix, Iy, Ixy, thetaDeg){
  const th = thetaDeg*Math.PI/180;
  const c2 = Math.cos(2*th), s2 = Math.sin(2*th);
  const avg = (Ix+Iy)/2, dif = (Ix-Iy)/2;
  let Iu  = avg + dif*c2 - Ixy*s2;
  let Iv  = avg - dif*c2 + Ixy*s2;
  let Iuv = dif*s2 + Ixy*c2;
  // limpieza de residuos numéricos en múltiplos exactos de 90°
  const m = ((thetaDeg % 180)+180)%180;
  const near = (a,b)=>Math.abs(a-b)<1e-9;
  if(near(m,0)){   Iu=Ix; Iv=Iy; Iuv=Ixy; }
  if(near(m,90)){  Iu=Iy; Iv=Ix; Iuv=-Ixy; }   // ejes intercambiados: Iu ≡ Iy
  return {Iu, Iv, Iuv, swapped: near(m,90)};
}

function computeExtraPoint(res){
  if(!extraPoint || !res) return null;
  const dx = res.xbar - extraPoint.x;   // centroide relativo a P
  const dy = res.ybar - extraPoint.y;
  const IxP  = res.Ix  + res.A*dy*dy;
  const IyP  = res.Iy  + res.A*dx*dx;
  const IxyP = res.Ixy + res.A*dx*dy;
  const avg=(IxP+IyP)/2;
  const R=Math.sqrt(Math.pow((IxP-IyP)/2,2)+IxyP*IxyP);
  const thetaP = -0.5*Math.atan2(2*IxyP, IxP-IyP)*180/Math.PI;
  const out = {x:extraPoint.x, y:extraPoint.y, dx, dy, IxP, IyP, IxyP, avg, R, Imax:avg+R, Imin:avg-R, thetaP};
  if(axisAngle!==null && isFinite(axisAngle)){
    const rot = rotateInertia(IxP, IyP, IxyP, axisAngle);
    const norm = ((axisAngle % 360)+360)%360;   // 0..360
    out.rot = {
      ang: axisAngle,
      norm,
      Iu: rot.Iu, Iv: rot.Iv, Iuv: rot.Iuv,
      swapped: rot.swapped,
      c2: Math.cos(2*axisAngle*Math.PI/180),
      s2: Math.sin(2*axisAngle*Math.PI/180)
    };
  }
  return out;
}
