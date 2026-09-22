/**
 * CI guard (NF-1 / NJ-1): worklet bodies must not call imported (or same-file)
 * functions that lack a 'worklet' directive.
 *
 * Self-check: scripts/fixtures/worklet-guard/{good,bad}.ts must pass/fail.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { globSync } from 'glob';
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';

const traverse = traverseModule.default;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const PARSER_OPTS = {
  sourceType: 'module',
  plugins: ['typescript', 'jsx'],
};

function listProjectFiles() {
  return new Set(
    globSync('{src,app}/**/*.{ts,tsx}', {
      cwd: ROOT,
      ignore: ['**/*.d.ts'],
    }),
  );
}

function resolveTs(fromRel, spec, fileSet) {
  if (!spec.startsWith('.')) return null;
  const base = normalize(join(dirname(fromRel), spec)).replace(/\\/g, '/');
  for (const ext of ['', '.ts', '.tsx', '/index.ts', '/index.tsx']) {
    const candidate = base + ext;
    if (fileSet.has(candidate)) return candidate;
  }
  return null;
}

/** Babel puts leading string directives on FunctionBody.directives, not body[0]. */
function fnIsWorklet(node) {
  if (!node?.body || node.body.type !== 'BlockStatement') return false;
  const dirs = node.body.directives ?? [];
  for (const d of dirs) {
    if (d.value?.value === 'worklet') return true;
  }
  // Fallback: some transforms leave ExpressionStatement 'worklet'
  const first = node.body.body?.[0];
  return (
    first?.type === 'ExpressionStatement' &&
    first.expression?.type === 'StringLiteral' &&
    first.expression.value === 'worklet'
  );
}

function parseFile(abs) {
  return parse(readFileSync(abs, 'utf8'), PARSER_OPTS);
}

/**
 * Find a named export (function / const arrow / re-export) and whether it is a worklet.
 * Returns { rel, isWorklet } | null if unresolved.
 */
function resolveExportWorklet(fromRel, spec, exportName, fileSet, seen = new Set()) {
  const rel = resolveTs(fromRel, spec, fileSet);
  if (!rel) return null;
  const key = `${rel}::${exportName}`;
  if (seen.has(key)) return null;
  seen.add(key);

  const ast = parseFile(join(ROOT, rel));
  let result = null;

  traverse(ast, {
    ExportNamedDeclaration(path) {
      if (result) return;
      const decl = path.node.declaration;
      if (decl?.type === 'FunctionDeclaration' && decl.id?.name === exportName) {
        result = { rel, isWorklet: fnIsWorklet(decl) };
        return;
      }
      if (decl?.type === 'VariableDeclaration') {
        for (const d of decl.declarations) {
          if (d.id?.type === 'Identifier' && d.id.name === exportName) {
            const init = d.init;
            if (
              init &&
              (init.type === 'ArrowFunctionExpression' ||
                init.type === 'FunctionExpression')
            ) {
              result = { rel, isWorklet: fnIsWorklet(init) };
            } else {
              result = { rel, isWorklet: false };
            }
            return;
          }
        }
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
          result = resolveExportWorklet(rel, src, local, fileSet, seen);
        } else {
          // export { localName as exportName } — find local binding in this file
          const local =
            specNode.local.type === 'Identifier'
              ? specNode.local.name
              : specNode.local.value;
          result = findLocalFnWorklet(rel, local, fileSet, seen);
        }
      }
    },
    ExportDefaultDeclaration(path) {
      if (result || exportName !== 'default') return;
      const decl = path.node.declaration;
      if (decl.type === 'FunctionDeclaration' || decl.type === 'FunctionExpression' || decl.type === 'ArrowFunctionExpression') {
        result = { rel, isWorklet: fnIsWorklet(decl) };
      }
    },
  });
  return result;
}

function findLocalFnWorklet(rel, name, fileSet, seen) {
  const ast = parseFile(join(ROOT, rel));
  let result = null;
  traverse(ast, {
    FunctionDeclaration(path) {
      if (result) return;
      if (path.node.id?.name === name) {
        result = { rel, isWorklet: fnIsWorklet(path.node) };
      }
    },
    VariableDeclarator(path) {
      if (result) return;
      if (path.node.id?.type === 'Identifier' && path.node.id.name === name) {
        const init = path.node.init;
        if (
          init &&
          (init.type === 'ArrowFunctionExpression' ||
            init.type === 'FunctionExpression')
        ) {
          result = { rel, isWorklet: fnIsWorklet(init) };
        }
      }
    },
  });
  return result;
}

/**
 * Scan files for worklet→non-worklet call violations.
 * @returns {string[]} violation messages
 */
export function findWorkletClosureViolations(fileSet, root = ROOT) {
  const violations = [];

  for (const rel of fileSet) {
    const abs = join(root, rel);
    if (!existsSync(abs)) continue;
    const ast = parseFile(abs);

    /** localName → { kind: 'import'|'local', ... } */
    const bindings = new Map();

    traverse(ast, {
      ImportDeclaration(path) {
        if (path.node.importKind === 'type') return;
        const from = path.node.source.value;
        for (const spec of path.node.specifiers) {
          if (spec.type === 'ImportSpecifier') {
            if (spec.importKind === 'type') continue;
            const imported =
              spec.imported.type === 'Identifier'
                ? spec.imported.name
                : spec.imported.value;
            bindings.set(spec.local.name, {
              kind: 'import',
              imported,
              from,
            });
          } else if (spec.type === 'ImportDefaultSpecifier') {
            bindings.set(spec.local.name, {
              kind: 'import',
              imported: 'default',
              from,
            });
          } else if (spec.type === 'ImportNamespaceSpecifier') {
            bindings.set(spec.local.name, {
              kind: 'namespace',
              from,
            });
          }
        }
      },
      FunctionDeclaration(path) {
        if (path.node.id?.name) {
          bindings.set(path.node.id.name, {
            kind: 'local',
            name: path.node.id.name,
            isWorklet: fnIsWorklet(path.node),
          });
        }
      },
      VariableDeclarator(path) {
        if (path.node.id?.type !== 'Identifier') return;
        const init = path.node.init;
        if (
          init &&
          (init.type === 'ArrowFunctionExpression' ||
            init.type === 'FunctionExpression')
        ) {
          bindings.set(path.node.id.name, {
            kind: 'local',
            name: path.node.id.name,
            isWorklet: fnIsWorklet(init),
          });
        }
      },
    });

    traverse(ast, {
      Function(path) {
        if (!fnIsWorklet(path.node)) return;
        path.traverse({
          CallExpression(callPath) {
            // Skip nested function scopes that are not themselves traversed as worklets
            if (callPath.findParent(
              (p) =>
                p.isFunction() &&
                p.node !== path.node &&
                fnIsWorklet(p.node) === false &&
                p.node.body?.type === 'BlockStatement',
            )) {
              // Still check calls inside nested non-worklet? Skip — only direct worklet body.
            }
            const callee = callPath.node.callee;
            let localName = null;
            let memberExport = null;
            if (callee.type === 'Identifier') {
              localName = callee.name;
            } else if (
              callee.type === 'MemberExpression' &&
              !callee.computed &&
              callee.object.type === 'Identifier' &&
              callee.property.type === 'Identifier'
            ) {
              localName = callee.object.name;
              memberExport = callee.property.name;
            } else {
              return;
            }

            const b = bindings.get(localName);
            if (!b) return;

            if (b.kind === 'local') {
              if (!b.isWorklet) {
                violations.push(
                  `${rel}: worklet calls local ${b.name} (not a worklet)`,
                );
              }
              return;
            }

            if (b.kind === 'namespace') {
              if (!memberExport) return;
              const resolved = resolveExportWorklet(
                rel,
                b.from,
                memberExport,
                fileSet,
              );
              if (!resolved) {
                violations.push(
                  `${rel}: worklet calls ${localName}.${memberExport} from ${b.from} (unresolved — fail closed)`,
                );
                return;
              }
              if (!resolved.isWorklet) {
                violations.push(
                  `${rel}: worklet calls ${memberExport} from ${b.from} (not a worklet)`,
                );
              }
              return;
            }

            // named / default import
            const exportName = memberExport ?? b.imported;
            if (memberExport && b.kind === 'import' && b.imported !== 'default') {
              // foo.bar where foo is a named import of a value — unusual; skip
              return;
            }
            const resolved = resolveExportWorklet(
              rel,
              b.from,
              exportName,
              fileSet,
            );
            if (!resolved) {
              // Relative imports must resolve; package imports are out of scope
              if (b.from.startsWith('.')) {
                violations.push(
                  `${rel}: worklet calls ${exportName} from ${b.from} (unresolved — fail closed)`,
                );
              }
              return;
            }
            if (!resolved.isWorklet) {
              violations.push(
                `${rel}: worklet calls ${exportName} from ${b.from} (not a worklet)`,
              );
            }
          },
        });
      },
    });
  }

  return violations;
}

function runSelfCheck() {
  const goodRel = 'scripts/fixtures/worklet-guard/good.ts';
  const badRel = 'scripts/fixtures/worklet-guard/bad.ts';
  const goodAbs = join(ROOT, goodRel);
  const badAbs = join(ROOT, badRel);
  if (!existsSync(goodAbs) || !existsSync(badAbs)) {
    console.error(
      'Worklet guard self-check missing fixtures under scripts/fixtures/worklet-guard/',
    );
    process.exit(1);
  }

  // Fixture graph is self-contained under fixtures dir
  const fixtureFiles = new Set(
    globSync('scripts/fixtures/worklet-guard/**/*.{ts,tsx}', { cwd: ROOT }),
  );

  const goodViolations = findWorkletClosureViolations(fixtureFiles);
  const goodOnly = goodViolations.filter((v) => v.startsWith(goodRel));
  if (goodOnly.length > 0) {
    console.error(
      'Worklet guard self-check FAILED: known-good fixture reported violations:\n' +
        goodOnly.join('\n'),
    );
    process.exit(1);
  }

  const badViolations = findWorkletClosureViolations(fixtureFiles);
  const badOnly = badViolations.filter((v) => v.startsWith(badRel));
  if (badOnly.length === 0) {
    console.error(
      'Worklet guard self-check FAILED: known-bad fixture produced zero violations (guard is vacuous)',
    );
    process.exit(1);
  }
}

function main() {
  runSelfCheck();
  const files = listProjectFiles();
  const violations = findWorkletClosureViolations(files);
  if (violations.length) {
    console.error('Worklet closure violations:\n' + violations.join('\n'));
    process.exit(1);
  }
  console.log(`Worklet closure guard OK (${files.size} files)`);
}

const isMain =
  process.argv[1] &&
  normalize(fileURLToPath(import.meta.url)) === normalize(process.argv[1]);
if (isMain) {
  main();
}
