// The module 'vscode' contains the VS Code extensibility API
import * as vscode from "vscode";
import { TimeTrackerModel } from "./models/timeTracker";
import { ReportViewProvider } from "./ui/reportView";
import { StatusBarController } from "./ui/statusBarController";
import { IdleDetector } from "./utils/idleDetection";

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
  console.log("Time Tracking extension is now active!");

  // Initialize the time tracker model
  const timeTracker = new TimeTrackerModel(context);

  // Initialize the status bar controller
  const statusBarController = new StatusBarController(timeTracker);
  context.subscriptions.push(statusBarController);

  // Initialize idle detector
  const idleDetector = new IdleDetector(
    vscode.workspace.getConfiguration("timeTracking").get("idleThreshold", 300),
    () => {
      // When idle is detected and tracking is active, show notification
      if (timeTracker.isTracking()) {
        vscode.window
          .showWarningMessage(
            "You appear to be idle. Do you want to continue tracking time?",
            "Continue Tracking",
            "Stop Tracking",
          )
          .then((selection) => {
            if (selection === "Stop Tracking") {
              timeTracker.stopTracking();
              statusBarController.stopTimer();
              vscode.window.showInformationMessage(
                "Time tracking stopped due to inactivity.",
              );
            }
          });
      }
    },
    // Add onUserReturned callback
    () => {
      // When user returns from idle state and tracking is active
      if (timeTracker.isTracking()) {
        vscode.window.showInformationMessage(
          "Welcome back! Time tracking has continued.",
        );
      }
    },
  );

  // Add the idleDetector to context subscriptions for proper cleanup
  context.subscriptions.push(idleDetector);

  // Start idle detection and tracking by default if workspace is present
  const autoTrack = vscode.workspace
    .getConfiguration("timeTracking")
    .get("autoTrack", true);

  if (autoTrack) {
    idleDetector.startMonitoring();

    // Only auto-start tracking if there's at least one workspace folder
    if (
      vscode.workspace.workspaceFolders &&
      vscode.workspace.workspaceFolders.length > 0
    ) {
      // Start tracking asynchronously
      setTimeout(async () => {
        await timeTracker.startTracking();
        statusBarController.startTimer();
        vscode.commands.executeCommand(
          "setContext",
          "timeTracking.isTracking",
          true,
        );
        vscode.window.showInformationMessage(
          "Time tracking started automatically for the current project.",
        );
      }, 1000); // Small delay to ensure everything is initialized
    }
  }

  // Watch for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("timeTracking.autoTrack")) {
        const autoTrackEnabled = vscode.workspace
          .getConfiguration("timeTracking")
          .get("autoTrack", true);

        if (
          autoTrackEnabled &&
          !timeTracker.isTracking() &&
          vscode.workspace.workspaceFolders &&
          vscode.workspace.workspaceFolders.length > 0
        ) {
          // Start tracking if auto-track was enabled and there's a workspace
          timeTracker.startTracking();
          statusBarController.startTimer();
          idleDetector.startMonitoring();
          vscode.commands.executeCommand(
            "setContext",
            "timeTracking.isTracking",
            true,
          );
        } else if (!autoTrackEnabled && timeTracker.isTracking()) {
          // Stop tracking if auto-track was disabled
          timeTracker.stopTracking();
          statusBarController.stopTimer();
          idleDetector.stopMonitoring();
          vscode.commands.executeCommand(
            "setContext",
            "timeTracking.isTracking",
            false,
          );
        }
      }
    }),
  );

  // Watch for workspace folders change
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(async (event) => {
      // If folders were added and auto-track is enabled and not already tracking
      if (
        event.added.length > 0 &&
        vscode.workspace
          .getConfiguration("timeTracking")
          .get("autoTrack", true) &&
        !timeTracker.isTracking()
      ) {
        await timeTracker.startTracking();
        statusBarController.startTimer();
        idleDetector.startMonitoring();
        vscode.commands.executeCommand(
          "setContext",
          "timeTracking.isTracking",
          true,
        );
        vscode.window.showInformationMessage(
          "Time tracking started for the new workspace.",
        );
      }
      // If all folders were removed and was tracking
      else if (
        (!vscode.workspace.workspaceFolders ||
          vscode.workspace.workspaceFolders.length === 0) &&
        timeTracker.isTracking()
      ) {
        timeTracker.stopTracking();
        statusBarController.stopTimer();
        vscode.commands.executeCommand(
          "setContext",
          "timeTracking.isTracking",
          false,
        );
        vscode.window.showInformationMessage(
          "Time tracking stopped as all workspaces were closed.",
        );
      }
    }),
  );

  // Register the report view provider
  const reportViewProvider = new ReportViewProvider(
    context.extensionUri,
    timeTracker,
  );

  // Add the provider instance to subscriptions so its dispose() method is called
  context.subscriptions.push(
    reportViewProvider,
    vscode.window.registerWebviewViewProvider(
      ReportViewProvider.viewType,
      reportViewProvider,
    ),
  );

  // Register commands
  const startTrackingCommand = vscode.commands.registerCommand(
    "time-tracking.startTracking",
    async () => {
      await timeTracker.startTracking();
      statusBarController.startTimer();
      // When tracking starts, make sure idle detection is active
      idleDetector.startMonitoring();
      // Update tracking context
      vscode.commands.executeCommand(
        "setContext",
        "timeTracking.isTracking",
        true,
      );
      vscode.window.showInformationMessage("Time tracking started.");
    },
  );
  context.subscriptions.push(startTrackingCommand);

  const stopTrackingCommand = vscode.commands.registerCommand(
    "time-tracking.stopTracking",
    () => {
      timeTracker.stopTracking();
      statusBarController.stopTimer();
      // Stop idle monitoring when tracking stops
      idleDetector.stopMonitoring();
      // Update tracking context
      vscode.commands.executeCommand(
        "setContext",
        "timeTracking.isTracking",
        false,
      );
      vscode.window.showInformationMessage("Time tracking stopped.");
    },
  );
  context.subscriptions.push(stopTrackingCommand);

  const toggleTrackingCommand = vscode.commands.registerCommand(
    "time-tracking.toggleTracking",
    () => {
      if (timeTracker.isTracking()) {
        timeTracker.stopTracking();
        statusBarController.stopTimer();
        // Stop idle monitoring when tracking stops
        idleDetector.stopMonitoring();
        // Update tracking context
        vscode.commands.executeCommand(
          "setContext",
          "timeTracking.isTracking",
          false,
        );
        vscode.window.showInformationMessage("Time tracking stopped.");
      } else {
        timeTracker.startTracking();
        statusBarController.startTimer();
        // When tracking starts, make sure idle detection is active
        idleDetector.startMonitoring();
        // Update tracking context
        vscode.commands.executeCommand(
          "setContext",
          "timeTracking.isTracking",
          true,
        );
        vscode.window.showInformationMessage("Time tracking started.");
      }
    },
  );
  context.subscriptions.push(toggleTrackingCommand);

  // Add category to current session
  const addCategoryCommand = vscode.commands.registerCommand(
    "time-tracking.addCategory",
    async () => {
      if (!timeTracker.isTracking()) {
        vscode.window.showWarningMessage(
          "No active tracking session to categorize.",
        );
        return;
      }

      const categories = [
        "Coding",
        "Debugging",
        "Documentation",
        "Research",
        "Meeting",
        "Planning",
        "Testing",
        "Other",
      ];

      const category = await vscode.window.showQuickPick(categories, {
        placeHolder: "Select a category for the current session",
      });

      if (category) {
        timeTracker.setCategoryForCurrentSession(category);
        vscode.window.showInformationMessage(`Category set to: ${category}`);
      }
    },
  );
  context.subscriptions.push(addCategoryCommand);

  // Add notes to current session
  const addNotesCommand = vscode.commands.registerCommand(
    "time-tracking.addNotes",
    async () => {
      if (!timeTracker.isTracking()) {
        vscode.window.showWarningMessage(
          "No active tracking session to add notes to.",
        );
        return;
      }

      const notes = await vscode.window.showInputBox({
        placeHolder: "Enter notes for the current session",
        prompt: "These notes will be saved with the current tracking session",
      });

      if (notes) {
        timeTracker.addNotesToCurrentSession(notes);
        vscode.window.showInformationMessage(
          "Notes added to the current session.",
        );
      }
    },
  );
  context.subscriptions.push(addNotesCommand);

  // Watch for editor changes to update tracking
  const editorChangeListener = vscode.window.onDidChangeActiveTextEditor(() => {
    timeTracker.handleEditorChange();
  });
  context.subscriptions.push(editorChangeListener);

  // Set initial context value for tracking status
  vscode.commands.executeCommand(
    "setContext",
    "timeTracking.isTracking",
    false,
  );
}

// This method is called when your extension is deactivated
export function deactivate() {
  // Nothing to do here - the disposables will be cleaned up automatically
}
