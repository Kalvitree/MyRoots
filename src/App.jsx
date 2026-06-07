import { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';

const circleId = 1;
const defaultCircle = {
  name: 'Santos family circle',
  activeMembers: 9,
};
const categoryOptions = [
  'Food & Recipe',
  'Family Tradition',
  'Memory / Story',
  'Language & Expression',
  'Music & Dance',
  'Celebration & Festival',
  'Family History',
];

function App() {
  const [screen, setScreen] = useState('welcome');
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('Miguel Santos');
  const [relationship, setRelationship] = useState('Grandson');
  const [memories, setMemories] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedType, setSelectedType] = useState('voice');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState(categoryOptions[0]);
  const [toast, setToast] = useState('');
  const [detailMemoryId, setDetailMemoryId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    };

    getSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_, authSession) => {
      setSession(authSession);
      setUser(authSession?.user ?? null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    fetchCircleData();
  }, [session]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  const activeMemory = useMemo(
    () => memories.find((m) => m.id === detailMemoryId),
    [memories, detailMemoryId]
  );

  const showToast = (message) => {
    setToast(message);
  };

  const fetchCircleData = async () => {
    setLoading(true);
    const [{ data: memoryData }, { data: memberData }] = await Promise.all([
      supabase
        .from('memories')
        .select('*')
        .eq('circle_id', circleId)
        .order('created_at', { ascending: false }),
      supabase.from('members').select('*').eq('circle_id', circleId),
    ]);

    setMemories(memoryData ?? []);
    setMembers(memberData ?? []);
    setIsMember(memberData?.some((member) => member.user_id === user?.id));
    setLoading(false);

    if (!memberData?.length) {
      setMembers([
        { id: 1, name: 'Grandma Rosa', relationship: 'Grandmother', status: 'Active' },
        { id: 2, name: 'Pai Antonio', relationship: 'Father', status: 'Active' },
        { id: 3, name: 'Miguel (you)', relationship: 'Grandson', status: 'Active' },
        { id: 4, name: 'Tia Teresa', relationship: 'Aunt', status: 'Active' },
        { id: 5, name: 'Cousin Nadia', relationship: 'Cousin', status: 'Active' },
        { id: 6, name: 'Uncle José', relationship: 'Uncle', status: 'Active' },
      ]);
    }

    if (!memoryData?.length) {
      setMemories([
        {
          id: 'demo-1',
          title: "Grandma Rosa's Feijoada recipe",
          author_name: 'Grandma Rosa',
          type: 'voice',
          summary: 'The real black bean stew recipe, including her secret pinch of clove she never told anyone about before...',
          tags: ['Rosa', 'Miguel', '+3'],
          category: 'Food & Recipe',
          created_at: new Date().toISOString(),
          author_id: 'demo',
        },
        {
          id: 'demo-2',
          title: 'Festa Junina decorations tradition',
          author_name: 'Tia Teresa',
          type: 'photo',
          summary: 'A bright festa tradition where the whole family hangs paper flags and lanterns together.',
          tags: ['Santos family'],
          category: 'Celebration & Festival',
          created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
          author_id: 'demo',
        },
      ]);
    }
  };

  const signIn = async () => {
    if (!email) {
      showToast('Enter your email to sign in.');
      return;
    }

    try {
      // Explicitly set redirect so the magic link points back to this app path
      const path = window.location.pathname.endsWith('/') ? window.location.pathname : `${window.location.pathname}/`;
      const redirectTo = `${window.location.origin}${path}`;
      const res = await supabase.auth.signInWithOtp({ email }, { options: { emailRedirectTo: redirectTo } });
      // Log response to help diagnose invalid-path issues
      // eslint-disable-next-line no-console
      console.debug('signInWithOtp response', res);
      // supabase v2 returns { data, error }
      // If the request fails in-flight (network / bad URL) it may throw — catch that
      // If the server responds with an unexpected body, JSON parse errors can occur.
      if (res.error) {
        // Some errors include a message, otherwise show full payload for debugging
        const msg = res.error.message || JSON.stringify(res.error);
        console.error('signInWithOtp error:', res.error);
        showToast(msg);
        return;
      }

      // success
      showToast('Magic link sent. Check your inbox.');
    } catch (err) {
      // Unexpected exception (network, CORS, or JSON parsing)
      // Log the full error to console and show a helpful toast.
      // eslint-disable-next-line no-console
      console.error('Unexpected signIn error:', err);
      const message = err?.message || String(err) || 'Unexpected error';
      showToast(`Error sending magic link: ${message}`);
    }
  };

  const createMembership = async () => {
    if (!name.trim() || !relationship.trim()) {
      showToast('Add your name and relationship to join.');
      return;
    }

    const { error } = await supabase.from('members').upsert({
      circle_id: circleId,
      user_id: user.id,
      name,
      relationship,
      joined_at: new Date().toISOString(),
    }, { onConflict: ['user_id'] });

    if (error) {
      showToast(error.message);
      return;
    }

    setIsMember(true);
    setScreen('dashboard');
    showToast('Welcome to the family circle!');
    fetchCircleData();
  };

  const addMemory = async () => {
    if (!title.trim() || !content.trim()) {
      showToast('Add a title and a memory before sharing.');
      return;
    }

    const { error } = await supabase.from('memories').insert([
      {
        circle_id: circleId,
        author_id: user.id,
        author_name: name,
        title,
        content,
        category,
        type: selectedType,
        tags: [relationship],
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      showToast(error.message);
      return;
    }

    setTitle('');
    setContent('');
    setSelectedType('voice');
    setScreen('dashboard');
    showToast('Shared with the family circle! 🎉');
    fetchCircleData();
  };

  const deleteMemory = async (id) => {
    const memory = memories.find((item) => item.id === id);
    if (!memory || memory.author_id !== user.id) {
      showToast('Only your own memories can be removed.');
      return;
    }

    const { error } = await supabase.from('memories').delete().eq('id', id);
    if (error) {
      showToast(error.message);
      return;
    }

    setMemories((list) => list.filter((item) => item.id !== id));
    setScreen('dashboard');
    showToast('Memory deleted');
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setIsMember(false);
    setScreen('welcome');
  };

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  if (loading) {
    return (
      <div className="app-shell">
        <div className="hero-logo">🌿</div>
        <div className="spinner" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="app-shell">
        <div className="screen-content welcome-screen">
          <div className="hero">
            <div className="hero-logo">🌿</div>
            <h1>Roots</h1>
            <p>Preserve your family’s recipes, stories, and traditions together.</p>
          </div>

          <div className="invite-banner">
            <div className="invite-banner-icon">✉️</div>
            <div>
              <div className="invite-title">You’ve been invited</div>
              <div className="invite-text">Sign in with your email to join the Santos family circle.</div>
            </div>
          </div>

          <label className="field-label">Email</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />

          <button className="btn btn-primary btn-full" type="button" onClick={signIn}>
            Send magic link
          </button>
          <p className="help-text">A magic link will be sent to your inbox for instant access.</p>
        </div>
        {toast && <div className="toast show">{toast}</div>}
      </div>
    );
  }

  if (session && !isMember) {
    return (
      <div className="app-shell">
        <div className="screen-content welcome-screen">
          <div className="hero">
            <div className="hero-logo">🌿</div>
            <h1>Finish setting up</h1>
            <p>We just need a few details to add you to the family circle.</p>
          </div>

          <label className="field-label">Your name</label>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Miguel Santos" />
          <label className="field-label">Relationship</label>
          <input value={relationship} onChange={(event) => setRelationship(event.target.value)} placeholder="Grandson" />

          <button className="btn btn-primary btn-full" type="button" onClick={createMembership}>
            Join the family circle
          </button>
          <button className="btn btn-full" type="button" onClick={logout}>
            Use a different account
          </button>
        </div>
        {toast && <div className="toast show">{toast}</div>}
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="app-bar">
        <div className="app-logo">🌿</div>
        <div>
          <div className="app-title">Roots</div>
          <div className="app-sub">{defaultCircle.name}</div>
        </div>
        <button className="btn btn-icon" type="button" onClick={logout}>
          Sign out
        </button>
      </div>

      <div className="screen-content">
        {screen === 'dashboard' && (
          <>
            <div className="stat-row">
              <div className="stat">
                <div className="n">{memories.length}</div>
                <div className="l">Memories</div>
              </div>
              <div className="stat">
                <div className="n">{members.length}</div>
                <div className="l">Members</div>
              </div>
              <div className="stat">
                <div className="n">{categoryOptions.length}</div>
                <div className="l">Categories</div>
              </div>
            </div>

            <button className="btn btn-primary btn-full" type="button" onClick={() => setScreen('add')}>
              + Add a memory or tradition
            </button>

            <p className="section-label">Recent additions</p>
            <p className="help-text">Long-press or open your own entry to edit or delete.</p>
            {memories.map((memory) => (
              <div
                key={memory.id}
                className={`card ${memory.author_id === user.id ? 'mine' : ''}`}
                onClick={() => {
                  setDetailMemoryId(memory.id);
                  setScreen('detail');
                }}
              >
                <div className="card-header">
                  <div className="avatar" style={{ background: '#FAECE7', color: '#D85A30' }}>
                    {memory.author_name?.split(' ').map((part) => part[0]).slice(0, 2).join('')}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="card-title">{memory.title}</div>
                    <div className="card-meta">
                      {memory.type === 'voice' ? '🎙 Voice' : memory.type === 'photo' ? '📷 Photo' : '✍️ Story'} · {memory.author_name}
                    </div>
                  </div>
                </div>
                <p className="card-summary">{memory.summary ?? memory.content}</p>
                <div className="tag-row">{(memory.tags || []).map((tag) => (<span key={tag} className="tag">{tag}</span>))}</div>
              </div>
            ))}
          </>
        )}

        {screen === 'add' && (
          <>
            <div className="app-bar-sub">
              <button className="btn btn-icon btn-back" type="button" onClick={() => setScreen('dashboard')}>
                ←
              </button>
              <div className="app-title">Add to the circle</div>
            </div>

            <p className="section-label">What are you sharing?</p>
            <div className="type-grid">
              {['voice', 'photo', 'text', 'recipe'].map((type) => (
                <button
                  type="button"
                  key={type}
                  className={`type-btn ${selectedType === type ? 'selected' : ''}`}
                  onClick={() => setSelectedType(type)}
                >
                  <span className="type-icon">{type === 'voice' ? '🎙' : type === 'photo' ? '📷' : type === 'text' ? '✍️' : '🍳'}</span>
                  <span className="type-label">{type === 'voice' ? 'Voice' : type === 'photo' ? 'Photo' : type === 'text' ? 'Story' : 'Recipe'}</span>
                </button>
              ))}
            </div>

            <div className="input-block">
              {selectedType === 'voice' && (
                <div className="voice-area">
                  <button className="voice-btn" type="button">🎙</button>
                  <p className="voice-status">Tap to record voice notes in the full app.</p>
                </div>
              )}
              {selectedType === 'photo' && (
                <div className="sim-photo">📷 Photo placeholder</div>
              )}
              {(selectedType === 'text' || selectedType === 'recipe') && (
                <textarea
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Write your memory, story, or tradition here..."
                />
              )}
            </div>

            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Title (e.g. Sunday feijoada tradition)"
            />

            <p className="section-label">Category</p>
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              {categoryOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>

            <p className="section-label">Tag family members</p>
            <div className="member-tags">
              {members.slice(0, 5).map((member) => (
                <button
                  key={member.id}
                  type="button"
                  className="member-chip"
                  onClick={() => showToast(`${member.name} tagged`)}
                >
                  <span className="chip-av">{member.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span>
                  {member.name}
                </button>
              ))}
            </div>

            <button className="btn btn-primary btn-full" type="button" onClick={addMemory}>
              Share with the family circle →
            </button>
          </>
        )}

        {screen === 'detail' && activeMemory && (
          <>
            <div className="app-bar-sub">
              <button className="btn btn-icon btn-back" type="button" onClick={() => setScreen('dashboard')}>
                ←
              </button>
              <div className="app-title">Memory</div>
              <button className="btn btn-icon" type="button" onClick={() => showToast('Saved to your collection')}>
                ♡
              </button>
            </div>

            <div className="detail-header">
              <div className="avatar" style={{ background: '#EEEDFE', color: '#534AB7' }}>
                {activeMemory.author_name.split(' ').map((part) => part[0]).slice(0, 2).join('')}
              </div>
              <div>
                <div className="detail-title">{activeMemory.title}</div>
                <div className="detail-meta">Added by {activeMemory.author_name}</div>
              </div>
            </div>

            {activeMemory.type === 'voice' && (
              <div className="audio-bar">
                <div className="audio-play">▶</div>
                <div className="audio-track"><div className="audio-fill" /></div>
                <div className="audio-time">2:34</div>
              </div>
            )}

            <p className="detail-content">{activeMemory.content || activeMemory.summary}</p>

            <p className="section-label">Tagged family members</p>
            <div className="tag-row">{(activeMemory.tags || []).map((tag) => (<span key={tag} className="tag">{tag}</span>))}</div>

            <p className="section-label">Category</p>
            <span className="feed-badge">{activeMemory.category}</span>

            <div className="detail-actions">
              <button className="btn" type="button" onClick={() => showToast('Saved!')}>
                ♡ Save
              </button>
              <button className="btn" type="button" onClick={() => showToast('Share link copied')}>
                ↗ Share
              </button>
              <button className="btn" type="button" onClick={() => setScreen('add')}>
                + Add
              </button>
            </div>
            {activeMemory.author_id === user.id && (
              <button className="btn btn-danger btn-full" type="button" onClick={() => deleteMemory(activeMemory.id)}>
                Delete this memory
              </button>
            )}
          </>
        )}

        {screen === 'circle' && (
          <>
            <div className="app-bar-sub">
              <div className="app-title">Family circle</div>
              <button className="btn btn-primary" type="button" onClick={() => showToast('Invite flow coming soon')}>
                + Invite
              </button>
            </div>

            <div className="invite-banner">
              <div className="invite-banner-icon">⏳</div>
              <div>2 members haven't joined yet. <button className="link-button" type="button" onClick={() => showToast('Reminder sent!')}>Resend invite</button></div>
            </div>

            <p className="section-label">Active members</p>
            {members.map((member) => (
              <div className="card row-card" key={member.id}> 
                <div className="avatar" style={{ background: '#EAF3DE', color: '#3B6D11' }}>
                  {member.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="card-title">{member.name}</div>
                  <div className="card-meta">{member.relationship}</div>
                </div>
                <span className="status-chip">{member.status || 'Active'}</span>
              </div>
            ))}
          </>
        )}
      </div>

      <nav className="nav-bar">
        {['dashboard', 'circle'].map((route) => (
          <button
            key={route}
            type="button"
            className={`nav-item ${screen === route ? 'active' : ''}`}
            onClick={() => setScreen(route)}
          >
            <span className="nav-icon">{route === 'dashboard' ? '🏠' : '👨‍👩‍👧‍👦'}</span>
            <span className="nav-label">{route === 'dashboard' ? 'Home' : 'Circle'}</span>
          </button>
        ))}
        <button type="button" className="nav-item" onClick={() => showToast('Search coming soon')}>
          <span className="nav-icon">🔍</span>
          <span className="nav-label">Search</span>
        </button>
        <button type="button" className="nav-item" onClick={() => showToast('No new alerts')}>
          <span className="nav-icon">🔔</span>
          <span className="nav-label">Alerts</span>
        </button>
      </nav>

      {toast && <div className="toast show">{toast}</div>}
    </div>
  );
}

export default App;
