// ═══════════════════════════════════════════════════════════
//  CALCULAR
// ═══════════════════════════════════════════════════════════
function calcular(){
  R = analizar();
  const rp = document.getElementById('resultsPanel');
  const ra = document.getElementById('resultsArea');
  const hint = document.getElementById('noResultsHint');
  ra.style.display = 'block';
  if(hint) hint.style.display = 'none';
  rp.style.display = 'block';
  if(R.error){ rp.innerHTML = renderError(R); dibujar(); return; }
  R.internas = fuerzasInternas(R);
  rp.innerHTML = renderResultados(R);
  try{ renderKatex(rp); }catch(e){}
  dibujar();
  setTimeout(()=>{ try{ ra.scrollIntoView({behavior:'smooth', block:'start'}); }catch(e){} },130);
}

function renderError(r){
  let t;
  if(r.error==='sin-viga') t = 'Todavía no hay ningún tramo. Usa <b>Viga</b> en la barra de herramientas.';
  else if(r.error==='no-conexa') t = 'Hay tramos sueltos: todos deben estar unidos por sus nudos en una sola estructura.';
  else if(r.error==='anillo') t = 'Los tramos forman un <b>anillo cerrado</b>: este tema resuelve vigas y pórticos abiertos, sin anillos.';
  else if(r.error==='determinacion'){
    const d=r.diag, g=d.inc-d.eq;
    t = 'Hay <b>'+d.inc+' reacción(es)</b> y <b>'+d.eq+' ecuación(es)</b> de equilibrio'
      + (d.rot? ' (3 más '+d.rot+' por las rótulas)':'') + '. '
      + (g<0 ? 'Faltan '+(-g)+': la viga no está sujeta y se movería.'
             : 'Sobran '+g+': el problema es hiperestático y no se resuelve solo con la estática.');
  }
  else t = 'La disposición de apoyos no impide el movimiento. Revisa sus tipos.';
  return '<div class="res-section"><div class="res-title"><div class="num">!</div>No se puede resolver</div>'
       + '<div class="verdict bad"><div class="verdict-t">Equilibrio</div>'+t+'</div></div>';
}
