import path from 'node:path'

/** The package root: this file sits at `<root>/{src,dist}/cli/utils/`. */
export function getPackageRoot(): string {
	const cliFile = new URL(import.meta.url).pathname
	return path.dirname(path.dirname(path.dirname(path.dirname(cliFile))))
}
