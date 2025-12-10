import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';
import Logger from '../utils/logger.js';

export async function runApiParser(options) {
  const { url, verbose } = options;
  const logger = new Logger(verbose);

  logger.log(`
Running API parser for URL: ${url}`);

  const browser = await puppeteer.launch({
    headless: !options.verbose,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-extensions',
      '--disable-features=Translate',
    ],
  });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    logger.log('Waiting for "__NEXT_DATA__" element...');
    await page.waitForSelector('script#__NEXT_DATA__', { timeout: 15000 });

    const productsJson = await page.$eval('script#__NEXT_DATA__', (script) => {
      try {
        const jsonData = JSON.parse(script.textContent);
        return jsonData?.props?.pageProps?.initialStore?.catalogPage?.products;
      } catch (e) {
        return null;
      }
    });

    if (!productsJson) {
      throw new Error(
        'Failed to extract or process product data from JSON. The structure may have changed or the JSON is invalid.'
      );
    }

    let formattedOutput = '';
    for (const product of productsJson) {
      const {
        name,
        url,
        rating,
        reviews,
        price,
        oldPrice,
        discount,
        discountPercent,
      } = product;

      const productUrl = `https://www.vprok.ru${url}`;

      formattedOutput += `Product Name: ${name}\n`;
      formattedOutput += `Product URL: ${productUrl}\n`;
      formattedOutput += `Rating: ${rating}\n`;
      formattedOutput += `Number of reviews: ${reviews}\n`;

      if (oldPrice && oldPrice > 0) {
        formattedOutput += `Discount price: ${price}\n`;
        formattedOutput += `Price before discount: ${oldPrice}\n`;
      } else {
        formattedOutput += `Price: ${price}\n`;
      }

      if (discountPercent && discountPercent > 0) {
        formattedOutput += `Discount size: ${discountPercent}%\n`;
      } else if (discount && discount > 0) {
        formattedOutput += `Discount size: ${discount}\n`;
      }

      formattedOutput += '---\n';
    }

    await fs.writeFile('products-api.txt', formattedOutput);

    logger.log(
      `Found ${productsJson.length} products. Data successfully written to products-api.txt`
    );
  } catch (error) {
    console.error(`Error during API parsing: ${error.message}`);
  } finally {
    await browser.close();
  }
}
