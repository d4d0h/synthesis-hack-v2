/**
 * Interactive UI — single-page explainer + live API demo
 */
export function renderUI(baseUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>TrustVault — Open Trust Resolution Protocol</title>
<style>
  :root { --bg: #0a0a0a; --surface: #141414; --border: #2a2a2a; --text: #e0e0e0; --muted: #777; --red: #e53e3e; --green: #38a169; --orange: #dd6b20; --indigo: #5c6bc0; --dim: #555; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', monospace; background: var(--bg); color: var(--text); line-height: 1.7; font-size: 14px; }
  .container { max-width: 880px; margin: 0 auto; padding: 2.5rem 1.5rem; }

  /* Header */
  .header { margin-bottom: 2.5rem; }
  h1 { font-size: 2rem; font-weight: 700; letter-spacing: -0.5px; color: #fff; }
  h1 .v { color: var(--dim); font-weight: 400; font-size: 0.9rem; margin-left: 0.5rem; }
  .tagline { color: var(--muted); margin-top: 0.3rem; font-size: 0.85rem; }
  .cursor { display: inline-block; width: 8px; height: 16px; background: var(--red); margin-left: 2px; animation: blink 1s step-end infinite; vertical-align: text-bottom; }
  @keyframes blink { 50% { opacity: 0; } }

  /* Badges */
  .badges { margin-top: 1rem; display: flex; flex-wrap: wrap; gap: 0.4rem; }
  .badge { display: inline-block; padding: 0.15rem 0.55rem; border: 1px solid var(--border); border-radius: 3px; font-size: 0.7rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }
  .badge-red { border-color: rgba(229,62,62,0.4); color: var(--red); }
  .badge-green { border-color: rgba(56,161,105,0.4); color: var(--green); }
  .badge-orange { border-color: rgba(221,107,32,0.4); color: var(--orange); }

  /* Cards */
  .cards { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 2rem 0; }
  @media (max-width: 640px) { .cards { grid-template-columns: 1fr; } }
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: 4px; padding: 1.25rem; }
  .card h3 { font-size: 0.95rem; margin-bottom: 0.5rem; color: #fff; }
  .card h3 .method { color: var(--green); }
  .card h3 .path { color: var(--orange); }
  .card p { color: var(--muted); font-size: 0.8rem; }
  .card .label { color: var(--red); font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.4rem; }

  /* Sections */
  section { margin: 2.5rem 0; }
  section h2 { font-size: 1rem; color: var(--dim); text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 1rem; }
  section h2::before { content: '> '; color: var(--red); }

  /* Demo */
  .demo-section { background: var(--surface); border: 1px solid var(--border); border-radius: 4px; padding: 1.25rem; margin: 1rem 0; }
  label { display: block; color: var(--dim); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.25rem; margin-top: 0.75rem; }
  input, select, textarea { width: 100%; padding: 0.5rem 0.7rem; background: var(--bg); border: 1px solid var(--border); border-radius: 3px; color: var(--text); font-size: 0.85rem; font-family: inherit; }
  input:focus, select:focus, textarea:focus { outline: none; border-color: var(--red); }
  textarea { min-height: 70px; resize: vertical; }
  button { padding: 0.6rem 1.4rem; border: 1px solid; border-radius: 3px; font-size: 0.8rem; font-weight: 600; cursor: pointer; margin-top: 1rem; font-family: inherit; text-transform: uppercase; letter-spacing: 0.5px; transition: all 0.15s; background: transparent; }
  button:hover { transform: translateY(-1px); }
  button:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
  .btn-red { border-color: var(--red); color: var(--red); }
  .btn-red:hover { background: var(--red); color: #fff; }
  .btn-orange { border-color: var(--orange); color: var(--orange); }
  .btn-orange:hover { background: var(--orange); color: #fff; }

  /* Results */
  .result { margin-top: 1rem; background: var(--bg); border: 1px solid var(--border); border-radius: 3px; padding: 1rem; overflow-x: auto; }
  .result pre { font-size: 0.75rem; white-space: pre-wrap; word-break: break-word; color: var(--muted); }
  .verdict { font-size: 1.2rem; font-weight: 700; margin-bottom: 0.4rem; letter-spacing: 1px; }
  .verdict-TRUSTED, .verdict-ASSURED { color: var(--green); }
  .verdict-CAUTIOUS, .verdict-INSUFFICIENT_DATA { color: var(--orange); }
  .verdict-UNTRUSTED, .verdict-FLAGGED { color: var(--red); }
  .verdict-UNKNOWN { color: var(--dim); }
  .check-row { display: flex; align-items: center; gap: 0.5rem; padding: 0.3rem 0; font-size: 0.8rem; border-bottom: 1px solid var(--border); }
  .check-row:last-child { border-bottom: none; }
  .check-pass { color: var(--green); font-weight: 700; width: 36px; }
  .check-fail { color: var(--red); font-weight: 700; width: 36px; }
  .check-name { color: var(--text); flex: 1; }
  .check-score { color: var(--dim); font-size: 0.75rem; width: 30px; text-align: right; }
  .check-reason { font-size: 0.75rem; color: var(--muted); padding-left: 2.8rem; margin-bottom: 0.3rem; }

  /* Links */
  .links { display: flex; flex-wrap: wrap; gap: 0.4rem; margin: 0.5rem 0; }
  .links a { color: var(--muted); text-decoration: none; font-size: 0.75rem; padding: 0.25rem 0.6rem; border: 1px solid var(--border); border-radius: 3px; transition: all 0.15s; }
  .links a:hover { border-color: var(--red); color: var(--red); }

  /* Spinner */
  .spinner { display: inline-block; width: 12px; height: 12px; border: 2px solid var(--border); border-top-color: var(--red); border-radius: 50%; animation: spin 0.5s linear infinite; margin-right: 0.4rem; vertical-align: middle; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Pipeline */
  .pipeline { font-size: 0.8rem; color: var(--muted); }
  .pipeline .step { padding: 0.2rem 0; }
  .pipeline .step-num { color: var(--dim); margin-right: 0.3rem; }
  .pipeline .step-label { color: var(--text); }

  /* Footer */
  footer { text-align: center; color: var(--dim); font-size: 0.75rem; margin-top: 4rem; padding: 2rem 0; border-top: 1px solid var(--border); }
  footer a { color: var(--muted); text-decoration: none; }
  footer a:hover { color: var(--red); }
  .brain-icon { display: inline-block; vertical-align: middle; margin-right: 0.3rem; }
</style>
</head>
<body>
<div class="container">

<div class="header">
  <h1>TrustVault<span class="v">v2.2</span></h1>
  <p class="tagline">trust resolution + outcome assurance for autonomous agents<span class="cursor"></span></p>
  <div class="badges">
    <span class="badge badge-red">ERC-8004</span>
    <span class="badge badge-green">signed receipts</span>
    <span class="badge badge-orange">sybil detection</span>
    <span class="badge badge-red">AI reasoning</span>
    <span class="badge badge-green">groq llm</span>
    <span class="badge badge-orange">cloudflare workers</span>
  </div>
</div>

<div class="cards">
  <div class="card">
    <div class="label">pre-task</div>
    <h3><span class="method">POST</span> <span class="path">/resolve</span></h3>
    <p>"Should I cooperate with this agent?"</p>
    <p style="margin-top:0.4rem">Agent URL + task context &rarr; verdict + capability gap + safeguards + signed receipt</p>
  </div>
  <div class="card">
    <div class="label">post-task</div>
    <h3><span class="method">POST</span> <span class="path">/assure</span></h3>
    <p>"Can I trust what they delivered?"</p>
    <p style="margin-top:0.4rem">Task output + performer &rarr; 6-check verification + AI analysis + signed certificate</p>
  </div>
</div>

<section>
  <h2>endpoints</h2>
  <div class="links">
    <a href="${baseUrl}/.well-known/agent.json" target="_blank">agent.json</a>
    <a href="${baseUrl}/health" target="_blank">health</a>
    <a href="${baseUrl}/trust/resume" target="_blank">trust resume</a>
    <a href="${baseUrl}/trust/attestations" target="_blank">attestations</a>
    <a href="${baseUrl}/resolution-log" target="_blank">resolution log</a>
    <a href="${baseUrl}/assurance-log" target="_blank">assurance log</a>
    <a href="https://github.com/unbrained-labs/synthesis-hack-v2" target="_blank">github</a>
    <a href="https://sepolia.etherscan.io/address/0xb5a8d645ff6c749f600a3ff31d71cdfad518737b" target="_blank">identity registry</a>
    <a href="https://sepolia.etherscan.io/address/0xfa20c33daa0bdf4d4b38c46952f2b2c95ace2ecf" target="_blank">reputation registry</a>
  </div>
</section>

<section>
  <h2>try /resolve</h2>
  <div class="demo-section">
    <label>agent url</label>
    <input id="resolve-url" value="https://trustvault-peer.leaidedev.workers.dev" />
    <label>task type</label>
    <input id="resolve-task" placeholder="e.g. code-review, data-analysis" />
    <label>risk level</label>
    <select id="resolve-risk">
      <option value="low">low</option>
      <option value="medium" selected>medium</option>
      <option value="high">high</option>
      <option value="critical">critical</option>
    </select>
    <label>required capabilities (comma-separated)</label>
    <input id="resolve-caps" placeholder="e.g. code-analysis, security-review" />
    <button class="btn-red" onclick="runResolve()">resolve trust</button>
    <div id="resolve-result"></div>
  </div>
</section>

<section>
  <h2>try /assure</h2>
  <div class="demo-section">
    <label>performer url</label>
    <input id="assure-performer" value="https://trustvault-peer.leaidedev.workers.dev" />
    <label>task type</label>
    <input id="assure-task" value="data-analysis" />
    <label>artifact summary</label>
    <input id="assure-summary" value="Market trend analysis with investment recommendations" />
    <label>artifact output (json)</label>
    <textarea id="assure-output">{"trends": ["DeFi TVL up 23%", "NFT volume declining", "L2 adoption accelerating"], "recommendation": "Increase L2 allocation", "confidence": 0.78}</textarea>
    <label>expected outcome</label>
    <input id="assure-expected" value="Analyze market trends and provide investment recommendations" />
    <label>success criteria (one per line)</label>
    <textarea id="assure-criteria" style="min-height:55px">Identifies market trends
Provides recommendations
Cites data sources</textarea>
    <button class="btn-orange" onclick="runAssure()">verify outcome</button>
    <div id="assure-result"></div>
  </div>
</section>

<section>
  <h2>how it works</h2>
  <div class="cards">
    <div class="card">
      <div class="label">resolve pipeline</div>
      <div class="pipeline">
        <div class="step"><span class="step-num">01</span> <span class="step-label">fetch agent card</span></div>
        <div class="step"><span class="step-num">02</span> <span class="step-label">query onchain ERC-8004</span></div>
        <div class="step"><span class="step-num">03</span> <span class="step-label">analyze attestation history</span></div>
        <div class="step"><span class="step-num">04</span> <span class="step-label">sybil detection</span></div>
        <div class="step"><span class="step-num">05</span> <span class="step-label">task-fit + capability gap</span></div>
        <div class="step"><span class="step-num">06</span> <span class="step-label">composite score</span></div>
        <div class="step"><span class="step-num">07</span> <span class="step-label">risk-adjusted verdict</span></div>
        <div class="step"><span class="step-num">08</span> <span class="step-label">AI reasoning (groq)</span></div>
        <div class="step"><span class="step-num">09</span> <span class="step-label">sign receipt</span></div>
      </div>
    </div>
    <div class="card">
      <div class="label">assure pipeline</div>
      <div class="pipeline">
        <div class="step"><span class="step-num">P1</span> <span class="step-label">performer-trust (parallel)</span></div>
        <div class="step"><span class="step-num">P1</span> <span class="step-label">capability-match (parallel)</span></div>
        <div class="step"><span class="step-num">P1</span> <span class="step-label">sybil-risk (parallel)</span></div>
        <div class="step"><span class="step-num">P2</span> <span class="step-label">attestation-history (parallel)</span></div>
        <div class="step"><span class="step-num">P2</span> <span class="step-label">output-completeness AI (parallel)</span></div>
        <div class="step"><span class="step-num">P2</span> <span class="step-label">output-consistency AI (parallel)</span></div>
        <div class="step"><span class="step-num">--</span> <span class="step-label">aggregate + verdict</span></div>
        <div class="step"><span class="step-num">--</span> <span class="step-label">AI recommendation</span></div>
        <div class="step"><span class="step-num">--</span> <span class="step-label">sign certificate</span></div>
      </div>
    </div>
  </div>
</section>

<footer>
  <svg class="brain-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e53e3e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 18V5"/><path d="M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4"/><path d="M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5"/><path d="M17.997 5.125a4 4 0 0 1 2.526 5.77"/><path d="M18 18a4 4 0 0 0 2-7.464"/><path d="M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517"/><path d="M6 18a4 4 0 0 1-2-7.464"/><path d="M6.003 5.125a4 4 0 0 0-2.526 5.77"/></svg>
  built by <a href="https://github.com/unbrained-labs" target="_blank">unbrained labs</a>
  &nbsp;|&nbsp;
  <a href="https://synthesis.devfolio.co" target="_blank">synthesis hackathon</a>
  &nbsp;|&nbsp;
  agents with receipts + let the agent cook
</footer>

</div>

<script>
const API = '${baseUrl}';

async function runResolve() {
  const btn = event.target;
  const el = document.getElementById('resolve-result');
  btn.disabled = true;
  el.innerHTML = '<div style="margin-top:1rem"><span class="spinner"></span> resolving...</div>';

  const url = document.getElementById('resolve-url').value;
  const taskType = document.getElementById('resolve-task').value;
  const risk = document.getElementById('resolve-risk').value;
  const caps = document.getElementById('resolve-caps').value.split(',').map(s => s.trim()).filter(Boolean);

  const body = { agentUrl: url };
  if (taskType) {
    body.task = { type: taskType, riskLevel: risk, requiredCapabilities: caps };
  }

  try {
    const res = await fetch(API + '/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const d = await res.json();
    el.innerHTML = renderResolveResult(d);
  } catch (e) {
    el.innerHTML = '<div class="result"><pre>error: ' + e.message + '</pre></div>';
  }
  btn.disabled = false;
}

async function runAssure() {
  const btn = event.target;
  const el = document.getElementById('assure-result');
  btn.disabled = true;
  el.innerHTML = '<div style="margin-top:1rem"><span class="spinner"></span> running 6-check verification...</div>';

  let output;
  try { output = JSON.parse(document.getElementById('assure-output').value); }
  catch { output = document.getElementById('assure-output').value; }

  const criteria = document.getElementById('assure-criteria').value.split('\\n').filter(Boolean);

  const body = {
    taskType: document.getElementById('assure-task').value,
    performedBy: document.getElementById('assure-performer').value,
    artifact: { summary: document.getElementById('assure-summary').value, output },
    expectedOutcome: {
      description: document.getElementById('assure-expected').value,
      successCriteria: criteria.length > 0 ? criteria : undefined,
    },
  };

  try {
    const res = await fetch(API + '/assure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const d = await res.json();
    el.innerHTML = renderAssureResult(d);
  } catch (e) {
    el.innerHTML = '<div class="result"><pre>error: ' + e.message + '</pre></div>';
  }
  btn.disabled = false;
}

function renderResolveResult(d) {
  const signals = [
    ['reachable', d.report.identity.reachable],
    ['agent card', d.report.identity.hasAgentCard],
    ['ERC-8004', d.report.identity.erc8004Registered],
    ['sybil clean', !d.report.sybilIndicators.selfAttestationDetected],
  ];
  return \`<div class="result">
    <div class="verdict verdict-\${d.verdict}">\${d.verdict}</div>
    <p style="color:var(--dim)">score <span style="color:var(--text)">\${d.trustScore}/100</span> &middot; confidence <span style="color:var(--text)">\${d.confidence}</span></p>
    <div style="margin:0.6rem 0">\${signals.map(([name, ok]) =>
      '<div class="check-row"><span class="' + (ok ? 'check-pass' : 'check-fail') + '">' + (ok ? 'OK' : '--') + '</span><span class="check-name">' + name + '</span></div>'
    ).join('')}</div>
    \${d.taskFit.capabilityGap.length > 0 ? '<p style="color:var(--orange);font-size:0.8rem">capability gaps: ' + d.taskFit.capabilityGap.join(', ') + '</p>' : ''}
    \${d.taskFit.safeguards.length > 0 ? '<p style="font-size:0.75rem;color:var(--dim);margin-top:0.4rem">safeguards: ' + d.taskFit.safeguards.join(' | ') + '</p>' : ''}
    <p style="margin-top:0.6rem;font-size:0.8rem;color:var(--muted)">\${d.report.reasoning}</p>
    <p style="margin-top:0.6rem;font-size:0.7rem;color:var(--dim)">receipt \${d.receipt.id.slice(0,8)}... &middot; expires \${d.receipt.expiresAt}</p>
    <details style="margin-top:0.4rem"><summary style="cursor:pointer;color:var(--red);font-size:0.75rem">raw json</summary><pre>\${JSON.stringify(d, null, 2)}</pre></details>
  </div>\`;
}

function renderAssureResult(d) {
  return \`<div class="result">
    <div class="verdict verdict-\${d.status}">\${d.status}</div>
    <p style="color:var(--dim)">confidence <span style="color:var(--text)">\${d.confidence}</span></p>
    <div style="margin:0.6rem 0">\${d.checks.map(c =>
      '<div class="check-row"><span class="' + (c.passed ? 'check-pass' : 'check-fail') + '">' + (c.passed ? 'OK' : '--') + '</span><span class="check-name">' + c.check + '</span><span class="check-score">' + (c.score ?? '-') + '</span></div>' +
      (c.reason ? '<div class="check-reason">' + c.reason + '</div>' : '')
    ).join('')}</div>
    <p style="font-size:0.8rem;color:var(--muted)">\${d.recommendation}</p>
    <p style="margin-top:0.6rem;font-size:0.7rem;color:var(--dim)">certificate \${d.certificate.id.slice(0,8)}... &middot; artifact \${d.certificate.artifactHash.slice(0,12)}...</p>
    <details style="margin-top:0.4rem"><summary style="cursor:pointer;color:var(--orange);font-size:0.75rem">raw json</summary><pre>\${JSON.stringify(d, null, 2)}</pre></details>
  </div>\`;
}
</script>
</body>
</html>`;
}
