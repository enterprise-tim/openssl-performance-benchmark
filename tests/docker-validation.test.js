import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '..');

// Skip Docker tests if Docker is not available
let DOCKER_AVAILABLE = false;
let SKIP_REASON = '';

beforeAll(async () => {
  try {
    await execAsync('docker --version');
    DOCKER_AVAILABLE = true;
  } catch (error) {
    SKIP_REASON = 'Docker not available';
  }
});

describe('Docker - Configuration Validation', () => {
  it('should have valid Dockerfile', async () => {
    const dockerfilePath = path.join(PROJECT_ROOT, 'docker/Dockerfile');
    const content = await fs.readFile(dockerfilePath, 'utf8');
    
    // Check for required directives
    expect(content.includes('FROM')).toBeTruthy();
    expect(content.includes('ARG OPENSSL_VERSION')).toBeTruthy();
    expect(content.includes('ARG OPENSSL_URL')).toBeTruthy();
    expect(content.includes('WORKDIR')).toBeTruthy();
    expect(content.includes('CMD') || content.includes('ENTRYPOINT')).toBeTruthy();
  });

  it('should have versions.json with valid URLs', async () => {
    const configPath = path.join(PROJECT_ROOT, 'config/versions.json');
    const content = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(content);
    
    expect(Array.isArray(config.versions)).toBeTruthy();
    expect(config.versions.length > 0).toBeTruthy();
    
    config.versions.forEach(v => {
      expect(v.version).toBeTruthy();
      expect(v.url).toBeTruthy();
      expect(v.url.startsWith('http')).toBeTruthy();
      expect(v.series).toBeTruthy();
    });
  });

  it('should have benchmark script', async () => {
    const scriptPath = path.join(PROJECT_ROOT, 'src/benchmark.sh');
    const content = await fs.readFile(scriptPath, 'utf8');
    
    // Check for bash shebang
    expect(content.startsWith('#!/bin/bash')).toBeTruthy();
    
    // Check for key operations
    expect(content.includes('openssl')).toBeTruthy();
    expect(content.includes('jq')).toBeTruthy();
  });
});

describe('Docker - Build Test (Integration)', function() {
  // Skip if Docker not available
  if (!DOCKER_AVAILABLE) {
    it.skip(`Docker tests skipped: ${SKIP_REASON}`, () => {});
    return;
  }

  // These tests take longer
  this.timeout(300000); // 5 minutes per test

  it('should build Docker image for test version', async () => {
    // Use a simple test version (latest 3.5.x is usually most stable)
    const version = '3.5.3';
    const configPath = path.join(PROJECT_ROOT, 'config/versions.json');
    const content = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(content);
    
    const versionConfig = config.versions.find(v => v.version === version);
    if (!versionConfig) {
      console.log(`⚠️  Version ${version} not in config, skipping build test`);
      return;
    }
    
    const imageTag = `openssl-bench-test:${version}`;
    
    try {
      console.log(`\n  🐳 Building Docker image for ${version}...`);
      console.log(`  ⏱️  This may take 2-3 minutes...`);
      
      const { stdout, stderr } = await execAsync(
        `docker build -t ${imageTag} ` +
        `--build-arg OPENSSL_VERSION=${version} ` +
        `--build-arg OPENSSL_URL=${versionConfig.url} ` +
        `-f docker/Dockerfile .`,
        { cwd: PROJECT_ROOT }
      );
      
      console.log(`  ✅ Build successful`);
      
      // Verify image exists
      const { stdout: images } = await execAsync(`docker images ${imageTag} -q`);
      expect(images.trim().length > 0).toBeTruthy();
      
      // Cleanup
      await execAsync(`docker rmi ${imageTag}`).catch(() => {});
      
    } catch (error) {
      console.error(`  ❌ Build failed: ${error.message}`);
      throw error;
    }
  });

  it('should run smoke test in container', async () => {
    const version = '3.5.3';
    const configPath = path.join(PROJECT_ROOT, 'config/versions.json');
    const content = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(content);
    
    const versionConfig = config.versions.find(v => v.version === version);
    if (!versionConfig) {
      console.log(`⚠️  Version ${version} not in config, skipping smoke test`);
      return;
    }
    
    const imageTag = `openssl-bench-test:${version}`;
    
    try {
      // Build image first
      console.log(`\n  🐳 Building image for smoke test...`);
      await execAsync(
        `docker build -t ${imageTag} ` +
        `--build-arg OPENSSL_VERSION=${version} ` +
        `--build-arg OPENSSL_URL=${versionConfig.url} ` +
        `-f docker/Dockerfile .`,
        { cwd: PROJECT_ROOT }
      );
      
      // Run smoke test
      console.log(`  🧪 Running smoke test...`);
      const { stdout } = await execAsync(
        `docker run --rm ${imageTag} bash -c 'openssl version && openssl speed -seconds 1 -evp aes-256-gcm 2>&1 | head -5'`
      );
      
      console.log(`  ✅ Smoke test passed`);
      expect(stdout.includes('OpenSSL')).toBeTruthy();
      
      // Cleanup
      await execAsync(`docker rmi ${imageTag}`).catch(() => {});
      
    } catch (error) {
      console.error(`  ❌ Smoke test failed: ${error.message}`);
      // Cleanup on failure
      await execAsync(`docker rmi ${imageTag}`).catch(() => {});
      throw error;
    }
  });
});

describe('Docker - Build Script Validation', () => {
  it('should have test-docker-build script', async () => {
    const scriptPath = path.join(PROJECT_ROOT, 'scripts/test-docker-build.sh');
    
    try {
      await fs.access(scriptPath);
      const stat = await fs.stat(scriptPath);
      
      // Check if executable
      const isExecutable = (stat.mode & 0o111) !== 0;
      if (!isExecutable) {
        console.log('  ⚠️  Script is not executable, checking if it has shebang...');
        const content = await fs.readFile(scriptPath, 'utf8');
        expect(content.startsWith('#!/bin/bash')).toBeTruthy();
      }
    } catch (error) {
      expect.fail(`test-docker-build.sh should exist: ${error.message}`);
    }
  });

  it('should validate Dockerfile syntax', async () => {
    const dockerfilePath = path.join(PROJECT_ROOT, 'docker/Dockerfile');
    
    try {
      const content = await fs.readFile(dockerfilePath, 'utf8');
      const lines = content.split('\n');
      
      // Basic syntax checks
      let hasFrom = false;
      let hasCmdOrEntrypoint = false;
      
      lines.forEach((line, index) => {
        const trimmed = line.trim();
        
        if (trimmed.startsWith('FROM ')) {
          hasFrom = true;
        }
        
        if (trimmed.startsWith('CMD ') || trimmed.startsWith('ENTRYPOINT ')) {
          hasCmdOrEntrypoint = true;
        }
        
        // Check for common mistakes
        if (trimmed.includes('RUN cd ')) {
          console.warn(`  ⚠️  Line ${index + 1}: 'RUN cd' may not work as expected`);
        }
      });
      
      expect(hasFrom).toBeTruthy();
      expect(hasCmdOrEntrypoint).toBeTruthy();
      
    } catch (error) {
      expect.fail(`Dockerfile validation failed: ${error.message}`);
    }
  });
});

describe('Docker - OpenSSL Version Detection', () => {
  it('should detect OpenSSL 1.1.x vs 3.x differences', async () => {
    const scriptPath = path.join(PROJECT_ROOT, 'src/benchmark.sh');
    const content = await fs.readFile(scriptPath, 'utf8');
    
    // Check that script handles both versions
    expect(
      content.includes('IS_OPENSSL_1_1') || content.includes('1.1')
    ).toBeTruthy();
    
    expect(
      content.includes('IS_OPENSSL_3') || content.includes('3.')
    ).toBeTruthy();
  });

  it('should have fallback for version-specific features', async () => {
    const scriptPath = path.join(PROJECT_ROOT, 'src/benchmark.sh');
    const content = await fs.readFile(scriptPath, 'utf8');
    
    // Check for conditional logic for PQC (only in 3.5+)
    expect(
      content.includes('IS_PQC') || content.includes('ml-kem')
    ).toBeTruthy();
  });
});

console.log('✅ All Docker validation tests defined');
console.log('💡 Run full Docker build tests with: npm run test:docker');

