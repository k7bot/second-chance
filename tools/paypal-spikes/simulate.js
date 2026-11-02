const { api, loadEnv } = require('./lib');
const types = process.argv.slice(2).length ? process.argv.slice(2) : ['BILLING.SUBSCRIPTION.CANCELLED','BILLING.SUBSCRIPTION.PAYMENT.FAILED','BILLING.SUBSCRIPTION.SUSPENDED'];
(async () => {
  const webhook_id = loadEnv().PAYPAL_WEBHOOK_ID;
  for (const event_type of types) {
    const r = await api('POST', '/v1/notifications/simulate-event', { webhook_id, event_type, resource_version: '2.0' });
    console.log(event_type, r.status, r.json.id || JSON.stringify(r.json).slice(0, 300));
  }
})();
