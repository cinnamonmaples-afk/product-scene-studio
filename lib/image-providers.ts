export type Provider='gemini'|'doubao';
export const GEMINI_MODELS=['gemini-3.1-flash-image','gemini-3-pro-image'];
export const DOUBAO_MODEL='doubao-seedream-5-0-pro-260628';
export const RESOLUTION='2K';
export class ProviderError extends Error{
status:number;code:string;retryAfter:number;stopQueue=true;
constructor(status:number,code:string,message:string,retryAfter=0){super(message);this.status=status;this.code=code;this.retryAfter=retryAfter}
}
function redact(value:unknown,key:string){return String(value||'').replaceAll(key||'__unused__','[密钥已隐藏]').replace(/AIza[\w-]{20,}/g,'[密钥已隐藏]').replace(/Bearer\s+[^\s"]+/gi,'Bearer [已隐藏]').slice(0,800)}
export function providerError(provider:Provider,status:number,data:any,headers:Headers,key=''){
const e=data?.error||{};const details=Array.isArray(e.details)?e.details:[];const raw=redact(e.message||data?.message,key);
const retryInfo=details.find((x:any)=>String(x['@type']).endsWith('RetryInfo'));
const header= headers.get('retry-after');let delay=Number.parseFloat(retryInfo?.retryDelay||'')||0;
if(header){const seconds=Number(header);delay=Math.max(delay,Number.isFinite(seconds)?seconds:Math.max(0,(Date.parse(header)-Date.now())/1000))}
delay=Math.min(86400,Math.max(0,Math.ceil(delay)));
const label=provider==='gemini'?'Google':'火山方舟';
const violations=details.flatMap((x:any)=>Array.isArray(x.violations)?x.violations:[]);
const metric=violations.map((v:any)=>String(v.quotaId||v.quotaMetric||'')).join(' ');
const zero=violations.some((v:any)=>v.quotaValue!==undefined&&Number(v.quotaValue)===0)||/limit:\s*0\b/i.test(raw);
const daily=/perday|per_day|daily/i.test(metric+' '+raw);
const quotaInfo=violations.map((v:any)=>redact(v.quotaId||v.quotaMetric,key)+(v.quotaValue!==undefined?'（上限 '+v.quotaValue+'）':'')).slice(0,3).join('；');
const detail=(quotaInfo?' 配额项：'+quotaInfo+'。':'')+(raw?' 服务详情：'+raw:'');
if(status===429){if(zero)return new ProviderError(429,'QUOTA_ZERO',label+' 对当前模型的可用配额为 0，请在该项目中开通模型并检查计费。等待重试无法增加配额。'+detail);
if(daily)return new ProviderError(429,'DAILY_QUOTA',label+' 当前模型的每日配额已用完，请等待配额重置或调整项目配额。'+detail,delay);
return new ProviderError(429,'RATE_LIMIT',label+' 暂时限制了请求速率或可用额度。'+(delay?'建议至少等待 '+delay+' 秒再继续。':'请稍后再试，并检查该模型的项目配额。')+detail,delay||60)}
if(status===401||status===403)return new ProviderError(status,'ACCESS_DENIED',label+' 密钥无效、无模型权限或服务地区不可用，请检查所选服务商的密钥。'+detail);
if(status===404)return new ProviderError(400,'MODEL_NOT_FOUND',label+' 未找到该模型，或此项目尚未开通该模型。'+detail);
if(status===400)return new ProviderError(400,'INVALID_REQUEST',label+' 不支持当前模型或请求参数。'+detail);
return new ProviderError(502,'PROVIDER_UNAVAILABLE',label+' 图片服务暂时不可用（HTTP '+status+'）。'+detail,delay||30);
}
export function imageRequest(provider:Provider,model:string,parts:any[],ratio:string){
if(provider==='doubao'){
if(model!==DOUBAO_MODEL)throw new ProviderError(400,'MODEL_NOT_FOUND','当前仅接入 Doubao-Seedream-5.0-pro。');
const sizes:Record<string,string>={'3:4':'1728x2304','1:1':'2048x2048','4:5':'1792x2240','9:16':'1440x2560','16:9':'2560x1440'};
return {url:'https://ark.cn-beijing.volces.com/api/v3/images/generations',body:{model,prompt:parts.filter(p=>p.text).map(p=>p.text).join('\n'),image:parts.filter(p=>p.inlineData).map(p=>'data:'+p.inlineData.mimeType+';base64,'+p.inlineData.data),size:sizes[ratio]||sizes['3:4'],response_format:'b64_json',output_format:'png',watermark:false}}}
if(!GEMINI_MODELS.includes(model))throw new ProviderError(400,'MODEL_NOT_SUPPORTED',model==='gemini-3.8-flash'?'Gemini 3.8 Flash 不支持图片生成，请选择 Gemini Image 模型。':'请选择支持图片生成的 Gemini 模型。');
return {url:'https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent',body:{contents:[{role:'user',parts}],generationConfig:{responseModalities:['TEXT','IMAGE'],imageConfig:{aspectRatio:ratio,imageSize:RESOLUTION}}}};
}
export async function generateImage(provider:Provider,model:string,key:string,parts:any[],ratio:string,fetcher:typeof fetch=fetch,sleep:(ms:number)=>Promise<void>=ms=>new Promise(r=>setTimeout(r,ms))){
const request=imageRequest(provider,model,parts,ratio);let data:any;
for(let attempt=0;attempt<2;attempt++){
const response=await fetcher(request.url,{method:'POST',redirect:'manual',headers:{'Content-Type':'application/json',...(provider==='gemini'?{'x-goog-api-key':key}:{Authorization:'Bearer '+key})},body:JSON.stringify(request.body),signal:AbortSignal.timeout(180000)});
if(response.status>=300&&response.status<400)throw new ProviderError(502,'UNEXPECTED_REDIRECT','图片服务返回了意外跳转，请稍后重试。');
try{data=await response.json()}catch{throw new ProviderError(502,'INVALID_RESPONSE','图片服务返回了无法读取的响应。')}
if(response.ok)break;
const error=providerError(provider,response.status,data,response.headers,key);
// Only a short, explicit transient wait is retried inside this request.
if(attempt===0 && ((error.code==='RATE_LIMIT'&&error.retryAfter<=60)||response.status===503)){
await sleep(Math.max(10000,error.retryAfter*1000));continue}
throw error;
}
if(provider==='doubao'){
const result=data?.data?.[0];if(result?.error)throw providerError(provider,400,{error:result.error},new Headers(),key);
if(!result?.b64_json)throw new ProviderError(502,'NO_IMAGE','豆包未返回图片数据，请检查内容限制或模型权限。');
return {data:result.b64_json as string,mimeType:result.output_format==='jpeg'?'image/jpeg':'image/png'};
}
const part=data?.candidates?.flatMap((v:any)=>v.content?.parts||[]).find((v:any)=>v.inlineData?.mimeType?.startsWith('image/'));
if(!part)throw new ProviderError(422,'NO_IMAGE','模型未返回图片，可能受到内容限制。请调整场景后重试。');
return {data:part.inlineData.data as string,mimeType:part.inlineData.mimeType as string};
}
