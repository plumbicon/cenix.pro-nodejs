import 'dotenv/config';
import { parseArguments } from './cli.js';
import { runScraper } from './parsers/scraper.js';
import { runApiParser } from './parsers/api-parser.js';

async function main() {
  let options;
  try {
    options = parseArguments();
  } catch (error) {
    console.error(`Error parsing arguments: ${error.message}`);
    process.exit(1);
  }

  try {
    switch (options.command) {
      case 'ui-parser':
        await runScraper(options);
        if (options.verbose) {
          console.log('\nUI parsing completed successfully.');
        }
        break;

      case 'api-parser':
        await runApiParser(options);
        if (options.verbose) {
          console.log('\nAPI parsing completed successfully.');
        }

        break;

      default:
        console.error(`Unknown command: ${options.command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error(
      `\nA critical error occurred during execution: ${error.message}`
    );
    console.error(error.stack);
    process.exit(1);
  }
}

main();
