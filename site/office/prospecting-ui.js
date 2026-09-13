(()=>{
  async function run(action,button){
    const label=button.textContent;button.disabled=true;button.textContent=action==='prospect'?'Iniciando…':'Coletando…';
    try{
      const r=await apiFetch('/api/leads',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,venture:'nexjud'})});
      const p=await r.json().catch(()=>({}));
      if(!r.ok){if(p.error==='apify_not_configured')throw new Error('Falta somente configurar APIFY_TOKEN no Netlify.');throw new Error(p.error||'Não foi possível executar a prospecção.');}
      if(action==='prospect')alert('Busca iniciada no Apify. Quando terminar, clique em Coletar resultados.');
      else if(p.status==='synced'){state.leads=null;await renderLeads();alert(`${p.inserted||0} novo(s) lead(s) adicionados. ${p.duplicates||0} duplicado(s) ignorado(s).`)}
      else if(p.status==='no_pending_run')alert('Ainda não há uma busca pendente para coletar.');
      else alert(`Busca ainda está ${p.status||'em processamento'}. Tente novamente em alguns minutos.`);
    }catch(error){alert(error?.message||'Não foi possível executar a prospecção.')}finally{button.disabled=false;button.textContent=label}
  }
  function inject(){
    if((state.leadsFilter||'all')!=='nexjud')return;
    const toolbar=document.querySelector('.crm-toolbar');if(!toolbar||toolbar.querySelector('#lead-prospect-now'))return;
    const start=document.createElement('button');start.id='lead-prospect-now';start.className='btn primary';start.type='button';start.textContent='Prospectar agora';start.onclick=()=>run('prospect',start);
    const collect=document.createElement('button');collect.id='lead-prospect-collect';collect.className='btn';collect.type='button';collect.textContent='Coletar resultados';collect.onclick=()=>run('collect',collect);
    toolbar.insertBefore(collect,toolbar.firstChild);toolbar.insertBefore(start,collect);
  }
  new MutationObserver(inject).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',inject);
})();
