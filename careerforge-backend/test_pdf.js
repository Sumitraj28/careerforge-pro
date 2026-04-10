const { generatePDF } = require('./services/puppeteerService');
const fs = require('fs');

async function run() {
  try {
    console.log("Generating PDF...");
    const html = '<html><body><h1>Hello World</h1></body></html>';
    const buffer = await generatePDF(html, false);
    fs.writeFileSync('test.pdf', buffer);
    console.log("PDF generated successfully. Size:", buffer.length);
  } catch (err) {
    console.error("Error:", err);
  }
}
run();
