import * as vscode from "vscode";
import { DatabaseService } from "../services/databaseService";
import { WebhookService } from "../services/webhookService";
import { getCurrentProjectName } from "../utils/projectUtils";

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
  private webhookService: WebhookService;

  constructor(private context: vscode.ExtensionContext) {
    // Initialize the database service
    try {
      this.dbService = new DatabaseService();
      // Load today's sessions from database
      this.loadSessions();

      // Check if we need to migrate from older version
      this.migrateDataIfNeeded();
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to initialize time tracking database: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Fallback to empty sessions array if database fails
      this.sessions = [];
    }

    // Initialize the webhook service
    this.webhookService = new WebhookService();

    // Register extension deactivation handler to close database
    context.subscriptions.push({
      dispose: () => {
        this.dbService.close();
      },
    });
  }

  /**
   * Check if data migration is needed and perform it
   */
  private migrateDataIfNeeded(): void {
    // Check if we've already migrated
    const hasMigrated = this.context.globalState.get<boolean>(
      "hasMigratedToPerDayStorage",
    );
    if (hasMigrated) {
      return;
    }

    // Get the old file path from settings
    const configPath = vscode.workspace
      .getConfiguration("timeTracking")
      .get<string>("csvFilePath", "~/time-tracking.csv");

    // Expand home directory if path starts with ~
    let oldFilePath = configPath;
    if (configPath.startsWith("~/")) {
      const os = require("node:os");
      const path = require("node:path");
      oldFilePath = path.join(os.homedir(), configPath.substring(2));
    }

    try {
      const success = this.dbService.migrateFromSingleFile(oldFilePath);
      if (success) {
        vscode.window.showInformationMessage(
          "Time tracking data successfully migrated to daily CSV files.",
        );
        // Mark migration as done
        this.context.globalState.update("hasMigratedToPerDayStorage", true);
      }
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to migrate time tracking data: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Starts tracking time for the current workspace or file
   */
  public async startTracking(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    let fileName = "No Active File";
    let filePath = "";

    // Get project name regardless of whether there's an open file
    const project = await getCurrentProjectName();

    // If an editor is active, use its file information
    if (editor) {
      filePath = editor.document.uri.fsPath;
      fileName = filePath.split(/[\\/]/).pop() || "Untitled";
      this.lastActiveFile = filePath;
    }

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
  public async handleEditorChange(): Promise<void> {
    const editor = vscode.window.activeTextEditor;

    // If no editor is active, continue tracking the current project
    if (!editor) {
      return;
    }

    const currentFilePath = editor.document.uri.fsPath;

    // If the file changed, end current session and start a new one
    if (this.isTracking() && this.lastActiveFile !== currentFilePath) {
      this.endCurrentSession();
      await this.startTracking();
    }
  }

  /**
   * Returns whether time tracking is currently active
   */
  public isTracking(): boolean {
    return !!this.currentSession;
  }

  /**
   * Gets all tracked sessions for today
   */
  public getTodaySessions(): TimeSession[] {
    return [...this.sessions];
  }

  /**
   * Gets all tracked sessions within a date range
   */
  public getSessionsInRange(startDate: Date, endDate: Date): TimeSession[] {
    return this.dbService.loadSessions(startDate, endDate);
  }

  /**
   * Gets all tracked sessions across all days
   */
  public getAllSessions(): TimeSession[] {
    return this.dbService.loadSessions();
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
   * Can be limited to a date range
   */
  public getProjectTotalTime(
    project: string,
    startDate?: Date,
    endDate?: Date,
  ): number {
    return this.dbService.getProjectTotalTime(project, startDate, endDate);
  }

  /**
   * Gets statistics for time spent per category
   * Can be limited to a date range
   */
  public getCategoryStats(
    startDate?: Date,
    endDate?: Date,
  ): { category: string; duration: number }[] {
    return this.dbService.getCategoryStats(startDate, endDate);
  }

  /**
   * Gets statistics by day for a date range
   */
  public getDailyStats(
    startDate: Date,
    endDate: Date,
  ): { date: string; duration: number }[] {
    return this.dbService.getDailyStats(startDate, endDate);
  }

  /**
   * Loads today's sessions from the database
   */
  private loadSessions(): void {
    this.sessions = this.dbService.loadTodaySessions();
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

      // Store the session in memory array (if it's for today)
      this.sessions.push({ ...this.currentSession });

      // Save to database
      try {
        this.dbService.saveSession(this.currentSession);

        // Send webhook notification for the completed session
        this.webhookService.sendSessionEvent(this.currentSession);
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to save time tracking session: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      this.currentSession = undefined;
    }
  }

  /**
   * Migrates data from the old single CSV file format to the new per-day format
   * @param oldFilePath Path to the old single CSV file
   * @returns true if migration was successful, false otherwise
   */
  public async migrateDataFromSingleFile(
    oldFilePath: string,
  ): Promise<boolean> {
    try {
      return this.dbService.migrateFromSingleFile(oldFilePath);
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to migrate time tracking data: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }
}
