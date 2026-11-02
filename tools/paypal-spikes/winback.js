const { api, loadEnv } = require('./lib');
const ctx = { brand_name: 'Second Chance Demo', user_action: 'SUBSCRIBE_NOW', return_url: 'https://example.com/winback-return', cancel_url: 'https://example.com/winback-cancel' };
const show = (label, r) => { console.log(label, r.status, r.json.id || '', r.json.status || '', r.json.plan_overridden !== undefined ? 'plan_overridden=' + r.json.plan_overridden : '');
  if (r.status >= 300) console.log(' error:', JSON.stringify(r.json)); else console.log(' approve:', (r.json.links || []).find(l => l.rel === 'approve')?.href); };
(async () => {
  const env = loadEnv();
  // A: plain win-back subscription with custom_id + subscriber email hint
  show('winback', await api('POST', '/v1/billing/subscriptions', { plan_id: env.PAYPAL_PLAN_WINBACK_ID, custom_id: 'winback:demo-subscriber-1:I-FT1VJ935P7LG',
    subscriber: { email_address: process.env.SANDBOX_BUYER_EMAIL || 'buyer@example.com', name: { given_name: 'Demo', surname: 'Buyer' } }, application_context: ctx }, { Prefer: 'return=representation' }));
  // B: per-subscriber plan override (custom pricing) on the Pro plan: $19.99/mo
  show('override-pricing', await api('POST', '/v1/billing/subscriptions', { plan_id: env.PAYPAL_PLAN_PRO_ID, custom_id: 'override-test-1',
    plan: { billing_cycles: [{ sequence: 1, total_cycles: 0, pricing_scheme: { fixed_price: { value: '19.99', currency_code: 'USD' } } }] }, application_context: ctx }, { Prefer: 'return=representation' }));
})();
