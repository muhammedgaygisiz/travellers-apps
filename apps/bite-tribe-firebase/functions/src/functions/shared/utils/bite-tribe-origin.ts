/**
 * The public origin BiteTribe is served from, for the Functions package.
 *
 * A second definition of the string in `libs/common/utils` rather than an
 * import of it, and deliberately so: this package compiles on its own tsconfig
 * with `rootDir: src` and no path mappings into the workspace libraries, so
 * there is no import to make. One constant here is the next best thing to one
 * constant overall - before it, the origin was spelled out at three separate
 * call sites, which is exactly the drift the comment on `BITE_TRIBE_ORIGIN`
 * warns about. If that constant ever changes, this is the one other place that
 * has to change with it.
 *
 * `www.bitetribe.app` and `bite-tribe.web.app` serve the same build. This is
 * the canonical host of the three, decided in issue \#1454.
 */
export const BITE_TRIBE_ORIGIN = 'https://bitetribe.app';
