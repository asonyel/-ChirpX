'use client';

import { ChangeEvent, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Clip={id:string;post_id:string;owner_id:string;storage_path:string;caption:string;created_at:string;url?:string};

export default function ClipsPage(){
 const [clips,setClips]=useState<Clip[]>([]);
 const [caption,setCaption]=useState('');
 const [file,setFile]=useState<File|null>(null);
 const [busy,setBusy]=useState(false);
 useEffect(()=>{void load();},[]);
 async function load(){
   const {data}=await supabase.from('clips').select('*').order('created_at',{ascending:false}).limit(20);
   const rows=(data??[]) as Clip[];
   const hydrated=await Promise.all(rows.map(async c=>{const {data:s}=await supabase.storage.from('chirpx-media').createSignedUrl(c.storage_path,3600);return {...c,url:s?.signedUrl};}));
   setClips(hydrated);
 }
 async function upload(){
   if(!file)return;
   setBusy(true);
   const {data:{user}}=await supabase.auth.getUser();
   if(!user){location.href='/auth';return;}
   const {data:post,error:postError}=await supabase.from('posts').insert({author_id:user.id,kind:'chirp',visibility:'public',body:caption}).select('id').single();
   if(postError||!post){setBusy(false);return;}
   const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'-');
   const path=`${user.id}/clips/${post.id}/${crypto.randomUUID()}-${safe}`;
   const up=await supabase.storage.from('chirpx-media').upload(path,file,{contentType:file.type,upsert:false});
   if(up.error){setBusy(false);return;}
   await supabase.from('clips').insert({post_id:post.id,owner_id:user.id,storage_path:path,caption,status:'ready'});
   setCaption('');setFile(null);setBusy(false);await load();
 }
 return <main style={{maxWidth:680,margin:'0 auto',padding:20}}>
   <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><a href="/" className="brand">Chirp<span>x</span></a><h1>Clips</h1></div>
   <section className="card" style={{padding:16,margin:'16px 0'}}><input type="file" accept="video/mp4,video/webm" onChange={(e:ChangeEvent<HTMLInputElement>)=>setFile(e.target.files?.[0]??null)}/><textarea value={caption} onChange={e=>setCaption(e.target.value)} placeholder="Caption your Clip" maxLength={2200} style={{width:'100%',margin:'12px 0',minHeight:80,background:'#151c26',color:'white',border:'1px solid #253041',borderRadius:12,padding:12}}/><button className="primary" onClick={upload} disabled={!file||busy}>{busy?'Uploading…':'Publish Clip'}</button></section>
   <section style={{display:'grid',gap:18}}>{clips.map(c=><article key={c.id} className="card" style={{overflow:'hidden'}}>{c.url&&<video src={c.url} controls playsInline preload="metadata" style={{width:'100%',maxHeight:'78vh',background:'#000',objectFit:'contain'}}/>}<div style={{padding:14}}><p>{c.caption}</p><div className="actions"><span>♥ Like</span><span>♡ Reply</span><span>↻ Rechirp</span><span>↗ Share</span></div></div></article>)}</section>
 </main>;
}
