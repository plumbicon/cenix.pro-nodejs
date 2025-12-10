import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import {
  REGION_MAP,
  DEFAULT_REGION,
  DEFAULT_VIEWPORT_SIZE,
} from './constants/config.js';

export function parseArguments() {
  const argv = yargs(hideBin(process.argv))
    .usage('Usage: $0 <command> [options]')
    .command(
      'ui-parser <url>',
      'Parse a product page using a headless browser.',
      (yargs) => {
        return yargs
          .positional('url', {
            describe: 'The URL of the product page to parse',
            type: 'string',
          })
          .option('region', {
            alias: 'r',
            describe: 'The region to set for parsing.',
            choices: Object.keys(REGION_MAP),
            default: DEFAULT_REGION,
          })
          .option('size', {
            alias: 's',
            describe: 'Browser viewport size, e.g., "1920x1080".',
            type: 'string',
            default: DEFAULT_VIEWPORT_SIZE,
          })
          .option('verbose', {
            alias: 'v',
            describe: 'Run in visible mode (not headless).',
            type: 'boolean',
            default: false,
          });
      }
    )
    .command(
      'api-parser <url>',
      'Parse a category page using API requests.',
      (yargs) => {
        return yargs
          .positional('url', {
            describe: 'The URL of the category page to parse',
            type: 'string',
          })
          .option('verbose', {
            alias: 'v',
            describe: 'Run in visible mode (not headless).',
            type: 'boolean',
            default: false,
          });
      }
    )
    .demandCommand(1, 'You must provide a command to run (e.g., ui-parser).')
    .help('h')
    .alias('h', 'help')
    .fail((msg, err, yargs) => {
      console.error(yargs.help());
      console.error(`\nError: ${msg}`);
      if (err) console.error(err);
      process.exit(1);
    })
    .parse();

  if (argv.url && !argv.url.startsWith('http')) {
    throw new Error('Invalid URL. It must start with http or https.');
  }

  if (argv.size) {
    const [width, height] = argv.size.split('x').map(Number);
    if (!width || !height || width <= 0 || height <= 0) {
      throw new Error(
        'Invalid size format. Use "widthxheight", e.g., "1920x1080".'
      );
    }
    argv.width = width;
    argv.height = height;
  }

  argv.command = argv._[0];

  return argv;
}
