'use client';

import { useState } from 'react';

type FeedMode = 'for-you' | 'following';

const posts = [
  { id: 1, name: 'Chirpx Team', handle: '@chirpx', time: 'now', body: 'Welcome to the new Chirpx foundation — conversations, communities, creators and short video in one AI-native network.', initials: 'CX' },
  { id: 2, name: 'Creator Network', handle: '@creators', time: '12m', body: 'Chirpx Clips will make short-form video a first-class citizen without pushing text conversations into the background.', initials: 'CR' },
  { id: 3, name: 'Community Hub', handle: '@community', time: '29m', body: 'Following stays chronological. For You earns attention through relevance, diversity, freshness and healthy engagement — not raw virality alone.', initials: 'CH' },
];

export default function Home() {
  const [mode, setMode] = useState<FeedMode>('for-you');
  const [draft, setDraft] = useState('');

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
            <button className="primary" disabled={!draft.trim()}>Chirp</button>
          </div>
        </section>

        <section aria-label={`${mode} feed`}>
          {posts.map((post) => (
            <article className="post" key={post.id}>
              <div className="avatar">{post.initials}</div>
              <div>
                <div className="meta"><span className="name">{post.name}</span><span className="handle">{post.handle}</span><span className="time">· {post.time}</span></div>
                <p className="body">{post.body}</p>
                <div className="actions"><span>♡ Reply</span><span>↻ Rechirp</span><span>♥ Like</span><span>⌑ Save</span><span>↗ Share</span></div>
              </div>
            </article>
          ))}
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
