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
  );

  // Start idle detection when tracking is active
  if (
    vscode.workspace.getConfiguration("timeTracking").get("autoTrack", true)
  ) {
    idleDetector.startMonitoring();
  }

  // Register the report view provider
  const reportViewProvider = new ReportViewProvider(
    context.extensionUri,
    timeTracker,
  );
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ReportViewProvider.viewType,
      reportViewProvider,
    ),
  );

  // Register commands
  const startTrackingCommand = vscode.commands.registerCommand(
    "time-tracking.startTracking",
    () => {
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
    },
  );
  context.subscriptions.push(startTrackingCommand);

  const stopTrackingCommand = vscode.commands.registerCommand(
    "time-tracking.stopTracking",
    () => {
      timeTracker.stopTracking();
      statusBarController.stopTimer();
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
