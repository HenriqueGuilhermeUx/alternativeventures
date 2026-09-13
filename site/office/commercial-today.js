(()=>{
  const DAY=86400000;
  const meta=d=>(d?.metadata&&typeof d.metadata==='object')?d.metadata:{};
  const quality=d=>meta(d).quality||{};
  const fit=d=>Number(quality(d).fitScore||meta(d).fitScore||0);
  const open=d=>!['won','lost'].includes(d.stage);
  const due=d=>{
    if(!open(d))return false;
    const m=meta(d);
    if(!m.lastContactAt)return true;
    return Boolean(m.nextContactAt&&new Date(m.nextContactAt).getTime()<=Date.now());
  };
  const phone=d=>String(meta(d).phone||meta(d).whatsapp||'').replace(/\D/g,'');
  const venture=d=>(window.AV_PORTFOLIO||[]).find(v=>v.slug===d.venture_slug)||{name:d.venture_slug,accent:'#56e0ff'};
  const first=d=>String(d.contact_name||'').trim().split(/\s+/)[0]||'';
  const channel=d=>phone(d)?'whatsapp':d.contact_email?'email':'copy';
  const score=d=>{
    const m=meta(d),follow=m.nextContactAt&&new Date(m.nextContactAt).getTime()<=Date.now();
    return (follow?120:0)+fit(d)+(phone(d)||d.contact_email?15:0)+(m.verifiedSource?10:0);
  };
  const queue=()=>[...(state.leads||[])].filter(due).sort((a,b)=>score(b)-score(a));
  const fmtDate=value=>{try{return new Date(value).toLocaleDateString('pt-BR')}catch{return '—'}};
  const playbook=d=>typeof crmPlaybook==='function'?crmPlaybook(d.venture_slug):{pitch:`conhecer a ${venture(d).name}`,cta:'te mostrar rapidamente como funciona'};

  function variants(d){
    const v=venture(d),p=playbook(d),n=first(d),hello=n?`Olá, ${n}`:'Olá';
    return [
      {key:'short',label:'Curta',text:`${hello}! Sou da ${v.name}. Vi a ${d.company} e achei que pode fazer sentido conversar sobre ${p.pitch}. Posso te mandar um resumo rápido?`},
      {key:'consultative',label:'Consultiva',text:`${hello}! Estou entrando em contato pela ${v.name}. Tenho conversado com empresas com desafios parecidos e acredito que podemos ajudar a ${d.company} a ${p.pitch}. Se fizer sentido, posso ${p.cta}.`},
      {key:'direct',label:'Direta',text:`${hello}! Aqui é da ${v.name}. Ajudamos empresas a ${p.pitch}. Pensei na ${d.company}. Faz sentido uma conversa rápida esta semana?`}
    ];
  }

  function metrics(){
    const leads=(state.leads||[]).filter(open),now=Date.now();
    const newLeads=leads.filter(d=>!meta(d).lastContactAt).length;
    const follow=leads.filter(d=>meta(d).nextContactAt&&new Date(meta(d).nextContactAt).getTime()<=now).length;
    const high=leads.filter(d=>fit(d)>=75).length;
    const ready=leads.filter(d=>due(d)&&(phone(d)||d.contact_email)).length;
    return {newLeads,follow,high,ready,total:queue().length};
  }

  function ventureBreakdown(){
    const counts={};
    queue().forEach(d=>counts[d.venture_slug]=(counts[d.venture_slug]||0)+1);
    return Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,6);
  }

  function commercialPanel(){
    if(state.view!=='overview'||document.getElementById('commercial-today'))return;
    const section=document.querySelector('.venture-grid');
    if(!section)return;
    const m=metrics(),breakdown=ventureBreakdown();
    const el=document.createElement('section');
    el.id='commercial-today';el.className='panel commercial-today';
    el.innerHTML=`<div class="section-head" style="margin-top:0"><div><p class="eyebrow">COMERCIAL HOJE</p><h2>Fila de contatos do fundador</h2><p>Prioridade por follow-up, aderência e canal disponível.</p></div><button class="btn primary" id="commercial-start" type="button">Começar meus contatos →</button></div><div class="grid4">${kpi('Novos leads',m.newLeads,'ainda sem contato')}${kpi('Follow-ups vencidos',m.follow,'pedem ação hoje')}${kpi('Alta aderência',m.high,'fit score ≥ 75')}${kpi('Prontos para contato',m.ready,'WhatsApp ou e-mail')}</div>${breakdown.length?`<div class="metric-strip commercial-breakdown" style="margin-top:16px">${breakdown.map(([slug,count])=>`<span>${esc(venture({venture_slug:slug}).name)} · ${count}</span>`).join('')}</div>`:'<div class="empty" style="margin-top:16px">Nenhum contato pendente agora.</div>'}`;
    section.parentNode.insertBefore(el,section);
    document.getElementById('commercial-start').onclick=start;
  }

  async function start(){
    try{if(typeof loadLeads==='function')await loadLeads(true)}catch{}
    const items=queue();
    if(!items.length){alert('Nenhum contato pendente agora.');return}
    renderQueue(items,0);
  }

  function renderQueue(items,index){
    const d=items[index];
    if(!d){modalRoot.innerHTML='';alert('Fila de contatos concluída.');return}
    const v=venture(d),m=meta(d),q=quality(d),vars=variants(d),recommended=channel(d),reasons=Array.isArray(q.fitReasons)?q.fitReasons:[];
    modalRoot.innerHTML=`<div class="modal-backdrop" id="commercial-bg"><div class="modal contact-modal"><div class="modal-head"><div><p class="eyebrow">COMERCIAL HOJE · ${index+1}/${items.length}</p><h2>${esc(d.company)}</h2><p class="muted">${esc(v.name)} · ${esc(d.stage||'lead')} · Fit ${Math.round(fit(d)||0)}</p></div><button class="close" id="commercial-close">×</button></div><div class="contact-grid"><section class="panel"><div class="list"><div class="list-item"><b>Contato</b><span>${esc(d.contact_name||'—')}</span></div><div class="list-item"><b>E-mail</b><span>${esc(d.contact_email||'—')}</span></div><div class="list-item"><b>WhatsApp</b><span>${phone(d)?'+'+esc(phone(d)):'—'}</span></div><div class="list-item"><b>Fonte</b><span>${esc(d.source||'—')}</span></div>${m.nextContactAt?`<div class="list-item"><b>Follow-up</b><span>${esc(fmtDate(m.nextContactAt))}</span></div>`:''}</div>${reasons.length?`<div class="crm-next" style="margin-top:14px">Por que priorizar: ${esc(reasons.slice(0,4).join(' · '))}</div>`:''}<div class="contact-actions" style="margin-top:16px"><button class="btn" id="commercial-open-crm" type="button">Abrir CRM da venture</button><button class="btn" id="commercial-skip" type="button">Pular</button></div></section><aside class="panel"><label class="contact-label">Canal<select id="commercial-channel" class="input"><option value="whatsapp" ${recommended==='whatsapp'?'selected':''} ${phone(d)?'':'disabled'}>WhatsApp</option><option value="email" ${recommended==='email'?'selected':''} ${d.contact_email?'':'disabled'}>E-mail</option><option value="copy" ${recommended==='copy'?'selected':''}>Copiar mensagem</option></select></label><label class="contact-label">Abordagem<select id="commercial-variant" class="input">${vars.map(x=>`<option value="${x.key}">${x.label}</option>`).join('')}</select></label><label class="contact-label">Mensagem<textarea id="commercial-message" class="input contact-textarea">${esc(vars[0].text)}</textarea></label><div class="contact-actions"><button class="btn primary" id="commercial-send" type="button">${recommended==='whatsapp'?'Abrir WhatsApp':recommended==='email'?'Abrir e-mail':'Copiar'}</button><button class="btn primary" id="commercial-done" type="button">Marcar enviado + próximo</button></div><p class="muted" id="commercial-status"></p></aside></div></div></div>`;
    const close=()=>modalRoot.innerHTML='';
    document.getElementById('commercial-close').onclick=close;
    document.getElementById('commercial-bg').onclick=e=>{if(e.target.id==='commercial-bg')close()};
    document.getElementById('commercial-skip').onclick=()=>renderQueue(items,index+1);
    document.getElementById('commercial-open-crm').onclick=()=>{close();openVentureLeads(d.venture_slug)};
    const variant=document.getElementById('commercial-variant'),message=document.getElementById('commercial-message'),chan=document.getElementById('commercial-channel'),send=document.getElementById('commercial-send');
    variant.onchange=()=>{message.value=vars.find(x=>x.key===variant.value)?.text||vars[0].text};
    chan.onchange=()=>{send.textContent=chan.value==='whatsapp'?'Abrir WhatsApp':chan.value==='email'?'Abrir e-mail':'Copiar'};
    send.onclick=async()=>{
      const text=message.value.trim();
      if(chan.value==='whatsapp'&&phone(d))window.open(`https://wa.me/${phone(d)}?text=${encodeURIComponent(text)}`,'_blank','noopener');
      else if(chan.value==='email'&&d.contact_email)window.location.href=`mailto:${encodeURIComponent(d.contact_email)}?subject=${encodeURIComponent(v.name+' — contato')}&body=${encodeURIComponent(text)}`;
      else{try{await navigator.clipboard.writeText(text);document.getElementById('commercial-status').textContent='Mensagem copiada.'}catch{document.getElementById('commercial-status').textContent='Selecione e copie a mensagem.'}}
    };
    document.getElementById('commercial-done').onclick=async()=>{
      const button=document.getElementById('commercial-done'),status=document.getElementById('commercial-status'),now=new Date(),next=new Date(Date.now()+3*DAY);
      button.disabled=true;status.textContent='Registrando contato…';
      try{
        const r=await apiFetch('/api/leads-update',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id:d.id,nextAction:`Follow-up em ${next.toLocaleDateString('pt-BR')}`,metadataPatch:{lastContactAt:now.toISOString(),lastChannel:chan.value,nextContactAt:next.toISOString(),lastMessageVariant:variant.value}})}),p=await r.json().catch(()=>({}));
        if(!r.ok)throw new Error(p.error||'Não foi possível registrar o contato.');
        const i=(state.leads||[]).findIndex(x=>String(x.id)===String(d.id));if(i>=0&&p.deal)state.leads[i]=p.deal;
        items.splice(index,1);renderQueue(items,index);
      }catch(error){status.textContent=error?.message||'Não foi possível registrar.';button.disabled=false}
    };
  }

  function refresh(){setTimeout(commercialPanel,0)}
  new MutationObserver(refresh).observe(document.getElementById('view-root'),{childList:true,subtree:false});
  document.addEventListener('DOMContentLoaded',refresh);
})();
