# Change Log

All notable changes to the "time-tracking" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

### Added
- Workspace-level tracking that works without requiring an open file
- Smart project name detection from project files (package.json, composer.json, .git/config, etc.)
- Automatic project name fallback to directory name when no project files are found
- Auto-start tracking when a workspace is opened
- Auto-tracking when workspace folders are added or removed
- Automatic refresh for report webview based on configurable interval
- Added `timeTracking.reportRefreshInterval` setting to control refresh frequency (default: 10 seconds)
- CSV file storage for time tracking data
- Added `timeTracking.csvFilePath` setting to configure CSV file location (default: `~/time-tracking.csv`)
- Improved data persistence and reliability with human-readable CSV format
- GitHub Actions workflow for automated testing and publishing to VS Code Marketplace
- VSIX artifact creation and attaching to GitHub releases
- Improved report view with collapsible sections for file edits grouped by project and file path
- Added visual grouping of file activities using HTML details/summary elements for better organization
- Standard Webhooks integration for sending time tracking data to external services
- Added `timeTracking.webhookUrl` setting to configure webhook endpoint
- Added `timeTracking.webhookSecret` setting for secure webhook payload signing
- Implementation of the Standard Webhooks specification including proper headers and signatures

### Changed
- Modified tracking to begin at the workspace level even without an active file
- Updated `timeTracking.autoTrack` setting description to better reflect workspace-level tracking
- Migrated from VS Code global state storage to CSV file for better performance
- Updated internal architecture to support CSV file operations
- Added publisher field to package.json for marketplace publishing
- Improved report view to display auto-refresh status
- Enhanced the report view UI with collapsible file activity groups showing total time in the summary 

## [0.0.1]

- Initial release
- Track time spent on files
- View time reports
- Add categories and notes to sessions