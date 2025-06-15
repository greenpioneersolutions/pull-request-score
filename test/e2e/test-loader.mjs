import fs from 'fs';
export async function load(url, context, defaultLoad) {
  if (url.endsWith('/collectors/pullRequests.js')) {
    const data = fs.readFileSync(new URL('./fixtures/prs.json', import.meta.url), 'utf8');
    const source = `export async function collectPullRequests() { return ${data}; }
export class PartialResultsError extends Error { constructor(m, p) { super(m); this.partial = p; } }`;
    return { format: 'module', source, shortCircuit: true };
  }
  if (url.endsWith('/plugins/registry.js')) {
    const source = `export function register(){}; export function getAll(){ return []; }`;
    return { format: 'module', source, shortCircuit: true };
  }
  return defaultLoad(url, context, defaultLoad);
}
