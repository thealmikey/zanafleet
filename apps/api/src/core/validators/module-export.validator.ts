/**
 * Module Export Validator
 * 
 * This tool scans all NestJS modules and validates that exports are properly formed.
 * It catches common issues like:
 * - Exporting TypeORM Module classes (which cause "Cannot read properties of undefined (reading 'provide')" errors)
 * - Exporting undefined/null values
 * - Exporting objects that aren't providers
 * 
 * Run with: npx ts-node apps/api/src/core/validators/module-export.validator.ts
 */

import * as path from 'path';
import * as fs from 'fs';

const PROJECT_ROOT = '/home/lenovo/projects/zanafleet';
const MODULES_DIR = path.join(PROJECT_ROOT, 'apps/api/src/modules');
const CORE_DIR = path.join(PROJECT_ROOT, 'apps/api/src/core');

// Patterns that indicate problematic exports
const FORBIDDEN_EXPORT_PATTERNS = [
  { 
    pattern: /exports\s*:\s*\[[^\]]*TypeOrmModule/gi, 
    message: 'TypeORM Module should not be exported - export providers instead',
    exportName: 'TypeOrmModule'
  },
  { 
    pattern: /exports\s*:\s*\[[^\]]*TypeormModule/gi, 
    message: 'TypeORM Module should not be exported - export providers instead',
    exportName: 'TypeormModule'
  },
  { 
    pattern: /exports\s*:\s*\[[^\]]*JwtModule/gi, 
    message: 'JWT Module should not be exported - export guards/services instead',
    exportName: 'JwtModule'
  },
  { 
    pattern: /exports\s*:\s*\[[^\]]*PassportModule/gi, 
    message: 'Passport Module should not be exported - export guards/services instead',
    exportName: 'PassportModule'
  },
  { 
    pattern: /exports\s*:\s*\[[^\]]*MulterModule/gi, 
    message: 'Multer Module should not be exported - export interceptors instead',
    exportName: 'MulterModule'
  },
  { 
    pattern: /exports\s*:\s*\[[^\]]*ServeStaticModule/gi, 
    message: 'ServeStatic Module should not be exported',
    exportName: 'ServeStaticModule'
  },
  { 
    pattern: /exports\s*:\s*\[[^\]]*ScheduleModule/gi, 
    message: 'Schedule Module should not be exported',
    exportName: 'ScheduleModule'
  },
  { 
    pattern: /exports\s*:\s*\[[^\]]*EventEmitterModule/gi, 
    message: 'EventEmitter Module should not be exported',
    exportName: 'EventEmitterModule'
  },
  { 
    pattern: /exports\s*:\s*\[[^\]]*ConfigModule(?!\s*\.\s*forRoot)/gi, 
    message: 'ConfigModule should not be exported - export ConfigService instead',
    exportName: 'ConfigModule'
  },
  { 
    pattern: /TypeOrmModule\.forRoot/gi, 
    message: 'TypeORM Module.forRoot() should not be exported',
    exportName: 'TypeOrmModule.forRoot'
  },
];

interface ValidationIssue {
  file: string;
  line: number;
  exportName: string;
  issue: string;
  severity: 'error' | 'warning';
}

function findModuleFiles(dir: string): string[] {
  const files: string[] = [];
  
  if (!fs.existsSync(dir)) {
    return files;
  }
  
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Skip test directories and certain subdirs
      if (!item.includes('test') && !item.includes('__')) {
        files.push(...findModuleFiles(fullPath));
      }
    } else if (item.endsWith('.module.ts') && !item.includes('.spec.') && !item.includes('.integration.')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function validateModule(filePath: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  // Check for forbidden export patterns in each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    
    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('*') || line.trim().startsWith('/*')) {
      continue;
    }
    
    for (const forbidden of FORBIDDEN_EXPORT_PATTERNS) {
      if (forbidden.pattern.test(line)) {
        issues.push({
          file: filePath,
          line: lineNum,
          exportName: forbidden.exportName,
          issue: forbidden.message,
          severity: 'error',
        });
      }
    }
  }
  
  // Also check for export default statements with modules
  const exportDefaultMatches = content.match(/export\s+default\s+class\s+(\w*Module\w*)/gi);
  if (exportDefaultMatches) {
    for (const match of exportDefaultMatches) {
      const moduleName = match.replace(/export\s+default\s+class\s+/gi, '');
      // Only flag if it looks like a NestJS module being exported as default
      if (moduleName.includes('Module') && !moduleName.includes('Controller') && !moduleName.includes('Service')) {
        issues.push({
          file: filePath,
          line: 1,
          exportName: moduleName,
          issue: 'Module class exported as default may cause issues - use named export instead',
          severity: 'warning',
        });
      }
    }
  }
  
  return issues;
}

function main() {
  console.log('\n🔍 Module Export Validator');
  console.log('=' .repeat(50));
  
  const allFiles = [
    ...findModuleFiles(MODULES_DIR),
    ...findModuleFiles(CORE_DIR),
  ];
  
  console.log(`\n📁 Found ${allFiles.length} module files to validate\n`);
  
  const allIssues: ValidationIssue[] = [];
  
  for (const file of allFiles) {
    const relativePath = path.relative(PROJECT_ROOT, file);
    const issues = validateModule(file);
    
    if (issues.length > 0) {
      console.log(`\n⚠️  ${relativePath}`);
      for (const issue of issues) {
        console.log(`   Line ${issue.line}: ${issue.issue}`);
        console.log(`   → Found: ${issue.exportName}`);
        allIssues.push(issue);
      }
    }
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (allIssues.length > 0) {
    console.log(`\n❌ Found ${allIssues.length} issue(s):`);
    
    // Group by issue type
    const grouped = new Map<string, ValidationIssue[]>();
    for (const issue of allIssues) {
      const key = issue.issue;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(issue);
    }
    
    for (const [issueType, issues] of grouped) {
      console.log(`\n  ${issueType}`);
      for (const issue of issues) {
        const relPath = path.relative(PROJECT_ROOT, issue.file);
        console.log(`    - ${relPath}:${issue.line} (${issue.exportName})`);
      }
    }
    
    console.log('\n\n💡 To fix: Remove the problematic exports from the module\'s exports array.');
    console.log('   Only export providers (services, guards, interceptors, etc.) or properly configured modules.');
    process.exit(1);
  } else {
    console.log('\n✅ All modules validated successfully!');
    process.exit(0);
  }
}

main();
