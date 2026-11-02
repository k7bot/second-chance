const { api } = require('./lib');
const SUB = process.argv[2] || 'I-FT1VJ935P7LG';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const status = async () => (await api('GET', `/v1/billing/subscriptions/${SUB}`)).json.status;
(async () => {
  let t = Date.now();
  let r = await api('POST', `/v1/billing/subscriptions/${SUB}/suspend`, { reason: 'Second Chance save offer: customer chose to pause' });
  console.log(new Date().toISOString(), 'suspend', r.status, r.status !== 204 ? JSON.stringify(r.json) : '');
  for (let i = 0; i < 10; i++) { const s = await status(); console.log(' +' + (Date.now() - t) + 'ms', s); if (s === 'SUSPENDED') break; await sleep(1500); }
  await sleep(20000);
  t = Date.now();
  r = await api('POST', `/v1/billing/subscriptions/${SUB}/activate`, { reason: 'Second Chance: customer resumed' });
  console.log(new Date().toISOString(), 'activate', r.status, r.status !== 204 ? JSON.stringify(r.json) : '');
  for (let i = 0; i < 10; i++) { const s = await status(); console.log(' +' + (Date.now() - t) + 'ms', s); if (s === 'ACTIVE') break; await sleep(1500); }
  await sleep(20000);
})();
