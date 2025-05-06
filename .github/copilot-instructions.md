<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# VS Code Time Tracking Extension

This is a VS Code extension project for tracking time spent on different tasks in VS Code.

## Key Features & Architecture

1. **Time Tracking Core**:
   - Track time spent on different files and projects automatically and manually
   - Smart project detection from workspace or file context
   - Idle time detection to avoid counting inactive periods

2. **Data Management**:
   - Store time tracking data in CSV format for easy user access
   - Support categorization and note-taking for time entries
   - Handle data persistence between sessions

3. **User Interface**:
   - Status bar integration showing current tracking status and elapsed time
   - Report view for visualizing time data with filtering options
   - Command palette integration for manual tracking control

4. **Extension Features**:
   - Project-level and file-level time statistics
   - Activity categorization and labeling
   - Start/stop/toggle timers through commands
   - Generate and export time reports

## Project Structure

- `src/extension.ts` - Extension activation and command registration
- `src/models/` - Core data models and interfaces
- `src/services/` - Business logic services (database, tracking)
- `src/ui/` - UI components (status bar, report view)
- `src/utils/` - Helper utilities for time calculations, idle detection, etc.

## Development Guidelines

### VS Code API Usage
- Always use the VS Code API through typed interfaces
- Register commands, views, and UI elements properly through the Extension Context
- Follow the VS Code extension activation/deactivation lifecycle

### Code Style & Patterns
- Use TypeScript with strict typing
- Follow SOLID principles for class design
- Separate UI logic from business logic
- Use service-based architecture with dependency injection when appropriate
- Document public interfaces and complex functions

### Error Handling
- Properly catch and handle errors with meaningful user feedback
- Log errors through VS Code's logging mechanism
- Ensure extension stability even when errors occur

### Testing
- Write unit tests for core functionality
- Test edge cases like workspace switching, file deletion
- Mock VS Code API dependencies for unit testing

### Storage & Settings
- Store user data in appropriate locations using VS Code's storage APIs
- Use workspace and user configuration properly
- Respect user privacy and provide data export/import options

### Documentation
- Update README.md to reflect any new features
- Document architecture decisions in INTERNAL_ARCHITECTURE.md
- Keep CHANGELOG.md updated with changes

## Dependencies & Environment

- Use `pnpm` as the package manager
- Support for both VS Code desktop and web versions
- Use esbuild for bundling

## API Reference & Resources

Please use `get_vscode_api` with a specific query as input to fetch the latest VS Code API references when suggesting code. Key API areas include:

- `vscode.window` for UI interactions
- `vscode.workspace` for file and workspace operations
- `vscode.commands` for registering and triggering commands
- `vscode.StatusBarItem` for status bar integration
- `vscode.WebviewPanel` for custom views

## Performance Considerations

- Optimize file operations and tracking logic to minimize resource usage
- Avoid blocking the main thread with intensive operations
- Handle large tracking data sets efficiently