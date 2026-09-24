/**
 * A fixer giving up on something the user has to resolve — a wrong flag, not a
 * crash. Thrown rather than printed-and-exited because a fixer runs underneath
 * `--json`: only the command layer knows whether the failure should surface as
 * an error payload on stdout or a red line on stderr.
 */
export class FixerAbort extends Error {
	constructor(
		readonly code: string,
		message: string,
		readonly hint?: string
	) {
		super(message)
		this.name = 'FixerAbort'
	}
}
