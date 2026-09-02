'use client';

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type FeedMode='for-you'|'following';
type Media={id:string;storage_path:string;media_type:string;url?:string};
type FeedPost={id:string;author_id:string;body:string;created_at:string;author?:{username:string;display_name:string};media?:Media[]};

export default function Home(){
 const [mode,setMode]=useState<FeedMode>('for-you');
 const [draft,setDraft]=useState('');
 const [file,setFile]=useState<File|null>(null);
 const [posts,setPosts]=useState<FeedPost[]>([]);
 const [loading,setLoading]=useState(true);
 const [posting,setPosting]=useState(false);
 const [currentUserId,setCurrentUserId]=useState<string|null>(null);
 const [liked,setLiked]=useState<Set<string>>(new Set());
 const [bookmarked,setBookmarked]=useState<Set<string>>(new Set());
 const [following,setFollowing]=useState<Set<string>>(new Set());

 const loadFeed=useCallback(async(feedMode:FeedMode)=>{
  setLoading(true);
  const {data:auth}=await supabase.auth.getUser();
  if(!auth.user){window.location.href='/auth';return;}
  const uid=auth.user.id;setCurrentUserId(uid);
  const fn=feedMode==='following'?'following_feed':'for_you_feed';
  const {data,error}=await supabase.rpc(fn,{limit_count:30});
  if(error){console.error(error);setPosts([]);setLoading(false);return;}
  const raw=(data??[]) as FeedPost[];
  const ids=raw.map(p=>p.id),authorIds=[...new Set(raw.map(p=>p.author_id))];
  const [{data:profiles},{data:mediaRows},{data:likes},{data:marks},{data:follows}]=await Promise.all([
    authorIds.length?supabase.from('profiles').select('id,username,display_name').in('id',authorIds):Promise.resolve({data:[]}),
    ids.length?supabase.from('post_media').select('id,post_id,storage_path,media_type').in('post_id',ids):Promise.resolve({data:[]}),
    ids.length?supabase.from('reactions').select('post_id').eq('user_id',uid).in('post_id',ids):Promise.resolve({data:[]}),
    ids.length?supabase.from('bookmarks').select('post_id').eq('user_id',uid).in('post_id',ids):Promise.resolve({data:[]}),
    authorIds.length?supabase.from('follows').select('following_id').eq('follower_id',uid).in('following_id',authorIds):Promise.resolve({data:[]}),
  ]);
  const profileMap=new Map((profiles??[]).map((p:any)=>[p.id,p]));
  const grouped=new Map<string,Media[]>();
  for(const m of (mediaRows??[]) as any[]){const {data:signed}=await supabase.storage.from('chirpx-media').createSignedUrl(m.storage_path,3600);const row={...m,url:signed?.signedUrl};grouped.set(m.post_id,[...(grouped.get(m.post_id)??[]),row]);}
  setLiked(new Set((likes??[]).map((x:any)=>x.post_id)));
  setBookmarked(new Set((marks??[]).map((x:any)=>x.post_id)));
  setFollowing(new Set((follows??[]).map((x:any)=>x.following_id)));
  setPosts(raw.map(p=>({...p,author:profileMap.get(p.author_id),media:grouped.get(p.id)??[]})));
  setLoading(false);
 },[]);

 useEffect(()=>{void loadFeed(mode);},[mode,loadFeed]);

 async function createChirp(){
  const body=draft.trim();if((!body&&!file)||!currentUserId||posting)return;setPosting(true);
  const {data:post,error}=await supabase.from('posts').insert({author_id:currentUserId,body,visibility:'public',kind:'chirp'}).select('id').single();
  if(error||!post){alert(error?.message??'Could not create Chirp');setPosting(false);return;}
  if(file){const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'-');const path=`${currentUserId}/posts/${post.id}/${crypto.randomUUID()}-${safe}`;const upload=await supabase.storage.from('chirpx-media').upload(path,file,{contentType:file.type,upsert:false});if(upload.error){alert(upload.error.message);}else{await supabase.from('post_media').insert({post_id:post.id,owner_id:currentUserId,media_type:file.type.startsWith('video/')?'video':'image',storage_path:path});}}
  setDraft('');setFile(null);setPosting(false);await loadFeed(mode);
 }
 async function toggleLike(postId:string){if(!currentUserId)return;if(liked.has(postId)){await supabase.from('reactions').delete().eq('post_id',postId).eq('user_id',currentUserId);setLiked(s=>{const n=new Set(s);n.delete(postId);return n;});}else{await supabase.from('reactions').insert({post_id:postId,user_id:currentUserId,reaction:'like'});setLiked(s=>new Set(s).add(postId));}}
 async function toggleBookmark(postId:string){if(!currentUserId)return;if(bookmarked.has(postId)){await supabase.from('bookmarks').delete().eq('post_id',postId).eq('user_id',currentUserId);setBookmarked(s=>{const n=new Set(s);n.delete(postId);return n;});}else{await supabase.from('bookmarks').insert({post_id:postId,user_id:currentUserId});setBookmarked(s=>new Set(s).add(postId));}}
 async function reply(postId:string){if(!currentUserId)return;const body=window.prompt('Write your reply');if(!body?.trim())return;await supabase.from('posts').insert({author_id:currentUserId,body:body.trim(),visibility:'public',kind:'reply',parent_post_id:postId});await loadFeed(mode);}
 async function rechirp(postId:string){if(!currentUserId)return;await supabase.from('posts').insert({author_id:currentUserId,body:'',visibility:'public',kind:'repost',quoted_post_id:postId});await loadFeed(mode);}
 async function quote(postId:string){if(!currentUserId)return;const body=window.prompt('Add your comment');if(!body?.trim())return;await supabase.from('posts').insert({author_id:currentUserId,body:body.trim(),visibility:'public',kind:'quote',quoted_post_id:postId});await loadFeed(mode);}
 async function toggleFollow(authorId:string){if(!currentUserId||authorId===currentUserId)return;if(following.has(authorId)){await supabase.from('follows').delete().eq('follower_id',currentUserId).eq('following_id',authorId);setFollowing(s=>{const n=new Set(s);n.delete(authorId);return n;});}else{await supabase.from('follows').insert({follower_id:currentUserId,following_id:authorId});setFollowing(s=>new Set(s).add(authorId));}}
 async function signOut(){await supabase.auth.signOut();window.location.href='/auth';}
 const emptyMessage=useMemo(()=>mode==='following'?'Follow people to build your chronological feed.':'Your For You feed is ready for the first Chirp.',[mode]);

 return <div className="shell">
  <aside className="rail"><div className="brand">Chirp<span>x</span></div><nav className="nav" aria-label="Primary">
   <a className="active" href="/"><span>⌂&nbsp; Home</span></a><a href="/explore"><span>⌕&nbsp; Explore</span></a><a href="/clips"><span>▶&nbsp; Clips</span></a><a href="/notifications"><span>◉&nbsp; Notifications</span></a><a href="#"><span>✉&nbsp; Messages</span></a><a href="#"><span>◎&nbsp; Communities</span></a><button className="tab" onClick={signOut}><span>↪&nbsp; Sign out</span></button>
  </nav></aside>
  <main className="main"><header className="topbar"><div className="tabs"><button className={`tab ${mode==='for-you'?'active':''}`} onClick={()=>setMode('for-you')}>For You</button><button className={`tab ${mode==='following'?'active':''}`} onClick={()=>setMode('following')}>Following</button></div></header>
   <section className="composer" aria-label="Create Chirp"><textarea value={draft} onChange={e=>setDraft(e.target.value)} maxLength={10000} placeholder="What’s happening?"/><div className="composer-row"><label className="tools" style={{cursor:'pointer'}}>▧ Media<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" onChange={(e:ChangeEvent<HTMLInputElement>)=>setFile(e.target.files?.[0]??null)} style={{display:'none'}}/></label><span className="muted">{file?.name}</span><button className="primary" onClick={createChirp} disabled={(!draft.trim()&&!file)||posting}>{posting?'Posting…':'Chirp'}</button></div></section>
   <section aria-label={`${mode} feed`}>{loading&&<div className="card" style={{margin:18}}>Loading feed…</div>}{!loading&&posts.length===0&&<div className="card" style={{margin:18}}>{emptyMessage}</div>}{posts.map(post=>{const name=post.author?.display_name??'Chirpx User';const username=post.author?.username??'chirpx';return <article className="post" key={post.id}><div className="avatar">{name.slice(0,2).toUpperCase()}</div><div style={{minWidth:0}}><div className="meta"><a className="name" href={`/profile/${username}`}>{name}</a><span className="handle">@{username}</span><span className="time">· {new Date(post.created_at).toLocaleString()}</span>{currentUserId!==post.author_id&&<button className="tab" onClick={()=>toggleFollow(post.author_id)}>{following.has(post.author_id)?'Following':'Follow'}</button>}</div><p className="body">{post.body}</p>{post.media?.map(m=>m.url&&(m.media_type==='video'?<video key={m.id} src={m.url} controls playsInline style={{width:'100%',borderRadius:14,maxHeight:520}}/>:<img key={m.id} src={m.url} alt="Chirpx media" style={{width:'100%',borderRadius:14,maxHeight:520,objectFit:'cover'}}/>))}<div className="actions"><button onClick={()=>reply(post.id)}>♡ Reply</button><button onClick={()=>rechirp(post.id)}>↻ Rechirp</button><button onClick={()=>quote(post.id)}>❝ Quote</button><button onClick={()=>toggleLike(post.id)}>{liked.has(post.id)?'♥ Liked':'♡ Like'}</button><button onClick={()=>toggleBookmark(post.id)}>{bookmarked.has(post.id)?'⌑ Saved':'⌑ Save'}</button><button onClick={()=>navigator.share?.({title:'Chirpx',text:post.body,url:location.href})}>↗ Share</button></div></div></article>;})}</section>
  </main>
  <aside className="right"><div className="card"><h3>What’s happening</h3><div className="trend"><b>#ChirpxBuild</b><div className="muted">Production social layer</div></div><div className="trend"><b>Creator Economy</b><div className="muted">Growing conversations</div></div><div className="trend"><b>AI + Social</b><div className="muted">Trending in technology</div></div></div><div className="card"><h3>Built for control</h3><div className="muted">Chronological Following, private media storage, notifications and creator-first publishing.</div></div></aside>
  <nav className="mobilebar" aria-label="Mobile navigation"><a href="/">⌂</a><a href="/explore">⌕</a><a href="/">＋</a><a href="/clips">▶</a><a href="/notifications">◉</a></nav>
 </div>;
}
