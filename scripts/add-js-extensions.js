/**
 * Post-build script to:
 * 1. Compile all missing files that SWC skipped
 * 2. Add .js extensions to relative imports in compiled CommonJS code.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function findMissingFiles() {
  // Get all source TS files
  const sourceFiles = [];
  function walkSource(dir) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach((f) => {
      const p = path.join(dir, f);
      if (fs.statSync(p).isDirectory()) {
        walkSource(p);
      } else if (f.endsWith('.ts')) {
        sourceFiles.push(p);
      }
    });
  }
  walkSource('apps/api/src');

  // Get all compiled JS files
  const compiledFiles = [];
  function walkCompiled(dir) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach((f) => {
      const p = path.join(dir, f);
      if (fs.statSync(p).isDirectory()) {
        walkCompiled(p);
      } else if (f.endsWith('.js') && !f.endsWith('.map')) {
        compiledFiles.push(p);
      }
    });
  }
  walkCompiled('dist/api/src');

  // Find source files that weren't compiled
  const missing = [];
  for (const src of sourceFiles) {
    const outPath = src.replace('apps/api/src/', 'dist/api/src/').replace('.ts', '.js');
    if (!fs.existsSync(outPath)) {
      missing.push({ src, out: outPath });
    }
  }

  return missing;
}

function compileMissingFiles(missingFiles) {
  if (missingFiles.length === 0) return;

  console.log(`\n🔨 Compiling ${missingFiles.length} missing files skipped by SWC...`);

  for (const { src, out } of missingFiles) {
    const outDir = path.dirname(out);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    try {
      execSync(`npx swc "${src}" -o "${out}" --config-file .swcrc`, { stdio: 'ignore' });
      console.log(`  ✓ Compiled: ${src}`);
    } catch (err) {
      console.error(`  ✗ Failed: ${src}`);
    }
  }
}

function addJsExtensions() {
  console.log(`\n🔧 Adding .js extensions to relative imports...`);

  function walkDir(dir, callback) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach((f) => {
      const p = path.join(dir, f);
      if (fs.statSync(p).isDirectory()) {
        walkDir(p, callback);
      } else if (f.endsWith('.js')) {
        callback(p);
      }
    });
  }

  function processFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    let modified = false;

    const newContent = content.replace(
      /require\(['"]((\.\.?\/)(?:[^'"]+?))['"]\)/g,
      (match, importPath, relativePrefix) => {
        if (
          importPath.endsWith('.js') ||
          importPath.endsWith('.json') ||
          importPath.includes('node_modules')
        ) {
          return match;
        }

        if (!relativePrefix) {
          return match;
        }

        const fileDir = path.dirname(filePath);
        const resolvedPath = path.resolve(fileDir, importPath);

        const jsFilePath = resolvedPath + '.js';
        const indexFilePath = path.join(resolvedPath, 'index.js');

        const jsFileExists = fs.existsSync(jsFilePath);
        const indexFileExists = fs.existsSync(indexFilePath);

        if (jsFileExists && !indexFileExists) {
          modified = true;
          return match.replace(importPath, importPath + '.js');
        }

        return match;
      }
    );

    if (modified) {
      fs.writeFileSync(filePath, newContent, 'utf-8');
      console.log(`  ✓ Fixed: ${path.relative(process.cwd(), filePath)}`);
    }
  }

  walkDir('dist/api/src', processFile);
}

// Main
if (!fs.existsSync('dist')) {
  console.error('Error: dist/ not found. Run build first.');
  process.exit(1);
}

const missingFiles = findMissingFiles();
compileMissingFiles(missingFiles);
addJsExtensions();

console.log('\n✅ Done!\n');
