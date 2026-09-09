import path from 'node:path';
import { existsSync, statSync } from 'node:fs';

// Transform only links to repository files outside the documentation tree.
// Markdown links, images and their anchors inside docs remain Docusaurus-managed.
export default function sourceLinks({ source, docs, repository, sourceRef }) {
  return (tree, file) => {
    // Definitions can follow their references. Markdown uses the first definition for an identifier.
    const definitions = new Map();
    function collect(node) {
      if (node.type === 'definition' && !definitions.has(node.identifier)) definitions.set(node.identifier, node);
      node.children?.forEach(collect);
    }
    collect(tree);
    function visit(node) {
      // Expand references independently so images reach Docusaurus's asset transform
      // while links sharing their definition can point to GitHub.
      if (['linkReference', 'imageReference'].includes(node.type) && definitions.has(node.identifier)) {
        const definition = definitions.get(node.identifier);
        node.type = node.type === 'imageReference' ? 'image' : 'link';
        node.url = definition.url;
        node.title = definition.title;
        delete node.identifier;
        delete node.label;
        delete node.referenceType;
      }
      // Leave absolute URLs, site-root paths and same-page anchors to their existing handlers.
      if (node.type === 'link' && node.url && !/^(?:[a-z][a-z\d+.-]*:|\/|#)/i.test(node.url)) {
        // Check the decoded filesystem path while retaining URL queries and fragments verbatim.
        const suffixAt = node.url.search(/[?#]/);
        const pathname = suffixAt === -1 ? node.url : node.url.slice(0, suffixAt);
        const suffix = suffixAt === -1 ? '' : node.url.slice(suffixAt);
        const target = path.resolve(path.dirname(file.path), decodeURIComponent(pathname));
        const fromDocs = path.relative(docs, target);
        const fromSource = path.relative(source, target);
        // Docs-to-docs links need Docusaurus routes; only repository source links go to GitHub.
        if (fromDocs === '..' || fromDocs.startsWith(`..${path.sep}`)) {
          if (fromSource === '..' || fromSource.startsWith(`..${path.sep}`) || !existsSync(target)) {
            throw new Error(`Unresolved repository link in ${file.path}: ${node.url}`);
          }
          const type = statSync(target).isDirectory() ? 'tree' : 'blob';
          node.url = `https://github.com/${repository}/${type}/${sourceRef}/${fromSource.split(path.sep).map(encodeURIComponent).join('/')}${suffix}`;
        }
      }
      node.children?.forEach(visit);
    }
    visit(tree);
  };
}
