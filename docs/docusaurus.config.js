const {themes: prismThemes} = require('prism-react-renderer');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'pull-request-score',
  tagline: 'Score, analyze, and track your team\'s pull requests',
  favicon: 'img/logo.svg',
  future: {
    v4: true,
  },
  url: 'https://greenpioneersolutions.github.io',
  baseUrl: '/pull-request-score/',
  organizationName: 'greenpioneersolutions',
  projectName: 'pull-request-score',
  deploymentBranch: 'gh-pages',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },
  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/greenpioneersolutions/pull-request-score/edit/main/docs/',
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          editUrl: 'https://github.com/greenpioneersolutions/pull-request-score/edit/main/docs/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],
  themeConfig: {
    image: 'img/logo.svg',
    navbar: {
      title: 'pull-request-score',
      logo: {
        alt: 'pull-request-score',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Docs',
        },
        { to: '/blog', label: 'Blog', position: 'left' },
        {
          href: 'https://github.com/greenpioneersolutions/pull-request-score',
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
          items: [
            {
              label: 'Getting Started',
              to: '/docs/intro',
            },
            {
              label: 'Metric Reference',
              to: '/docs/metric-reference',
            },
          ],
        },
        {
          title: 'More',
          items: [
            { label: 'Blog', to: '/blog' },
            { label: 'GitHub', href: 'https://github.com/greenpioneersolutions/pull-request-score' },
            { label: 'npm', href: 'https://www.npmjs.com/package/pull-request-score' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Green Pioneer Solutions. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  },
};

module.exports = config;
