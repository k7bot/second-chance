const { api, setEnv } = require('./lib');
const URL = process.argv[2];
const TYPES = ['BILLING.SUBSCRIPTION.CREATED','BILLING.SUBSCRIPTION.ACTIVATED','BILLING.SUBSCRIPTION.UPDATED','BILLING.SUBSCRIPTION.CANCELLED','BILLING.SUBSCRIPTION.SUSPENDED','BILLING.SUBSCRIPTION.PAYMENT.FAILED','BILLING.SUBSCRIPTION.EXPIRED','BILLING.SUBSCRIPTION.RE-ACTIVATED','PAYMENT.SALE.COMPLETED'];
(async () => {
  const list = await api('GET', '/v1/notifications/webhooks');
  const hooks = (list.json.webhooks || []);
  console.log('existing:', hooks.map(h => h.id + ' ' + h.url));
  let id;
  const existing = hooks.find(h => h.url.includes('/paypal/webhook')) || hooks[0];
  if (existing) {
    const r = await api('PATCH', `/v1/notifications/webhooks/${existing.id}`, [
      { op: 'replace', path: '/url', value: URL },
      { op: 'replace', path: '/event_types', value: TYPES.map(name => ({ name })) }]);
    console.log('update', r.status, r.status !== 200 ? JSON.stringify(r.json) : ''); id = existing.id;
  } else {
    const r = await api('POST', '/v1/notifications/webhooks', { url: URL, event_types: TYPES.map(name => ({ name })) });
    console.log('create', r.status, r.status >= 300 ? JSON.stringify(r.json) : ''); id = r.json.id;
  }
  if (id) { setEnv('PAYPAL_WEBHOOK_ID', id); console.log('PAYPAL_WEBHOOK_ID=' + id); }
})();
