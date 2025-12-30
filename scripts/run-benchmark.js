import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
const CONFIG_PATH = path.join(ROOT_DIR, 'config', 'versions.json');
const RESULTS_DIR = path.join(ROOT_DIR, 'results');
const DOCKER_DIR = path.join(ROOT_DIR, 'docker');

function checkDocker() {
  try {
    // Check if docker executable exists
    execSync('docker --version', { stdio: 'ignore' });
    
    // Check if docker daemon is running
    try {
      execSync('docker info', { stdio: 'ignore' });
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: 'daemon_not_running' };
    }
  } catch (e) {
    return { ok: false, reason: 'not_installed' };
  }
}

async function main() {
  console.log('🚀 Starting OpenSSL Performance Benchmark');

  const dockerStatus = checkDocker();
  if (!dockerStatus.ok) {
    if (dockerStatus.reason === 'not_installed') {
      console.error('\n❌ Error: Docker is not found in your PATH.');
      console.error('   Please ensure Docker is installed.');
    } else if (dockerStatus.reason === 'daemon_not_running') {
      console.error('\n❌ Error: Docker daemon is not running.');
      console.error('   Please open the Docker Desktop application and wait for it to start.');
    }
    process.exit(1);
  }
  
  // Ensure results directory exists
  await fs.mkdir(RESULTS_DIR, { recursive: true });

  // Load config
  const configRaw = await fs.readFile(CONFIG_PATH, 'utf8');
  const config = JSON.parse(configRaw);
  
  const results = [];

  for (const entry of config.versions) {
    const { version, url, series } = entry;
    console.log(`\n----------------------------------------`);
    console.log(`🔧 Testing OpenSSL ${version}`);
    console.log(`----------------------------------------`);

    const imageName = `openssl-bench:${version}`;
    
    try {
      // 1. Build Docker Image
      console.log(`📦 Building image ${imageName}...`);
      // Use Dockerfile from docker/ directory, passing args
      execSync(`docker build -t ${imageName} --build-arg OPENSSL_VERSION=${version} --build-arg OPENSSL_URL=${url} -f ${path.join(DOCKER_DIR, 'Dockerfile')} ${ROOT_DIR}`, {
        stdio: 'inherit'
      });

      // 2. Run Benchmark
      console.log(`🏃 Running benchmark...`);
      const output = execSync(`docker run --rm ${imageName}`, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'inherit'] // Capture stdout, pass stderr to console
      });

      // 3. Parse and Store Result
      try {
        const jsonResult = JSON.parse(output);
        // Add metadata
        jsonResult.config = entry;
        jsonResult.timestamp = new Date().toISOString();
        
        results.push(jsonResult);
        console.log(`✅ Success.`);
        
        // Save individual result
        await fs.writeFile(
          path.join(RESULTS_DIR, `result-${version}.json`), 
          JSON.stringify(jsonResult, null, 2)
        );

      } catch (parseError) {
        console.error(`❌ Failed to parse JSON output for ${version}:`);
        console.error('Raw Output Start:');
        console.error(output.substring(0, 500) + '...');
        console.error('Raw Output End:');
        console.error(output.slice(-500));
        console.error('\n🛑 Aborting benchmark suite due to failure.');
        process.exit(1);
      }

    } catch (error) {
      console.error(`❌ Failed to benchmark ${version}:`, error.message);
      console.error('\n🛑 Aborting benchmark suite due to failure.');
      process.exit(1);
    }
  }

  // Save summary
  const summaryPath = path.join(RESULTS_DIR, 'summary.json');
  
  if (results.length === 0) {
    console.error('\n❌ No benchmark results were successfully generated.');
    console.error('   Check the errors above. Ensure Docker is running and has internet access.');
    // We do not overwrite summary.json with empty array to preserve old results if any? 
    // Or maybe we should to reflect current state? 
    // Let's write it but warn loudly.
    await fs.writeFile(summaryPath, JSON.stringify(results, null, 2));
    process.exit(1);
  }

  await fs.writeFile(summaryPath, JSON.stringify(results, null, 2));
  console.log(`\n📊 Benchmark complete. Summary saved to ${summaryPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
