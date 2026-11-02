const http = require('http'), fs = require('fs'), path = require('path');
const { loadEnv, api } = require('./lib');
const PORT = process.env.PORT || 8787;
const EV = path.join(__dirname, 'events');
http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') { res.end('ok'); return; }
  if (req.method !== 'POST' || !req.url.startsWith('/paypal/webhook')) { res.statusCode = 404; res.end(); return; }
  let raw = ''; req.on('data', c => raw += c);
  req.on('end', async () => {
    res.statusCode = 200; res.end('ok'); // ack fast
    let body; try { body = JSON.parse(raw); } catch { body = null; }
    const id = (body && body.id) || ('noid-' + Date.now());
    const rec = { received_at: new Date().toISOString(), headers: req.headers, raw_body: raw, event_type: body && body.event_type };
    let verification = { status: 'skipped' };
    try {
      const env = loadEnv();
      if (!env.PAYPAL_WEBHOOK_ID) verification = { status: 'no PAYPAL_WEBHOOK_ID' };
      else {
        const h = req.headers;
        // Splice raw body in verbatim so the signature input isn't altered by re-serialization
        const payload = `{"auth_algo":${JSON.stringify(h['paypal-auth-algo']||'')},"cert_url":${JSON.stringify(h['paypal-cert-url']||'')},"transmission_id":${JSON.stringify(h['paypal-transmission-id']||'')},"transmission_sig":${JSON.stringify(h['paypal-transmission-sig']||'')},"transmission_time":${JSON.stringify(h['paypal-transmission-time']||'')},"webhook_id":${JSON.stringify(env.PAYPAL_WEBHOOK_ID)},"webhook_event":${raw}}`;
        const r = await api('POST', '/v1/notifications/verify-webhook-signature', payload);
        verification = { http: r.status, status: r.json && r.json.verification_status, debug_id: r.debugId, error: r.status !== 200 ? r.json : undefined };
      }
    } catch (e) { verification = { status: 'error', error: String(e.message) }; }
    rec.verification = verification;
    const fn = path.join(EV, `${Date.now()}_${(rec.event_type||'unknown').replace(/[^A-Z0-9._-]/gi,'_')}_${id}.json`);
    fs.writeFileSync(fn, JSON.stringify(rec, null, 2));
    console.log(new Date().toISOString(), rec.event_type, id, 'verification_status=' + verification.status, verification.http ? 'http=' + verification.http : '');
  });
}).listen(PORT, () => console.log('listening on', PORT));
