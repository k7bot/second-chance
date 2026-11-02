const { api, setEnv, loadEnv } = require('./lib');
(async () => {
  const env = loadEnv();
  let productId = env.PAYPAL_PRODUCT_ID, planId = env.PAYPAL_PLAN_PRO_ID;
  if (!productId) {
    const p = await api('POST', '/v1/catalogs/products', { name: 'Second Chance Demo', description: 'Demo SaaS product for Second Chance retention agent', type: 'SERVICE', category: 'SOFTWARE' }, { 'PayPal-Request-Id': 'sc-product-1' });
    console.log('product', p.status, p.json.id || JSON.stringify(p.json)); productId = p.json.id; setEnv('PAYPAL_PRODUCT_ID', productId);
  }
  if (!planId) {
    const pl = await api('POST', '/v1/billing/plans', {
      product_id: productId, name: 'Second Chance Demo - Pro', description: 'Pro monthly', status: 'ACTIVE',
      billing_cycles: [{ frequency: { interval_unit: 'MONTH', interval_count: 1 }, tenure_type: 'REGULAR', sequence: 1, total_cycles: 0,
        pricing_scheme: { fixed_price: { value: '29.00', currency_code: 'USD' } } }],
      payment_preferences: { auto_bill_outstanding: true, setup_fee_failure_action: 'CONTINUE', payment_failure_threshold: 3 }
    }, { 'PayPal-Request-Id': 'sc-plan-pro-1', Prefer: 'return=representation' });
    console.log('plan', pl.status, pl.json.id || JSON.stringify(pl.json)); planId = pl.json.id; setEnv('PAYPAL_PLAN_PRO_ID', planId);
  }
  const s = await api('POST', '/v1/billing/subscriptions', {
    plan_id: planId, custom_id: 'demo-subscriber-1',
    application_context: { brand_name: 'Second Chance Demo', user_action: 'SUBSCRIBE_NOW', return_url: 'https://example.com/return', cancel_url: 'https://example.com/cancel' }
  }, { Prefer: 'return=representation' });
  console.log('subscription', s.status, s.json.id, s.json.status);
  console.log('approve', (s.json.links || []).find(l => l.rel === 'approve')?.href);
})();
