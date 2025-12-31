# GitHub Pages Setup Guide

This document explains how to enable GitHub Pages for automated benchmark result publishing.

## Overview

The benchmark workflow automatically generates:
- **visualizations.html**: Interactive D3.js dashboard with charts
- **REPORT.md**: Detailed markdown report
- **summary.json**: Raw aggregated data

These are automatically deployed to GitHub Pages after each successful benchmark run on the `main` branch.

## Setup Instructions

### 1. Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** → **Pages** (in the left sidebar)
3. Under **Source**, select:
   - **Source**: GitHub Actions
   - (This allows workflows to deploy directly)
4. Click **Save**

### 2. Verify Permissions

The workflow already includes the necessary permissions:
```yaml
permissions:
  contents: write
  actions: read
  pages: write
  id-token: write
```

### 3. Run the Workflow

The workflow runs automatically:
- **On push** to the `main` branch
- **On schedule** (weekly on Sundays at 3 AM UTC)
- **Manually** via workflow_dispatch

To trigger manually:
1. Go to **Actions** → **OpenSSL Performance Benchmark**
2. Click **Run workflow**
3. Click **Run workflow** (green button)

### 4. Access Your Site

After the workflow completes:
1. Go to **Settings** → **Pages**
2. Your site URL will be displayed at the top:
   ```
   https://<username>.github.io/<repository-name>/
   ```
   Or for organizations:
   ```
   https://<org-name>.github.io/<repository-name>/
   ```

## What Gets Published

The GitHub Pages site includes:

### Home Page (`index.html`)
A landing page with:
- Embedded interactive visualizations
- Links to download reports
- Navigation to different views

### Interactive Dashboard (`visualizations.html`)
- Performance comparison charts
- Version-by-version breakdowns
- Algorithm performance metrics
- Interactive D3.js visualizations

### Downloads
- **REPORT.md**: Markdown report (download link)
- **summary.json**: Raw JSON data (download link)

## Workflow Details

The `deploy-pages` job in the workflow:

1. **Runs after** the `report` job completes
2. **Downloads** the `benchmark-report` artifact
3. **Creates** an index.html wrapper page
4. **Uploads** everything to GitHub Pages
5. **Deploys** using the official `actions/deploy-pages@v4` action

### Job Configuration

```yaml
deploy-pages:
  runs-on: ubuntu-latest
  needs: report
  if: github.ref == 'refs/heads/main'
  environment:
    name: github-pages
    url: ${{ steps.deployment.outputs.page_url }}
```

## Troubleshooting

### Pages Not Showing Up

1. **Check workflow status**: Go to **Actions** and verify the workflow completed successfully
2. **Check Pages settings**: Ensure **Source** is set to "GitHub Actions"
3. **Check deployment**: Look for a "pages build and deployment" workflow run
4. **Wait**: Initial deployment can take 1-2 minutes

### 404 Error

- The site may take a few minutes to become available after first deployment
- Clear your browser cache
- Verify the URL matches your repository name

### Permission Errors

If you see permission errors:
1. Go to **Settings** → **Actions** → **General**
2. Under **Workflow permissions**, ensure:
   - "Read and write permissions" is selected
   - "Allow GitHub Actions to create and approve pull requests" is enabled (if needed)

### Deployment Failed

Check the workflow logs:
1. Go to **Actions**
2. Click on the failed workflow run
3. Expand the `deploy-pages` job
4. Look for error messages in the logs

Common issues:
- Artifact not found: The `report` job may have failed
- Invalid HTML: Check the `visualizations.html` generation
- Permission denied: Verify permissions in Settings → Actions

## Customization

### Change the Landing Page

Edit the `Create GitHub Pages structure` step in `.github/workflows/benchmark.yml`:

```yaml
- name: Create GitHub Pages structure
  run: |
    cd gh-pages
    cat > index.html << 'EOF'
    <!-- Your custom HTML here -->
    EOF
```

### Add Additional Files

Copy additional files before uploading:

```yaml
- name: Create GitHub Pages structure
  run: |
    cd gh-pages
    # Your index.html creation...
    
    # Copy additional files
    cp ../README.md .
    cp -r ../docs .
```

### Custom Domain

To use a custom domain:
1. Go to **Settings** → **Pages**
2. Enter your custom domain under **Custom domain**
3. Add a `CNAME` file to your deployment:

```yaml
- name: Create GitHub Pages structure
  run: |
    cd gh-pages
    echo "your-domain.com" > CNAME
    # Rest of your setup...
```

## Related Documentation

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [GitHub Actions Deploy Pages](https://github.com/actions/deploy-pages)
- [OpenSSL Benchmark Usage Guide](./usage.md)
- [Architecture Overview](./architecture.md)

## Example Sites

Once deployed, your site will look like this:

**Home Page Structure:**
```
┌─────────────────────────────────────┐
│  🔒 OpenSSL Performance Benchmark   │
│  Automated performance testing      │
├─────────────────────────────────────┤
│  Dashboard │  Report │ 📥 Data  │
├─────────────────────────────────────┤
│                                     │
│  [Interactive Visualizations]       │
│  (embedded iframe)                  │
│                                     │
└─────────────────────────────────────┘
```

## Continuous Updates

The site automatically updates whenever:
- You push changes to `main`
- The scheduled workflow runs (weekly)
- You manually trigger the workflow

Each deployment replaces the previous version with fresh benchmark results.

