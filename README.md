# Vprok.ru Scraper

This project is a Node.js script for scraping product data from the `vprok.ru` website.

## Features

- Two scraping modes:
  - **UI Parser**: Scrapes a single product page using a headless browser (Puppeteer).
  - **API Parser**: Scrapes a category page by intercepting the website's internal API calls.
- Configurable region and viewport size.
- Silent mode by default, with an optional verbose mode for debugging.
- Code linting and formatting with ESLint and Prettier.

## Project Structure

The project is organized into the following directories:

- `src/`: Source code
  - `constants/`: Configuration files and constants.
  - `parsers/`: Scraping logic for both UI and API modes.
  - `utils/`: Utility functions, including a logger.
  - `cli.js`: Command-line interface definition.
  - `main.js`: Main application entry point.

## Installation and Usage

1.  **Install dependencies:**

    ```bash
    npm install
    ```

2.  **Run the scraper:**
    The script is run via `npm start --`, followed by a command and its options.

    **UI Parser Example:**

    ```bash
    npm start -- ui-parser "https://www.vprok.ru/product/gorchitsa-frantsuzskaya-kuhne-250g--310232"
    ```

    **API Parser Example:**

    ```bash
    npm start -- api-parser "https://www.vprok.ru/catalog/103/moloko-syr-yaytsa"
    ```

    By default, the script runs silently. To see detailed logs, add the `--verbose` (or `-v`) flag:

    ```bash
    npm start -- ui-parser "https://..." --verbose
    ```

### Commands and Options

- `ui-parser <url>`: Parses a product page.
  - `url`: (Required) The URL of the product page.
  - `--region, -r`: The region to use for scraping (see `src/constants/config.js` for available regions).
  - `--size, -s`: The browser viewport size (e.g., "1920x1080").
  - `--verbose, -v`: Enable verbose logging.

- `api-parser <url>`: Parses a category page.
  - `url`: (Required) The URL of the category page.
  - `--verbose, -v`: Enable verbose logging.

## Development

This project uses ESLint and Prettier for code quality and consistency.

- **Lint code:**

  ```bash
  npm run lint
  ```

- **Fix linting and formatting errors:**
  ```bash
  npm run lint:fix
  npm run format
  ```
