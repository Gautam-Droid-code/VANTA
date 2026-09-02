/**
 * The pre-deploy gate.
 *
 *     npm run predeploy
 *
 * Two checks that are not the same kind of thing, and — since §34 — do not
 * share a fate:
 *
 * - **The link check is always fatal.** A dead internal link is user-visible
 *   breakage: somebody clicks it and lands on a 404. It has shipped twice
 *   (§31), which is the whole reason this gate exists.
 * - **Lint's severity depends on the deploy target.** An unused import is
 *   style. Blocking a deploy on it means one lint error at 11pm before a client
 *   demo stops the build for something no visitor could ever perceive.
 *
 * ## Why lint is not simply dropped
 *
 * Checked against the installed docs rather than assumed, because it changes
 * the answer: **Next 16 removed `next lint` and the `eslint` config option**
 * (`node_modules/next/dist/docs/.../05-config/03-eslint.md` — "Starting with
 * Next.js 16, `next lint` is removed"). So `next build` does not run ESLint at
 * all, and this is the *only* thing linting in CI. Removing it would mean
 * nothing lints on any deploy, ever.
 *
 * TypeScript is unaffected either way: `next build` still type-checks, and
 * `next.config.mjs` sets no `ignoreBuildErrors`. Real correctness stays gated
 * on every target regardless of what happens here.
 *
 * ## The escape hatch is a target, not a flag
 *
 * Production stays strict. A **preview** deploy reports lint and carries on, so
 * there is always a way to get a working URL in front of somebody: push to a
 * preview and demo from that.
 *
 * Deliberately no `SKIP_CHECKS` variable. An override wide enough to be
 * reached in a hurry is an override that disables the link check too, and §33's
 * point was that a check nobody is forced to run is a check that does not
 * exist. Relaxing by *target* cannot be pointed at the wrong thing.
 *
 * Local runs are strict on both counts. The relaxation is about unattended
 * builds, not about the person running this deliberately.
 */
import { spawnSync } from "node:child_process";

/**
 * `production` | `preview` | `development` on Vercel, undefined everywhere
 * else. Undefined means a local run, which is strict.
 */
const target = process.env.VERCEL_ENV ?? "local";
const lintIsFatal = target !== "preview";

const rule = "─".repeat(64);

/**
 * The command is passed as one string rather than as `(cmd, args, { shell })`.
 * Node deprecates the latter (DEP0190) because the arguments are concatenated
 * rather than escaped — harmless with these fixed literals, but a warning
 * printed on every deploy trains people to ignore deploy logs.
 *
 * `shell: true` is still needed: `npm` is `npm.cmd` on Windows and is not
 * directly executable.
 */
function run(label, command) {
  console.log(`\n${rule}\n${label}\n${rule}`);
  const { status } = spawnSync(command, { stdio: "inherit", shell: true });
  return status === 0;
}

console.log(`predeploy — target: ${target}`);
console.log(`  link check: fatal`);
console.log(`  lint:       ${lintIsFatal ? "fatal" : "reported, non-fatal on preview"}`);

/**
 * Both run before anything exits, even when the first fails. A build that dies
 * on the link check while hiding the lint output would cost a second round trip
 * to learn something already known.
 */
const linksOk = run("Link check (fatal)", "npm run content:check-links");
const lintOk = run(`ESLint (${lintIsFatal ? "fatal" : "non-fatal on preview"})`, "npm run lint");

console.log(`\n${rule}`);
console.log(`links: ${linksOk ? "pass" : "FAIL"}    lint: ${lintOk ? "pass" : "FAIL"}`);

if (!linksOk) {
  console.error("\nBlocked: a dead internal link is user-visible breakage. §31, §33.");
  process.exit(1);
}

if (!lintOk) {
  if (lintIsFatal) {
    console.error(
      "\nBlocked: lint failed on a " +
        (target === "local" ? "local run" : `${target} build`) +
        ".\nTo get a URL in front of somebody now, deploy to a PREVIEW — lint is\n" +
        "reported there but does not block. Fix it before promoting to production.",
    );
    process.exit(1);
  }
  console.warn(
    "\nLint failed, and this is a preview build, so it is not blocking.\n" +
      "It WILL block production. Fix it before promoting.",
  );
}

console.log("Ready to deploy.\n");
