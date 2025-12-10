export const REGION_MAP = {
  'Moscow and Moscow Oblast': 1,
  'Saint Petersburg and Leningrad Oblast': 2,
  'Vladimir Oblast': 8,
  'Kaluga Oblast': 12,
  'Ryazan Oblast': 26,
  'Tver Oblast': 33,
  'Tula Oblast': 34,
};

export const DEFAULT_REGION =
  process.env.DEFAULT_REGION || 'Moscow and Moscow Oblast';
export const DEFAULT_VIEWPORT_SIZE =
  process.env.DEFAULT_VIEWPORT_SIZE || '1920x1080';

export const SELECTORS = {
  x5idCloseButton: '[class*="Tooltip_closeIcon"]',

  priceContainer: '[class*="ProductPage_desktopBuy"]',
  price: 'span[class*="Price_price"]',
  rating: '.ActionsRow_stars__EKt42',
  reviews: '.ActionsRow_reviews__AfSj_',
  stickyHeader: '[class*="StickyPortal_root"]',
};

export const OUTPUT_FILES = {
  html: 'page.html',
  screenshot: 'screenshot.jpg',
  productData: 'product.txt',
};

export const PUPPETEER_LAUNCH_OPTIONS = {
  headless: process.env.HEADLESS_MODE === 'false' ? false : 'new',
};

export const PUPPETEER_GOTO_OPTIONS = {
  waitUntil: 'networkidle2',
};

export const TIMEOUTS = {
  selector: process.env.SELECTOR_TIMEOUT || 5000,
  action: process.env.ACTION_TIMEOUT || 1000,
};
