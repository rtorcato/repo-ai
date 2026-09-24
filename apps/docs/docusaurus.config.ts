import type * as Preset from '@docusaurus/preset-classic'
import type { Config } from '@docusaurus/types'
import { themes as prismThemes } from 'prism-react-renderer'

const config: Config = {
	title: 'repo-ai',
	tagline:
		'The ai-issue-loop pipeline — loop mechanics, Claude Code skills, and their audit — split out of @rtorcato/repo-tooling',
	favicon: 'img/favicon.svg',

	url: 'https://rtorcato.github.io',
	baseUrl: '/repo-ai/',

	organizationName: 'rtorcato',
	projectName: 'repo-ai',

	onBrokenLinks: 'warn',

	markdown: {
		format: 'detect',
		hooks: {
			onBrokenMarkdownLinks: 'warn',
		},
	},

	i18n: {
		defaultLocale: 'en',
		locales: ['en'],
	},

	presets: [
		[
			'classic',
			{
				docs: {
					sidebarPath: './sidebars.ts',
					routeBasePath: '/docs',
					editUrl: 'https://github.com/rtorcato/repo-ai/edit/main/apps/docs/',
				},
				blog: false,
				theme: {
					customCss: './src/css/custom.css',
				},
			} satisfies Preset.Options,
		],
	],

	plugins: [
		[
			'@easyops-cn/docusaurus-search-local',
			{
				hashed: true,
				indexDocs: true,
				indexBlog: false,
				docsRouteBasePath: '/docs',
				highlightSearchTermsOnTargetPage: true,
				searchBarShortcutHint: false,
			},
		],
	],

	themeConfig: {
		image: 'img/social-card.png',
		colorMode: {
			defaultMode: 'dark',
			respectPrefersColorScheme: true,
		},
		navbar: {
			title: 'repo-ai',
			items: [
				{ to: '/docs', position: 'left', label: 'Docs' },
				{
					href: 'https://github.com/rtorcato/repo-ai',
					label: 'GitHub',
					position: 'right',
				},
			],
		},
		footer: {
			style: 'dark',
			links: [
				{
					title: 'Docs',
					items: [{ label: 'Getting Started', to: '/docs' }],
				},
				{
					title: 'More',
					items: [
						{ label: 'GitHub', href: 'https://github.com/rtorcato/repo-ai' },
						{ label: 'Issues', href: 'https://github.com/rtorcato/repo-ai/issues' },
					],
				},
			],
			copyright: `Copyright © ${new Date().getFullYear()} repo-ai. Built with Docusaurus.`,
		},
		// `theme` is the LIGHT-mode Prism theme and `darkTheme` the dark one. Both
		// were vsDark here, which is why the shared stylesheet had to pin fenced
		// blocks dark in light mode too (#324). Keep this pairing and the CSS in
		// step — vsDark tokens on a light surface are unreadable.
		prism: {
			theme: prismThemes.vsLight,
			darkTheme: prismThemes.vsDark,
			additionalLanguages: ['bash', 'json', 'typescript'],
		},
	} satisfies Preset.ThemeConfig,
}

export default config
