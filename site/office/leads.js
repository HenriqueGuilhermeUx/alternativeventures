const CRM_STAGES=[
  {key:'lead',label:'Lead'},
  {key:'qualified',label:'Qualificado'},
  {key:'meeting',label:'Reunião'},
  {key:'proposal',label:'Proposta'},
  {key:'won',label:'Ganho'},
  {key:'lost',label:'Perdido'}
];

const crmMeta=slug=>(window.AV_PORTFOLIO||[]).find(v=>v.slug===slug)||{slug,name:slug||'Sem venture',accent:'#56e0ff'};
const crmOpen=d=>!['won','lost'].includes(d.stage);

async function renderLeads(){
  setHeader('Leads / CRM','Pipeline consolidado por venture — da entrada do lead ao fechamento.');
  root.innerHTML='<div class="empty">Carregando pipeline…</div>';
  try{
    const r=await apiFetch('/api/leads');
    if(!r.ok) throw new Error('Não foi possível carregar os leads.');
    state.leads=await r.json();
    if(!Array.isArray(state.leads)) state.leads=[];
  }catch(error){
    state.leads=[];
    root.innerHTML=`<div class="empty">${esc(error?.message||'Não foi possível carregar os leads.')}</div>`;
    return;
  }
  if(!state.leadsFilter) state.leadsFilter='all';
  drawLeads();
}

function drawLeads(){
  const deals=state.leads||[];
  const portfolio=window.AV_PORTFOLIO||[];
  const openValue=deals.filter(crmOpen).reduce((a,d)=>a+Number(d.value_brl||0),0);
  const wonValue=deals.filter(d=>d.stage==='won').reduce((a,d)=>a+Number(d.value_brl||0),0);
  const ventures=new Set(deals.map(d=>d.venture_slug)).size;
  const filter=state.leadsFilter||'all';
  const visible=filter==='all'?deals:deals.filter(d=>d.venture_slug===filter);
  const order=new Map(portfolio.map((v,i)=>[v.slug,i]));
  const grouped=Object.entries(visible.reduce((acc,d)=>{(acc[d.venture_slug] ||= []).push(d);return acc},{})).sort(([a],[b])=>(order.get(a)??999)-(order.get(b)??999));
  const options=['<option value="all">Todas as ventures</option>',...portfolio.map(v=>`<option value="${esc(v.slug)}" ${filter===v.slug?'selected':''}>${esc(v.name)}</option>`)].join('');

  root.innerHTML=`
    <div class="grid4">
      ${kpi('Leads / deals',deals.length,'pipeline consolidado')}
      ${kpi('Pipeline aberto',money(openValue),'lead → proposta')}
      ${kpi('Ganhos',money(wonValue),'stage won')}
      ${kpi('Ventures com pipeline',ventures,'origem consolidada')}
    </div>
    <div class="toolbar crm-toolbar">
      <select id="lead-venture-filter" class="input">${options}</select>
      <button id="lead-refresh" class="btn" type="button">Atualizar</button>
      <span class="muted">Arraste os cards ou altere o estágio no seletor.</span>
    </div>
    <div id="crm-boards">
      ${grouped.length?grouped.map(([slug,items])=>renderCrmBoard(slug,items)).join(''):'<div class="empty">Nenhum lead encontrado. SmartBots, MODO e outras ventures podem alimentar este CRM por <code>POST /api/leads-ingest</code>.</div>'}
    </div>`;
  bindCrmInteractions();
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
  const contact=[d.contact_name,d.contact_email].filter(Boolean).join(' · ');
  return `<article class="crm-card" draggable="true" data-lead-id="${esc(d.id)}" data-lead-venture="${esc(d.venture_slug)}">
    <div class="crm-card-top"><b>${esc(d.company)}</b><span>${money(d.value_brl)}</span></div>
    ${contact?`<p>${esc(contact)}</p>`:''}
    <div class="crm-card-meta"><span>${esc(d.source||'sem fonte')}</span>${d.owner?`<span>${esc(d.owner)}</span>`:''}</div>
    ${d.next_action?`<div class="crm-next">${esc(d.next_action)}</div>`:''}
    <select class="input crm-stage-select" data-lead-stage="${esc(d.id)}">${stageOptions}</select>
  </article>`;
}

function bindCrmInteractions(){
  const filter=document.getElementById('lead-venture-filter');
  if(filter) filter.onchange=()=>{state.leadsFilter=filter.value;drawLeads()};
  const refresh=document.getElementById('lead-refresh');
  if(refresh) refresh.onclick=()=>renderLeads();

  document.querySelectorAll('[data-lead-stage]').forEach(select=>select.addEventListener('change',()=>updateLeadStage(select.dataset.leadStage,select.value,select)));
  document.querySelectorAll('.crm-card').forEach(card=>card.addEventListener('dragstart',event=>{
    card.classList.add('dragging');
    event.dataTransfer.effectAllowed='move';
    event.dataTransfer.setData('text/plain',JSON.stringify({id:card.dataset.leadId,venture:card.dataset.leadVenture}));
  }));
  document.querySelectorAll('.crm-card').forEach(card=>card.addEventListener('dragend',()=>card.classList.remove('dragging')));
  document.querySelectorAll('.crm-column').forEach(column=>{
    column.addEventListener('dragover',event=>{event.preventDefault();column.classList.add('drag-over')});
    column.addEventListener('dragleave',()=>column.classList.remove('drag-over'));
    column.addEventListener('drop',event=>{
      event.preventDefault(); column.classList.remove('drag-over');
      try{
        const payload=JSON.parse(event.dataTransfer.getData('text/plain')||'{}');
        if(payload.id&&payload.venture===column.dataset.crmVenture) updateLeadStage(payload.id,column.dataset.crmStage,column);
      }catch{}
    });
  });
}

async function updateLeadStage(id,stage,sourceEl){
  const lead=(state.leads||[]).find(d=>d.id===id); if(!lead||lead.stage===stage) return;
  sourceEl?.classList.add('is-updating');
  try{
    const r=await apiFetch('/api/leads-update',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id,stage})});
    const payload=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(payload.error||'Não foi possível atualizar o estágio.');
    Object.assign(lead,payload.deal||{stage,updated_at:new Date().toISOString()});
    drawLeads();
  }catch(error){
    sourceEl?.classList.remove('is-updating');
    alert(error?.message||'Não foi possível atualizar o estágio.');
    drawLeads();
  }
}
