const CRM_STAGES=[
  {key:'lead',label:'Lead'},
  {key:'qualified',label:'Qualificado'},
  {key:'meeting',label:'Reunião'},
  {key:'proposal',label:'Proposta'},
  {key:'won',label:'Ganho'},
  {key:'lost',label:'Perdido'}
];

const CRM_PLAYBOOKS={
  sindcopilot:{source:'Google Maps / Apify',audiences:['administradoras de condomínio','síndicos profissionais'],pitch:'centralizar a operação condominial, comunicação, documentos e rotinas com IA',cta:'te mostrar em 10 minutos como isso pode funcionar na sua operação'},
  nexjud:{source:'Google Maps + fontes jurídicas públicas',audiences:['escritórios de advocacia','advogados','boutiques jurídicas'],pitch:'transformar dados e documentos jurídicos em inteligência operacional e jurimétrica',cta:'te mostrar rapidamente onde o NexJud pode economizar tempo e melhorar a análise'},
  mindsteps:{source:'Google Maps / instituições de ensino',audiences:['escolas particulares','colégios','redes de ensino'],pitch:'acompanhar a evolução dos alunos e apoiar direção e coordenação com tutoria e inteligência pedagógica',cta:'enviar um resumo para a direção ou coordenação pedagógica'},
  'health-wallet':{source:'Google Maps / clínicas',audiences:['clínicas médicas','consultórios','clínicas de especialidades'],pitch:'dar ao paciente controle do histórico de saúde e facilitar o compartilhamento autorizado com profissionais',cta:'te mostrar como isso pode melhorar a jornada do paciente'},
  mydatamed:{source:'Google Maps / clínicas',audiences:['clínicas médicas','consultórios','profissionais de saúde'],pitch:'organizar dados autorizados pelo paciente para médicos e clínicas em uma visão prática e longitudinal',cta:'te mostrar a experiência para clínica e profissional em poucos minutos'},
  mindcompliance:{source:'Google Maps + CNPJ público',audiences:['escritórios de contabilidade','contadores','PMEs com empregados'],pitch:'simplificar a gestão preventiva e auditável das obrigações da NR-1 e riscos psicossociais',cta:'te mandar uma visão rápida de como aplicar isso em clientes ou na própria empresa'},
  'f-insight':{source:'CVM + Google Maps',audiences:['assessores de investimento','escritórios de assessoria'],pitch:'transformar dados financeiros dispersos em inteligência acionável para o trabalho do assessor',cta:'te mostrar como a plataforma pode apoiar sua rotina de análise e relacionamento'},
  smartbots:{source:'Google Maps / negócios locais',audiences:['salões e barbearias','clínicas de estética','odontologia','veterinárias e pet shops','óticas','oficinas','imobiliárias','academias e studios','restaurantes e buffets'],pitch:'transformar site e WhatsApp em canais de atendimento, qualificação e vendas 24/7',cta:'te mostrar um exemplo aplicado ao seu tipo de negócio'},
  modo:{source:'Google Maps + social / reaproveitamento SmartBots',audiences:['negócios locais','prestadores de serviço','pequenas marcas','empresas sem equipe de marketing'],pitch:'planejar, criar, publicar e aprender com marketing usando IA em uma única operação',cta:'te mostrar uma forma simples de colocar o marketing para rodar com mais consistência'},
  taxagent:{source:'parcerias e prospecção B2B',audiences:['softwares','contabilidades','empresas com operação fiscal'],pitch:'usar infraestrutura fiscal API-first para automatizar NFS-e, IBS/CBS, eventos e processos fiscais',cta:'entender seu fluxo atual e mostrar onde a API pode entrar'},
  nextgen:{source:'prospecção B2B / varejo',audiences:['PMEs','varejistas','distribuidores'],pitch:'automatizar rotinas financeiras, recebimentos, conciliação e operação com IA',cta:'te mostrar um fluxo simples aplicado ao seu negócio'},
  docwallet:{source:'prospecção B2B',audiences:['empresas com alto volume documental','RH','jurídico','operações'],pitch:'organizar documentos, assinatura, inteligência e prova de integridade em uma camada confiável',cta:'te mostrar como transformar documentos em processos rastreáveis'}
};

const crmMeta=slug=>(window.AV_PORTFOLIO||[]).find(v=>v.slug===slug)||{slug,name:slug||'Sem venture',accent:'#56e0ff'};
const crmOpen=d=>!['won','lost'].includes(d.stage);
const crmPlaybook=slug=>CRM_PLAYBOOKS[slug]||{source:'prospecção B2B',audiences:['clientes potenciais'],pitch:`conhecer uma solução da ${crmMeta(slug).name}`,cta:'te mandar um resumo curto para avaliar se faz sentido'};
const leadMeta=d=>(d&&d.metadata&&typeof d.metadata==='object')?d.metadata:{};
const leadPhone=d=>String(leadMeta(d).phone||leadMeta(d).whatsapp||'').replace(/\D/g,'');
const leadFirstName=d=>String(d.contact_name||'').trim().split(/\s+/)[0]||'';

async function loadLeads(force=false){
  if(Array.isArray(state.leads)&&!force) return state.leads;
  const r=await apiFetch('/api/leads');
  if(!r.ok) throw new Error('Não foi possível carregar os leads.');
  const data=await r.json();
  state.leads=Array.isArray(data)?data:[];
  return state.leads;
}

function openVentureLeads(slug){
  state.leadsFilter=slug||'all';
  location.hash=slug&&slug!=='all'?`leads/${encodeURIComponent(slug)}`:'leads';
}

async function renderLeads(){
  const filter=state.leadsFilter||'all';
  const venture=filter==='all'?null:crmMeta(filter);
  setHeader(venture?`Leads — ${venture.name}`:'Leads / CRM',venture?`Pipeline, prospecção e contato comercial da ${venture.name}.`:'Pipeline consolidado por venture — da entrada do lead ao fechamento.');
  root.innerHTML='<div class="empty">Carregando pipeline…</div>';
  try{await loadLeads(true)}catch(error){state.leads=[];root.innerHTML=`<div class="empty">${esc(error?.message||'Não foi possível carregar os leads.')}</div>`;return}
  drawLeads();
}

function dueForContact(d){
  if(!crmOpen(d)) return false;
  const meta=leadMeta(d);
  if(!meta.lastContactAt) return true;
  if(meta.nextContactAt) return new Date(meta.nextContactAt).getTime()<=Date.now();
  return false;
}

function drawLeads(){
  const deals=state.leads||[];
  const portfolio=window.AV_PORTFOLIO||[];
  const filter=state.leadsFilter||'all';
  const visible=filter==='all'?deals:deals.filter(d=>d.venture_slug===filter);
  const openValue=visible.filter(crmOpen).reduce((a,d)=>a+Number(d.value_brl||0),0);
  const wonValue=visible.filter(d=>d.stage==='won').reduce((a,d)=>a+Number(d.value_brl||0),0);
  const actions=visible.filter(dueForContact).length;
  const ventures=new Set(visible.map(d=>d.venture_slug)).size;
  const order=new Map(portfolio.map((v,i)=>[v.slug,i]));
  const grouped=Object.entries(visible.reduce((acc,d)=>{(acc[d.venture_slug] ||= []).push(d);return acc},{})).sort(([a],[b])=>(order.get(a)??999)-(order.get(b)??999));
  const options=['<option value="all">Todas as ventures</option>',...portfolio.map(v=>`<option value="${esc(v.slug)}" ${filter===v.slug?'selected':''}>${esc(v.name)}</option>`)].join('');
  const playbook=filter==='all'?null:crmPlaybook(filter);

  root.innerHTML=`
    <div class="grid4">
      ${kpi('Leads / deals',visible.length,filter==='all'?'pipeline consolidado':crmMeta(filter).name)}
      ${kpi('Ações pendentes',actions,'novos leads + follow-ups')}
      ${kpi('Pipeline aberto',money(openValue),'lead → proposta')}
      ${kpi('Ganhos',money(wonValue),'stage won')}
    </div>
    ${playbook?renderProspectingPlaybook(filter,playbook):''}
    <div class="toolbar crm-toolbar">
      <select id="lead-venture-filter" class="input">${options}</select>
      <button id="lead-refresh" class="btn" type="button">Atualizar</button>
      <button id="lead-actions-only" class="btn" type="button">Ações de hoje (${actions})</button>
      <span class="muted">Arraste, mude o estágio ou abra Contato para escolher canal e mensagem.</span>
    </div>
    <div id="crm-actions"></div>
    <div id="crm-boards">
      ${grouped.length?grouped.map(([slug,items])=>renderCrmBoard(slug,items)).join(''):'<div class="empty">Nenhum lead encontrado. O pipeline será preenchido por <code>POST /api/leads-ingest</code> quando as fontes de prospecção estiverem conectadas.</div>'}
    </div>`;
  bindCrmInteractions();
}

function renderProspectingPlaybook(slug,playbook){
  return `<section class="crm-playbook" style="--accent:${esc(crmMeta(slug).accent||'#56e0ff')}"><div><p class="eyebrow">PROSPECÇÃO AUTOMÁTICA</p><h3>${esc(playbook.source)}</h3><p>ICP inicial: ${esc(playbook.audiences.join(' · '))}</p></div><div class="tags">${playbook.audiences.map(x=>`<span>${esc(x)}</span>`).join('')}</div></section>`;
}

function renderCrmBoard(slug,deals){
  const v=crmMeta(slug);
  const open=deals.filter(crmOpen).reduce((a,d)=>a+Number(d.value_brl||0),0);
  return `<section class="crm-venture" style="--accent:${esc(v.accent||'#56e0ff')}">
    <div class="crm-venture-head">
      <div><span class="venture-icon">${esc((v.name||slug).slice(0,2).toUpperCase())}</span><div><h2>${esc(v.name||slug)}</h2><p>${deals.length} oportunidade${deals.length===1?'':'s'} · ${money(open)} em aberto</p></div></div>
      <span class="stage">${esc(slug)}</span>
    </div>
    <div class="crm-kanban">
      ${CRM_STAGES.map(stage=>{
        const items=deals.filter(d=>d.stage===stage.key);
        return `<div class="crm-column" data-crm-stage="${stage.key}" data-crm-venture="${esc(slug)}">
          <div class="crm-column-head"><b>${stage.label}</b><span>${items.length}</span></div>
          <div class="crm-dropzone">${items.map(renderCrmCard).join('')||'<div class="crm-empty">Solte aqui</div>'}</div>
        </div>`;
      }).join('')}
    </div>
  </section>`;
}

function renderCrmCard(d){
  const stageOptions=CRM_STAGES.map(s=>`<option value="${s.key}" ${d.stage===s.key?'selected':''}>${s.label}</option>`).join('');
  const meta=leadMeta(d); const phone=leadPhone(d);
  const contact=[d.contact_name,d.contact_email,phone?`+${phone}`:''].filter(Boolean).join(' · ');
  const last=meta.lastContactAt?new Date(meta.lastContactAt).toLocaleDateString('pt-BR'):null;
  return `<article class="crm-card" draggable="true" data-lead-id="${esc(d.id)}" data-lead-venture="${esc(d.venture_slug)}">
    <div class="crm-card-top"><b>${esc(d.company)}</b><span>${money(d.value_brl)}</span></div>
    ${contact?`<p>${esc(contact)}</p>`:''}
    <div class="crm-card-meta"><span>${esc(d.source||'sem fonte')}</span>${d.owner?`<span>${esc(d.owner)}</span>`:''}${last?`<span>contato ${last}</span>`:''}</div>
    ${d.next_action?`<div class="crm-next">${esc(d.next_action)}</div>`:''}
    <div class="crm-card-actions"><button class="btn primary" type="button" data-lead-contact="${esc(d.id)}">Contato</button><select class="input crm-stage-select" data-lead-stage="${esc(d.id)}">${stageOptions}</select></div>
  </article>`;
}

function renderActionQueue(){
  const filter=state.leadsFilter||'all';
  const due=(state.leads||[]).filter(d=>(filter==='all'||d.venture_slug===filter)&&dueForContact(d));
  const target=document.getElementById('crm-actions'); if(!target)return;
  target.innerHTML=`<section class="panel crm-action-panel"><div class="section-head" style="margin-top:0"><h2>Ações de contato</h2><p>${due.length} pendente${due.length===1?'':'s'}</p></div>${due.length?`<div class="list">${due.slice(0,30).map(d=>`<div class="list-item"><div><b>${esc(d.company)}</b><div class="muted">${esc(crmMeta(d.venture_slug).name)} · ${esc(d.stage)}${d.next_action?` · ${esc(d.next_action)}`:''}</div></div><button class="btn" type="button" data-lead-contact="${esc(d.id)}">Preparar contato</button></div>`).join('')}</div>`:'<div class="empty">Nenhuma ação vencida agora.</div>'}</section>`;
  target.querySelectorAll('[data-lead-contact]').forEach(btn=>btn.onclick=()=>openLeadContact(btn.dataset.leadContact));
}

function bindCrmInteractions(){
  const filter=document.getElementById('lead-venture-filter');
  if(filter) filter.onchange=()=>{state.leadsFilter=filter.value;location.hash=filter.value==='all'?'leads':`leads/${encodeURIComponent(filter.value)}`};
  const refresh=document.getElementById('lead-refresh');
  if(refresh) refresh.onclick=()=>renderLeads();
  const actions=document.getElementById('lead-actions-only');
  if(actions) actions.onclick=()=>renderActionQueue();
  document.querySelectorAll('[data-lead-contact]').forEach(btn=>btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openLeadContact(btn.dataset.leadContact)}));
  document.querySelectorAll('[data-lead-stage]').forEach(select=>select.addEventListener('change',()=>updateLeadStage(select.dataset.leadStage,select.value,select)));
  document.querySelectorAll('.crm-card').forEach(card=>card.addEventListener('dragstart',event=>{
    if(event.target.closest('button,select')){event.preventDefault();return}
    card.classList.add('dragging');event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',JSON.stringify({id:card.dataset.leadId,venture:card.dataset.leadVenture}));
  }));
  document.querySelectorAll('.crm-card').forEach(card=>card.addEventListener('dragend',()=>card.classList.remove('dragging')));
  document.querySelectorAll('.crm-column').forEach(column=>{
    column.addEventListener('dragover',event=>{event.preventDefault();column.classList.add('drag-over')});
    column.addEventListener('dragleave',()=>column.classList.remove('drag-over'));
    column.addEventListener('drop',event=>{
      event.preventDefault();column.classList.remove('drag-over');
      try{const payload=JSON.parse(event.dataTransfer.getData('text/plain')||'{}');if(payload.id&&payload.venture===column.dataset.crmVenture) updateLeadStage(payload.id,column.dataset.crmStage,column)}catch{}
    });
  });
}

function messageVariants(d,channel='whatsapp'){
  const v=crmMeta(d.venture_slug),p=crmPlaybook(d.venture_slug),name=leadFirstName(d),hello=name?`Olá, ${name}!`:'Olá!';
  const company=d.company||'sua empresa';
  const short=`${hello} Conheci a ${company} e achei que pode fazer sentido te apresentar o ${v.name}. A proposta é ${p.pitch}. Posso te mandar um resumo bem curto?`;
  const consult=`${hello} Estou conversando com ${p.audiences[0]||'empresas'} que querem ganhar eficiência sem aumentar a complexidade da operação. O ${v.name} foi criado para ${p.pitch}. Se fizer sentido, posso ${p.cta}.`;
  const direct=`${hello} uma ideia objetiva para a ${company}: ${v.name} — ${p.pitch}. Se isso estiver entre as prioridades de vocês, posso ${p.cta}.`;
  if(channel==='email') return [
    {label:'Curta',subject:`Uma ideia para a ${company}`,body:`${hello}\n\nConheci a ${company} e acredito que o ${v.name} pode fazer sentido. A proposta é ${p.pitch}.\n\nSe quiser, posso ${p.cta}.\n\nAbraço,\nHenrique`},
    {label:'Consultiva',subject:`${v.name} + ${company}`,body:`${hello}\n\nEstou conversando com ${p.audiences[0]||'empresas'} sobre como ganhar eficiência sem aumentar a complexidade da operação. O ${v.name} foi criado para ${p.pitch}.\n\nAchei que valia te procurar porque pode haver aderência com a ${company}. Posso ${p.cta}?\n\nAbraço,\nHenrique`},
    {label:'Direta',subject:`Posso te mostrar em 10 minutos?`,body:`${hello}\n\nUma ideia objetiva para a ${company}: ${v.name}. ${p.pitch}.\n\nSe fizer sentido, posso ${p.cta}.\n\nHenrique`}
  ];
  if(channel==='sms') return [{label:'Curta',body:short},{label:'Direta',body:direct}];
  return [{label:'Curta',body:short},{label:'Consultiva',body:consult},{label:'Direta',body:direct}];
}

function openLeadContact(id,channel='whatsapp',variantIndex=0){
  const d=(state.leads||[]).find(x=>x.id===id); if(!d)return;
  const meta=leadMeta(d),phone=leadPhone(d),variants=messageVariants(d,channel),variant=variants[Math.min(variantIndex,variants.length-1)]||variants[0];
  const channels=[['whatsapp','WhatsApp'],['email','E-mail'],['sms','SMS']];
  modalRoot.innerHTML=`<div class="modal-backdrop" id="contact-bg"><div class="modal contact-modal"><div class="modal-head"><div><p class="eyebrow">OUTREACH · ${esc(crmMeta(d.venture_slug).name)}</p><h2>${esc(d.company)}</h2><p class="muted">Escolha o canal, revise a mensagem e envie quando quiser.</p></div><button class="close" id="contact-close">×</button></div><div class="contact-channel-tabs">${channels.map(([key,label])=>`<button class="btn ${channel===key?'primary':''}" type="button" data-contact-channel="${key}">${label}</button>`).join('')}</div><div class="contact-grid"><section class="panel"><div class="section-head" style="margin-top:0"><h2>Mensagem sugerida</h2><p>${esc(variant.label)}</p></div>${channel==='email'?`<label class="contact-label">Assunto<input id="contact-subject" class="input" value="${esc(variant.subject||'')}"/></label>`:''}<label class="contact-label">Mensagem<textarea id="contact-body" class="input contact-textarea">${esc(variant.body||'')}</textarea></label><div class="contact-variants">${variants.map((x,i)=>`<button class="mini-btn ${i===variantIndex?'active':''}" type="button" data-contact-variant="${i}">${esc(x.label)}</button>`).join('')}</div></section><aside class="panel"><div class="list"><div class="list-item"><b>Contato</b><span>${esc(d.contact_name||'—')}</span></div><div class="list-item"><b>E-mail</b><span>${esc(d.contact_email||'—')}</span></div><div class="list-item"><b>Telefone</b><span>${esc(phone?`+${phone}`:'—')}</span></div><div class="list-item"><b>Fonte</b><span>${esc(d.source||'—')}</span></div><div class="list-item"><b>Último contato</b><span>${meta.lastContactAt?new Date(meta.lastContactAt).toLocaleString('pt-BR'):'Nunca'}</span></div></div><div class="contact-actions"><button class="btn" id="contact-copy" type="button">Copiar mensagem</button><button class="btn primary" id="contact-open" type="button">Abrir ${channel==='email'?'e-mail':channel==='sms'?'SMS':'WhatsApp'} ↗</button><button class="btn" id="contact-mark" type="button">Marcar como enviado</button></div></aside></div></div></div>`;
  document.getElementById('contact-close').onclick=closeModal;
  document.getElementById('contact-bg').addEventListener('click',e=>{if(e.target.id==='contact-bg')closeModal()});
  document.querySelectorAll('[data-contact-channel]').forEach(btn=>btn.onclick=()=>openLeadContact(id,btn.dataset.contactChannel,0));
  document.querySelectorAll('[data-contact-variant]').forEach(btn=>btn.onclick=()=>openLeadContact(id,channel,Number(btn.dataset.contactVariant||0)));
  document.getElementById('contact-copy').onclick=()=>copyContactDraft(channel);
  document.getElementById('contact-open').onclick=()=>openContactChannel(d,channel);
  document.getElementById('contact-mark').onclick=()=>markContactSent(d,channel,variant.label);
}

function currentDraft(channel){
  const body=document.getElementById('contact-body')?.value||'';
  const subject=channel==='email'?(document.getElementById('contact-subject')?.value||''):'';
  return {body,subject};
}
async function copyContactDraft(channel){
  const draft=currentDraft(channel); const text=channel==='email'&&draft.subject?`Assunto: ${draft.subject}\n\n${draft.body}`:draft.body;
  try{await navigator.clipboard.writeText(text);alert('Mensagem copiada.')}catch{alert('Não foi possível copiar automaticamente.')}
}
function openContactChannel(d,channel){
  const draft=currentDraft(channel),phone=leadPhone(d);
  if(channel==='email'){
    if(!d.contact_email){alert('Este lead ainda não tem e-mail cadastrado.');return}
    location.href=`mailto:${encodeURIComponent(d.contact_email)}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`;return;
  }
  if(!phone){alert('Este lead ainda não tem telefone/WhatsApp cadastrado.');return}
  if(channel==='sms'){location.href=`sms:+${phone}?body=${encodeURIComponent(draft.body)}`;return}
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(draft.body)}`,'_blank','noopener');
}
async function markContactSent(d,channel,variant){
  const now=new Date(),follow=new Date(now.getTime()+3*86400000);
  try{
    const r=await apiFetch('/api/leads-update',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id:d.id,nextAction:`Follow-up em ${follow.toLocaleDateString('pt-BR')}`,metadataPatch:{lastContactAt:now.toISOString(),lastChannel:channel,lastMessageVariant:variant,nextContactAt:follow.toISOString()}})});
    const payload=await r.json().catch(()=>({})); if(!r.ok) throw new Error(payload.error||'Não foi possível registrar o contato.');
    Object.assign(d,payload.deal||{});closeModal();drawLeads();
  }catch(error){alert(error?.message||'Não foi possível registrar o contato.')}
}

async function updateLeadStage(id,stage,sourceEl){
  const lead=(state.leads||[]).find(d=>d.id===id); if(!lead||lead.stage===stage) return;
  sourceEl?.classList.add('is-updating');
  try{
    const r=await apiFetch('/api/leads-update',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id,stage})});
    const payload=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(payload.error||'Não foi possível atualizar o estágio.');
    Object.assign(lead,payload.deal||{stage,updated_at:new Date().toISOString()});drawLeads();
  }catch(error){sourceEl?.classList.remove('is-updating');alert(error?.message||'Não foi possível atualizar o estágio.');drawLeads()}
}
