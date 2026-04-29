const puppeteer = require("puppeteer");
const path = require("path");
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  page.on('console', async (msg) => {
    console.log(`[${msg.type()}] ${msg.text()}`);
    for (const arg of msg.args()) {
      try {
        const val = await arg.jsonValue();
        if (typeof val === 'object' && val !== null) {
          console.log('[console arg]', JSON.stringify(val));
        }
      } catch (error) {}
    }
  });
  page.on('pageerror', (error) => {
    console.error('[pageerror]', error);
  });
  const filePath = path.resolve(__dirname, 'tmp-swagger-middleware.html');
  const fileUrl = 'file://' + filePath.replace(/\\/g, '/');
  console.log('Loading', fileUrl);
  await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 60000 });

  const opSelector = '#operations-Auth-post_auth_login';
  await page.click(`${opSelector} .opblock-summary-control`);
  await page.waitForSelector(`${opSelector} .try-out__btn`, { timeout: 5000 });
  await page.click(`${opSelector} .try-out__btn`);
  await page.waitForSelector(`${opSelector} textarea`, { timeout: 5000 });
  await page.evaluate((selector) => {
    const textarea = document.querySelector(`${selector} textarea`);
    if (textarea) {
      textarea.value = JSON.stringify({ email: 'admin@example.com', password: 'changeMeAdmin1!' }, null, 2);
      textarea.dispatchEvent(new Event('input'));
    }
  }, opSelector);
  await page.click(`${opSelector} .execute`);
  await new Promise((resolve) => setTimeout(resolve, 4000));
  await browser.close();
})();
