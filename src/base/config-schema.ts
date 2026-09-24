/**
 * `.repo-ai.json` against the shipped `schemas/repo-ai.json` (#67). The schema
 * is the single source of truth for the key list; this checks the subset of
 * JSON Schema it uses — top-level `type` per property, `items.type` for
 * arrays, and `additionalProperties: false` — so the package needs no
 * validator dependency.
 *
 * ponytail: no `integer`/`minimum`/`enum` support — add it with the first
 * property that uses one (e.g. #62's `pollSeconds`).
 */
import path from 'node:path'
import fs from 'fs-extra'
import { CONFIG_FILE, readConfig } from './config.js'
import { FixerAbort } from './fixer-abort.js'
import type { CheckResult } from './types.js'

interface PropertySchema {
	type: string
	items?: { type: string }
}

// ponytail: dist/base and src/base both sit two levels below the package root.
const SCHEMA_PATH = path.join(import.meta.dirname, '..', '..', 'schemas', 'repo-ai.json')
const schema: { $id: string; properties: Record<string, PropertySchema> } =
	fs.readJsonSync(SCHEMA_PATH)

export const SCHEMA_URL = schema.$id

function typeOf(value: unknown): string {
	if (Array.isArray(value)) return 'array'
	if (value === null) return 'null'
	return typeof value
}

/** One message per violation; empty when the value conforms. */
export function validateConfig(value: unknown): string[] {
	if (typeOf(value) !== 'object') return [`must be an object, got ${typeOf(value)}`]
	const errors: string[] = []
	for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
		const prop = schema.properties[key]
		if (!prop) {
			errors.push(`unknown key "${key}"`)
			continue
		}
		if (typeOf(v) !== prop.type) {
			errors.push(`"${key}" must be ${prop.type}, got ${typeOf(v)}`)
			continue
		}
		const itemType = prop.items?.type
		if (itemType && (v as unknown[]).some((i) => typeOf(i) !== itemType)) {
			errors.push(`"${key}" must contain only ${itemType} items`)
		}
	}
	return errors
}

/** Null when there is no `.repo-ai.json` to check. */
export async function checkConfigSchema(dir: string): Promise<CheckResult | null> {
	const file = path.join(dir, CONFIG_FILE)
	const raw = await fs.readFile(file, 'utf8').catch(() => null)
	if (raw === null) return null
	let errors: string[]
	try {
		errors = validateConfig(JSON.parse(raw))
	} catch (err) {
		errors = [`not valid JSON: ${(err as Error).message}`]
	}
	if (errors.length === 0) {
		return { check: 'Loop config schema', status: 'ok', detail: `${CONFIG_FILE} is valid` }
	}
	return {
		check: 'Loop config schema',
		status: 'drift',
		detail: `${CONFIG_FILE}: ${errors.join('; ')}`,
		hint: `Keys and types: ${SCHEMA_URL}`,
	}
}

/**
 * `fix config`: stamp `$schema` into `.repo-ai.json`, first in key order. With
 * no file yet, create one seeded from the legacy `.repo-tooling.json` settings
 * `readConfig` falls back to — so the new file never shadows them.
 */
export async function writeConfigSchema(dir: string): Promise<string[]> {
	const file = path.join(dir, CONFIG_FILE)
	let current: Record<string, unknown>
	if (await fs.pathExists(file)) {
		const parsed = await fs.readJson(file).catch(() => null)
		if (typeOf(parsed) !== 'object') {
			throw new FixerAbort(
				'invalid-config',
				`${CONFIG_FILE} is not a JSON object`,
				'fix it by hand, then rerun'
			)
		}
		current = parsed
		if (current.$schema === SCHEMA_URL) return []
	} else {
		const { agentUser, requiredSkills } = await readConfig(dir)
		current = { agentUser, requiredSkills }
	}
	const { $schema: _, ...rest } = current
	await fs.writeJson(file, { $schema: SCHEMA_URL, ...rest }, { spaces: 2 })
	return [file]
}
