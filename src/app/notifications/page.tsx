'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Item={id:number;notification_type:string;created_at:string;read_at:string|null;actor_id:string|null;post_id:string|null};

export default function NotificationsPage(){
 const [items,setItems]=useState<Item[]>([]);
 useEffect(()=>{void load();},[]);
 async function load(){
   const {data}=await supabase.from('notifications').select('*').order('created_at',{ascending:false}).limit(50);
   setItems((data??[]) as Item[]);
 }
 async function markRead(id:number){
   await supabase.from('notifications').update({read_at:new Date().toISOString()}).eq('id',id);
   setItems(v=>v.map(x=>x.id===id?{...x,read_at:new Date().toISOString()}:x));
 }
 return <main style={{maxWidth:760,margin:'0 auto',padding:24}}>
   <a href="/" className="brand">Chirp<span>x</span></a><h1>Notifications</h1>
   <section className="card" style={{marginTop:20}}>{items.length===0?<p className="muted" style={{padding:20}}>No notifications yet.</p>:items.map(n=><button key={n.id} onClick={()=>markRead(n.id)} className="post" style={{width:'100%',textAlign:'left',background:n.read_at?'transparent':'#111a25',color:'inherit',border:0,borderBottom:'1px solid #253041'}}><b>{label(n.notification_type)}</b><div className="muted">{new Date(n.created_at).toLocaleString()}</div></button>)}</section>
 </main>;
}
function label(t:string){return ({follow:'Someone followed you',like:'Someone liked your Chirp',reply:'Someone replied to your Chirp',rechirp:'Someone Rechirped you',quote:'Someone quoted your Chirp',mention:'Someone mentioned you'} as Record<string,string>)[t]??'New activity';}
