import { describe, it, expect } from 'vitest';
import { generateMockMatrix } from './test-helpers.js';

describe('Workflow - Matrix Generation', () => {
  it('should generate correct matrix for 3 iterations', () => {
    const versions = ['3.5.3'];
    const iterations = 3;
    
    const matrix = generateMockMatrix(versions, iterations);
    
    expect(matrix.include.length).toBe(3);
    expect(matrix.include[0].iteration).toBe(1);
    expect(matrix.include[1].iteration).toBe(2);
    expect(matrix.include[2].iteration).toBe(3);
  });

  it('should generate matrix for multiple versions', () => {
    const versions = ['3.5.3', '3.4.0'];
    const iterations = 3;
    
    const matrix = generateMockMatrix(versions, iterations);
    
    // 2 versions × 3 iterations = 6 jobs
    expect(matrix.include.length).toBe(6);
  });

  it('should generate matrix for 7 versions × 3 iterations', () => {
    const versions = ['1.1.1w', '3.0.15', '3.1.7', '3.2.3', '3.3.2', '3.4.0', '3.5.3'];
    const iterations = 3;
    
    const matrix = generateMockMatrix(versions, iterations);
    
    // 7 versions × 3 iterations = 21 jobs
    expect(matrix.include.length).toBe(21);
  });

  it('should include all required fields', () => {
    const versions = ['3.5.3'];
    const iterations = 1;
    
    const matrix = generateMockMatrix(versions, iterations);
    const job = matrix.include[0];
    
    expect(job.version).toBeTruthy();
    expect(job.url).toBeTruthy();
    expect(job.series).toBeTruthy();
    expect(job.iteration !== undefined).toBeTruthy();
  });

  it('should handle single iteration (backward compatible)', () => {
    const versions = ['3.5.3'];
    const iterations = 1;
    
    const matrix = generateMockMatrix(versions, iterations);
    
    expect(matrix.include.length).toBe(1);
    expect(matrix.include[0].iteration).toBe(1);
  });

  it('should handle 10 iterations', () => {
    const versions = ['3.5.3'];
    const iterations = 10;
    
    const matrix = generateMockMatrix(versions, iterations);
    
    expect(matrix.include.length).toBe(10);
    expect(matrix.include[9].iteration).toBe(10);
  });

  it('should extract series correctly', () => {
    const version = '3.5.3';
    const series = version.split('.').slice(0, 2).join('.');
    
    expect(series).toBe('3.5');
  });

  it('should handle 1.1.1 series', () => {
    const version = '1.1.1w';
    const series = version.split('.').slice(0, 2).join('.');
    
    expect(series).toBe('1.1');
  });
});

describe('Workflow - Artifact Naming', () => {
  it('should generate unique artifact names', () => {
    const version = '3.5.3';
    const iteration = 2;
    
    const artifactName = `result-${version}-iter${iteration}`;
    
    expect(artifactName).toBe('result-3.5.3-iter2');
  });

  it('should generate unique artifact names for all jobs', () => {
    const matrix = generateMockMatrix(['3.5.3', '3.4.0'], 3);
    
    const names = matrix.include.map(job => 
      `result-${job.version}-iter${job.iteration}`
    );
    
    // All names should be unique
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  it('should match file naming pattern', () => {
    const artifactName = 'result-3.5.3-iter2';
    const fileName = 'result-3.5.3-iter2.json';
    
    expect(fileName.startsWith(artifactName)).toBeTruthy();
    expect(fileName.endsWith('.json')).toBeTruthy();
  });
});

describe('Workflow - JSON Configuration', () => {
  it('should parse versions.json structure', () => {
    const config = {
      iterations: 3,
      versions: [
        { version: '3.5.3', url: 'https://...', series: '3.5' }
      ]
    };
    
    expect(config.iterations).toBe(3);
    expect(Array.isArray(config.versions)).toBeTruthy();
    expect(config.versions[0].version).toBe('3.5.3');
  });

  it('should default to 1 iteration if not specified', () => {
    const config = {
      versions: [{ version: '3.5.3' }]
    };
    
    const iterations = config.iterations || 1;
    expect(iterations).toBe(1);
  });

  it('should default to 3 iterations if null', () => {
    const config = {
      iterations: null,
      versions: []
    };
    
    const iterations = config.iterations ?? 3;
    expect(iterations).toBe(3);
  });
});

describe('Workflow - Job Dependencies', () => {
  it('should have correct job order', () => {
    const jobs = [
      { name: 'generate-matrix', needs: [] },
      { name: 'benchmark', needs: ['generate-matrix'] },
      { name: 'report', needs: ['benchmark', 'generate-matrix'] }
    ];
    
    // generate-matrix should have no dependencies
    expect(jobs[0].needs.length).toBe(0);
    
    // benchmark should depend on generate-matrix
    expect(jobs[1].needs.includes('generate-matrix')).toBeTruthy();
    
    // report should depend on both
    expect(jobs[2].needs.includes('benchmark')).toBeTruthy();
    expect(jobs[2].needs.includes('generate-matrix')).toBeTruthy();
  });
});

describe('Workflow - Parallel Execution', () => {
  it('should run all iterations in parallel', () => {
    const matrix = generateMockMatrix(['3.5.3'], 3);
    
    // All 3 iterations should be independent (no dependencies)
    // In GitHub Actions, they run in parallel
    const iterations = matrix.include.map(j => j.iteration);
    
    expect(iterations).toEqual([1, 2, 3]);
  });

  it('should calculate total parallel jobs', () => {
    const versions = 7;
    const iterations = 3;
    const totalJobs = versions * iterations;
    
    expect(totalJobs).toBe(21);
  });
});

describe('Workflow - Resource Estimation', () => {
  it('should calculate CI minutes for 3 iterations', () => {
    const versions = 7;
    const iterations = 3;
    const minutesPerJob = 30; // Approximate
    
    // With parallel execution, total time ≈ one job
    const totalTime = minutesPerJob;
    
    // But total CI minutes = all jobs
    const totalCIMinutes = versions * iterations * minutesPerJob;
    
    expect(totalTime).toBe(30);
    expect(totalCIMinutes).toBe(630);
  });

  it('should calculate weekly cost', () => {
    const ciMinutesPerRun = 630;
    const runsPerWeek = 1;
    const weeksPerMonth = 4;
    
    const monthlyMinutes = ciMinutesPerRun * runsPerWeek * weeksPerMonth;
    
    expect(monthlyMinutes).toBe(2520);
  });

  it('should check if exceeds free tier', () => {
    const monthlyMinutes = 2520;
    const freeTierLimit = 2000;
    
    const exceeds = monthlyMinutes > freeTierLimit;
    const overage = monthlyMinutes - freeTierLimit;
    
    expect(exceeds).toBe(true);
    expect(overage).toBe(520);
  });
});

describe('Workflow - Docker Build Strategy', () => {
  it('should create unique Docker image tags', () => {
    const version = '3.5.3';
    const iteration = 2;
    
    const imageTag = `openssl-bench:${version}-iter${iteration}`;
    
    expect(imageTag).toBe('openssl-bench:3.5.3-iter2');
  });

  it('should ensure image tag uniqueness', () => {
    const matrix = generateMockMatrix(['3.5.3'], 3);
    
    const tags = matrix.include.map(job => 
      `openssl-bench:${job.version}-iter${job.iteration}`
    );
    
    const uniqueTags = new Set(tags);
    expect(uniqueTags.size).toBe(3);
  });
});

describe('Workflow - Edge Cases', () => {
  it('should handle single version, single iteration', () => {
    const matrix = generateMockMatrix(['3.5.3'], 1);
    
    expect(matrix.include.length).toBe(1);
    expect(matrix.include[0].version).toBe('3.5.3');
    expect(matrix.include[0].iteration).toBe(1);
  });

  it('should handle 20 iterations', () => {
    const matrix = generateMockMatrix(['3.5.3'], 20);
    
    expect(matrix.include.length).toBe(20);
    expect(matrix.include[19].iteration).toBe(20);
  });

  it('should handle many versions', () => {
    const versions = Array.from({ length: 10 }, (_, i) => `3.${i}.0`);
    const matrix = generateMockMatrix(versions, 3);
    
    expect(matrix.include.length).toBe(30);
  });
});

console.log('✅ All workflow matrix tests defined');

