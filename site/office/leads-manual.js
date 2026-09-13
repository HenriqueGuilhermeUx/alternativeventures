(()=>{
  const ventureOptions=()=>['<option value="">Selecione a venture</option>',...(window.AV_PORTFOLIO||[]).map(v=>`<option value="${esc(v.slug)}" ${(state.leadsFilter||'')===v.slug?'selected':''}>${esc(v.name)}</option>`)].join('');
  function openManualLead(){
    const fallback=(state.leadsFilter&&state.leadsFilter!=='all')?state.leadsFilter:'';
    modalRoot.innerHTML=`<div class="modal-backdrop" id="lead-new-bg"><div class="modal contact-modal"><div class="modal-head"><div><p class="eyebrow">NOVO LEAD</p><h2>Adicionar oportunidade</h2><p class="muted">Use para leads manuais, indicações ou testes. Os automáticos entram pelo mesmo pipeline.</p></div><button class="close" id="lead-new-close">×</button></div><div class="contact-grid"><section class="panel"><label class="contact-label">Venture<select id="lead-new-venture" class="input">${ventureOptions()}</select></label><label class="contact-label">Empresa<input id="lead-new-company" class="input" placeholder="Nome da empresa"/></label><label class="contact-label">Contato<input id="lead-new-contact" class="input" placeholder="Nome do contato"/></label><label class="contact-label">E-mail<input id="lead-new-email" class="input" type="email" placeholder="contato@empresa.com"/></label><label class="contact-label">Telefone / WhatsApp<input id="lead-new-phone" class="input" placeholder="5513999999999"/></label><label class="contact-label">Valor potencial (R$)<input id="lead-new-value" class="input" type="number" min="0" step="0.01" placeholder="0"/></label></section><aside class="panel"><label class="contact-label">Fonte<input id="lead-new-source" class="input" value="manual"/></label><label class="contact-label">Observação<textarea id="lead-new-note" class="input contact-textarea" placeholder="Contexto, indicação, dor percebida..."></textarea></label><div class="contact-actions"><button class="btn primary" id="lead-new-save" type="button">Salvar lead</button></div><p class="muted" id="lead-new-status"></p></aside></div></div></div>`;
    const venture=document.getElementById('lead-new-venture'); if(fallback) venture.value=fallback;
    const close=()=>{modalRoot.innerHTML=''};
    document.getElementById('lead-new-close').onclick=close;
    document.getElementById('lead-new-bg').onclick=e=>{if(e.target.id==='lead-new-bg')close()};
    document.getElementById('lead-new-save').onclick=async()=>{
      const status=document.getElementById('lead-new-status'),button=document.getElementById('lead-new-save');
      const body={venture:venture.value,company:document.getElementById('lead-new-company').value.trim(),contactName:document.getElementById('lead-new-contact').value.trim(),contactEmail:document.getElementById('lead-new-email').value.trim(),phone:document.getElementById('lead-new-phone').value.trim(),value:Number(document.getElementById('lead-new-value').value||0),source:document.getElementById('lead-new-source').value.trim()||'manual',metadata:{note:document.getElementById('lead-new-note').value.trim()}};
      if(!body.venture||!body.company){status.textContent='Informe venture e empresa.';return}
      button.disabled=true;status.textContent='Salvando…';
      try{
        const r=await apiFetch('/api/leads',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
        const payload=await r.json().catch(()=>({}));
        if(!r.ok) throw new Error(payload.error||'Não foi possível salvar.');
        if(payload.duplicate){status.textContent='Esse lead já existe nessa venture.';button.disabled=false;return}
        state.leads=null;close();await renderLeads();
      }catch(error){status.textContent=error?.message||'Não foi possível salvar.';button.disabled=false}
    };
  }
  function inject(){
    const toolbar=document.querySelector('.crm-toolbar'); if(!toolbar||toolbar.querySelector('#lead-new'))return;
    const btn=document.createElement('button');btn.id='lead-new';btn.className='btn primary';btn.type='button';btn.textContent='+ Adicionar lead';btn.onclick=openManualLead;
    toolbar.insertBefore(btn,toolbar.firstChild);
  }
  new MutationObserver(inject).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',inject);
})();
