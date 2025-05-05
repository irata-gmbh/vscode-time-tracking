import * as vscode from "vscode";
import type { TimeTrackerModel } from "../models/timeTracker";
import { formatDuration } from "../utils/timeUtils";

/**
 * Controls the status bar item for time tracking
 */
export class StatusBarController {
  private statusBarItem: vscode.StatusBarItem;
  private timer: NodeJS.Timeout | undefined;
  private updateInterval = 1000; // Update interval in ms

  constructor(private timeTracker: TimeTrackerModel) {
    // Create status bar item
    this.statusBarItem = vscode.window.createStatusBarItem(
      "timeTracking.statusBar",
      vscode.StatusBarAlignment.Left,
      100,
    );

    this.statusBarItem.command = "time-tracking.toggleTracking";
    this.updateStatusBar();
    this.statusBarItem.show();
  }

  /**
   * Disposes of the status bar item
   */
  public dispose(): void {
    this.statusBarItem.dispose();
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  /**
   * Starts the status bar timer
   */
  public startTimer(): void {
    // Clear existing timer if any
    if (this.timer) {
      clearInterval(this.timer);
    }

    // Start new timer to update status bar every second
    this.timer = setInterval(() => {
      this.updateStatusBar();
    }, this.updateInterval);

    this.updateStatusBar();
  }

  /**
   * Stops the status bar timer
   */
  public stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }

    this.updateStatusBar();
  }

  /**
   * Updates the status bar text with current tracking information
   */
  private updateStatusBar(): void {
    if (this.timeTracker.isTracking()) {
      const currentSession = this.timeTracker.getCurrentSession();
      if (currentSession) {
        const durationFormatted = formatDuration(currentSession.duration);
        this.statusBarItem.text = `$(clock) ${durationFormatted} (${currentSession.fileName})`;
        this.statusBarItem.tooltip = `Tracking time for ${currentSession.fileName} in ${currentSession.project}`;
        this.statusBarItem.command = "time-tracking.stopTracking";
      }
    } else {
      this.statusBarItem.text = `$(play) Start Time Tracking`;
      this.statusBarItem.tooltip = "Start tracking time for the current file";
      this.statusBarItem.command = "time-tracking.startTracking";
    }
  }
}
