const { chromium } = require('./node_modules/@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  const logs = [];
  const failedRequests = [];
  page.on('console', msg => logs.push(msg.type() + ': ' + msg.text()));
  page.on('pageerror', err => errors.push(err.toString()));
  page.on('requestfailed', req => failedRequests.push(req.url() + ' - ' + req.failure()?.errorText));
  page.on('response', res => { if (res.status() >= 400) failedRequests.push(res.status() + ' ' + res.url()); });
  
  console.log('Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(5000);
  
  const html = await page.evaluate(() => document.getElementById('root').innerHTML);
  console.log('===ROOT HTML===');
  console.log(html.slice(0, 800) || '(empty)');
  console.log('\n===FAILED REQUESTS===');
  failedRequests.forEach(f => console.log(f));
  console.log('\n===CONSOLE (first 20)===');
  logs.slice(0, 20).forEach(l => console.log(l));
  console.log('\n===PAGE ERRORS===');
  errors.forEach(e => console.log(e));
  
  await browser.close();
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
