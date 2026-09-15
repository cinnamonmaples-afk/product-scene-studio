import {env} from 'cloudflare:workers';
export const runtimeEnv=env as unknown as {DB:D1Database;BUCKET:R2Bucket;CREDENTIAL_ENCRYPTION_KEY:string};
export function db(){if(!runtimeEnv.DB)throw new Error('存储尚未就绪，请稍后再试');return runtimeEnv.DB}
export function bucket(){if(!runtimeEnv.BUCKET)throw new Error('图片存储尚未就绪');return runtimeEnv.BUCKET}
export class HttpError extends Error{constructor(public status:number,message:string,public code='REQUEST_FAILED',public retryAfter=0,public stopQueue=false){super(message)}}
// Single workspace, deliberately no account or login dependency.
export function user(req:Request){if(req.method!=='GET'){const origin=req.headers.get('origin');if(origin && origin!==new URL(req.url).origin)throw new HttpError(403,'请求来源不匹配');}return 'personal-workspace'}

export function reply(v:unknown,status=200){return Response.json(v,{status,headers:{'Cache-Control':'no-store'}})}
export async function body(req:Request){if(Number(req.headers.get('content-length')||0)>1000000)throw new HttpError(413,'内容过长');return await req.json() as any}
export function text(v:unknown,max=5000){if(typeof v!=='string'||v.length>max)throw new HttpError(400,'输入格式不正确或内容过长');return v}
export function encode(b:ArrayBuffer|Uint8Array){return Buffer.from(b as ArrayBuffer).toString('base64')}
export async function cipher(value:string,decrypt=false){if(!runtimeEnv.CREDENTIAL_ENCRYPTION_KEY)throw new HttpError(503,'安全存储尚未配置');const key=await crypto.subtle.importKey('raw',Buffer.from(runtimeEnv.CREDENTIAL_ENCRYPTION_KEY,'base64'),{name:'AES-GCM'},false,['encrypt','decrypt']);if(decrypt){const [iv,data]=value.split('.');return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:Buffer.from(iv,'base64')},key,Buffer.from(data,'base64')))}const iv=crypto.getRandomValues(new Uint8Array(12));return encode(iv)+'.'+encode(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(value)))}
export async function config(owner:string){return await db().prepare('SELECT * FROM settings WHERE owner=?').bind(owner).first<{secret:string;model:string;provider:'gemini'|'doubao';doubao_secret:string|null;doubao_model:string;gemini_cooldown:number;doubao_cooldown:number}>()}
export const models=['gemini-3.1-flash-image','gemini-3-pro-image'];
export async function ownedAsset(id:string,owner:string){const a=await db().prepare('SELECT * FROM assets WHERE id=? AND owner=?').bind(id,owner).first<any>();if(!a)throw new HttpError(404,'图片不存在');return a}
