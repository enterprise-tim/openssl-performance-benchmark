import { describe, it, expect } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '..');

describe('Workflow Bash Scripts', () => {
  const workflowFiles = [
    'benchmark.yml',
    'test.yml',
    'regenerate-reports.yml'
  ];

  workflowFiles.forEach(filename => {
    describe(`${filename}`, () => {
      let content;

      it('should exist and be readable', async () => {
        const workflowPath = path.join(PROJECT_ROOT, '.github/workflows', filename);
        content = await fs.readFile(workflowPath, 'utf8');
        expect(content).toBeTruthy();
        expect(content.length > 0).toBeTruthy();
      });

      it('should not have bash conditionals without spaces', async () => {
        const workflowPath = path.join(PROJECT_ROOT, '.github/workflows', filename);
        content = await fs.readFile(workflowPath, 'utf8');
        
        // Extract only bash blocks (run: |)
        const lines = content.split('\n');
        const errors = [];
        let inBashBlock = false;
        
        lines.forEach((line, idx) => {
          // Track bash blocks
          if (line.match(/^\s+run:\s*\|/)) {
            inBashBlock = true;
            return;
          }
          if (line.match(/^\s+- name:/) || line.match(/^\s+uses:/)) {
            inBashBlock = false;
            return;
          }
          
          // Only check bash code
          if (inBashBlock) {
            // Check for if [X (missing space after [ in bash conditionals)
            if (line.match(/if \[\S/) && !line.match(/if \[\[/)) {
              errors.push(`Line ${idx + 1}: Missing space after '[' in bash conditional: ${line.trim()}`);
            }
            // Check for if [! (missing space after [)
            if (line.match(/if \[!/)) {
              errors.push(`Line ${idx + 1}: Missing space in '[!' conditional: ${line.trim()}`);
            }
          }
        });
        
        if (errors.length > 0) {
          console.error('Bash conditional errors in run blocks:', errors);
        }
        expect(errors.length).toBe(0);
      });

      it('should have balanced if/fi statements in bash blocks', async () => {
        const workflowPath = path.join(PROJECT_ROOT, '.github/workflows', filename);
        content = await fs.readFile(workflowPath, 'utf8');
        
        // Extract bash blocks (run: | sections)
        const bashBlocks = [];
        const lines = content.split('\n');
        let inBashBlock = false;
        let currentBlock = [];
        let blockStart = 0;
        
        lines.forEach((line, idx) => {
          if (line.match(/^\s+run:\s*\|/)) {
            inBashBlock = true;
            blockStart = idx + 1;
            currentBlock = [];
          } else if (inBashBlock && (line.match(/^\s+- name:/) || line.match(/^\s+uses:/))) {
            // End of bash block
            if (currentBlock.length > 0) {
              bashBlocks.push({ lines: currentBlock, start: blockStart });
            }
            inBashBlock = false;
            currentBlock = [];
          } else if (inBashBlock) {
            currentBlock.push({ text: line, lineNum: idx + 1 });
          }
        });
        
        // Check last block
        if (currentBlock.length > 0) {
          bashBlocks.push({ lines: currentBlock, start: blockStart });
        }
        
        // Validate each bash block
        bashBlocks.forEach((block, blockIdx) => {
          let ifCount = 0;
          let fiCount = 0;
          
          block.lines.forEach(lineObj => {
            const line = lineObj.text.trim();
            // Count bash if statements - both formats:
            // if [ ... ]; then
            // if command; then
            if (line.match(/^if \[/) || line.match(/^if \w+.*; then/)) {
              ifCount++;
            }
            // Count fi statements (must be standalone or at end of line)
            if (line.match(/^fi$/) || line.match(/;\s*fi$/)) {
              fiCount++;
            }
          });
          
          // Only check blocks that have if statements
          if (ifCount > 0 || fiCount > 0) {
            expect(ifCount).toBe(fiCount);
          }
        });
      });

      it('should not reference renamed files', async () => {
        const workflowPath = path.join(PROJECT_ROOT, '.github/workflows', filename);
        content = await fs.readFile(workflowPath, 'utf8');
        
        // Check for mv command followed by reference to old name
        const lines = content.split('\n');
        const movedFiles = [];
        
        lines.forEach((line, idx) => {
          const mvMatch = line.match(/mv\s+(\S+)\s+(\S+)/);
          if (mvMatch) {
            movedFiles.push({
              from: mvMatch[1],
              to: mvMatch[2],
              line: idx + 1
            });
          }
        });
        
        // Check if moved files are still referenced later
        movedFiles.forEach(move => {
          const afterMove = lines.slice(move.line).join('\n');
          if (afterMove.includes(move.from)) {
            console.error(`File ${move.from} is referenced after being renamed to ${move.to}`);
            expect(false).toBe(true); // Fail the test
          }
        });
        
        expect(true).toBe(true); // Pass if no issues
      });
    });
  });
});

describe('Workflow Bash Scripts - Specific Checks', () => {
  it('should have proper bash syntax in all if statements', async () => {
    const workflowPath = path.join(PROJECT_ROOT, '.github/workflows/benchmark.yml');
    const content = await fs.readFile(workflowPath, 'utf8');
    
    // Look for bash if statements in run blocks (not YAML if:)
    const lines = content.split('\n');
    let inBashBlock = false;
    const bashErrors = [];
    
    lines.forEach((line, idx) => {
      if (line.match(/^\s+run:\s*\|/)) {
        inBashBlock = true;
      } else if (line.match(/^\s+- name:/) || line.match(/^\s+uses:/)) {
        inBashBlock = false;
      }
      
      if (inBashBlock && line.includes('if [')) {
        // Check for missing spaces
        if (line.match(/if \[\w/) || line.match(/if \[!/) || line.match(/if \[-/)) {
          // Check it's not [[ or properly spaced
          if (!line.match(/if \[ /) && !line.match(/if \[\[/)) {
            bashErrors.push(`Line ${idx + 1}: ${line.trim()}`);
          }
        }
      }
    });
    
    if (bashErrors.length > 0) {
      console.error('Found bash conditional errors:', bashErrors);
    }
    expect(bashErrors.length).toBe(0);
  });
  
  it('should not reference files after renaming them', async () => {
    const workflowPath = path.join(PROJECT_ROOT, '.github/workflows/benchmark.yml');
    const content = await fs.readFile(workflowPath, 'utf8');
    
    // This test would have caught the visualizations.html rename bug
    // Check we don't have: mv X Y ... then reference X later
    const hasMvAndReference = content.includes('mv visualizations.html') && 
                               content.indexOf('mv visualizations.html') < 
                               content.lastIndexOf('src="visualizations.html"');
    
    expect(hasMvAndReference).toBe(false);
  });
});

console.log('✅ All workflow bash validation tests defined');

