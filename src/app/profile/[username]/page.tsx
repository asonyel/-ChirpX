'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Profile={id:string;username:string;display_name:string;bio:string;is_verified:boolean};
type Post={id:string;body:string;created_at:string};

export default function ProfilePage(){
 const params=useParams<{username:string}>();
 const username=decodeURIComponent(params.username);
 const [profile,setProfile]=useState<Profile|null>(null);
 const [posts,setPosts]=useState<Post[]>([]);
 const [me,setMe]=useState<string|null>(null);
 const [following,setFollowing]=useState(false);
 useEffect(()=>{void load();},[username]);
 async function load(){
   const {data:{user}}=await supabase.auth.getUser(); setMe(user?.id??null);
   const {data:p}=await supabase.from('profiles').select('id,username,display_name,bio,is_verified').eq('username',username).maybeSingle();
   if(!p)return; setProfile(p as Profile);
   const {data:feed}=await supabase.from('posts').select('id,body,created_at').eq('author_id',p.id).is('deleted_at',null).order('created_at',{ascending:false}).limit(50); setPosts((feed??[]) as Post[]);
   if(user){const {data:f}=await supabase.from('follows').select('follower_id').eq('follower_id',user.id).eq('following_id',p.id).maybeSingle();setFollowing(!!f);}
 }
 async function toggleFollow(){if(!me||!profile||me===profile.id)return;if(following){await supabase.from('follows').delete().eq('follower_id',me).eq('following_id',profile.id);setFollowing(false);}else{await supabase.from('follows').insert({follower_id:me,following_id:profile.id});setFollowing(true);}}
 if(!profile)return <main style={{padding:24}}>Profile not found.</main>;
 return <main style={{maxWidth:760,margin:'0 auto',padding:24}}>
   <a href="/" className="brand">Chirp<span>x</span></a>
   <section className="card" style={{padding:24,marginTop:20}}><div className="avatar" style={{width:72,height:72,fontSize:24}}>{profile.display_name.slice(0,2).toUpperCase()}</div><h1>{profile.display_name}{profile.is_verified?' ✓':''}</h1><div className="muted">@{profile.username}</div><p>{profile.bio||'No bio yet.'}</p>{me&&me!==profile.id&&<button className="primary" onClick={toggleFollow}>{following?'Following':'Follow'}</button>}</section>
   <h2 style={{marginTop:24}}>Chirps</h2><section className="card">{posts.map(p=><article className="post" key={p.id}><div><p className="body">{p.body}</p><div className="muted">{new Date(p.created_at).toLocaleString()}</div></div></article>)}</section>
 </main>;
}
