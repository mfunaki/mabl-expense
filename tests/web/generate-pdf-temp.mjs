import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('http://localhost:8765/manager-guide-en-embedded.html', { waitUntil: 'networkidle' });
await page.pdf({
  path: '/Users/mfunaki/src/github.com/mfunaki/mabl-expense/docs/operations/manager-expense-approval-guide_en.pdf',
  format: 'A4',
  margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
  printBackground: true
});
await browser.close();
console.log('PDF generated successfully');
