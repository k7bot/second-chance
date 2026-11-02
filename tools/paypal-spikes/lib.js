const fs = require('fs'), path = require('path');
const ENV_FILE = path.join(__dirname, '..', '..', '.env.sandbox');
function loadEnv() {
  const env = {};
  for (const line of fs.readFileSync(ENV_FILE, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2];
  }
  return env;
}
function setEnv(key, val) {
  let txt = fs.readFileSync(ENV_FILE, 'utf8');
  const re = new RegExp(`^${key}=.*$`, 'm');
  txt = re.test(txt) ? txt.replace(re, `${key}=${val}`) : txt.replace(/\n?$/, `\n${key}=${val}\n`);
  fs.writeFileSync(ENV_FILE, txt);
}
let cached = null;
async function token() {
  if (cached && cached.exp > Date.now()) return cached.t;
  const env = loadEnv();
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!secret) throw new Error('PAYPAL_CLIENT_SECRET missing');
  const r = await fetch(env.PAYPAL_API_BASE + '/v1/oauth2/token', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(env.PAYPAL_CLIENT_ID + ':' + secret).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials' });
  if (!r.ok) throw new Error('oauth failed ' + r.status);
  const j = await r.json();
  cached = { t: j.access_token, exp: Date.now() + (j.expires_in - 60) * 1000 };
  return cached.t;
}
async function api(method, p, body, extraHeaders = {}) {
  const env = loadEnv();
  const r = await fetch(env.PAYPAL_API_BASE + p, {
    method, headers: { Authorization: 'Bearer ' + await token(), 'Content-Type': 'application/json', ...extraHeaders },
    body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)) });
  const text = await r.text(); let json; try { json = JSON.parse(text); } catch { json = text; }
  return { status: r.status, json, debugId: r.headers.get('paypal-debug-id') };
}
module.exports = { loadEnv, setEnv, token, api };
