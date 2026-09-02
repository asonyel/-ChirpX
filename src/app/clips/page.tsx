'use client';

import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Clip={id:string;post_id:string;owner_id:string;storage_path:string;caption:string;created_at:string;url?:string};

export default function ClipsPage(){
 const [clips,setClips]=useState<Clip[]>([]); const [caption,setCaption]=useState(''); const [file,setFile]=useState<File|null>(null); const [busy,setBusy]=useState(false);
 useEffect(()=>{void load();},[]);
 async function load(){
   const {data:{user}}=await supabase.auth.getUser(); if(!user){location.href='/auth';return;}
   const {data,error}=await supabase.rpc('clips_for_you',{limit_count:20}); if(error){console.error(error);return;}
   const rows=(data??[]) as Clip[];
   const hydrated=await Promise.all(rows.map(async c=>{const {data:s}=await supabase.storage.from('chirpx-media').createSignedUrl(c.storage_path,3600);return {...c,url:s?.signedUrl};})); setClips(hydrated);
 }
 async function upload(){
   if(!file)return; setBusy(true); const {data:{user}}=await supabase.auth.getUser(); if(!user){location.href='/auth';return;}
   const {data:post,error:postError}=await supabase.from('posts').insert({author_id:user.id,kind:'chirp',visibility:'public',body:caption}).select('id').single(); if(postError||!post){setBusy(false);return;}
   const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'-'); const path=`${user.id}/clips/${post.id}/${crypto.randomUUID()}-${safe}`;
   const up=await supabase.storage.from('chirpx-media').upload(path,file,{contentType:file.type,upsert:false}); if(up.error){setBusy(false);return;}
   await supabase.from('clips').insert({post_id:post.id,owner_id:user.id,storage_path:path,caption,status:'ready',processing_status:'ready',moderation_status:'pending'});
   setCaption('');setFile(null);setBusy(false);await load();
 }
 return <main style={{maxWidth:680,margin:'0 auto',padding:20}}>
   <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><a href="/" className="brand">Chirp<span>x</span></a><h1>Clips</h1></div>
   <section className="card" style={{padding:16,margin:'16px 0'}}><input type="file" accept="video/mp4,video/webm" onChange={(e:ChangeEvent<HTMLInputElement>)=>setFile(e.target.files?.[0]??null)}/><textarea value={caption} onChange={e=>setCaption(e.target.value)} placeholder="Caption your Clip" maxLength={2200} style={{width:'100%',margin:'12px 0',minHeight:80,background:'#151c26',color:'white',border:'1px solid #253041',borderRadius:12,padding:12}}/><button className="primary" onClick={upload} disabled={!file||busy}>{busy?'Uploading…':'Publish Clip'}</button><div className="muted" style={{marginTop:8}}>Large-video resumable upload and transcoding workers are the next media-infrastructure step.</div></section>
   <section style={{height:'82vh',overflowY:'auto',scrollSnapType:'y mandatory',display:'grid',gap:12}}>{clips.map(c=><ClipCard key={c.id} clip={c}/>)}</section>
 </main>;
}

function ClipCard({clip}:{clip:Clip}){
 const videoRef=useRef<HTMLVideoElement|null>(null); const started=useRef<number>(0); const reported=useRef(false);
 async function report(completed=false,skipped=false){if(reported.current)return; const watched=Math.max(0,Date.now()-started.current); if(watched<800&&!completed&&!skipped)return; reported.current=true; await supabase.rpc('record_clip_view',{p_clip_id:clip.id,p_watched_ms:watched,p_completed:completed,p_replayed:false,p_skipped:skipped});}
 useEffect(()=>{const el=videoRef.current;if(!el)return; const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting&&entry.intersectionRatio>=.75){started.current=Date.now();reported.current=false;void el.play().catch(()=>{});}else if(started.current){void report(false,true);el.pause();}}},{threshold:[.25,.75]});observer.observe(el);return()=>observer.disconnect();},[]);
 return <article className="card" style={{overflow:'hidden',scrollSnapAlign:'start',minHeight:'78vh',position:'relative',background:'#000'}}>{clip.url&&<video ref={videoRef} src={clip.url} playsInline loop muted preload="metadata" onEnded={()=>void report(true,false)} style={{width:'100%',height:'72vh',background:'#000',objectFit:'contain'}}/>}<div style={{padding:14,background:'#0d1117'}}><p>{clip.caption}</p><div className="actions"><span>♥ Like</span><span>♡ Reply</span><span>↻ Rechirp</span><button className="tab" onClick={()=>navigator.share?.({title:'Chirpx Clip',text:clip.caption,url:location.href})}>↗ Share</button></div></div></article>;
}
