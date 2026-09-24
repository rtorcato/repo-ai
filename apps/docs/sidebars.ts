import type { SidebarsConfig } from '@docusaurus/plugin-content-docs'

const sidebars: SidebarsConfig = {
	docs: [
		{ type: 'category', label: 'Start here', collapsed: false, items: ['intro'] },
		{
			type: 'category',
			label: 'Guides',
			collapsed: false,
			items: ['ai-issue-loop', 'commands'],
		},
		{ type: 'category', label: 'Releases', items: ['changelog'] },
	],
}

export default sidebars
