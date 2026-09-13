(()=>{
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  async function call(action){
    const r=await apiFetch('/api/leads',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,venture:'nexjud'})});
    const p=await r.json().catch(()=>({}));
    if(!r.ok){if(p.error==='apify_not_configured')throw new Error('Falta somente configurar APIFY_TOKEN no Netlify.');throw new Error(p.error||'Não foi possível executar a prospecção.')}return p;
  }
  async function prospect(button){
    const label=button.textContent;button.disabled=true;button.textContent='Iniciando…';
    try{
      await call('prospect');
      button.textContent='Buscando leads…';
      for(let i=0;i<20;i++){
        await sleep(15000);
        const p=await call('collect');
        if(p.status==='synced'){
          state.leads=null;await renderLeads();
          alert(`${p.inserted||0} novo(s) lead(s) adicionados ao NexJud. ${p.duplicates||0} duplicado(s) ignorado(s).`);
          return;
        }
        if(p.status==='no_pending_run')continue;
        if(!['ready','running','unknown'].includes(String(p.status||'').toLowerCase()))break;
      }
      alert('A busca continua em processamento. O coletor automático do AV OS vai importar os resultados quando terminar.');
    }catch(error){alert(error?.message||'Não foi possível executar a prospecção.')}finally{button.disabled=false;button.textContent=label}
  }
  async function collect(button){
    const label=button.textContent;button.disabled=true;button.textContent='Coletando…';
    try{
      const p=await call('collect');
      if(p.status==='synced'){state.leads=null;await renderLeads();alert(`${p.inserted||0} novo(s) lead(s) adicionados. ${p.duplicates||0} duplicado(s) ignorado(s).`)}
      else if(p.status==='no_pending_run')alert('Não há busca pendente para coletar.');
      else alert(`Busca ainda está ${p.status||'em processamento'}.`);
    }catch(error){alert(error?.message||'Não foi possível coletar os resultados.')}finally{button.disabled=false;button.textContent=label}
  }
  function inject(){
    if((state.leadsFilter||'all')!=='nexjud')return;
    const toolbar=document.querySelector('.crm-toolbar');if(!toolbar||toolbar.querySelector('#lead-prospect-now'))return;
    const start=document.createElement('button');start.id='lead-prospect-now';start.className='btn primary';start.type='button';start.textContent='Prospectar agora';start.onclick=()=>prospect(start);
    const manual=document.createElement('button');manual.id='lead-prospect-collect';manual.className='btn';manual.type='button';manual.textContent='Coletar resultados';manual.onclick=()=>collect(manual);
    toolbar.insertBefore(manual,toolbar.firstChild);toolbar.insertBefore(start,manual);
  }
  new MutationObserver(inject).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',inject);
})();
