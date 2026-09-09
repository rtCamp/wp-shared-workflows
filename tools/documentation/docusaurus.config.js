import path from 'node:path';
import sourceLinks from './source-links.mjs';
import { loadSettings } from './settings.mjs';

const { source, docs, repository, sourceRepository, sourceRef, title, url, baseUrl, tagline, branding } = loadSettings();
// GitHub edit paths start at the checkout root, including any monorepo project prefix.
const docsRelative = path.relative(source, docs).split(path.sep).map(encodeURIComponent).join('/');
export default {
  title,
  tagline: branding.tagline ?? tagline ?? 'Developer documentation',
  favicon: branding.favicon,
  // Copy consumer assets alongside shared static files, retaining the shared .nojekyll marker.
  staticDirectories: ['./static', ...(branding.staticDirectory ? [branding.staticDirectory] : [])],
  url,
  baseUrl,
  // Emit directory index pages so direct links work on GitHub Pages.
  trailingSlash: true,
  onBrokenLinks: 'throw',
  onBrokenAnchors: 'throw',
  markdown: { format: 'detect', hooks: { onBrokenMarkdownLinks: 'throw' } },
  presets: [['classic', {
    docs: {
      path: docs,
      routeBasePath: '/',
      sidebarPath: './sidebars.js',
      // editUrl: ({ docPath }) => `https://github.com/${sourceRepository}/edit/${sourceRef}/${docsRelative}/${docPath.split('/').map(encodeURIComponent).join('/')}`,
      // Expand references before Docusaurus resolves Markdown links and bundles local images.
      beforeDefaultRemarkPlugins: [[sourceLinks, { source, docs, repository: sourceRepository, sourceRef }]],
    },
    blog: false,
    pages: false,
    // Consumer CSS comes last so repositories can override the shared colour tokens.
    theme: { customCss: ['./style.css', ...(branding.customCss ? [branding.customCss] : [])] },
  }]],
  themeConfig: {
    // Merge presentation objects one level deep; supplied arrays replace the default arrays.
    navbar: { title, items: [{ type: 'docSidebar', sidebarId: 'docs', label: 'Documentation', position: 'left' }, { href: `https://github.com/${repository}`, label: 'GitHub', position: 'right' }], ...branding.navbar },
    colorMode: { respectPrefersColorScheme: true },
    prism: { additionalLanguages: ['php', 'bash', 'json'] },
    footer: { style: 'dark', copyright: `${title} · ${repository.split('/')[0]}`, ...branding.footer },
  },
};
