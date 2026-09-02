'use client';

import { ChangeEvent, useEffect, useRef, useState } from 'react';
import * as tus from 'tus-js-client';
import { supabase } from '@/lib/supabase';

type Clip={id:string;post_id:string;owner_id:string;storage_path:string;caption:string;created_at:string;url?:string};

const PROJECT_REF='vfqeosnclfdvmzilcgrv';
const MEDIA_BUCKET='chirpx-media';

export default function ClipsPage(){
 const [clips,setClips]=useState<Clip[]>([]); const [caption,setCaption]=useState(''); const [file,setFile]=useState<File|null>(null); const [busy,setBusy]=useState(false); const [progress,setProgress]=useState(0); const [message,setMessage]=useState(''); const [currentUserId,setCurrentUserId]=useState<string|null>(null); const [liked,setLiked]=useState<Set<string>>(new Set());
 useEffect(()=>{void load();},[]);
 async function load(){
   const {data:{user}}=await supabase.auth.getUser(); if(!user){location.href='/auth';return;} setCurrentUserId(user.id);
   const {data,error}=await supabase.rpc('clips_for_you',{limit_count:20}); if(error){console.error(error);return;}
   const rows=(data??[]) as Clip[]; const postIds=rows.map(c=>c.post_id);
   if(postIds.length){const {data:likes}=await supabase.from('reactions').select('post_id').eq('user_id',user.id).in('post_id',postIds);setLiked(new Set((likes??[]).map((r:any)=>r.post_id)));}else setLiked(new Set());
   const hydrated=await Promise.all(rows.map(async c=>{const {data:s}=await supabase.storage.from(MEDIA_BUCKET).createSignedUrl(c.storage_path,3600);return {...c,url:s?.signedUrl};})); setClips(hydrated);
 }
 async function resumableUpload(path:string, video:File){
   const {data:{session}}=await supabase.auth.getSession(); if(!session)throw new Error('Your session expired. Please sign in again.');
   await new Promise<void>((resolve,reject)=>{
     const upload=new tus.Upload(video,{
       endpoint:`https://${PROJECT_REF}.storage.supabase.co/storage/v1/upload/resumable`,retryDelays:[0,3000,5000,10000,20000],headers:{authorization:`Bearer ${session.access_token}`},uploadDataDuringCreation:true,removeFingerprintOnSuccess:true,
       metadata:{bucketName:MEDIA_BUCKET,objectName:path,contentType:video.type||'video/mp4',cacheControl:'3600'},chunkSize:6*1024*1024,
       onError:(error)=>reject(error),onProgress:(uploaded,total)=>setProgress(total?Math.round((uploaded/total)*100):0),onSuccess:()=>resolve(),
     });
     void upload.findPreviousUploads().then(previous=>{if(previous.length)upload.resumeFromPreviousUpload(previous[0]);upload.start();}).catch(reject);
   });
 }
 async function upload(){
   if(!file)return; setBusy(true); setProgress(0); setMessage('Preparing Clip…');
   try{
     const {data:{user}}=await supabase.auth.getUser(); if(!user){location.href='/auth';return;}
     const {data:post,error:postError}=await supabase.from('posts').insert({author_id:user.id,kind:'chirp',visibility:'public',body:caption}).select('id').single(); if(postError||!post)throw postError??new Error('Could not create Clip post.');
     const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'-'); const path=`${user.id}/clips/${post.id}/${crypto.randomUUID()}-${safe}`;
     setMessage('Uploading securely…'); await resumableUpload(path,file); setMessage('Queuing processing…');
     const {error:clipError}=await supabase.from('clips').insert({post_id:post.id,owner_id:user.id,storage_path:path,caption,status:'processing',processing_status:'queued',moderation_status:'pending'}); if(clipError)throw clipError;
     setCaption(''); setFile(null); setProgress(100); setMessage('Upload complete. Chirpx is preparing your Clip.'); await load();
   }catch(error){console.error(error);setMessage(error instanceof Error?error.message:'Clip upload failed.');} finally{setBusy(false);}
 }
 async function toggleLike(postId:string){if(!currentUserId)return;if(liked.has(postId)){await supabase.from('reactions').delete().eq('post_id',postId).eq('user_id',currentUserId);setLiked(s=>{const n=new Set(s);n.delete(postId);return n;});}else{await supabase.from('reactions').insert({post_id:postId,user_id:currentUserId,reaction:'like'});setLiked(s=>new Set(s).add(postId));}}
 async function reply(postId:string){if(!currentUserId)return;const body=window.prompt('Write your reply');if(!body?.trim())return;await supabase.from('posts').insert({author_id:currentUserId,body:body.trim(),visibility:'public',kind:'reply',parent_post_id:postId});}
 async function rechirp(postId:string){if(!currentUserId)return;await supabase.from('posts').insert({author_id:currentUserId,body:'',visibility:'public',kind:'repost',quoted_post_id:postId});}
 return <main style={{maxWidth:680,margin:'0 auto',padding:20}}>
   <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}><a href="/" className="brand">Chirp<span>x</span></a><h1 style={{flex:1,textAlign:'center'}}>Clips</h1><a href="/creator" className="tab">Studio</a></div>
   <section className="card" style={{padding:16,margin:'16px 0'}}><input type="file" accept="video/mp4,video/webm" onChange={(e:ChangeEvent<HTMLInputElement>)=>setFile(e.target.files?.[0]??null)}/><textarea value={caption} onChange={e=>setCaption(e.target.value)} placeholder="Caption your Clip" maxLength={2200} style={{width:'100%',margin:'12px 0',minHeight:80,background:'#151c26',color:'white',border:'1px solid #253041',borderRadius:12,padding:12}}/><button className="primary" onClick={upload} disabled={!file||busy}>{busy?`Uploading ${progress}%`:'Publish Clip'}</button>{busy&&<div aria-label="Upload progress" style={{height:8,background:'#151c26',borderRadius:999,overflow:'hidden',marginTop:10}}><div style={{height:'100%',width:`${progress}%`,background:'#e91e63',transition:'width .2s ease'}}/></div>}{message&&<div className="muted" style={{marginTop:8}}>{message}</div>}</section>
   <section style={{height:'82vh',overflowY:'auto',scrollSnapType:'y mandatory',display:'grid',gap:12}}>{clips.map(c=><ClipCard key={c.id} clip={c} liked={liked.has(c.post_id)} onLike={()=>void toggleLike(c.post_id)} onReply={()=>void reply(c.post_id)} onRechirp={()=>void rechirp(c.post_id)}/>)}</section>
 </main>;
}

function ClipCard({clip,liked,onLike,onReply,onRechirp}:{clip:Clip;liked:boolean;onLike:()=>void;onReply:()=>void;onRechirp:()=>void}){
 const videoRef=useRef<HTMLVideoElement|null>(null); const started=useRef<number>(0); const reported=useRef(false); const completed=useRef(false);
 async function report(isCompleted=false,skipped=false){if(reported.current)return; const watched=Math.max(0,Date.now()-started.current); if(watched<800&&!isCompleted&&!skipped)return; reported.current=true; if(isCompleted)completed.current=true; await supabase.rpc('record_clip_view',{p_clip_id:clip.id,p_watched_ms:watched,p_completed:isCompleted,p_replayed:false,p_skipped:skipped});}
 useEffect(()=>{const el=videoRef.current;if(!el)return; const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting&&entry.intersectionRatio>=.75){started.current=Date.now();reported.current=false;completed.current=false;void el.play().catch(()=>{});}else if(started.current){void report(false,true);el.pause();}}},{threshold:[.25,.75]});observer.observe(el);return()=>observer.disconnect();},[]);
 function timeUpdate(){const el=videoRef.current;if(!el||!Number.isFinite(el.duration)||el.duration<=0||completed.current)return;if(el.currentTime/el.duration>=.95)void report(true,false);}
 return <article className="card" style={{overflow:'hidden',scrollSnapAlign:'start',minHeight:'78vh',position:'relative',background:'#000'}}>{clip.url&&<video ref={videoRef} src={clip.url} playsInline loop muted preload="metadata" onTimeUpdate={timeUpdate} style={{width:'100%',height:'72vh',background:'#000',objectFit:'contain'}}/>}<div style={{padding:14,background:'#0d1117'}}><p>{clip.caption}</p><div className="actions"><button onClick={onLike}>{liked?'♥ Liked':'♡ Like'}</button><button onClick={onReply}>♡ Reply</button><button onClick={onRechirp}>↻ Rechirp</button><button className="tab" onClick={()=>navigator.share?.({title:'Chirpx Clip',text:clip.caption,url:location.href})}>↗ Share</button></div></div></article>;
}
