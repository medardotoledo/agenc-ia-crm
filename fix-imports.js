const fs = require('fs');
const path = require('path');

function walkDir(dir) {
  const files = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory() && item !== 'node_modules' && item !== '.next') {
      files.push(...walkDir(fullPath));
    } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx'))) {
      files.push(fullPath);
    }
  }

  return files;
}

function fixImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  const patterns = [
    // ../../../ paths
    [/from\s+['"]\.\.\/\.\.\/\.\.\/store['"]/g, "from '@/store/useApp'"],
    [/from\s+['"]\.\.\/\.\.\/\.\.\/types['"]/g, "from '@/types'"],
    [/from\s+['"]\.\.\/\.\.\/\.\.\/lib\/(\w+)['"]/g, "from '@/lib/$1'"],
    [/from\s+['"]\.\.\/\.\.\/\.\.\/data\/mock['"]/g, "from '@/lib/data/mock'"],

    // ../../ paths
    [/from\s+['"]\.\.\/\.\.\/store['"]/g, "from '@/store/useApp'"],
    [/from\s+['"]\.\.\/\.\.\/types['"]/g, "from '@/types'"],
    [/from\s+['"]\.\.\/\.\.\/lib\/(\w+)['"]/g, "from '@/lib/$1'"],
    [/from\s+['"]\.\.\/\.\.\/data\/mock['"]/g, "from '@/lib/data/mock'"],
    [/from\s+['"]\.\.\/\.\.\/components\/(\w+)['"]/g, "from '@/modules/crm/components/$1'"],
    [/from\s+['"]\.\.\/\.\.\/views\/(\w+)['"]/g, "from '@/modules/crm/views/$1'"],

    // ../ paths
    [/from\s+['"]\.\.\/store['"]/g, "from '@/store/useApp'"],
    [/from\s+['"]\.\.\/types['"]/g, "from '@/types'"],
    [/from\s+['"]\.\.\/lib\/(\w+)['"]/g, "from '@/lib/$1'"],
    [/from\s+['"]\.\.\/data\/mock['"]/g, "from '@/lib/data/mock'"],
    [/from\s+['"]\.\.\/components\/(\w+)['"]/g, "from '@/modules/crm/components/$1'"],
    [/from\s+['"]\.\.\/views\/(\w+)['"]/g, "from '@/modules/crm/views/$1'"],
  ];

  for (const [pattern, replacement] of patterns) {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ ${filePath}`);
    return 1;
  }

  return 0;
}

const files = walkDir(path.join(__dirname, 'src'));
let count = 0;

for (const file of files) {
  count += fixImports(file);
}

console.log(`\n✓ Fixed imports in ${count} files`);
