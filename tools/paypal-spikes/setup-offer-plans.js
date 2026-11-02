const { api, setEnv, loadEnv } = require('./lib');
const usd = v => ({ fixed_price: { value: v, currency_code: 'USD' } });
const cyc = (seq, tenure, price, total) => ({ frequency: { interval_unit: 'MONTH', interval_count: 1 }, tenure_type: tenure, sequence: seq, total_cycles: total, pricing_scheme: usd(price) });
const pay = { auto_bill_outstanding: true, setup_fee_failure_action: 'CONTINUE', payment_failure_threshold: 3 };
(async () => {
  const env = loadEnv(); const product_id = env.PAYPAL_PRODUCT_ID;
  const plans = [
    ['PAYPAL_PLAN_LITE_ID', 'Second Chance Demo - Lite', [cyc(1, 'REGULAR', '15.00', 0)]],
    ['PAYPAL_PLAN_SAVE50_ID', 'Second Chance Demo - Save 50% (3 mo)', [cyc(1, 'TRIAL', '14.50', 3), cyc(2, 'REGULAR', '29.00', 0)]],
    ['PAYPAL_PLAN_WINBACK_ID', 'Second Chance Demo - Win-back', [cyc(1, 'TRIAL', '0', 1), cyc(2, 'REGULAR', '29.00', 0)]],
  ];
  for (const [key, name, billing_cycles] of plans) {
    if (env[key]) { console.log(key, 'exists', env[key]); continue; }
    const r = await api('POST', '/v1/billing/plans', { product_id, name, status: 'ACTIVE', billing_cycles, payment_preferences: pay },
      { 'PayPal-Request-Id': 'sc-' + key, Prefer: 'return=representation' });
    console.log(key, r.status, r.json.id || JSON.stringify(r.json));
    if (r.json.id) setEnv(key, r.json.id);
  }
})();
