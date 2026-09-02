'use client';

import { FormEvent, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Result = { result_type:string; id:string; title:string; subtitle:string; rank:number };

export default function ExplorePage(){
  const [q,setQ]=useState('');
  const [results,setResults]=useState<Result[]>([]);
  const [busy,setBusy]=useState(false);
  async function search(e:FormEvent){
    e.preventDefault();
    if(!q.trim()) return;
    setBusy(true);
    const { data } = await supabase.rpc('search_chirpx',{search_term:q.trim(),limit_count:30});
    setResults((data??[]) as Result[]);
    setBusy(false);
  }
  return <main style={{maxWidth:760,margin:'0 auto',padding:24}}>
    <a href="/" className="brand">Chirp<span>x</span></a>
    <h1>Explore</h1>
    <form onSubmit={search} style={{display:'flex',gap:10,margin:'20px 0'}}>
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search people and public Chirps" style={{flex:1,padding:14,borderRadius:12,border:'1px solid #253041',background:'#151c26',color:'white'}}/>
      <button className="primary" disabled={busy}>{busy?'Searching…':'Search'}</button>
    </form>
    <section className="card">
      {results.length===0?<p className="muted" style={{padding:20}}>Search Chirpx by name, username or public conversation.</p>:results.map(r=><a key={`${r.result_type}-${r.id}`} href={r.result_type==='profile'?`/profile/${r.subtitle}`:'#'} className="post" style={{display:'block'}}><b>{r.title}</b><div className="muted">{r.result_type==='profile'?`@${r.subtitle}`:`@${r.subtitle} · Chirp`}</div></a>)}
    </section>
  </main>;
}
