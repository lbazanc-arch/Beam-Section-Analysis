function _panelLatexPDF(){
  let panel = document.getElementById('panelLatexPDF');
  if(panel) return panel;
  panel = document.createElement('div');
  panel.id = 'panelLatexPDF';
  panel.style.cssText = 'display:none; position:fixed; inset:0; z-index:9000; '
    + 'background:rgba(15,20,28,.72); align-items:center; justify-content:center; padding:16px;';
  // El cierre pasa por una función con nombre en vez de código en línea: así no
  // depende de cómo queden escapadas las comillas dentro del atributo, y de
  // paso puede limpiar el visor.
  panel.innerHTML =
      '<div style="background:#fff; border-radius:10px; width:100%; max-width:900px; '
    +   'height:92vh; display:flex; flex-direction:column; overflow:hidden; position:relative;">'
    +   '<div style="display:flex; align-items:center; justify-content:space-between; '
    +     'padding:10px 14px; border-bottom:1px solid #e5d9c8;">'
    +     '<strong style="color:#0d3a8f">Reporte PDF (LaTeX)</strong>'
    +     '<button onclick="cerrarPanelLatex()" title="Cerrar" aria-label="Cerrar" '
    +       'style="border:none;background:none;font-size:22px;cursor:pointer;line-height:1;'
    +       'color:#6B7280;padding:0 4px;">&times;</button>'
    +   '</div>'
    +   '<div id="latexEstado" style="padding:8px 14px; font-size:12.5px; color:#6B7280;">'
    +     'Enviando a texlive.net\u2026</div>'
    +   '<iframe id="latexFrame" name="latexFrame" style="flex:1; border:none;"></iframe>'
    +   '<div id="latexPie" style="padding:6px 14px; font-size:10.5px; color:#9aa3ad; '
    +     'border-top:1px solid #f0eee9;">Si en lugar del PDF aparece texto, es el registro '
    +     'de LaTeX: c\u00f3pialo y av\u00edsanos.</div>'
    +   '<div id="latexCargando" style="position:absolute; inset:0; background:#fff; '
    +     'display:flex; flex-direction:column; align-items:center; justify-content:center; gap:18px;">'
    +     '<div style="display:flex; gap:10px; align-items:flex-end; height:64px;">'
    +       '<span class="bsa-let" style="color:#CDA953; animation-delay:0s">B</span>'
    +       '<span class="bsa-let" style="color:#8AB4CA; animation-delay:.22s">S</span>'
    +       '<span class="bsa-let" style="color:#22584B; animation-delay:.44s">A</span>'
    +     '</div>'
    +     '<div style="font-size:12px;color:#6B7280">Compilando el informe\u2026</div>'
    +   '</div>'
    + '</div>';
  document.body.appendChild(panel);
  return panel;
}

// Cierra la ventana del informe y deja el visor limpio, para que al volver a
// generar no se vea por un instante el PDF anterior.

function generarPDFLatex(){
  const btn = document.getElementById('btnLatex');
  if(btn && btn.dataset.ocupado === '1') return;

  const tex = construirLatex();
  if(!tex) return;

  try{
    if(btn) btn.dataset.ocupado = '1';
    const panel = _panelLatexPDF();
    const estado = document.getElementById('latexEstado');
    const frame = document.getElementById('latexFrame');
    estado.textContent = 'Enviando a texlive.net\u2026';
    estado.style.color = '#6B7280';
    const cargando = document.getElementById('latexCargando');
    if(cargando) cargando.style.display = 'flex';
    panel.style.display = 'flex';

    const viejo = document.getElementById('formLatexNet');
    if(viejo) viejo.remove();
    const form = document.createElement('form');
    form.id = 'formLatexNet';
    form.action = TEXLIVE_NET_URL;
    form.method = 'post';
    form.enctype = 'multipart/form-data';
    form.target = 'latexFrame';
    form.style.display = 'none';
    const campo = (nombre, valor)=>{
      const inp = document.createElement('textarea');
      inp.name = nombre; inp.value = valor;
      form.appendChild(inp);
    };
    campo('filename[]', 'document.tex');
    campo('filecontents[]', tex);
    campo('engine', 'pdflatex');
    campo('return', 'pdf');
    document.body.appendChild(form);
    form.submit();

    // Por CORS no se puede leer la respuesta para saber si es PDF o registro
    // de errores; el alumno lo ve directamente. Por eso el mensaje es neutro.
    frame.addEventListener('load', function(){
      const cg = document.getElementById('latexCargando');
      if(cg) cg.style.display = 'none';
      estado.textContent = 'Informe generado.';
      estado.style.color = '#15803D';
    }, {once:true});

    setTimeout(()=>{
      if(estado.textContent.indexOf('Enviando') === 0){
        estado.textContent = 'Sigue esperando respuesta de texlive.net. '
          + 'Si tarda demasiado, cierra este panel y vuelve a intentar.';
      }
    }, 45000);
    // Salvavidas: si nunca llega el evento 'load', la animación no puede
    // quedarse girando para siempre encima del informe.
    setTimeout(()=>{
      const cg = document.getElementById('latexCargando');
      if(cg) cg.style.display = 'none';
    }, 90000);
  }catch(e){
    console.error('Error al enviar a texlive.net:', e);
    aviso('Ocurri\u00f3 un error al preparar el env\u00edo: ' + e.message, 'error');
  }finally{
    if(btn) btn.dataset.ocupado = '0';
  }
}

// ── Croquis acotado de UNA figura, en SVG ──
// Va al costado de su tabla de propiedades. El encuadre se calcula DESPUÉS de
// muestrear el trazado y se une con la caja declarada, así ninguna figura
// puede salirse del recuadro aunque su bounds esté mal.
function croquisFigura(fig, idx){
  const def=FIG_DEFS[fig.type]; if(!def) return '';
  let b; try{ b=def.bounds(fig.dims); }catch(e){ return ''; }
  const W=190, H=150, M=30;                       // lienzo y margen para cotas

  // contorno de la figura mediante muestreo del trazado
  let path='';
  const cmds=[];
  const ctxFake={ moveTo:(x,y)=>cmds.push(['M',x,y]), lineTo:(x,y)=>cmds.push(['L',x,y]),
    closePath:()=>cmds.push(['Z']), arc:(cx,cy,r,a0,a1,acw)=>{
      const n=28; for(let i=0;i<=n;i++){ let a=a0+(a1-a0)*(i/n);
        cmds.push([i===0&&!cmds.length?'M':'L', cx+r*Math.cos(a), cy+r*Math.sin(a)]); } },
    bezierCurveTo:(a,bb,c,d,e,f)=>cmds.push(['L',e,f]),
    quadraticCurveTo:(a,bb,c,d)=>cmds.push(['L',c,d]),
    beginPath:()=>{}, ellipse:()=>{} };
  try{ def.draw(ctxFake, fig.dims); }catch(e){}

  // El encuadre se calcula DESPUÉS de muestrear: se une la caja declarada con
  // la caja real del trazado, así ninguna figura puede salirse del recuadro
  // aunque su bounds esté mal. (El sector circular se cortaba por esto.)
  const puntos = cmds.filter(c=>c[0]!=='Z');
  if(puntos.length){
    b = {
      left:   Math.min(b.left,   ...puntos.map(c=>c[1])),
      right:  Math.max(b.right,  ...puntos.map(c=>c[1])),
      bottom: Math.min(b.bottom, ...puntos.map(c=>c[2])),
      top:    Math.max(b.top,    ...puntos.map(c=>c[2]))
    };
  }
  const bw=Math.max(b.right-b.left,1e-9), bh=Math.max(b.top-b.bottom,1e-9);
  const s=Math.min((W-2*M)/bw, (H-2*M)/bh);
  const px = x => M + (x-b.left)*s;
  const py = y => H-M - (y-b.bottom)*s;           // Y hacia arriba

  cmds.forEach(c=>{
    if(c[0]==='Z'){ path+='Z'; return; }
    path += c[0] + px(c[1]).toFixed(1) + ',' + py(c[2]).toFixed(1) + ' ';
  });
  if(!path) path = `M${px(b.left)},${py(b.bottom)} L${px(b.right)},${py(b.bottom)} `
                 + `L${px(b.right)},${py(b.top)} L${px(b.left)},${py(b.top)} Z`;

  // centroide propio de la figura (en coordenadas locales)
  let cxl=0, cyl=0;
  try{
    const off = def.anchorOffset ? def.anchorOffset(fig.dims,'C') : {dx:0,dy:0};
    cxl=-off.dx; cyl=-off.dy;
  }catch(e){}
  const gx=px(cxl), gy=py(cyl);
  const col=fig.color||'#14766d';
  const neg=fig.sign<0;

  return `
  <div class="croq">
    <div class="croq-h">
      <span class="croq-n">${idx+1}</span>
      <span class="croq-t">${esc(fig.etiqueta||fig.name||def.name)}${neg?' <i>(hueco)</i>':''}</span>
    </div>
    <svg viewBox="0 0 ${W} ${H}" class="croq-svg">
      <path d="${path}" fill="${col}" fill-opacity="${neg?0.10:0.22}" stroke="${col}"
            stroke-width="1.6" stroke-dasharray="${neg?'4 3':'0'}"/>
      <line x1="${gx}" y1="${py(b.bottom)}" x2="${gx}" y2="${py(b.top)}"
            stroke="${col}" stroke-width=".8" stroke-dasharray="3 2" opacity=".55"/>
      <line x1="${px(b.left)}" y1="${gy}" x2="${px(b.right)}" y2="${gy}"
            stroke="${col}" stroke-width=".8" stroke-dasharray="3 2" opacity=".55"/>
      <circle cx="${gx}" cy="${gy}" r="3.4" fill="#e2aa1b" stroke="#fff" stroke-width="1"/>
      <text x="${gx+6}" y="${gy-5}" font-size="9" font-weight="700" fill="#b8860c">C${idx+1}</text>
      <line x1="${px(b.left)}" y1="${H-16}" x2="${px(b.right)}" y2="${H-16}" stroke="#64748b" stroke-width=".9"/>
      <line x1="${px(b.left)}" y1="${H-20}" x2="${px(b.left)}" y2="${H-12}" stroke="#64748b" stroke-width=".9"/>
      <line x1="${px(b.right)}" y1="${H-20}" x2="${px(b.right)}" y2="${H-12}" stroke="#64748b" stroke-width=".9"/>
      <text x="${(px(b.left)+px(b.right))/2}" y="${H-6}" font-size="8.5" fill="#475569" text-anchor="middle">${decFix(bw,'len')} ${unit}</text>
      <line x1="${W-16}" y1="${py(b.bottom)}" x2="${W-16}" y2="${py(b.top)}" stroke="#64748b" stroke-width=".9"/>
      <line x1="${W-20}" y1="${py(b.bottom)}" x2="${W-12}" y2="${py(b.bottom)}" stroke="#64748b" stroke-width=".9"/>
      <line x1="${W-20}" y1="${py(b.top)}" x2="${W-12}" y2="${py(b.top)}" stroke="#64748b" stroke-width=".9"/>
      <text x="${W-8}" y="${(py(b.bottom)+py(b.top))/2}" font-size="8.5" fill="#475569"
            text-anchor="middle" transform="rotate(-90 ${W-8} ${(py(b.bottom)+py(b.top))/2})">${decFix(bh,'len')} ${unit}</text>
    </svg>
    <div class="croq-d">
      <span>x̃ = ${decFix(fig.cx,'len')} ${unit}</span>
      <span>ỹ = ${decFix(fig.cy,'len')} ${unit}</span>
    </div>
  </div>`;
}

// Punto de entrada del lienzo del editor.
function dibujarCotasGenerales(){
  if(!figures.length) return;
  dibujarCotasSobre(ctx, {
    px: x => worldToScreen(x,0).x,
    py: y => worldToScreen(0,y).y,
    fuente: '600 10.5px Inter, sans-serif',
    fuenteTotal: '700 11px Inter, sans-serif',
    tick: 4.5, salto: 15, sepX: 44, sepY: 50, angulos: true
  });
}
