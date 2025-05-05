import * as vscode from "vscode";

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

  constructor(private context: vscode.ExtensionContext) {
    // Load saved sessions from storage
    this.loadSessions();
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
    return this.sessions
      .filter((session) => session.project === project)
      .reduce((total, session) => total + session.duration, 0);
  }

  /**
   * Gets statistics for time spent per category
   */
  public getCategoryStats(): { category: string; duration: number }[] {
    const stats: Record<string, number> = {};

    this.sessions.forEach((session) => {
      const category = session.category || "Uncategorized";
      stats[category] = (stats[category] || 0) + session.duration;
    });

    return Object.entries(stats).map(([category, duration]) => ({
      category,
      duration,
    }));
  }

  /**
   * Saves sessions to extension storage
   */
  public saveSessions(): void {
    this.context.globalState.update("timeTrackingSessions", this.sessions);
  }

  /**
   * Loads sessions from extension storage
   */
  private loadSessions(): void {
    const savedSessions = this.context.globalState.get<TimeSession[]>(
      "timeTrackingSessions",
      [],
    );
    this.sessions = savedSessions.map((session) => ({
      ...session,
      startTime: new Date(session.startTime),
      endTime: session.endTime ? new Date(session.endTime) : undefined,
    }));
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
      this.sessions.push({ ...this.currentSession });
      this.saveSessions();
      this.currentSession = undefined;
    }
  }
}
