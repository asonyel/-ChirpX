'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Clip={id:string;caption:string;status:string;processing_status?:string;moderation_status?:string;created_at:string};
type Metric={clip_id:string;view_count:number;completed_count:number;skipped_count:number;replay_count:number;total_watch_ms:number};
type Job={id:string;clip_id:string;job_type:string;status:string;attempt_count:number;error_message:string|null;updated_at:string};

export default function CreatorStudio(){
 const [clips,setClips]=useState<Clip[]>([]); const [metrics,setMetrics]=useState<Metric[]>([]); const [jobs,setJobs]=useState<Job[]>([]); const [loading,setLoading]=useState(true);
 useEffect(()=>{void load();},[]);
 async function load(){
   const {data:{user}}=await supabase.auth.getUser(); if(!user){location.href='/auth';return;}
   const [clipRes,metricRes,jobRes]=await Promise.all([
     supabase.from('clips').select('id,caption,status,processing_status,moderation_status,created_at').eq('owner_id',user.id).order('created_at',{ascending:false}),
     supabase.from('clip_metrics').select('clip_id,view_count,completed_count,skipped_count,replay_count,total_watch_ms').eq('owner_id',user.id),
     supabase.from('media_jobs').select('id,clip_id,job_type,status,attempt_count,error_message,updated_at').eq('owner_id',user.id).order('updated_at',{ascending:false}),
   ]);
   if(clipRes.error)console.error(clipRes.error); if(metricRes.error)console.error(metricRes.error); if(jobRes.error)console.error(jobRes.error);
   setClips((clipRes.data??[]) as Clip[]); setMetrics((metricRes.data??[]) as Metric[]); setJobs((jobRes.data??[]) as Job[]); setLoading(false);
 }
 const metricMap=useMemo(()=>new Map(metrics.map(m=>[m.clip_id,m])),[metrics]);
 const totals=useMemo(()=>metrics.reduce((a,m)=>({views:a.views+Number(m.view_count),watch:a.watch+Number(m.total_watch_ms),completed:a.completed+Number(m.completed_count)}),{views:0,watch:0,completed:0}),[metrics]);
 return <main style={{maxWidth:980,margin:'0 auto',padding:24}}>
   <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:16}}><a href="/" className="brand">Chirp<span>x</span></a><div><h1 style={{margin:0}}>Creator Studio</h1><div className="muted">Clips, processing and audience signals</div></div><a className="primary" href="/clips">Create Clip</a></header>
   <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12,margin:'24px 0'}}>
     <Stat label="Total views" value={totals.views.toLocaleString()}/><Stat label="Watch time" value={formatMs(totals.watch)}/><Stat label="Completed views" value={totals.completed.toLocaleString()}/><Stat label="Published Clips" value={clips.length.toLocaleString()}/>
   </section>
   {loading&&<div className="card" style={{padding:20}}>Loading Creator Studio…</div>}
   {!loading&&clips.length===0&&<div className="card" style={{padding:20}}>Publish your first Clip to start collecting creator analytics.</div>}
   <section style={{display:'grid',gap:14}}>{clips.map(clip=>{const m=metricMap.get(clip.id); const clipJobs=jobs.filter(j=>j.clip_id===clip.id); const completion=m&&Number(m.view_count)>0?Math.round((Number(m.completed_count)/Number(m.view_count))*100):0; return <article key={clip.id} className="card" style={{padding:18}}>
      <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'flex-start'}}><div><strong>{clip.caption||'Untitled Clip'}</strong><div className="muted">{new Date(clip.created_at).toLocaleString()}</div></div><span>{clip.status}</span></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:10,margin:'16px 0'}}><Mini label="Views" value={m?.view_count??0}/><Mini label="Completion" value={`${completion}%`}/><Mini label="Replays" value={m?.replay_count??0}/><Mini label="Watch" value={formatMs(Number(m?.total_watch_ms??0))}/></div>
      <div className="muted" style={{marginBottom:8}}>Processing pipeline</div><div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{clipJobs.length?clipJobs.map(j=><span key={j.id} style={{border:'1px solid #253041',borderRadius:999,padding:'6px 9px'}}>{j.job_type}: {j.status}{j.attempt_count?` · try ${j.attempt_count}`:''}</span>):<span className="muted">Pipeline jobs will appear after upload.</span>}</div>
    </article>;})}</section>
 </main>;
}

function Stat({label,value}:{label:string;value:string}){return <div className="card" style={{padding:18}}><div className="muted">{label}</div><div style={{fontSize:28,fontWeight:800,marginTop:6}}>{value}</div></div>}
function Mini({label,value}:{label:string;value:string|number}){return <div><div className="muted">{label}</div><strong>{value}</strong></div>}
function formatMs(ms:number){if(!ms)return '0m';const minutes=Math.floor(ms/60000);const hours=Math.floor(minutes/60);return hours?`${hours}h ${minutes%60}m`:`${minutes}m`;}
