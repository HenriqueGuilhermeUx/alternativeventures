import {configured,sb} from './_supabase.mjs';

const UA='AlternativeVentures-AVOS/1.0 (+https://alternativeventures.com.br)';
const clean=v=>String(v??'').trim();
const digits=v=>clean(v).replace(/\D/g,'');
const enabledVentures=['nexjud','sindcopilot','mindsteps','mindcompliance','health-wallet','mydatamed','smartbots','modo'];

const validCnpj=value=>{
  const n=digits(value);if(n.length!==14||/^(\d)\1{13}$/.test(n))return false;
  const calc=base=>{let size=base.length,pos=size-7,sum=0;for(let i=size;i>=1;i--){sum+=Number(base[size-i])*pos--;if(pos<2)pos=9}const r=sum%11;return r<2?0:11-r};
  return Number(n[12])===calc(n.slice(0,12))&&Number(n[13])===calc(n.slice(0,13));
};

const normalizeUrl=value=>{const s=clean(value);if(!s)return null;try{return new URL(/^https?:\/\//i.test(s)?s:`https://${s}`).toString()}catch{return null}};
const unique=arr=>[...new Set(arr.filter(Boolean))];

async function websiteSignals(url){
  const target=normalizeUrl(url);if(!target)return {};
  try{
    const r=await fetch(target,{headers:{'user-agent':UA,'accept':'text/html,application/xhtml+xml'},signal:AbortSignal.timeout(6500),redirect:'follow'});
    if(!r.ok)return {websiteChecked:true,websiteStatus:r.status};
    const type=r.headers.get('content-type')||'';if(!type.includes('text')&&!type.includes('html'))return {websiteChecked:true,websiteStatus:r.status};
    const html=(await r.text()).slice(0,450000);
    const emails=unique((html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)||[]).map(x=>x.toLowerCase())).filter(x=>!/(example\.|wixpress|sentry|cloudflare|noreply|no-reply)/i.test(x));
    const candidates=html.match(/\b\d{2}\.?\d{3}\.?\d{3}[\/\s.-]?\d{4}-?\d{2}\b/g)||[];
    const cnpj=unique(candidates.map(digits).filter(validCnpj))[0]||null;
    return {websiteChecked:true,websiteStatus:r.status,...(emails[0]?{discoveredEmail:emails[0]}:{}),...(cnpj?{discoveredCnpj:cnpj}:{})};
  }catch{return {websiteChecked:true,websiteStatus:null}}
}

async function cnpjProfile(cnpj){
  if(!validCnpj(cnpj))return null;
  try{
    const r=await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits(cnpj)}`,{headers:{'user-agent':UA,'accept':'application/json'},signal:AbortSignal.timeout(6500)});
    if(!r.ok)return null;const x=await r.json();
    const qsa=Array.isArray(x.qsa)?x.qsa:[];
    const decision=qsa.find(s=>clean(s?.nome_socio))||null;
    return {
      cnpj:digits(x.cnpj||cnpj),
      legalName:clean(x.razao_social)||null,
      tradeName:clean(x.nome_fantasia)||null,
      status:clean(x.descricao_situacao_cadastral||x.situacao_cadastral)||null,
      cnae:clean(x.cnae_fiscal)||null,
      cnaeDescription:clean(x.cnae_fiscal_descricao)||null,
      companySize:clean(x.porte)||null,
      mei:typeof x.opcao_pelo_mei==='boolean'?x.opcao_pelo_mei:null,
      municipality:clean(x.municipio)||null,
      uf:clean(x.uf)||null,
      decisionMaker:decision?clean(decision.nome_socio):null,
      decisionMakerRole:decision?clean(decision.qualificacao_socio):null,
      verifiedSource:'BrasilAPI/CNPJ'
    };
  }catch{return null}
}

function score(deal,meta,profile){
  let n=30;const why=[];
  if(clean(meta.phone||meta.whatsapp)){n+=12;why.push('telefone disponível')}
  if(clean(deal.contact_email||meta.discoveredEmail)){n+=15;why.push('e-mail disponível')}
  if(clean(meta.website)){n+=8;why.push('site encontrado')}
  if(Number(meta.rating)>=4){n+=6;why.push('boa avaliação pública')}
  if(Number(meta.reviewsCount)>=20){n+=5;why.push('presença digital validada')}
  if(profile?.cnpj){n+=10;why.push('CNPJ verificado')}
  if(/ativa|ativo/i.test(profile?.status||'')){n+=7;why.push('cadastro ativo')}
  if(profile?.cnaeDescription){n+=4;why.push(`CNAE: ${profile.cnaeDescription}`)}
  if(profile?.decisionMaker){n+=3;why.push('responsável público identificado')}
  return {fitScore:Math.min(n,100),fitReasons:why.slice(0,6)};
}

export async function enrichDeal(deal){
  const meta=deal?.metadata&&typeof deal.metadata==='object'?deal.metadata:{};
  const signals=await websiteSignals(meta.website);
  const candidate=meta.cnpj||signals.discoveredCnpj;
  const profile=candidate?await cnpjProfile(candidate):null;
  const email=clean(deal.contact_email)||clean(meta.discoveredEmail)||clean(signals.discoveredEmail)||null;
  const contact=clean(deal.contact_name)||clean(profile?.decisionMaker)||null;
  const nextMeta={...meta,...signals,...(profile?{cnpjProfile:profile,cnpj:profile.cnpj}:{}),quality:{...score(deal,{...meta,...signals},profile),enrichedAt:new Date().toISOString()}};
  const payload={metadata:nextMeta,updated_at:new Date().toISOString(),...(email?{contact_email:email}:{}),...(contact?{contact_name:contact}:{})};
  const r=await sb(`av_deals?id=eq.${encodeURIComponent(deal.id)}`,{method:'PATCH',body:JSON.stringify(payload)});
  if(!r.ok)throw new Error(`quality_update_failed:${r.status}`);
  const rows=await r.json().catch(()=>[]);return rows[0]||{...deal,...payload};
}

export async function enrichVenture(venture,limit=3){
  if(!configured)return {venture,processed:0,updated:0,reason:'supabase_not_configured'};
  const safe=enabledVentures.includes(venture)?venture:null;if(!safe)return {venture,processed:0,updated:0,reason:'unsupported_venture'};
  const r=await sb(`av_deals?venture_slug=eq.${encodeURIComponent(safe)}&stage=in.(lead,qualified)&select=*&order=updated_at.desc&limit=30`);
  if(!r.ok)return {venture,processed:0,updated:0,reason:'read_failed'};
  const rows=await r.json().catch(()=>[]);
  const candidates=rows.filter(d=>!d?.metadata?.quality?.enrichedAt).slice(0,Math.max(1,Math.min(limit,8)));
  const out=await Promise.allSettled(candidates.map(enrichDeal));
  return {venture,processed:candidates.length,updated:out.filter(x=>x.status==='fulfilled').length,failed:out.filter(x=>x.status==='rejected').length};
}

export async function enrichPortfolio(limitPerVenture=2){
  const results=[];
  for(const venture of enabledVentures)results.push(await enrichVenture(venture,limitPerVenture));
  return {ok:true,results};
}
