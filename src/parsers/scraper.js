import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import {
  REGION_MAP,
  SELECTORS,
  OUTPUT_FILES,
  PUPPETEER_LAUNCH_OPTIONS,
  PUPPETEER_GOTO_OPTIONS,
  TIMEOUTS,
} from '../constants/config.js';
import { autoScroll } from '../utils/utils.js';
import Logger from '../utils/logger.js';

async function closePopup(page, selector, name, logger) {
  try {
    logger.log(`Looking for ${name}...`);
    let element = null;

    // Support both XPath (starting with "//") and CSS selectors
    if (typeof selector === 'string' && selector.trim().startsWith('//')) {
      try {
        element = await page.waitForXPath(selector, {
          timeout: TIMEOUTS.selector,
        });
      } catch (e) {
        // If waitForXPath fails, fall through and element will be null
        element = null;
      }
    } else {
      try {
        element = await page.waitForSelector(selector, {
          timeout: TIMEOUTS.selector,
        });
      } catch (e) {
        // If waitForSelector fails, element stays null
        element = null;
      }
    }

    if (element) {
      logger.log(`${name} found, clicking it.`);
      try {
        await element.click();
      } catch (clickError) {
        // Fallback: perform click via page.evaluate in case ElementHandle.click() fails
        logger.log(
          `${name} click via handle failed, attempting DOM click. Error: ${clickError.message}`
        );
        try {
          await page.evaluate(
            (sel, isXPath) => {
              if (isXPath) {
                const node = document.evaluate(
                  sel,
                  document,
                  null,
                  XPathResult.FIRST_ORDERED_NODE_TYPE,
                  null
                ).singleNodeValue;
                if (node && typeof node.click === 'function') node.click();
              } else {
                const el = document.querySelector(sel);
                if (el && typeof el.click === 'function') el.click();
              }
            },
            selector,
            typeof selector === 'string' && selector.trim().startsWith('//')
          );
        } catch (evalError) {
          logger.log(`${name} DOM click failed: ${evalError.message}`);
        }
      }
    } else {
      logger.log(`${name} not found after waiting.`);
    }
  } catch (error) {
    logger.log(`${name} not found, continuing. Error: ${error.message}`);
  }
}

/**
 * Try to close cookie consent banners whose container DIV has a class
 * that starts with "CookiesAlert". Logs whether such an element was found.
 * If found, attempts to click the first clickable element inside it.
 */
async function closeCookieConsent(page, logger) {
  try {
    logger.log(
      'Looking for cookie consent container (class starting with "CookiesAlert_agreeButton")...'
    );
    const cookieContainerHandle = await page.$(
      'div[class^="CookiesAlert_agreeButton"]'
    );

    if (!cookieContainerHandle) {
      logger.log('CookiesAlert_agreeButton element not found.');
      return;
    }

    logger.log(
      'CookiesAlert_agreeButton element found, searching for a button inside it...'
    );

    // Try common clickable selectors inside the container
    let buttonHandle = await cookieContainerHandle.$(
      'button, [role="button"], input[type="button"], a'
    );

    // Fallback: use evaluate to query inside the container if previous returned null
    if (!buttonHandle) {
      const possibleHandle = await page.evaluateHandle((node) => {
        return node.querySelector(
          'button, [role="button"], input[type="button"], a'
        );
      }, cookieContainerHandle);

      // If evaluateHandle returned a DOM node, wrap as ElementHandle
      // If it's the empty result, its _remoteObject.value may be null, handle accordingly
      // We'll treat non-null handles as clickable
      try {
        const val =
          possibleHandle && (await possibleHandle.getProperty('nodeType'));
        // If nodeType exists, use possibleHandle as the button handle
        if (val) {
          buttonHandle = possibleHandle;
        } else {
          // dispose if not useful
          if (possibleHandle.dispose) possibleHandle.dispose();
        }
      } catch (e) {
        // If anything goes wrong, ignore and continue
        if (possibleHandle.dispose) possibleHandle.dispose();
      }
    }

    if (!buttonHandle) {
      logger.log(
        'No clickable element found inside CookiesAlert_agreeButton container.'
      );
      return;
    }

    // Try to click via ElementHandle.click(), otherwise fallback to DOM click via evaluate
    try {
      await buttonHandle.click();
      logger.log('Clicked cookie consent button via ElementHandle.click().');
    } catch (clickErr) {
      logger.log(
        `ElementHandle.click() failed: ${clickErr.message}. Attempting DOM click fallback.`
      );
      try {
        await page.evaluate((el) => {
          if (el && typeof el.click === 'function') el.click();
        }, buttonHandle);
        logger.log('Clicked cookie consent button via DOM click.');
      } catch (evalErr) {
        logger.log(`DOM click fallback failed: ${evalErr.message}`);
      }
    }
  } catch (err) {
    logger.log(`Error while trying to close cookie consent: ${err.message}`);
  }
}

async function scrapeProductData(page, logger) {
  let price, priceOld, rating, reviewCount;

  try {
    await page.waitForSelector(SELECTORS.priceContainer, {
      timeout: TIMEOUTS.selector,
    });
    const priceHandles = await page.$$(
      `${SELECTORS.priceContainer} ${SELECTORS.price}`
    );

    const prices = [];
    for (const handle of priceHandles) {
      const text = await handle.evaluate((el) => el.textContent.trim());
      if (text.includes('₽')) {
        prices.push(text);
      }
    }

    if (prices.length >= 2) {
      priceOld = prices[0];
      price = prices[1];
    } else if (prices.length === 1) {
      price = prices[0];
    }
  } catch (e) {
    logger.log('Could not find price.');
  }

  try {
    await page.waitForSelector(SELECTORS.rating, {
      timeout: TIMEOUTS.selector,
    });
    const ratingText = await page.$eval(
      SELECTORS.rating,
      (el) => el.textContent
    );
    const ratingMatch = ratingText.match(/(\d[.,]\d)/);
    if (ratingMatch) {
      rating = ratingMatch[1].replace(',', '.');
    }

    await page.waitForSelector(SELECTORS.reviews, {
      timeout: TIMEOUTS.selector,
    });
    const reviewsText = await page.$eval(
      SELECTORS.reviews,
      (el) => el.textContent
    );
    const reviewsMatch = reviewsText.match(/(\d+)/);
    if (reviewsMatch) {
      reviewCount = reviewsMatch[1];
    }
  } catch (e) {
    logger.log('Could not find rating or reviews.');
  }

  return { price, priceOld, rating, reviewCount };
}

export async function runScraper(options) {
  const { url, region, width, height, verbose } = options;
  const logger = new Logger(verbose);

  const regionId = REGION_MAP[region];

  logger.log(`Target: ${url}`);
  logger.log(`Region: ${region} (ID: ${regionId})`);
  logger.log(`Resolution: ${width}x${height}`);
  logger.log(`Launch mode: ${verbose ? 'Visible (--verbose)' : 'Headless'}`);

  const launchOptions = {
    ...PUPPETEER_LAUNCH_OPTIONS,
    headless: verbose ? false : true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-extensions',
      '--disable-features=Translate',
    ],
  };

  const browser = await puppeteer.launch(launchOptions);

  try {
    const page = await browser.newPage();

    const userAgent = (await browser.userAgent()).replace(
      'HeadlessChrome',
      'Chrome'
    );
    await page.setUserAgent(userAgent);
    logger.log(`Using User-Agent: ${userAgent}`);

    await page.setViewport({ width, height });

    const regionCookie = {
      name: 'region',
      value: String(regionId),
      domain: '.vprok.ru',
    };
    await page.setCookie(regionCookie);

    await page.goto(url, PUPPETEER_GOTO_OPTIONS);
    logger.log('Page loaded.');

    await closePopup(
      page,
      SELECTORS.x5idCloseButton,
      'X5ID login banner',
      logger
    );

    await closeCookieConsent(page, logger);

    const data = await scrapeProductData(page, logger);

    logger.log('Hiding sticky header...');
    try {
      await page.evaluate((selector) => {
        const stickyHeader = document.querySelector(selector);
        if (stickyHeader) stickyHeader.style.display = 'none';
      }, SELECTORS.stickyHeader);
    } catch (e) {
      logger.log('Could not hide sticky header.');
    }

    logger.log('Scrolling to the bottom of the page...');
    await autoScroll(page);
    logger.log('Scrolling complete.');

    logger.log(
      'Scrolling to the top of the page before taking a screenshot...'
    );
    await page.evaluate(() => window.scrollTo(0, 0));

    await page.screenshot({ path: OUTPUT_FILES.screenshot, fullPage: true });
    logger.log(`Screenshot saved to ${OUTPUT_FILES.screenshot}`);

    let output = '';
    if (data.price) output += `price=${data.price.replace(/[^0-9,.]/g, '')}\n`;
    if (data.priceOld)
      output += `priceOld=${data.priceOld.replace(/[^0-9,.]/g, '')}\n`;
    if (data.rating) output += `rating=${data.rating}\n`;
    if (data.reviewCount) output += `reviewCount=${data.reviewCount}\n`;

    await fs.writeFile(OUTPUT_FILES.productData, output.trim());
    logger.log(`Data saved to ${OUTPUT_FILES.productData}:`);
    logger.log(output.trim());
  } finally {
    logger.log('\nClosing browser...');
    await browser.close();
    logger.log('Browser closed.');
  }
}
