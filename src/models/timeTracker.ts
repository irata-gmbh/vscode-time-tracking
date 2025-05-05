import * as vscode from "vscode";
import { DatabaseService } from "../services/databaseService";

/**
 * Represents a time tracking session
 */
export interface TimeSession {
  id: string;
  fileName: string;
  filePath: string;
  project: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // duration in milliseconds
  category?: string;
  notes?: string;
}

/**
 * Represents time tracking data for the extension
 */
export class TimeTrackerModel {
  private sessions: TimeSession[] = [];
  private currentSession: TimeSession | undefined;
  private lastActiveFile: string | undefined;
  private timer: NodeJS.Timeout | undefined;
  private updateInterval = 1000; // Update interval in ms
  private dbService!: DatabaseService;

  constructor(private context: vscode.ExtensionContext) {
    // Initialize the database service
    try {
      this.dbService = new DatabaseService();
      // Load saved sessions from database
      this.loadSessions();
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to initialize time tracking database: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Fallback to empty sessions array if database fails
      this.sessions = [];
    }

    // Register extension deactivation handler to close database
    context.subscriptions.push({
      dispose: () => {
        this.dbService.close();
      },
    });
  }

  /**
   * Starts tracking time for the current file
   */
  public startTracking(): void {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
      vscode.window.showWarningMessage("No active editor to track time for.");
      return;
    }

    const filePath = editor.document.uri.fsPath;
    const fileName = filePath.split(/[\\/]/).pop() || "";
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(
      editor.document.uri,
    );
    const project = workspaceFolder ? workspaceFolder.name : "No Project";

    // End current session if exists
    this.endCurrentSession();

    // Create new session
    this.currentSession = {
      id: Date.now().toString(),
      fileName,
      filePath,
      project,
      startTime: new Date(),
      duration: 0,
    };

    this.lastActiveFile = filePath;

    // Start timer to update duration
    this.timer = setInterval(
      () => this.updateCurrentSessionDuration(),
      this.updateInterval,
    );
  }

  /**
   * Stops tracking time for the current file
   */
  public stopTracking(): void {
    this.endCurrentSession();
    this.timer && clearInterval(this.timer);
    this.timer = undefined;
  }

  /**
   * Updates the tracking when the active editor changes
   */
  public handleEditorChange(): void {
    const editor = vscode.window.activeTextEditor;

    // If no editor is active, continue tracking the last file
    if (!editor) {
      return;
    }

    const currentFilePath = editor.document.uri.fsPath;

    // If the file changed, end current session and start a new one
    if (this.isTracking() && this.lastActiveFile !== currentFilePath) {
      this.endCurrentSession();
      this.startTracking();
    }
  }

  /**
   * Returns whether time tracking is currently active
   */
  public isTracking(): boolean {
    return !!this.currentSession;
  }

  /**
   * Gets all tracked sessions
   */
  public getSessions(): TimeSession[] {
    return [...this.sessions];
  }

  /**
   * Gets the current active session if any
   */
  public getCurrentSession(): TimeSession | undefined {
    return this.currentSession;
  }

  /**
   * Sets a category for the current session
   */
  public setCategoryForCurrentSession(category: string): void {
    if (this.currentSession) {
      this.currentSession.category = category;
    }
  }

  /**
   * Adds notes to the current session
   */
  public addNotesToCurrentSession(notes: string): void {
    if (this.currentSession) {
      this.currentSession.notes = notes;
    }
  }

  /**
   * Gets total time spent on a specific project
   */
  public getProjectTotalTime(project: string): number {
    return this.dbService.getProjectTotalTime(project);
  }

  /**
   * Gets statistics for time spent per category
   */
  public getCategoryStats(): { category: string; duration: number }[] {
    return this.dbService.getCategoryStats();
  }

  /**
   * Loads sessions from the database
   */
  private loadSessions(): void {
    this.sessions = this.dbService.loadSessions();
  }

  /**
   * Updates the duration of the current session
   */
  private updateCurrentSessionDuration(): void {
    if (this.currentSession) {
      const now = new Date();
      this.currentSession.duration =
        now.getTime() - this.currentSession.startTime.getTime();
    }
  }

  /**
   * Ends the current tracking session and saves it
   */
  private endCurrentSession(): void {
    if (this.currentSession) {
      this.currentSession.endTime = new Date();
      this.currentSession.duration =
        this.currentSession.endTime.getTime() -
        this.currentSession.startTime.getTime();

      // Store the session in memory array
      this.sessions.push({ ...this.currentSession });

      // Save to database
      try {
        this.dbService.saveSession(this.currentSession);
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to save time tracking session: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      this.currentSession = undefined;
    }
  }
}
