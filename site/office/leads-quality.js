(()=>{
  const enrichable=new Set(['nexjud','sindcopilot','mindsteps','mindcompliance','health-wallet','mydatamed','smartbots','modo']);
  const meta=d=>(d?.metadata&&typeof d.metadata==='object')?d.metadata:{};
  const quality=d=>meta(d).quality||{};
  const score=d=>Number(quality(d).fitScore||meta(d).fitScore||0);
  const name=s=>(window.AV_PORTFOLIO||[]).find(v=>v.slug===s)?.name||s;

  async function api(body){
    const r=await apiFetch('/api/lead-quality',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),p=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(p.error||'Não foi possível executar.');return p;
  }

  async function enrich(button,venture){
    const label=button.textContent;button.disabled=true;button.textContent='Enriquecendo…';
    try{const p=await api({action:'enrich',venture,limit:6});state.leads=null;await renderLeads();alert(`${p.updated||0} lead(s) de ${name(venture)} enriquecidos com sinais públicos.`)}catch(e){alert(e?.message||'Falha no enriquecimento.')}finally{button.disabled=false;button.textContent=label}
  }

  async function cvm(button){
    const label=button.textContent;button.disabled=true;button.textContent='Consultando CVM…';
    try{const p=await api({action:'cvm-sync',limit:50});state.leads=null;await renderLeads();alert(`${p.inserted||0} novo(s) lead(s) oficiais da CVM adicionados ao F-Insight. ${p.duplicates||0} duplicado(s) ignorado(s).`)}catch(e){alert(e?.message||'Falha ao consultar a CVM.')}finally{button.disabled=false;button.textContent=label}
  }

  function decorateCards(){
    document.querySelectorAll('.crm-card').forEach(card=>{
      const d=(state.leads||[]).find(x=>String(x.id)===String(card.dataset.leadId));if(!d||card.dataset.qualityDecorated)return;
      card.dataset.qualityDecorated='1';const m=meta(d),q=quality(d),s=score(d),verified=m.verifiedSource||m.cnpjProfile?.verifiedSource,cnpj=m.cnpj||m.cnpjProfile?.cnpj;
      const parts=[];
      if(s)parts.push(`<span class="stage">Fit ${Math.round(s)}</span>`);
      if(verified)parts.push(`<span class="stage">✓ ${esc(verified)}</span>`);
      if(cnpj)parts.push(`<span class="stage">CNPJ ${esc(String(cnpj).replace(/\D/g,''))}</span>`);
      if(parts.length){const box=document.createElement('div');box.className='crm-card-meta quality-badges';box.innerHTML=parts.join('');card.querySelector('.crm-card-top')?.insertAdjacentElement('afterend',box)}
      const reasons=Array.isArray(q.fitReasons)?q.fitReasons:[];
      if(reasons.length){const p=document.createElement('div');p.className='crm-next';p.textContent=`Por que priorizar: ${reasons.slice(0,3).join(' · ')}`;card.querySelector('.crm-card-actions')?.insertAdjacentElement('beforebegin',p)}
    });
    document.querySelectorAll('.crm-dropzone').forEach(zone=>{
      const cards=[...zone.querySelectorAll('.crm-card')];cards.sort((a,b)=>{const da=(state.leads||[]).find(x=>String(x.id)===String(a.dataset.leadId)),db=(state.leads||[]).find(x=>String(x.id)===String(b.dataset.leadId));return score(db)-score(da)}).forEach(c=>zone.appendChild(c));
    });
  }

  function injectToolbar(){
    const venture=state.leadsFilter||'all',toolbar=document.querySelector('.crm-toolbar');if(!toolbar)return;
    if(enrichable.has(venture)&&!toolbar.querySelector('#lead-enrich-now')){const b=document.createElement('button');b.id='lead-enrich-now';b.className='btn';b.type='button';b.textContent='Enriquecer leads';b.onclick=()=>enrich(b,venture);toolbar.appendChild(b)}
    if(venture==='f-insight'&&!toolbar.querySelector('#lead-cvm-sync')){const b=document.createElement('button');b.id='lead-cvm-sync';b.className='btn primary';b.type='button';b.textContent='Importar CVM';b.onclick=()=>cvm(b);toolbar.insertBefore(b,toolbar.firstChild)}
  }

  function refresh(){injectToolbar();decorateCards()}
  new MutationObserver(refresh).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',refresh);
})();
