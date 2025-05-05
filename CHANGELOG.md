# Change Log

All notable changes to the "time-tracking" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

### Added
- SQLite database storage for time tracking data
- Added `timeTracking.databasePath` setting to configure database location (default: `~/time-tracking.sql`)
- Improved data persistence and reliability for large amounts of tracking data

### Changed
- Migrated from VS Code global state storage to SQLite for better performance
- Updated internal architecture to support database operations

## [0.0.1]

- Initial release
- Track time spent on files
- View time reports
- Add categories and notes to sessions