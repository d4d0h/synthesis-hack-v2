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
  :root { --bg: #0f172a; --surface: #1e293b; --border: #334155; --text: #e2e8f0; --muted: #94a3b8; --blue: #3b82f6; --purple: #8b5cf6; --green: #10b981; --red: #ef4444; --yellow: #f59e0b; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; }
  .container { max-width: 960px; margin: 0 auto; padding: 2rem 1.5rem; }
  h1 { font-size: 2.5rem; font-weight: 700; margin-bottom: 0.25rem; }
  h1 span { background: linear-gradient(135deg, var(--blue), var(--purple)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .subtitle { color: var(--muted); font-size: 1.1rem; margin-bottom: 2rem; }
  .badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; margin-right: 0.4rem; margin-bottom: 0.4rem; }
  .badge-blue { background: rgba(59,130,246,0.15); color: var(--blue); }
  .badge-purple { background: rgba(139,92,246,0.15); color: var(--purple); }
  .badge-green { background: rgba(16,185,129,0.15); color: var(--green); }
  .cards { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin: 2rem 0; }
  @media (max-width: 640px) { .cards { grid-template-columns: 1fr; } }
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; }
  .card h3 { font-family: monospace; font-size: 1.1rem; margin-bottom: 0.5rem; }
  .card p { color: var(--muted); font-size: 0.9rem; }
  .card-blue h3 { color: var(--blue); }
  .card-purple h3 { color: var(--purple); }
  section { margin: 3rem 0; }
  section h2 { font-size: 1.5rem; margin-bottom: 1rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; }
  .demo-section { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; margin: 1.5rem 0; }
  label { display: block; color: var(--muted); font-size: 0.85rem; margin-bottom: 0.3rem; margin-top: 0.8rem; }
  input, select, textarea { width: 100%; padding: 0.6rem 0.8rem; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 0.9rem; font-family: inherit; }
  textarea { min-height: 80px; resize: vertical; font-family: monospace; }
  button { padding: 0.7rem 1.5rem; border: none; border-radius: 8px; font-size: 0.95rem; font-weight: 600; cursor: pointer; margin-top: 1rem; transition: opacity 0.2s; }
  button:hover { opacity: 0.85; }
  button:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-blue { background: var(--blue); color: white; }
  .btn-purple { background: var(--purple); color: white; }
  .btn-green { background: var(--green); color: white; }
  .result { margin-top: 1rem; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 1rem; overflow-x: auto; }
  .result pre { font-size: 0.8rem; white-space: pre-wrap; word-break: break-word; color: var(--muted); }
  .verdict { font-size: 1.3rem; font-weight: 700; margin-bottom: 0.5rem; }
  .verdict-TRUSTED { color: var(--green); }
  .verdict-CAUTIOUS { color: var(--yellow); }
  .verdict-UNTRUSTED { color: var(--red); }
  .verdict-UNKNOWN { color: var(--muted); }
  .verdict-ASSURED { color: var(--green); }
  .verdict-FLAGGED { color: var(--red); }
  .verdict-INSUFFICIENT_DATA { color: var(--yellow); }
  .check-row { display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0; font-size: 0.9rem; }
  .check-pass { color: var(--green); }
  .check-fail { color: var(--red); }
  .score-bar { height: 6px; border-radius: 3px; background: var(--border); flex: 1; max-width: 100px; }
  .score-fill { height: 100%; border-radius: 3px; }
  .links { display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 1rem 0; }
  .links a { color: var(--blue); text-decoration: none; font-size: 0.85rem; padding: 0.3rem 0.7rem; border: 1px solid var(--border); border-radius: 6px; }
  .links a:hover { background: rgba(59,130,246,0.1); }
  .spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid var(--border); border-top-color: var(--blue); border-radius: 50%; animation: spin 0.6s linear infinite; margin-right: 0.5rem; vertical-align: middle; }
  @keyframes spin { to { transform: rotate(360deg); } }
  footer { text-align: center; color: var(--muted); font-size: 0.8rem; margin-top: 4rem; padding: 2rem 0; border-top: 1px solid var(--border); }
  footer a { color: var(--blue); text-decoration: none; }
</style>
</head>
<body>
<div class="container">

<h1><span>TrustVault</span></h1>
<p class="subtitle">Open Trust Resolution Protocol + Outcome Assurance for the Agent Economy</p>

<div>
  <span class="badge badge-blue">ERC-8004</span>
  <span class="badge badge-purple">Signed Receipts</span>
  <span class="badge badge-green">Sybil Detection</span>
  <span class="badge badge-blue">AI Reasoning</span>
  <span class="badge badge-purple">Groq LLM</span>
  <span class="badge badge-green">Cloudflare Workers</span>
</div>

<div class="cards">
  <div class="card card-blue">
    <h3>POST /resolve</h3>
    <p><strong>Pre-task:</strong> "Should I cooperate with this agent?"</p>
    <p style="margin-top:0.5rem">Send an agent URL + task context. Get a verdict (TRUSTED / CAUTIOUS / UNTRUSTED / UNKNOWN), capability gap analysis, risk-adjusted safeguards, and a signed receipt.</p>
  </div>
  <div class="card card-purple">
    <h3>POST /assure</h3>
    <p><strong>Post-task:</strong> "Can I trust what they delivered?"</p>
    <p style="margin-top:0.5rem">Send a task result + performer URL. Get 6-check verification (ASSURED / FLAGGED / INSUFFICIENT_DATA) covering trust, capabilities, output quality, and sybil risk.</p>
  </div>
</div>

<section>
  <h2>Live API Links</h2>
  <div class="links">
    <a href="${baseUrl}/.well-known/agent.json" target="_blank">Agent Card</a>
    <a href="${baseUrl}/health" target="_blank">Health</a>
    <a href="${baseUrl}/trust/resume" target="_blank">Trust Resume</a>
    <a href="${baseUrl}/trust/attestations" target="_blank">Attestations</a>
    <a href="${baseUrl}/resolution-log" target="_blank">Resolution Log</a>
    <a href="${baseUrl}/assurance-log" target="_blank">Assurance Log</a>
    <a href="https://github.com/unbrained-labs/synthesis-hack-v2" target="_blank">GitHub</a>
    <a href="https://sepolia.etherscan.io/address/0xb5a8d645ff6c749f600a3ff31d71cdfad518737b" target="_blank">Identity Registry (Sepolia)</a>
    <a href="https://sepolia.etherscan.io/address/0xfa20c33daa0bdf4d4b38c46952f2b2c95ace2ecf" target="_blank">Reputation Registry (Sepolia)</a>
  </div>
</section>

<section>
  <h2>Try /resolve</h2>
  <div class="demo-section">
    <label>Agent URL to resolve</label>
    <input id="resolve-url" value="https://trustvault-peer.leaidedev.workers.dev" />
    <label>Task type (optional)</label>
    <input id="resolve-task" placeholder="e.g. code-review, data-analysis" />
    <label>Risk level</label>
    <select id="resolve-risk">
      <option value="low">Low</option>
      <option value="medium" selected>Medium</option>
      <option value="high">High</option>
      <option value="critical">Critical</option>
    </select>
    <label>Required capabilities (comma-separated, optional)</label>
    <input id="resolve-caps" placeholder="e.g. code-analysis, security-review" />
    <button class="btn-blue" onclick="runResolve()">Resolve Trust</button>
    <div id="resolve-result"></div>
  </div>
</section>

<section>
  <h2>Try /assure</h2>
  <div class="demo-section">
    <label>Performer URL</label>
    <input id="assure-performer" value="https://trustvault-peer.leaidedev.workers.dev" />
    <label>Task type</label>
    <input id="assure-task" value="data-analysis" />
    <label>Artifact summary</label>
    <input id="assure-summary" value="Market trend analysis with investment recommendations" />
    <label>Artifact output (JSON)</label>
    <textarea id="assure-output">{"trends": ["DeFi TVL up 23%", "NFT volume declining", "L2 adoption accelerating"], "recommendation": "Increase L2 allocation", "confidence": 0.78}</textarea>
    <label>Expected outcome description</label>
    <input id="assure-expected" value="Analyze market trends and provide investment recommendations" />
    <label>Success criteria (one per line, optional)</label>
    <textarea id="assure-criteria" style="min-height:60px">Identifies market trends
Provides recommendations
Cites data sources</textarea>
    <button class="btn-purple" onclick="runAssure()">Verify Outcome</button>
    <div id="assure-result"></div>
  </div>
</section>

<section>
  <h2>How It Works</h2>
  <div class="card" style="margin-bottom:1rem">
    <h3 style="color:var(--blue)">Resolution Pipeline (/resolve)</h3>
    <p style="color:var(--muted);font-size:0.9rem">
      1. Fetch agent card from /.well-known/agent.json<br>
      2. Query onchain ERC-8004 reputation (Sepolia)<br>
      3. Analyze local attestation history (single-pass)<br>
      4. Sybil detection (self-attestation, velocity, diversity)<br>
      5. Task-fit evaluation (capability match vs gap)<br>
      6. Composite score (onchain 30% + local 25% + registration 15% + card 15% + fit 15% - sybil penalty)<br>
      7. Risk-adjusted verdict (thresholds scale with task risk level)<br>
      8. AI reasoning via Groq (Llama 3.3 70B)<br>
      9. Signed receipt (SHA-256 digest, 1hr TTL)
    </p>
  </div>
  <div class="card">
    <h3 style="color:var(--purple)">Assurance Pipeline (/assure)</h3>
    <p style="color:var(--muted);font-size:0.9rem">
      Phase 1 (parallel): performer-trust-resolution + capability-match + sybil-risk<br>
      Phase 2 (parallel): attestation-history + output-completeness (AI) + output-consistency (AI)<br><br>
      Status: ASSURED (all pass or 1 non-critical fail, confidence >= 0.6) | FLAGGED (critical fail or 2+ fails) | INSUFFICIENT_DATA (&lt;3 checks ran)<br><br>
      Confidence = (checks_passed / total) * 0.7 + (performer_trust / 100) * 0.3<br>
      Returns signed certificate binding artifact hash to verdict.
    </p>
  </div>
</section>

<footer>
  Built for <a href="https://synthesis.devfolio.co" target="_blank">The Synthesis Hackathon</a> by <a href="https://github.com/unbrained-labs" target="_blank">Unbrained Labs</a>
  <br>Tracks: Agents With Receipts (ERC-8004) + Let the Agent Cook
</footer>

</div>

<script>
const API = '${baseUrl}';

async function runResolve() {
  const btn = event.target;
  const el = document.getElementById('resolve-result');
  btn.disabled = true;
  el.innerHTML = '<div><span class="spinner"></span> Resolving trust...</div>';

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
    el.innerHTML = '<div class="result"><pre>Error: ' + e.message + '</pre></div>';
  }
  btn.disabled = false;
}

async function runAssure() {
  const btn = event.target;
  const el = document.getElementById('assure-result');
  btn.disabled = true;
  el.innerHTML = '<div><span class="spinner"></span> Running 6-check verification...</div>';

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
    el.innerHTML = '<div class="result"><pre>Error: ' + e.message + '</pre></div>';
  }
  btn.disabled = false;
}

function renderResolveResult(d) {
  const checks = [
    { label: 'Reachable', ok: d.report.identity.reachable },
    { label: 'Agent Card', ok: d.report.identity.hasAgentCard },
    { label: 'ERC-8004', ok: d.report.identity.erc8004Registered },
    { label: 'Sybil Clean', ok: !d.report.sybilIndicators.selfAttestationDetected },
  ];
  return \`
    <div class="result">
      <div class="verdict verdict-\${d.verdict}">\${d.verdict}</div>
      <p>Score: <strong>\${d.trustScore}/100</strong> | Confidence: <strong>\${d.confidence}</strong></p>
      <div style="margin:0.8rem 0">\${checks.map(c =>
        '<div class="check-row"><span class="' + (c.ok ? 'check-pass' : 'check-fail') + '">' + (c.ok ? 'PASS' : 'FAIL') + '</span> ' + c.label + '</div>'
      ).join('')}</div>
      \${d.taskFit.capabilityGap.length > 0 ? '<p style="color:var(--yellow);font-size:0.85rem">Capability gaps: ' + d.taskFit.capabilityGap.join(', ') + '</p>' : ''}
      \${d.taskFit.safeguards.length > 0 ? '<p style="font-size:0.85rem;color:var(--muted);margin-top:0.5rem"><strong>Safeguards:</strong> ' + d.taskFit.safeguards.join(' | ') + '</p>' : ''}
      <p style="margin-top:0.8rem;font-size:0.85rem;color:var(--muted)"><strong>AI Reasoning:</strong> \${d.report.reasoning}</p>
      <p style="margin-top:0.8rem;font-size:0.75rem;color:var(--muted)">Receipt: \${d.receipt.id} | Expires: \${d.receipt.expiresAt}</p>
      <details style="margin-top:0.5rem"><summary style="cursor:pointer;color:var(--blue);font-size:0.8rem">Raw JSON</summary><pre>\${JSON.stringify(d, null, 2)}</pre></details>
    </div>\`;
}

function renderAssureResult(d) {
  return \`
    <div class="result">
      <div class="verdict verdict-\${d.status}">\${d.status}</div>
      <p>Confidence: <strong>\${d.confidence}</strong></p>
      <div style="margin:0.8rem 0">\${d.checks.map(c => {
        const color = c.passed ? 'var(--green)' : 'var(--red)';
        return '<div class="check-row"><span class="' + (c.passed ? 'check-pass' : 'check-fail') + '">' + (c.passed ? 'PASS' : 'FAIL') + '</span> <span>' + c.check + '</span><div class="score-bar"><div class="score-fill" style="width:' + (c.score || 0) + '%;background:' + color + '"></div></div><span style="font-size:0.8rem;color:var(--muted)">' + (c.score ?? '-') + '</span></div><div style="font-size:0.8rem;color:var(--muted);padding-left:3rem;margin-bottom:0.3rem">' + (c.reason || '') + '</div>';
      }).join('')}</div>
      <p style="font-size:0.85rem;color:var(--muted)"><strong>Recommendation:</strong> \${d.recommendation}</p>
      <p style="margin-top:0.8rem;font-size:0.75rem;color:var(--muted)">Certificate: \${d.certificate.id} | Artifact hash: \${d.certificate.artifactHash.slice(0,16)}...</p>
      <details style="margin-top:0.5rem"><summary style="cursor:pointer;color:var(--purple);font-size:0.8rem">Raw JSON</summary><pre>\${JSON.stringify(d, null, 2)}</pre></details>
    </div>\`;
}
</script>
</body>
</html>`;
}
