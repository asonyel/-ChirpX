'use client';

import { FormEvent, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage('');

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
      else window.location.href = '/';
      setBusy(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username, display_name: displayName || username } },
    });

    if (error) {
      setMessage(error.message);
    } else if (data.session) {
      window.location.href = '/';
    } else {
      setMessage('Check your email to confirm your Chirpx account, then sign in.');
    }
    setBusy(false);
  }

  return (
    <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24}}>
      <section className="card" style={{width:'min(100%,460px)',padding:28}}>
        <div className="brand" style={{marginBottom:8}}>Chirp<span>x</span></div>
        <p className="muted">Join conversations, communities, creators and short video in one network.</p>
        <div className="tabs" style={{margin:'20px 0'}}>
          <button className={`tab ${mode==='signup'?'active':''}`} onClick={()=>setMode('signup')}>Create account</button>
          <button className={`tab ${mode==='signin'?'active':''}`} onClick={()=>setMode('signin')}>Sign in</button>
        </div>
        <form onSubmit={submit} style={{display:'grid',gap:12}}>
          {mode==='signup' && <><input required minLength={3} maxLength={30} pattern="[A-Za-z0-9_]+" placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} style={field}/><input required maxLength={80} placeholder="Display name" value={displayName} onChange={e=>setDisplayName(e.target.value)} style={field}/></>}
          <input required type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} style={field}/>
          <input required minLength={8} type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} style={field}/>
          <button className="primary" disabled={busy}>{busy?'Working…':mode==='signup'?'Create Chirpx account':'Sign in'}</button>
        </form>
        {message && <p style={{marginTop:16}}>{message}</p>}
      </section>
    </main>
  );
}

const field = {background:'#151c26',border:'1px solid #253041',color:'#f4f7fb',borderRadius:12,padding:'13px 14px',outline:'none'};
