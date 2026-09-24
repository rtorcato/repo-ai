import { defineConfig, mergeConfig } from 'vitest/config'
import base from '@rtorcato/repo-tooling/vitest/config'
import { stripAmbientGitEnv } from './scripts/lib/git-env.mjs'

// Before any test spawns git in a temp directory — under a hook, GIT_DIR would
// redirect it into this repo. See the helper for the full failure mode.
stripAmbientGitEnv()

export default mergeConfig(base, defineConfig({}))
