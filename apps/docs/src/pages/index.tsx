import { Redirect } from '@docusaurus/router'
import useBaseUrl from '@docusaurus/useBaseUrl'
import type { ReactElement } from 'react'

// ponytail: no landing page — the root just forwards to the docs. Swap for a
// real homepage (see repo-tooling's apps/docs/src/pages) when the site needs one.
export default function Home(): ReactElement {
	return <Redirect to={useBaseUrl('/docs')} />
}
