# Contributing to VS Code Time Tracking Extension

Thank you for your interest in contributing to the VS Code Time Tracking Extension! This document provides guidelines and instructions for development and contribution.

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS version recommended)
- [pnpm](https://pnpm.io/) (Recommended package manager for this project)
- [Visual Studio Code](https://code.visualstudio.com/)

### Building the Extension

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/vscode-time-tracking.git
   cd vscode-time-tracking
   ```

2. Install dependencies
   ```bash
   pnpm install
   ```

3. Build the extension
   ```bash
   pnpm run compile
   ```

### Publishing to VS Code Marketplace

This extension uses GitHub Actions for automated testing and publishing. To publish a new version:

1. Update the version in `package.json`
2. Create and push a new tag that matches the version:
   ```bash
   git tag v0.0.1
   git push --tags
   ```
3. GitHub Actions will automatically build, test, and publish the extension to the VS Code Marketplace

#### Manual Publishing

If you need to publish manually:

1. Install `vsce`, the VS Code Extension Manager:
   ```bash
   pnpm install -g @vscode/vsce
   ```

2. Package the extension:
   ```bash
   pnpm run package
   ```
   This will create a `.vsix` file in the root directory.

3. Publish to the marketplace:
   ```bash
   vsce publish
   ```
   Note: This requires a Personal Access Token from the Azure DevOps organization.

### Continuous Integration

The extension uses GitHub Actions for CI/CD:

- Every push to the main branch runs tests
- Tagged releases (starting with 'v') trigger an automatic build and publish
- Manual workflow runs can be triggered from GitHub Actions tab

### Development Workflow

For active development with automatic rebuilding:

1. Start the watch process
   ```bash
   pnpm run watch
   ```
   This will start both TypeScript type checking and esbuild bundling in watch mode.

2. Press F5 in VS Code to launch a new Extension Development Host window with your extension loaded.

3. Make changes to the code and the extension will automatically rebuild. You may need to reload the Extension Development Host window (Ctrl+R or Cmd+R on macOS) to see your changes.

### Installing the Extension Locally

#### Method 1: Using VSIX Package

1. Package the extension
   ```bash
   pnpm run package
   ```

2. Install the generated VSIX file
   ```bash
   code --install-extension time-tracking-0.0.1.vsix
   ```
   Note: The exact filename may vary based on the version in package.json.

#### Method 2: Using Symbolic Links

1. Build the extension
   ```bash
   pnpm run compile
   ```

2. Create a symbolic link in your VS Code extensions folder
   
   For Linux/macOS:
   ```bash
   ln -s /path/to/vscode-time-tracking ~/.vscode/extensions/time-tracking
   ```
   
   For Windows (Run as Administrator):
   ```powershell
   mklink /D %USERPROFILE%\.vscode\extensions\time-tracking C:\path\to\vscode-time-tracking
   ```

3. Restart VS Code

### Running Tests

Run `pnpm run test` to execute the test suite.

### Linting and Type Checking

- Run type checking: `pnpm run check-types`
- Run linting: `pnpm run lint`