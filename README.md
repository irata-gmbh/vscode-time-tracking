# VS Code Time Tracking Extension

Track time spent on different tasks, projects, and files within Visual Studio Code. This extension helps you monitor your productivity and provides insights into how you spend your time while coding.

## Features

- **Automatic Time Tracking**: Tracks time spent on different files and projects
- **Manual Control**: Start, stop, or toggle time tracking with simple commands
- **Activity View**: Visualizes your time data in an easy-to-understand report view
- **Categorization**: Add categories to your time sessions for better organization
- **Session Notes**: Attach notes to your time tracking sessions for later reference
- **Project Statistics**: See time spent per project and per category
- **Status Bar Integration**: Shows current tracking status and elapsed time in the status bar
- **SQLite Storage**: Stores time tracking data in a SQLite database for better performance and reliability

## Usage

### Starting and Stopping Time Tracking

- Click the timer icon in the status bar to toggle tracking
- Run the command "Start Time Tracking" from the command palette
- Run the command "Stop Time Tracking" from the command palette

### Categorizing Time

1. Start time tracking on a file
2. Run the command "Time Tracking: Add Category"
3. Select a category from the dropdown list

### Adding Notes to Sessions

1. Start time tracking on a file
2. Run the command "Time Tracking: Add Notes"
3. Enter your notes in the input field

### Viewing Reports

1. Click on the clock icon in the activity bar to open the Time Tracking view
2. View summaries of your time spent on different projects and files
3. Click "Refresh Data" to update the reports with the latest tracking information

## Extension Settings

This extension contributes the following settings:

* `timeTracking.autoTrack`: Enable/disable automatic time tracking when a file is opened
* `timeTracking.idleThreshold`: Time in seconds before considering the user idle
* `timeTracking.databasePath`: Path to the SQLite database file (default: `~/time-tracking.sql`)

## Data Storage

The extension stores all time tracking data in a SQLite database:

- The default database location is `~/time-tracking.sql`
- You can change the database location in the extension settings
- Data is automatically saved to the database when sessions end
- The database can be backed up like any other file on your system

## Commands

* `time-tracking.startTracking`: Start tracking time for the current file
* `time-tracking.stopTracking`: Stop the current tracking session
* `time-tracking.toggleTracking`: Toggle time tracking on/off
* `time-tracking.addCategory`: Add a category to the current tracking session
* `time-tracking.addNotes`: Add notes to the current tracking session

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

## Release Notes

### 0.0.1

Initial release of the Time Tracking extension with basic functionality:
- Track time spent on files
- View time reports
- Add categories and notes to sessions

## License

This extension is licensed under the MIT License.
