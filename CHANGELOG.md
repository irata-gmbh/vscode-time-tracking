# Change Log

All notable changes to the "time-tracking" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

### Added
- CSV file storage for time tracking data
- Added `timeTracking.csvFilePath` setting to configure CSV file location (default: `~/time-tracking.csv`)
- Improved data persistence and reliability with human-readable CSV format
- GitHub Actions workflow for automated testing and publishing to VS Code Marketplace
- VSIX artifact creation and attaching to GitHub releases

### Changed
- Migrated from VS Code global state storage to CSV file for better performance
- Updated internal architecture to support CSV file operations
- Added publisher field to package.json for marketplace publishing

## [0.0.1]

- Initial release
- Track time spent on files
- View time reports
- Add categories and notes to sessions