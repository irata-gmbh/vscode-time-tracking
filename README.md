# VS Code Time Tracking Extension

Track time spent on different tasks, projects, and files within Visual Studio Code. This extension helps you monitor your productivity and provides insights into how you spend your time while coding.

## Features

- **Automatic Time Tracking**: Tracks time spent on different files and projects automatically when a workspace is opened
- **Smart Project Detection**: Intelligently determines project names from project files or directory names
- **Intelligent Idle Detection**: Automatically detects when you're away and handles your time tracking accordingly
- **Auto-Dismissing Notifications**: Idle notifications are automatically dismissed when you resume activity
- **Manual Control**: Start, stop, or toggle time tracking with simple commands
- **Activity View**: Visualizes your time data in an easy-to-understand report view
- **Date Range Reports**: Filter time reports by day, week, 2 weeks, or month
- **Daily Charts**: Visual representation of time spent each day
- **Auto-Refreshing Reports**: Report view automatically refreshes at configurable intervals
- **Categorization**: Add categories to your time sessions for better organization
- **Session Notes**: Attach notes to your time tracking sessions for later reference
- **Project Statistics**: See time spent per project and per category
- **Status Bar Integration**: Shows current tracking status and elapsed time in the status bar
- **Per-Day CSV Storage**: Stores time tracking data in separate CSV files for each day for better organization and performance
- **Workspace-Level Tracking**: Tracks time at workspace level even when no file is open
- **Standard Webhooks Integration**: Send time tracking data to external services using Standard Webhooks format

## Usage

### Starting and Stopping Time Tracking

- Time tracking starts automatically when a workspace is opened
- Click the timer icon in the status bar to toggle tracking
- Run the command "Start Time Tracking" from the command palette
- Run the command "Stop Time Tracking" from the command palette

### Categorizing Time

1. Time tracking will already be active when you open a workspace
2. Run the command "Time Tracking: Add Category"
3. Select a category from the dropdown list

### Adding Notes to Sessions

1. With active time tracking
2. Run the command "Time Tracking: Add Notes"
3. Enter your notes in the input field

### Viewing Reports

1. Click on the clock icon in the activity bar to open the Time Tracking view
2. Select your desired date range (Today, Week, 2 Weeks, or Month)
3. View daily activity chart showing time spent each day
4. View summaries of your time spent on different projects and files
5. Click "Refresh Data" to update the reports with the latest tracking information

### Using Webhooks

To integrate your time tracking data with external services:

1. Go to VS Code Settings
2. Set `timeTracking.webhookUrl` to your webhook endpoint URL
3. Optionally set `timeTracking.webhookSecret` for secure payload signing
4. Time tracking data will be sent to the configured URL when sessions end

When configured, the extension will send webhooks in [Standard Webhooks](https://www.standardwebhooks.com/) format with the following:
- Event type: `time.session.completed`
- Secure signatures using HMAC SHA-256 (when secret is configured)
- Complete session details including project, duration, category, and notes

## Extension Settings

This extension contributes the following settings:

* `timeTracking.autoTrack`: Enable/disable automatic time tracking when a workspace is opened (default: `true`)
* `timeTracking.idleThreshold`: Time in seconds before considering the user idle (default: `300`)
* `timeTracking.autoDismissIdleNotification`: Enable/disable automatic dismissal of idle notifications when activity resumes (default: `true`)
* `timeTracking.csvFilePath`: Directory path for storing time tracking data (default: `~/time-tracking`)
* `timeTracking.reportRefreshInterval`: Time in seconds between automatic refreshes of the report view (default: `10`)
* `timeTracking.webhookUrl`: URL to send webhooks with time tracking events (Standard Webhooks format)
* `timeTracking.webhookSecret`: Secret for signing webhook payloads (Standard Webhooks format)

## Data Storage

The extension stores all time tracking data in CSV files:

- By default, data is stored in `~/time-tracking/` directory
- One CSV file is created per day (format: `time-tracking-YYYY-MM-DD.csv`)
- You can change the directory location in the extension settings
- Data is automatically saved to the appropriate day's file when sessions end
- CSV format allows for easy viewing and editing with spreadsheet applications
- Files can be backed up like any other files on your system
- The per-day format improves performance with large amounts of time tracking data
- If you're upgrading from an older version, the extension will offer to migrate your data automatically
- You can also manually migrate data using the "Time Tracking: Migrate to Per-Day Storage" command

## Commands

* `time-tracking.startTracking`: Start tracking time for the current file
* `time-tracking.stopTracking`: Stop the current tracking session
* `time-tracking.toggleTracking`: Toggle time tracking on/off
* `time-tracking.addCategory`: Add a category to the current tracking session
* `time-tracking.addNotes`: Add notes to the current tracking session
* `time-tracking.migrateToPerDayStorage`: Migrate data from single CSV file to per-day CSV files

## Contributing

For information on setting up the development environment and contributing to this extension, please see the [CONTRIBUTING.md](CONTRIBUTING.md) file.

## License

This extension is licensed under the MIT License.
