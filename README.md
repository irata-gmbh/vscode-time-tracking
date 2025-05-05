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

### Building the Extension

1. Clone the repository
2. Run `pnpm install` to install dependencies
3. Run `pnpm run compile` to build the extension
4. Press F5 to start debugging

### Running Tests

Run `pnpm run test` to execute the tests.

## Release Notes

### 0.0.1

Initial release of the Time Tracking extension with basic functionality:
- Track time spent on files
- View time reports
- Add categories and notes to sessions

## License

This extension is licensed under the MIT License.
