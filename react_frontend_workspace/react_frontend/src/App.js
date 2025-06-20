import React, { useState, useEffect } from 'react';
import './App.css';

// PUBLIC_INTERFACE
import { useState as useLocalState } from 'react';

/**
 * Minimal router hook supporting route path and params.
 * Returns {pathname, params, push(path)}
 * Supports paths like "/" and "/secret/:id"
 */
function useHashRouter() {
  const getPathAndParams = () => {
    // Strip '#' and split path
    const hash = window.location.hash.replace(/^#/, "") || "/";
    const pathname = hash.split("?")[0];
    // params are handled in component by extracting id
    return { pathname };
  };
  const [route, setRoute] = useState(getPathAndParams());
  useEffect(() => {
    const listener = () => setRoute(getPathAndParams());
    window.addEventListener("hashchange", listener);
    return () => window.removeEventListener("hashchange", listener);
  }, []);
  return {
    ...route,
    push: (path) => { window.location.hash = path; }
  };
}

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

  // Routing: supports "/", "/secret/:id" via hash in URL
  const router = useHashRouter();

  const [secrets, setSecrets] = useState([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState(null);

  // Backend API base (should match backend config; assumes CORS enabled)
  const API_BASE =
    (typeof process !== "undefined" && process.env && process.env.REACT_APP_API_URL)
      ? process.env.REACT_APP_API_URL
      : (window.REACT_APP_API_URL || 'https://vscode-internal-9853-dev.dev01.cloud.kavia.ai:3001');

  // Load secrets feed on mount
  useEffect(() => {
    if (router.pathname !== "/" && router.pathname !== "") return; // Only fetch feed in root route
    setFeedLoading(true);
    setFeedError(null);
    fetch(`${API_BASE}/secrets`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch secrets');
        return res.json();
      })
      .then((data) => {
        setSecrets(Array.isArray(data) ? data : []); // Backend returns array of {id, text}
        setFeedLoading(false);
      })
      .catch((err) => {
        setFeedError('Could not load secret feed.');
        setFeedLoading(false);
      });
  }, [API_BASE, router.pathname]);

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
        body: JSON.stringify({ text: secretText }),
      });
      if (!res.ok) throw new Error('Failed to submit secret');
      setSecretText('');
      // Refresh feed after submission
      const newSecret = await res.json();
      setSecrets(s => [newSecret, ...s]);
    } catch (err) {
      setSubmissionError('Failed to submit secret.');
    } finally {
      setSubmissionLoading(false);
    }
  };

  // Theme colors (CSS variables are set by App.css)
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--base-light', '#ff4081');    // Accent
    root.style.setProperty('--base-dark', '#1976d2');     // Primary
    root.style.setProperty('--background', '#f5f5f5');
    root.style.setProperty('--primary', '#1976d2');
    root.style.setProperty('--secondary', '#757575');
    root.style.setProperty('--text-color', '#1a1a1a');
    root.style.setProperty('--border-color', 'rgba(50,50,50,0.09)');
    root.style.setProperty('--card-bg', '#fff');
    root.style.setProperty('--card-shadow', '0 1px 4px 0 rgba(30,30,60,0.07)');
  }, []);

  // Router: parse out "/secret/:id"
  const rootFeed = (router.pathname === "/" || router.pathname === "");
  const secretViewMatch = router.pathname.match(/^\/secret\/(\d+)$/);

  // Render root feed or single secret
  return (
    <div className="app" style={{ background: "var(--background)", minHeight: "100vh", color: "var(--text-color)" }}>
      {/* Navbar */}
      <nav className="navbar" style={{ background: "var(--primary)", color: "#fff" }}>
        <div className="container">
          <div className="logo" style={{ fontWeight: 700, fontSize: "1.3rem" }}>
            <span className="logo-symbol" style={{ color: "var(--base-light)", fontWeight: 900 }}>*</span>
            <span
              style={{ cursor: "pointer" }}
              onClick={() => router.push("/")}
              tabIndex={0}
            >
              SecretStream
            </span>
          </div>
        </div>
      </nav>
      {/* Main section */}
      <main style={{ paddingTop: "80px" }}>
        {rootFeed && (
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
              {feedLoading && <div style={{ color: "var(--primary)", fontWeight: 500, marginBottom: 18 }}>Loading secrets...</div>}
              {feedError && <div style={{ color: "var(--base-light)", marginBottom: 16 }}>{feedError}</div>}
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
        )}
        {/* Single secret route, if matches "/secret/:id" */}
        {secretViewMatch && (
          <SingleSecretView
            secretId={secretViewMatch[1]}
            apiBase={API_BASE}
            onBack={() => router.push("/")}
          />
        )}
        {/* fallback: unknown route */}
        {!rootFeed && !secretViewMatch && (
          <div className="container" style={{ textAlign: "center", marginTop: 42 }}>
            <div style={{ fontSize: "1.12em", color: "var(--secondary)" }}>Page not found.</div>
            <button className="btn" style={{ marginTop: 13 }} onClick={() => router.push("/")}>
              Back to feed
            </button>
          </div>
        )}
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

  // Shareable URL format: #/secret/<id>
  const shareUrl = secret.id !== undefined
    ? `${window.location.origin}${window.location.pathname}#${singleSecretRoute(secret.id)}`
    : null;

  // For copy-to-clipboard feedback
  const [copied, setCopied] = useState(false);
  const handleCopy = async (e) => {
    e.preventDefault();
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  function singleSecretRoute(id) {
    return `/secret/${id}`;
  }

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
        position: "relative",
        marginBottom: 4
      }}
    >
      <div style={{ color: "#232323", fontSize: "1.11rem", marginBottom: 6, wordBreak: "break-word", lineHeight: 1.54 }}>
        {secret.text || secret.secret || String(secret)}
      </div>
      <div style={{
        display: "flex", flexDirection: "row", alignItems: "center",
        marginTop: 4, marginBottom: 4, gap: 8
      }}>
        {/* Share button/link */}
        {shareUrl && (
          <>
            <span style={{ fontSize: "0.89em", color: "var(--secondary)" }}>
              <a
                href={`#${singleSecretRoute(secret.id)}`}
                style={{ color: "var(--primary)", textDecoration: "underline", fontWeight: 500 }}
                title="View this secret directly"
              >link</a>
            </span>
            <button
              aria-label="Copy share link"
              onClick={handleCopy}
              style={{
                border: "none",
                background: "transparent",
                color: "var(--base-light)",
                fontWeight: 600,
                cursor: "pointer",
                marginLeft: 0,
                fontSize: "0.89em"
              }}
            >
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </>
        )}
      </div>
      {/* (Optional) Created at */}
      <div style={{
        color: "var(--secondary)",
        marginTop: "2px",
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

/**
 * View a single secret by its ID in the route.
 * URL: #/secret/<id>
 */
function SingleSecretView({ secretId, apiBase, onBack }) {
  const [secret, setSecret] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (!secretId) {
      setLoadError("No secret ID specified.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    // Backend endpoint assumed: /secrets/{id}
    fetch(`${apiBase}/secrets/${secretId}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch secret.");
        return res.json();
      })
      .then(data => {
        setSecret(data);
        setLoading(false);
      })
      .catch(() => {
        setLoadError("Could not load the secret. It may have expired or does not exist.");
        setLoading(false);
      });
  }, [secretId, apiBase]);

  return (
    <div
      className="card"
      style={{
        margin: "0 auto",
        marginTop: 20,
        maxWidth: 480,
        background: "#fff",
        borderRadius: 10,
        minHeight: 140,
        boxShadow: "var(--card-shadow)"
      }}
    >
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        alignItems: "center"
      }}>
        <button
          className="btn"
          onClick={onBack}
          style={{
            alignSelf: "flex-start",
            fontSize: "0.93em",
            padding: "6px 14px",
            marginBottom: 13,
            background: "var(--primary)",
            color: "#fff",
            borderRadius: 5
          }}
        >
          &#8592; Back to feed
        </button>
        {loading && <div style={{ color: "var(--primary)", fontWeight: 500, marginBottom: 8 }}>Loading secret...</div>}
        {loadError && <div style={{ color: "var(--base-light)", marginBottom: 9 }}>{loadError}</div>}
        {secret && !loading && (
          <>
            <div style={{
              color: "var(--primary)",
              fontWeight: 600,
              fontSize: "1.30em",
              textAlign: "center",
              marginBottom: 10
            }}>Anonymous Secret</div>
            {/* Display SecretText */}
            <div
              style={{
                fontSize: "1.17em",
                color: "#252525",
                textAlign: "center",
                margin: "5px 8px 10px 8px",
                wordBreak: "break-word",
                lineHeight: 1.63
              }}
            >
              {secret.text}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;