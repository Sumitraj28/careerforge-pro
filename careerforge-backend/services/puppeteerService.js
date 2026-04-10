const puppeteer = require('puppeteer')

async function generatePDF(resumeHTML, isPro = false) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    })

    const page = await browser.newPage()

    await page.setContent(resumeHTML, {
      waitUntil: 'networkidle2',
      timeout: 15000
    })

    // Add print CSS for page boundaries
    await page.addStyleTag({
      content: `
        * { -webkit-print-color-adjust: exact; }
        @page { margin: 15mm; }
        .experience-section { 
          page-break-inside: avoid; 
        }
        .rp-section {
          page-break-inside: avoid;
        }
      `
    })

    // Add watermark for free users
    if (!isPro) {
      await page.addStyleTag({
        content: `
          body::after {
            content: 'Created with CareerForge Pro — Free Plan';
            position: fixed;
            bottom: 5mm;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 9px;
            color: #999;
            font-family: Arial, sans-serif;
            z-index: 9999;
          }
        `
      })
    }

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: '0',
        bottom: '0',
        left: '0',
        right: '0'
      }
    })

    return pdf
  } catch (error) {
    console.error('Puppeteer PDF generation error:', error)
    throw new Error('Failed to generate PDF: ' + error.message)
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

async function generateCoverLetterPDF(coverLetterText, personalInfo) {
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const formattedText = coverLetterText.split('\n').filter(p => p.trim()).map(p => `<p>${p}</p>`).join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Georgia', 'Times New Roman', serif;
    font-size: 11px;
    line-height: 1.8;
    color: #333;
  }
  .page {
    width: 210mm;
    min-height: 297mm;
    padding: 25mm;
  }
  .header {
    margin-bottom: 30px;
    border-bottom: 2px solid #1a1a2e;
    padding-bottom: 15px;
  }
  .name {
    font-size: 24px;
    font-weight: bold;
    color: #1a1a2e;
    font-family: 'Arial', sans-serif;
  }
  .contact {
    font-size: 10px;
    color: #666;
    margin-top: 5px;
    font-family: 'Arial', sans-serif;
  }
  .date {
    margin-bottom: 20px;
    font-weight: bold;
  }
  .content p {
    margin-bottom: 12px;
  }
  @media print {
    .page { margin: 0; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="name">${personalInfo?.firstName || ''} ${personalInfo?.lastName || ''}</div>
    <div class="contact">
      ${personalInfo?.email || ''} ${personalInfo?.phone ? '• ' + personalInfo.phone : ''}
    </div>
  </div>
  <div class="date">${dateStr}</div>
  <div class="content">
    ${formattedText}
  </div>
</div>
</body>
</html>
  `;

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' }
    });
    return pdf;
  } catch (error) {
    console.error('Puppeteer Cover Letter PDF error:', error);
    throw new Error('Failed to generate cover letter PDF: ' + error.message);
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { generatePDF, generateCoverLetterPDF }
