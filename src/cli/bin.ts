import { run } from "./main.js";

/**
 * The entry file that esbuild bundles into dist/crit.js, which both bin names
 * run (FR-59, NFR-2). It only passes the command-line arguments to run; the
 * first two entries of process.argv are the node binary and this script.
 */
run(process.argv.slice(2));
