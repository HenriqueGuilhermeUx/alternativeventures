import {inflateRawSync} from 'node:zlib';
import {configured,sb} from './_supabase.mjs';

const CVM_URL='https://dados.cvm.gov.br/dados/CONSULTOR_VLMOB/CAD/DADOS/cad_consultor_vlmob.zip';
const UA='AlternativeVentures-AVOS/1.0 (+https://alternativeventures.com.br)';
const clean=v=>String(v??'').trim();
const digits=v=>clean(v).replace(/\D/g,'');
const key=s=>clean(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,'_').replace(/^_|_$/g,'');
const companyKey=s=>clean(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

function firstCsvFromZip(bytes){
  const b=Buffer.from(bytes);let eocd=-1;
  for(let i=b.length-22;i>=Math.max(0,b.length-65557);i--){if(b.readUInt32LE(i)===0x06054b50){eocd=i;break}}
  if(eocd<0)throw new Error('cvm_zip_invalid');
  const entries=b.readUInt16LE(eocd+10),dir=b.readUInt32LE(eocd+16);let p=dir;
  for(let i=0;i<entries;i++){
    if(b.readUInt32LE(p)!==0x02014b50)break;
    const method=b.readUInt16LE(p+10),compressed=b.readUInt32LE(p+20),nameLen=b.readUInt16LE(p+28),extraLen=b.readUInt16LE(p+30),commentLen=b.readUInt16LE(p+32),local=b.readUInt32LE(p+42);
    const name=b.slice(p+46,p+46+nameLen).toString('utf8');
    if(/\.csv$/i.test(name)){
      if(b.readUInt32LE(local)!==0x04034b50)throw new Error('cvm_zip_local_header');
      const ln=b.readUInt16LE(local+26),le=b.readUInt16LE(local+28),start=local+30+ln+le,raw=b.slice(start,start+compressed);
      return method===0?raw:method===8?inflateRawSync(raw):(()=>{throw new Error(`cvm_zip_method_${method}`)})();
    }
    p+=46+nameLen+extraLen+commentLen;
  }
  throw new Error('cvm_csv_not_found');
}

function parseLine(line,delimiter){
  const out=[];let cur='',quote=false;
  for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(quote&&line[i+1]==='"'){cur+='"';i++}else quote=!quote}else if(c===delimiter&&!quote){out.push(cur);cur=''}else cur+=c}out.push(cur);return out;
}

function rowsFromCsv(buffer,limit=3000){
  const text=Buffer.from(buffer).toString('latin1').replace(/^\uFEFF/,'');const lines=text.split(/\r?\n/).filter(Boolean);if(!lines.length)return [];
  const delimiter=(lines[0].match(/;/g)||[]).length>=(lines[0].match(/,/g)||[]).length?';':',';
  const headers=parseLine(lines[0],delimiter).map(key),rows=[];
  for(let i=1;i<lines.length&&rows.length<limit;i++){const cols=parseLine(lines[i],delimiter),row={};headers.forEach((h,j)=>row[h]=clean(cols[j]));rows.push(row)}return rows;
}

const pick=(row,names)=>{for(const n of names){if(row[n])return row[n]}for(const [k,v] of Object.entries(row)){if(names.some(n=>k.includes(n))&&v)return v}return null};

function normalize(row){
  const company=pick(row,['DENOM_SOCIAL','DENOMINACAO_SOCIAL','RAZAO_SOCIAL','NOME_EMPRESARIAL','NOME']);
  const registry=pick(row,['CNPJ','CPF_CNPJ','NR_CPF_CNPJ','CNPJ_CPF']);const cnpj=digits(registry);if(!company||cnpj.length!==14)return null;
  const status=pick(row,['SIT','SITUACAO','SIT_REG','SITUACAO_REGISTRO','SIT_CADASTRAL']);if(status&&/(CANCEL|SUSPEN|INATIV|ENCERR|BAIXAD)/i.test(status))return null;
  const uf=pick(row,['UF','UF_SEDE','UF_PF_PJ']),municipality=pick(row,['MUN','MUNICIPIO','MUNICIPIO_SEDE','CIDADE']);
  const email=pick(row,['EMAIL','E_MAIL','EMAIL_CONTATO']),phone=pick(row,['TEL','TELEFONE','TELEFONE_CONTATO']);
  return {company,cnpj,status:status||'registro CVM',uf:uf||null,municipality:municipality||null,email:email||null,phone:phone||null};
}

export async function syncCvmConsultants(maxItems=50){
  if(!configured)return {ok:false,error:'supabase_not_configured'};
  const r=await fetch(CVM_URL,{headers:{'user-agent':UA,'accept':'application/zip'},signal:AbortSignal.timeout(15000)});if(!r.ok)throw new Error(`cvm_http_${r.status}`);
  const csv=firstCsvFromZip(await r.arrayBuffer()),all=rowsFromCsv(csv).map(normalize).filter(Boolean);
  const sp=all.filter(x=>x.uf==='SP'),pool=(sp.length?sp:all).slice(0,Math.max(1,Math.min(maxItems,100)));
  const ex=await sb('av_deals?venture_slug=eq.f-insight&select=company,metadata&limit=5000');const existing=ex.ok?await ex.json().catch(()=>[]):[];
  const names=new Set(existing.map(x=>companyKey(x.company)).filter(Boolean)),cnpjs=new Set(existing.map(x=>digits(x?.metadata?.cnpj)).filter(x=>x.length===14));
  const fresh=[];
  for(const x of pool){if(names.has(companyKey(x.company))||cnpjs.has(x.cnpj))continue;names.add(companyKey(x.company));cnpjs.add(x.cnpj);fresh.push({venture_slug:'f-insight',company:x.company,contact_name:null,contact_email:x.email,stage:'lead',value_brl:0,source:'cvm-consultores',next_action:'Fazer primeiro contato',metadata:{cnpj:x.cnpj,...(x.phone?{phone:x.phone}:{}),...(x.uf?{uf:x.uf}:{}),...(x.municipality?{municipality:x.municipality}:{}),cvmStatus:x.status,verifiedSource:'CVM',cvmDataset:'consultor_vlmob',quality:{fitScore:92,fitReasons:['registro oficial CVM','consultor de valores mobiliários','CNPJ verificado'],enrichedAt:new Date().toISOString()}}})}
  let inserted=[];if(fresh.length){const ir=await sb('av_deals',{method:'POST',body:JSON.stringify(fresh)});if(!ir.ok)throw new Error(`cvm_insert_${ir.status}:${await ir.text()}`);inserted=await ir.json().catch(()=>[])}
  await sb('av_events',{method:'POST',body:JSON.stringify({venture_slug:'f-insight',event_name:'prospecting.cvm.synced',numeric_value:inserted.length,unit:'count',metadata:{source:'CVM',dataset:'consultor_vlmob',received:pool.length,inserted:inserted.length,duplicates:pool.length-inserted.length}})}).catch(()=>null);
  return {ok:true,source:'CVM',dataset:'consultor_vlmob',received:pool.length,inserted:inserted.length,duplicates:pool.length-inserted.length,scope:sp.length?'SP':'Brasil'};
}
