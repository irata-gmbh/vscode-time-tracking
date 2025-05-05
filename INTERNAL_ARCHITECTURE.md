# VS Code Time Tracking Extension: Internal Architecture

This document explains the internal architecture and logic of the VS Code Time Tracking extension. It's intended for developers who want to understand, modify, or extend the extension's functionality.

## Core Components Overview

The extension is built with a modular architecture consisting of several key components:

1. **TimeTrackerModel**: Core data model for tracking sessions
2. **StatusBarController**: UI controller for the status bar display
3. **ReportViewProvider**: WebView provider for displaying time reports
4. **IdleDetector**: Utility for detecting user inactivity

```mermaid
graph TD
    A[VS Code Events] <--> B[TimeTrackerModel] <--> C[Extension Storage]
    A --> D[IdleDetector]
    B --> E[StatusBarController]
    E --> F[ReportViewProvider]
```

### Activation Process

When the extension activates:

1. `TimeTrackerModel` is initialized and loads any saved sessions from storage
2. `StatusBarController` is created to display the current tracking status
3. `IdleDetector` is set up to monitor user activity
4. Commands like `startTracking`, `stopTracking`, etc. are registered
5. The `ReportViewProvider` is registered to show time tracking reports

## Core Components in Detail

### TimeTrackerModel

**File:** `src/models/timeTracker.ts`

The `TimeTrackerModel` is the central data model handling all time tracking logic:

- **Session Management**: Maintains a list of completed sessions and the current active session
- **Data Structure**: Each session contains:
  ```typescript
  interface TimeSession {
    id: string;
    fileName: string;
    filePath: string;
    project: string;
    startTime: Date;
    endTime?: Date;
    duration: number; // in milliseconds
    category?: string;
    notes?: string;
  }
  ```
- **Time Calculation**: Uses a timer (`setInterval`) to update the duration of the current session
- **Storage**: Saves completed sessions to the extension's global state

**Key Methods:**
- `startTracking()`: Creates a new session for the current file
- `stopTracking()`: Ends the current session and saves it
- `handleEditorChange()`: Switches tracking to a new file when the active editor changes
- `getCurrentSession()`: Gets the active tracking session
- `getSessions()`: Returns all completed sessions
- `saveSessions()`: Persists sessions to VS Code storage
- `loadSessions()`: Loads sessions from storage

### Idle Detection Logic

**File:** `src/utils/idleDetection.ts`

The `IdleDetector` monitors user activity to ensure accurate time tracking:

1. **Activity Monitoring**: Listens to VS Code events (cursor movement, typing, etc.)
2. **Idle Detection**: Checks if the user has been inactive for longer than the threshold
3. **Configuration**: Uses the `timeTracking.idleThreshold` setting (in seconds)

When idle is detected, the extension prompts the user to either continue tracking or stop.

**Implementation Details:**
- Registers event listeners for user activity like:
  - Editor selection changes
  - Document changes
  - Terminal activity
  - Window state changes
- Uses a timer to check idle status every minute
- Records timestamps of the last detected activity

### Status Bar Integration

**File:** `src/ui/statusBarController.ts`

The `StatusBarController` manages the status bar display:

- Shows current tracking status (active/inactive)
- Displays tracked time for the current session
- Provides clickable commands to start/stop tracking
- Updates the display every second when tracking is active

### Report Generation

**File:** `src/ui/reportView.ts`

The `ReportViewProvider` generates visual reports of tracked time:

- **Data Organization**:
  - Groups sessions by project (`groupSessionsByProject`)
  - Groups sessions by day (`groupSessionsByDay`)
- **Visualizations**:
  - Summary statistics (total time, project count, session count)
  - Time spent per project
  - Recently tracked activity by day

### Time Utilities

**File:** `src/utils/timeUtils.ts`

Helper functions for time-related operations:

- `formatDuration()`: Formats milliseconds as "HH:MM:SS"
- `formatDurationShort()`: Formats as "Xh Ym"
- `formatDate()`: Converts dates to "YYYY-MM-DD" format
- `groupSessionsByDay()`: Groups sessions by their start date
- `groupSessionsByProject()`: Groups sessions by project name

## Extension Configuration

The extension supports these configuration settings:

- `timeTracking.autoTrack`: Whether to start tracking automatically when a file is opened
- `timeTracking.idleThreshold`: Time in seconds before considering the user idle

## Storage Strategy

The extension uses VS Code's `ExtensionContext.globalState` for data persistence:

- Sessions are saved as a JSON array under the key "timeTrackingSessions"
- Date objects are serialized to strings during storage and restored to Date objects when loaded
- Data is automatically saved when sessions end or when VS Code is closed

## Command Registration

The extension registers the following commands:

- `time-tracking.startTracking`: Starts a new tracking session
- `time-tracking.stopTracking`: Stops the current session
- `time-tracking.toggleTracking`: Toggles tracking on/off
- `time-tracking.addCategory`: Adds a category to the current session
- `time-tracking.addNotes`: Adds notes to the current session

## Event Flow Example

**Starting a new tracking session:**

1. User executes the "Start Time Tracking" command or clicks the status bar item
2. `startTracking()` command handler is triggered
3. `TimeTrackerModel.startTracking()` creates a new session for the current file
4. A timer is started to update the session duration
5. `StatusBarController.startTimer()` is called to update the UI
6. `IdleDetector.startMonitoring()` begins watching for user inactivity
7. VS Code context is updated (`timeTracking.isTracking` = true)

**When user changes files:**

1. `onDidChangeActiveTextEditor` event is triggered
2. `TimeTrackerModel.handleEditorChange()` is called
3. Current session is ended and a new one is started for the new file

**When user is idle:**

1. `IdleDetector` detects no activity within the threshold period
2. User is prompted to continue or stop tracking
3. If "Stop Tracking" is chosen, tracking is ended and saved

## Advanced Features

### Multiple Project Support

The extension automatically categorizes sessions by project using VS Code's workspace concept. Each file is associated with its workspace folder, which is used as the project name.

### Session Categorization

Users can add categories to their tracking sessions to better organize their time. Categories are selected from a predefined list including "Coding", "Debugging", "Documentation", etc.

### Session Notes

Notes can be added to any active session to provide context about the work being done. These notes are stored with the session data and displayed in reports.

## Performance Considerations

- Time calculations use millisecond precision for accuracy
- Idle detection checks run at a lower frequency (every minute) to minimize performance impact
- Status bar updates occur every second to provide real-time feedback without excessive updates
- When loading session data, date parsing is handled carefully to ensure proper date objects

## Extension Points for Future Enhancement

1. **Data Export**: Add functionality to export time tracking data to CSV/JSON
2. **Visualization Improvements**: Enhanced charts and graphs for time analysis
3. **Team Integration**: Share time tracking data across a team
4. **Task Integration**: Link tracking sessions with tasks from issue trackers
5. **Automatic Categorization**: Use AI to suggest categories based on file content