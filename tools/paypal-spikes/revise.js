const { api, loadEnv } = require('./lib');
const SUB = process.argv[2], key = process.argv[3];
(async () => {
  const plan_id = loadEnv()[key];
  const r = await api('POST', `/v1/billing/subscriptions/${SUB}/revise`, { plan_id,
    application_context: { brand_name: 'Second Chance Demo', return_url: 'https://example.com/revise-return', cancel_url: 'https://example.com/revise-cancel' } });
  console.log(key, plan_id, 'revise', r.status, r.status >= 300 ? JSON.stringify(r.json) : '');
  console.log(' plan_overridden:', r.json.plan_overridden, ' links:', (r.json.links || []).map(l => l.rel + ' ' + l.href).join(' | '));
  const g = await api('GET', `/v1/billing/subscriptions/${SUB}`);
  console.log(' after: status', g.json.status, 'plan_id', g.json.plan_id, 'next', g.json.billing_info?.next_billing_time);
})();
