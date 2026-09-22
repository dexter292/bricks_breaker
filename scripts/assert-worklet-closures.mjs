/**
 * CI guard (NF-1 class): worklet bodies must not call imported functions that
 * lack a 'worklet' directive. Uses the project Babel config to verify exports
 * are transformed with worklet init data.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { globSync } from 'glob';
import { transformSync } from '@babel/core';
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';

const traverse = traverseModule.default;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BABEL = join(ROOT, 'babel.config.js');
const FILES = new Set(
  globSync('{src,app}/**/*.{ts,tsx}', { cwd: ROOT, ignore: ['**/*.d.ts'] }),
);

function resolveTs(fromRel, spec) {
  if (!spec.startsWith('.')) return null;
  const base = normalize(join(dirname(fromRel), spec));
  for (const ext of ['', '.ts', '.tsx', '/index.ts', '/index.tsx']) {
    const candidate = base + ext;
    if (FILES.has(candidate)) return candidate;
  }
  return null;
}

function exportIsWorklet(rel, exportName) {
  const abs = join(ROOT, rel);
  const out = transformSync(readFileSync(abs, 'utf8'), {
    filename: abs,
    configFile: BABEL,
  }).code;
  const marker = `exports.${exportName}=`;
  const idx = out.indexOf(marker);
  if (idx < 0) return false;
  return out.slice(idx, idx + 600).includes('_init_data');
}

function resolveExport(fromRel, spec, exportName, seen = new Set()) {
  const rel = resolveTs(fromRel, spec);
  if (!rel) return null;
  const key = `${rel}::${exportName}`;
  if (seen.has(key)) return null;
  seen.add(key);

  const ast = parse(readFileSync(join(ROOT, rel), 'utf8'), {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
  });

  let found = null;
  traverse(ast, {
    ExportNamedDeclaration(path) {
      if (found) return;
      const decl = path.node.declaration;
      if (decl?.type === 'FunctionDeclaration' && decl.id?.name === exportName) {
        found = { rel, exportName };
        return;
      }
      for (const specNode of path.node.specifiers ?? []) {
        const out =
          specNode.exported.type === 'Identifier'
            ? specNode.exported.name
            : specNode.exported.value;
        if (out !== exportName) continue;
        const src = path.node.source?.value;
        if (src) {
          const local =
            specNode.local.type === 'Identifier'
              ? specNode.local.name
              : specNode.local.value;
          found = resolveExport(rel, src, local, seen);
        }
      }
    },
  });
  return found;
}

function fnIsWorklet(node) {
  const first = node.body?.body?.[0];
  return (
    first?.type === 'ExpressionStatement' &&
    first.expression?.type === 'StringLiteral' &&
    first.expression.value === 'worklet'
  );
}

const violations = [];
for (const rel of FILES) {
  const ast = parse(readFileSync(join(ROOT, rel), 'utf8'), {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
  });
  const imports = new Map();
  traverse(ast, {
    ImportDeclaration(path) {
      if (path.node.importKind === 'type') return;
      const from = path.node.source.value;
      for (const spec of path.node.specifiers) {
        if (spec.type !== 'ImportSpecifier') continue;
        const imported =
          spec.imported.type === 'Identifier'
            ? spec.imported.name
            : spec.imported.value;
        imports.set(spec.local.name, { imported, from });
      }
    },
    Function(path) {
      if (!fnIsWorklet(path.node)) return;
      path.traverse({
        CallExpression(callPath) {
          const callee = callPath.node.callee;
          if (callee.type !== 'Identifier') return;
          const imp = imports.get(callee.name);
          if (!imp) return;
          const resolved = resolveExport(rel, imp.from, imp.imported);
          if (!resolved) return;
          if (!exportIsWorklet(resolved.rel, resolved.exportName)) {
            violations.push(
              `${rel}: worklet calls ${imp.imported} from ${imp.from} (not a worklet)`,
            );
          }
        },
      });
    },
  });
}

if (violations.length) {
  console.error('Worklet closure violations:\n' + violations.join('\n'));
  process.exit(1);
}
console.log(`Worklet closure guard OK (${FILES.size} files)`);
