import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

type Violation = {
  file: string;
  line: number;
  kind: string;
  text: string;
};

const repoRoot = process.cwd();
const changedFiles = execFileSync('git', ['diff', '--name-only', '--diff-filter=ACMRT', 'HEAD', '--', 'web/src'], {
  encoding: 'utf8',
})
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .filter((file) => file.endsWith('.tsx') && !file.endsWith('web/src/i18n.tsx'));

const violations: Violation[] = [];

for (const file of changedFiles) {
  const diff = execFileSync('git', ['diff', '--unified=0', '--no-color', 'HEAD', '--', file], {
    encoding: 'utf8',
  });
  const addedLines = parseAddedLines(diff);
  if (addedLines.size === 0) continue;

  const sourceFile = ts.createSourceFile(
    file,
    readFileSync(path.join(repoRoot, file), 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  visit(sourceFile);

  function visit(node: ts.Node): void {
    if (isAddedLine(node, sourceFile, addedLines)) {
      inspect(node, sourceFile);
    }
    ts.forEachChild(node, visit);
  }
}

if (violations.length > 0) {
  for (const violation of violations) {
    console.error(`${violation.file}:${violation.line}: ${violation.kind}: ${violation.text}`);
  }
  process.exitCode = 1;
}

function parseAddedLines(diff: string): Set<number> {
  const addedLines = new Set<number>();
  let currentLine = 0;

  for (const line of diff.split('\n')) {
    const header = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (header) {
      currentLine = Number(header[1]);
      continue;
    }

    if (currentLine === 0) {
      continue;
    }

    if (line.startsWith('+') && !line.startsWith('+++')) {
      addedLines.add(currentLine);
      currentLine += 1;
      continue;
    }

    if (line.startsWith('-') && !line.startsWith('---')) {
      continue;
    }

    if (!line.startsWith('\\')) {
      currentLine += 1;
    }
  }

  return addedLines;
}

function isAddedLine(node: ts.Node, sourceFile: ts.SourceFile, addedLines: Set<number>): boolean {
  const startLine = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
  return addedLines.has(startLine);
}

function inspect(node: ts.Node, sourceFile: ts.SourceFile): void {
  if (ts.isJsxText(node)) {
    const text = node.getText(sourceFile).replace(/\s+/g, ' ').trim();
    if (text && /[A-Za-z]/.test(text)) {
      violations.push({
        file: node.getSourceFile().fileName,
        line: lineOf(node, sourceFile),
        kind: 'JSX text',
        text,
      });
    }
    return;
  }

  if (ts.isJsxAttribute(node)) {
    const attrName = node.name.getText(sourceFile);
    if (!isVisibleAttribute(attrName)) return;
    if (node.initializer && ts.isStringLiteralLike(node.initializer) && /[A-Za-z]/.test(node.initializer.text)) {
      violations.push({
        file: node.getSourceFile().fileName,
        line: lineOf(node, sourceFile),
        kind: `JSX attribute "${attrName}"`,
        text: node.initializer.text,
      });
    }
    return;
  }

  if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && /[A-Za-z]/.test(node.text)) {
    if (isVisibleMessageLiteral(node, sourceFile)) {
      violations.push({
        file: node.getSourceFile().fileName,
        line: lineOf(node, sourceFile),
        kind: 'UI string literal',
        text: node.text,
      });
    }
  }
}

function isVisibleAttribute(attrName: string): boolean {
  const normalized = attrName.toLowerCase();
  if (['title', 'placeholder', 'alt', 'label', 'message', 'body', 'text', 'subtitle', 'description', 'hint', 'note', 'tooltip'].includes(normalized)) {
    return true;
  }

  return (
    normalized === 'aria-label'
    || normalized.endsWith('label')
    || normalized.endsWith('title')
    || normalized.endsWith('message')
    || normalized.endsWith('body')
    || normalized.endsWith('description')
    || normalized.endsWith('placeholder')
    || normalized.endsWith('hint')
    || normalized.endsWith('note')
  );
}

function isVisibleMessageLiteral(node: ts.Node, sourceFile: ts.SourceFile): boolean {
  const parent = node.parent;
  if (parent && ts.isJsxExpression(parent)) {
    return true;
  }

  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (ts.isCallExpression(current)) {
      const callee = current.expression.getText(sourceFile);
      return /Message|Error|Confirm|Dialog|Save|Delete|Move/.test(callee) || /throw\s+new\s+Error/.test(callee);
    }
    if (ts.isNewExpression(current)) {
      const callee = current.expression.getText(sourceFile);
      return callee === 'Error';
    }
    if (ts.isJsxAttribute(current)) {
      return isVisibleAttribute(current.name.getText(sourceFile));
    }
    current = current.parent;
  }

  return false;
}

function lineOf(node: ts.Node, sourceFile: ts.SourceFile): number {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}
