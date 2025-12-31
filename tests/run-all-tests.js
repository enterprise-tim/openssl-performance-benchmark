#!/usr/bin/env node

/**
 * Test Runner
 * Runs all test files and provides a summary
 */

import { run } from 'node:test';
import { spec as specReporter } from 'node:test/reporters';
import { glob } from 'node:fs';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const globAsync = promisify(glob);

async function runTests() {
  console.log('🧪 OpenSSL Benchmark Test Suite\n');
  console.log('═══════════════════════════════════════════════════════');
  
  try {
    // Find all test files
    const testFiles = await globAsync(path.join(__dirname, '*.test.js'));
    
    if (testFiles.length === 0) {
      console.error('❌ No test files found!');
      process.exit(1);
    }
    
    console.log(`📝 Found ${testFiles.length} test files:\n`);
    testFiles.forEach(file => {
      console.log(`   • ${path.basename(file)}`);
    });
    console.log();
    
    // Run tests
    const testStream = run({
      files: testFiles,
      concurrency: true,
      timeout: 30000 // 30 second timeout per test
    });
    
    // Use spec reporter for nice output
    testStream.compose(specReporter).pipe(process.stdout);
    
    // Wait for completion
    let passed = true;
    for await (const event of testStream) {
      if (event.type === 'test:fail') {
        passed = false;
      }
    }
    
    console.log('\n═══════════════════════════════════════════════════════');
    
    if (passed) {
      console.log('✅ All tests passed!\n');
      process.exit(0);
    } else {
      console.log('❌ Some tests failed\n');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Test runner failed:', error.message);
    process.exit(1);
  }
}

runTests();

