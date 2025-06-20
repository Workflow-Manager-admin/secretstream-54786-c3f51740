import React, { useState, useEffect } from 'react';
import './App.css';

/**
 * Anonymous Secret Stream App
 * - Users can submit anonymous secrets
 * - View secrets feed
 * - Minimalistic, responsive design with custom light theme
 */
function App() {
  // State for the new secret submission field
  const [secretText, setSecretText] = useState('');
  // State for handling loading/error on submit
  const [submissionLoading, setSubmissionLoading] = useState(false);
  const [submissionError, setSubmissionError] = useState(null);
  // State for secrets feed
  const [secrets, setSecrets] = useState([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState(null);

  // Backend API base (should match backend config; assumes CORS enabled)
  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  // Load secrets feed on mount
  useEffect(() => {
    setFeedLoading(true);
    setFeedError(null);
    fetch(`${API_BASE}/secrets`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch secrets');
        return res.json();
      })
      .then((data) => {
        setSecrets(data.secrets || data); // Support both `{ secrets: [...] }` and `[ ... ]`
        setFeedLoading(false);
      })
      .catch((err) => {
        setFeedError('Could not load secret feed.');
        setFeedLoading(false);
      });
  }, [API_BASE]);

  // Handle secret submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!secretText.trim()) {
      setSubmissionError('Secret cannot be empty.');
      return;
    }
    setSubmissionLoading(true);
    setSubmissionError(null);
    try {
      const res = await fetch(`${API_BASE}/secrets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: secretText }),
      });
      if (!res.ok) throw new Error('Failed to submit secret');
      setSecretText('');
      // Refresh feed after submission
      const newSecret = await res.json();
      // Optimistically prepend to feed for instant feedback
      setSecrets(s => [newSecret, ...s]);
    } catch (err) {
      setSubmissionError('Failed to submit secret.');
    } finally {
      setSubmissionLoading(false);
    }
  };

  // Theme colors (CSS variables are set by App.css, but we override here for custom style)
  // Required by: accent (#ff4081), background (#f5f5f5), primary (#1976d2), secondary (#757575)
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--base-light', '#ff4081');    // Accent
    root.style.setProperty('--base-dark', '#1976d2');     // Primary
    root.style.setProperty('--background', '#f5f5f5');
    root.style.setProperty('--primary', '#1976d2');
    root.style.setProperty('--secondary', '#757575');
    root.style.setProperty('--text-color', '#1a1a1a');
    root.style.setProperty('--border-color', 'rgba(50,50,50,0.09)');
    // For "card" BG
    root.style.setProperty('--card-bg', '#fff');
    root.style.setProperty('--card-shadow', '0 1px 4px 0 rgba(30,30,60,0.07)');
  }, []);

  return (
    <div className="app" style={{ background: "var(--background)", minHeight: "100vh", color: "var(--text-color)" }}>
      {/* Navbar */}
      <nav className="navbar" style={{ background: "var(--primary)", color: "#fff" }}>
        <div className="container">
          <div className="logo" style={{ fontWeight: 700, fontSize: "1.3rem" }}>
            <span className="logo-symbol" style={{ color: "var(--base-light)", fontWeight: 900 }}>*</span>
            SecretStream
          </div>
        </div>
      </nav>

      {/* Main section */}
      <main style={{ paddingTop: "80px" }}>
        <div className="container" style={{ maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Submission Form */}
          <section style={{
            background: "var(--card-bg)",
            borderRadius: 10,
            padding: "30px 24px 26px 24px",
            boxShadow: "var(--card-shadow)",
            marginBottom: "28px"
          }}>
            <h2 style={{
              margin: 0,
              color: "var(--primary)",
              fontWeight: 600,
              fontSize: "2.0rem",
              marginBottom: "8px"
            }}>Share a Secret</h2>
            <p style={{
              margin: 0,
              color: "var(--secondary)",
              fontSize: "1rem",
              marginBottom: "18px"
            }}>Submit something anonymously...</p>
            <form onSubmit={handleSubmit} autoComplete="off">
              <textarea
                value={secretText}
                onChange={e => setSecretText(e.target.value)}
                placeholder="Type your anonymous secret here."
                rows={3}
                disabled={submissionLoading}
                style={{
                  width: "100%",
                  resize: "vertical",
                  padding: "10px",
                  fontSize: "1.06rem",
                  border: "1.5px solid var(--border-color)",
                  borderRadius: 6,
                  background: "#fafcff",
                  minHeight: 60,
                  color: "var(--text-color)"
                }}
              />
              {submissionError && (
                <div style={{ color: "var(--base-light)", marginTop: 8, fontSize: "0.98em", minHeight: 24 }}>
                  {submissionError}
                </div>
              )}
              <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
                <button
                  className="btn btn-large"
                  style={{
                    background: "var(--base-light)",
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: "1.1em",
                    border: "none",
                    padding: "10px 30px",
                    borderRadius: 5,
                    boxShadow: "0 1px 4px 0 rgba(30,30,60,0.13)",
                    transition: "background .2s"
                  }}
                  type="submit"
                  disabled={submissionLoading}
                >
                  {submissionLoading ? 'Sending...' : 'Submit'}
                </button>
              </div>
            </form>
          </section>

          {/* Feed */}
          <section>
            <h3 style={{ marginBottom: 14, color: "var(--secondary)", fontWeight: 600, fontSize: "1.18rem", letterSpacing: "0.07em" }}>
              Anonymous Secret Feed
            </h3>
            {/* Loading/Error */}
            {feedLoading && <div style={{ color: "var(--primary)", fontWeight: 500, marginBottom: 18 }}>Loading secrets...</div>}
            {feedError && <div style={{ color: "var(--base-light)", marginBottom: 16 }}>{feedError}</div>}
            {/* Main Feed */}
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {(!feedLoading && (!secrets || secrets.length === 0)) && (
                <div style={{ color: "var(--secondary)", fontSize: "1.1rem" }}>No secrets yet. Be the first to share!</div>
              )}
              {secrets && secrets.length > 0 && (
                secrets.map((secret, idx) => (
                  <SecretCard key={secret.id || idx} secret={secret} />
                ))
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

/**
 * SecretCard
 * Minimalistic card displaying a single secret
 */
function SecretCard({ secret }) {
  // Supports both `{...}` with id, secret, created_at
  // and fallback to show time or index only
  return (
    <div
      style={{
        background: "#fff",
        border: "1.3px solid var(--border-color)",
        borderRadius: 7,
        boxShadow: "var(--card-shadow)",
        padding: "18px 18px 14px 18px",
        display: "flex",
        flexDirection: "column",
        position: "relative"
      }}
    >
      <div style={{ color: "#232323", fontSize: "1.11rem", marginBottom: 6, wordBreak: "break-word", lineHeight: 1.54 }}>
        {secret.secret || String(secret)}
      </div>
      {/* (Optional) Created at */}
      <div style={{
        color: "var(--secondary)",
        marginTop: "4px",
        marginLeft: "2px",
        fontSize: "0.94em"
      }}>
        {secret.created_at
          ? formatDate(secret.created_at)
          : ""}
      </div>
    </div>
  );
}

/**
 * Format date string for display in feed (short & friendly)
 */
function formatDate(dateStr) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d)) return '';
    return d.toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "short"
    });
  } catch {
    return '';
  }
}

export default App;