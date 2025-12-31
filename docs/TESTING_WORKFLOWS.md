# Testing GitHub Actions Workflows

## Can You Write Unit Tests for GitHub Actions?

**Yes!** And you should. Here's what happened and how to prevent it.

## The $25 Lesson

**What went wrong:**
- Bash syntax errors in workflow files (`if [-f`, missing `fi`)
- Errors only discovered after expensive CI runs
- Cost: 2 failed runs × ~$12 each = **$25 wasted**

**Why tests didn't catch it:**
- Tests validated scripts (benchmark.sh) ✅
- Tests didn't validate bash **embedded in workflow YAML files** ❌

**The fix:**
- Added workflow bash validation tests
- Added actionlint integration
- Now caught by `npm run precommit` before pushing

---

## Levels of Workflow Testing

### Level 1: Static Validation (Fastest)

**What:** Validate YAML structure and bash syntax without running

```javascript
// tests/workflow-bash.test.js
it('should have valid YAML syntax', async () => {
  const content = await fs.readFile('.github/workflows/test.yml');
  const parsed = YAML.parse(content);
  expect(parsed.jobs).toBeTruthy();
});

it('should not have bash conditionals without spaces', async () => {
  // Checks for: if [-f (should be: if [ -f)
  // Checks for: missing fi statements
});
```

**Time:** <1 second  
**Cost:** $0  
**Catches:** Syntax errors, structural issues

### Level 2: Bash Extraction & Testing

**What:** Extract bash blocks from `run: |` and validate them

```javascript
it('should have valid bash in deploy-pages step', async () => {
  const bashScript = extractBashBlock(workflow, 'Create GitHub Pages structure');
  
  // Write to temp file and test
  await fs.writeFile('/tmp/test.sh', bashScript);
  await exec('bash -n /tmp/test.sh'); // Syntax check
  
  // Or actually run it with mock data
  await exec('bash /tmp/test.sh'); // Runtime check
});
```

**Time:** ~10 seconds  
**Cost:** $0  
**Catches:** Bash runtime errors, logic bugs

### Level 3: Integration Testing with Act

**What:** Run workflows locally using Docker

```bash
# Install act
brew install act

# Run a job locally
act -j test

# Run with specific event
act push -e event.json
```

**Time:** Minutes (builds Docker containers)  
**Cost:** $0 (local)  
**Catches:** Everything except GitHub-specific APIs

### Level 4: Dry-run in CI

**What:** Use workflow_dispatch with test data

```yaml
on:
  workflow_dispatch:
    inputs:
      dry_run:
        type: boolean
        default: false
```

**Time:** Same as real run  
**Cost:** CI minutes, but cheaper than full run  
**Catches:** Everything

---

## What We Implemented

### 1. Workflow Bash Validation Tests

**File:** `tests/workflow-bash.test.js` (14 tests)

```javascript
describe('Workflow Bash Scripts', () => {
  workflowFiles.forEach(filename => {
    it('should not have bash conditionals without spaces', () => {
      // Would have caught: if [-f, if [!, if [-n
    });
    
    it('should have balanced if/fi statements', () => {
      // Would have caught: missing fi
    });
    
    it('should not reference renamed files', () => {
      // Would have caught: mv X Y; then use X
    });
  });
});
```

**Catches:**
- ✅ Missing spaces in bash conditionals
- ✅ Unbalanced if/fi statements  
- ✅ File rename logic bugs
- ✅ Basic bash syntax

### 2. Actionlint Integration

**File:** `scripts/lint-actions.sh`

```bash
if command -v actionlint &> /dev/null; then
  # Use professional tool
  actionlint .github/workflows/*.yml
else
  # Fall back to our custom checks
  npm run lint:yaml && npm run lint:workflows
fi
```

**Install actionlint:**
```bash
brew install actionlint
# or
go install github.com/rhysd/actionlint/cmd/actionlint@latest
```

### 3. Unified Precommit Check

```bash
npm run precommit
```

**What it does:**
1. Lint GitHub Actions workflows (actionlint or fallback)
2. Run full test suite (248 tests)

**Time:** ~5 seconds  
**Prevents:** $25+ in wasted CI runs

---

## Testing Tools Comparison

| Tool | Type | Speed | Catches | Cost |
|------|------|-------|---------|------|
| **Custom tests** (ours) | Static | Very fast | Bash syntax, structure | $0 |
| **actionlint** | Static | Fast | Actions best practices, bash, deprecated actions | $0 |
| **yamllint** | Static | Very fast | YAML formatting | $0 |
| **act** | Runtime | Slow | Everything except GitHub APIs | $0 |
| **Workflow dispatch** | Runtime | Real CI time | Everything | CI minutes |

---

## Best Practices

### Recommended Testing Strategy

```bash
# Level 1: Always run before commit (< 10 sec)
npm run precommit

# Level 2: Run before major changes (optional)
act -j test  # If you have act installed

# Level 3: Let CI catch edge cases
# Your test job in GitHub Actions
```

### What to Test

**✅ Must test:**
- Bash syntax in `run:` blocks
- YAML validity
- File existence (Dockerfile, scripts)
- Job dependencies

**✅ Should test:**
- Action versions (not using deprecated)
- Required environment variables
- Artifact names match expectations
- Workflow triggers are correct

**⚠️ Nice to have:**
- Actual execution with mock data
- Performance of workflow logic
- Matrix generation correctness (you already have this!)

### Our Current Coverage

**Test suite: 248 tests**
- Statistical calculations ✅
- Report generation ✅
- Workflow matrix logic ✅
- Docker configuration ✅
- **Workflow bash validation ✅ (NEW!)**
- Integration tests ✅

---

## Real-World Example

**Before (no workflow tests):**
```
Edit workflow → Push → CI runs → Fails at minute 20
→ Fix → Push → CI runs → Fails again
→ Cost: $25, Time: 40+ minutes
```

**After (with workflow tests):**
```
Edit workflow → npm run precommit → Catches error in 5 sec
→ Fix → npm run precommit → Passes
→ Push → CI runs → Success ✅
→ Cost: $0 wasted, Time: 5 seconds saved 40 minutes
```

---

## Installation

### Quick Start (Use our tests)

```bash
# Already works!
npm run precommit
```

### Full Protection (Add actionlint)

```bash
# Install
brew install actionlint

# Verify
actionlint --version

# Test
npm run precommit  # Now uses actionlint automatically!
```

### Act (Optional - for full local testing)

```bash
# Install
brew install act

# Run test job locally
act -j test

# Run benchmark job with custom inputs
act workflow_dispatch -e event.json
```

---

## Summary

**Question:** Can you write unit tests for GitHub Actions?  
**Answer:** Yes! We just implemented them.

**What we added:**
- 14 new tests in `workflow-bash.test.js`
- Actionlint integration in `lint-actions.sh`
- Unified `npm run precommit` check

**What it catches:**
- ✅ Bash syntax errors (your $25 bugs)
- ✅ Missing spaces in conditionals
- ✅ Unbalanced if/fi statements
- ✅ File rename logic bugs
- ✅ YAML formatting issues

**What it saves:**
- 💰 Money: No more wasted CI runs
- ⏱️ Time: 5 sec check vs 20+ min debugging
- 😤 Frustration: Catch errors before pushing

**Bottom line:** Testing workflows is not only possible, it's **essential** for expensive CI pipelines. Your $25 lesson is now preventing future waste.

---

## Commands Reference

```bash
# Run all workflow checks
npm run lint:actions

# Run just YAML linting
npm run lint:yaml

# Run just bash validation
npm run lint:workflows

# Run everything (recommended)
npm run precommit

# Install comprehensive linting
brew install actionlint
```

**Before every push:**
```bash
npm run precommit
```

This now protects you from workflow errors! 🛡️

