'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type FeedMode = 'for-you' | 'following';
type FeedPost = {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
  author?: { username: string; display_name: string };
};

export default function Home() {
  const [mode, setMode] = useState<FeedMode>('for-you');
  const [draft, setDraft] = useState('');
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const loadFeed = useCallback(async (feedMode: FeedMode) => {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      window.location.href = '/auth';
      return;
    }
    setCurrentUserId(auth.user.id);

    const fn = feedMode === 'following' ? 'following_feed' : 'for_you_feed';
    const { data, error } = await supabase.rpc(fn, { limit_count: 30 });
    if (error) {
      console.error(error);
      setPosts([]);
      setLoading(false);
      return;
    }

    const raw = (data ?? []) as FeedPost[];
    const authorIds = [...new Set(raw.map((p) => p.author_id))];
    const { data: profiles } = authorIds.length
      ? await supabase.from('profiles').select('id,username,display_name').in('id', authorIds)
      : { data: [] as { id: string; username: string; display_name: string }[] };

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    setPosts(raw.map((post) => ({ ...post, author: profileMap.get(post.author_id) })));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadFeed(mode);
  }, [mode, loadFeed]);

  async function createChirp() {
    const body = draft.trim();
    if (!body || !currentUserId || posting) return;
    setPosting(true);
    const { error } = await supabase.from('posts').insert({ author_id: currentUserId, body, visibility: 'public', kind: 'chirp' });
    if (!error) {
      setDraft('');
      await loadFeed(mode);
    } else {
      alert(error.message);
    }
    setPosting(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  }

  const emptyMessage = useMemo(() => mode === 'following' ? 'Follow people to build your chronological feed.' : 'Your For You feed is ready for the first Chirp.', [mode]);

  return (
    <div className="shell">
      <aside className="rail">
        <div className="brand">Chirp<span>x</span></div>
        <nav className="nav" aria-label="Primary">
          <a className="active" href="#"><span>⌂&nbsp; Home</span></a>
          <a href="#"><span>⌕&nbsp; Explore</span></a>
          <a href="#"><span>▶&nbsp; Clips</span></a>
          <a href="#"><span>✉&nbsp; Messages</span></a>
          <a href="#"><span>◎&nbsp; Communities</span></a>
          <a href="#"><span>♙&nbsp; Profile</span></a>
          <button className="tab" onClick={signOut}><span>↪&nbsp; Sign out</span></button>
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="tabs">
            <button className={`tab ${mode === 'for-you' ? 'active' : ''}`} onClick={() => setMode('for-you')}>For You</button>
            <button className={`tab ${mode === 'following' ? 'active' : ''}`} onClick={() => setMode('following')}>Following</button>
          </div>
        </header>

        <section className="composer" aria-label="Create Chirp">
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={10000} placeholder="What’s happening?" />
          <div className="composer-row">
            <div className="tools">▧ Media &nbsp; ◉ Poll &nbsp; ✦ AI</div>
            <button className="primary" onClick={createChirp} disabled={!draft.trim() || posting}>{posting ? 'Posting…' : 'Chirp'}</button>
          </div>
        </section>

        <section aria-label={`${mode} feed`}>
          {loading && <div className="card" style={{margin:18}}>Loading feed…</div>}
          {!loading && posts.length === 0 && <div className="card" style={{margin:18}}>{emptyMessage}</div>}
          {posts.map((post) => {
            const name = post.author?.display_name ?? 'Chirpx User';
            const handle = post.author?.username ? `@${post.author.username}` : '@chirpx';
            return (
              <article className="post" key={post.id}>
                <div className="avatar">{name.slice(0,2).toUpperCase()}</div>
                <div>
                  <div className="meta"><span className="name">{name}</span><span className="handle">{handle}</span><span className="time">· {new Date(post.created_at).toLocaleString()}</span></div>
                  <p className="body">{post.body}</p>
                  <div className="actions"><span>♡ Reply</span><span>↻ Rechirp</span><span>♥ Like</span><span>⌑ Save</span><span>↗ Share</span></div>
                </div>
              </article>
            );
          })}
        </section>
      </main>

      <aside className="right">
        <div className="card"><h3>What’s happening</h3><div className="trend"><b>#ChirpxBuild</b><div className="muted">Production foundation</div></div><div className="trend"><b>Creator Economy</b><div className="muted">Growing conversations</div></div><div className="trend"><b>AI + Social</b><div className="muted">Trending in technology</div></div></div>
        <div className="card"><h3>Built for control</h3><div className="muted">Chronological Following, transparent safety controls, multilingual AI and creator-first publishing.</div></div>
      </aside>

      <nav className="mobilebar" aria-label="Mobile navigation"><a href="#">⌂</a><a href="#">⌕</a><a href="#">＋</a><a href="#">▶</a><a href="#">♙</a></nav>
    </div>
  );
}
