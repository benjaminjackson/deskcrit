import { main } from "./main.js";

/**
 * The entry file that esbuild bundles into dist/crit.js, which both bin names run (FR-59, NFR-2).
 * It passes the command-line arguments and the environment to main; the first two entries of
 * process.argv are the node binary and this script.
 */
await main(process.argv.slice(2), process.env);
