import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as vscode from "vscode";
import type { TimeSession } from "../models/timeTracker";

/**
 * Service that manages CSV file operations for time tracking data
 */
export class DatabaseService {
  private baseDirectory: string;
  private sessions: TimeSession[] = [];
  private readonly CSV_HEADER =
    "id,fileName,filePath,project,startTime,endTime,duration,category,notes";

  /**
   * Creates a new DatabaseService
   */
  constructor() {
    this.baseDirectory = this.getBaseDirectory();
    this.ensureBaseDirectoryExists();

    try {
      // Load sessions for the current day initially
      this.loadSessionsForDay(new Date());
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to initialize CSV file: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Gets the base directory for storing CSV files from settings
   */
  private getBaseDirectory(): string {
    const configPath = vscode.workspace
      .getConfiguration("timeTracking")
      .get<string>("csvFilePath", "~/time-tracking");

    // Expand home directory if path starts with ~
    if (configPath.startsWith("~/")) {
      return path.join(os.homedir(), configPath.substring(2));
    }

    return configPath;
  }

  /**
   * Ensures that the base directory for CSV files exists
   */
  private ensureBaseDirectoryExists(): void {
    if (!fs.existsSync(this.baseDirectory)) {
      try {
        fs.mkdirSync(this.baseDirectory, { recursive: true });
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to create directory: ${error instanceof Error ? error.message : String(error)}`,
        );
        throw error;
      }
    }
  }

  /**
   * Formats a date in YYYY-MM-DD format
   */
  private formatDateToString(date: Date): string {
    return date.toISOString().split("T")[0]; // YYYY-MM-DD
  }

  /**
   * Gets the CSV file path for a specific day
   */
  private getFilePathForDay(date: Date): string {
    const dateString = this.formatDateToString(date);
    return path.join(this.baseDirectory, `time-tracking-${dateString}.csv`);
  }

  /**
   * Ensures that the CSV file for a specific day exists with headers
   */
  private ensureFileExists(filePath: string): void {
    if (!fs.existsSync(filePath)) {
      try {
        fs.writeFileSync(filePath, `${this.CSV_HEADER}\n`, "utf8");
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to create CSV file: ${error instanceof Error ? error.message : String(error)}`,
        );
        throw error;
      }
    }
  }

  /**
   * Escapes special characters in CSV fields
   */
  private escapeCSV(value: string | null | undefined): string {
    if (value === null || value === undefined) {
      return "";
    }
    const stringValue = String(value);
    // If the string contains commas, quotes, or newlines, wrap it in quotes and escape any quotes
    if (
      stringValue.includes(",") ||
      stringValue.includes('"') ||
      stringValue.includes("\n")
    ) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  }

  /**
   * Saves a time tracking session to the appropriate day's CSV file
   */
  public saveSession(session: TimeSession): void {
    try {
      // Determine which day file to use based on session start time
      const sessionDate = new Date(session.startTime);
      const filePath = this.getFilePathForDay(sessionDate);

      // Ensure file exists
      this.ensureFileExists(filePath);

      // Load sessions for this specific day
      const dailySessions = this.loadSessionsFromFile(filePath);

      // Check if session already exists
      const existingIndex = dailySessions.findIndex((s) => s.id === session.id);
      if (existingIndex >= 0) {
        dailySessions[existingIndex] = { ...session };
      } else {
        dailySessions.push({ ...session });
      }

      // Update in-memory sessions if this is today's data
      if (
        this.formatDateToString(sessionDate) ===
        this.formatDateToString(new Date())
      ) {
        this.sessions = dailySessions;
      }

      // Always rewrite the entire day file for consistency
      this.saveSessionsToFile(dailySessions, filePath);
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to save session: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Saves a collection of sessions to a specific file
   */
  private saveSessionsToFile(sessions: TimeSession[], filePath: string): void {
    try {
      // Start with header
      let fileContent = `${this.CSV_HEADER}\n`;

      // Add each session as a line
      sessions.forEach((session) => {
        const line = [
          session.id,
          this.escapeCSV(session.fileName),
          this.escapeCSV(session.filePath),
          this.escapeCSV(session.project),
          session.startTime.toISOString(),
          session.endTime ? session.endTime.toISOString() : "",
          session.duration,
          this.escapeCSV(session.category),
          this.escapeCSV(session.notes),
        ].join(",");
        fileContent += `${line}\n`;
      });

      // Write to file with a backup strategy
      const backupPath = `${filePath}.backup`;

      // 1. Create backup of existing file if it exists
      if (fs.existsSync(filePath)) {
        fs.copyFileSync(filePath, backupPath);
      }

      // 2. Write new content
      fs.writeFileSync(filePath, fileContent, "utf8");

      // 3. Remove backup if write was successful
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
      }
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to save sessions: ${error instanceof Error ? error.message : String(error)}`,
      );

      // Try to restore from backup if available
      const backupPath = `${filePath}.backup`;
      if (fs.existsSync(backupPath)) {
        try {
          fs.copyFileSync(backupPath, filePath);
          vscode.window.showInformationMessage(
            "Restored time tracking data from backup.",
          );
        } catch (restoreError) {
          vscode.window.showErrorMessage(
            `Failed to restore from backup: ${restoreError instanceof Error ? restoreError.message : String(restoreError)}`,
          );
        }
      }
    }
  }

  /**
   * Parse CSV value, handling quoted strings
   */
  private parseCSVValue(value: string): string {
    if (value === "") {
      return "";
    }

    if (value.startsWith('"') && value.endsWith('"')) {
      // Remove quotes and handle escaped quotes
      return value.substring(1, value.length - 1).replace(/""/g, '"');
    }

    return value;
  }

  /**
   * Parse a CSV line into an array of fields
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let inQuotes = false;
    let currentField = "";

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          // Handle escaped quote
          currentField += '"';
          i++; // Skip next quote
        } else {
          // Toggle quotes mode
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        // End of field
        result.push(currentField);
        currentField = "";
      } else {
        // Add character to current field
        currentField += char;
      }
    }

    // Add the last field
    result.push(currentField);

    return result;
  }

  /**
   * Loads sessions from a specific CSV file
   */
  private loadSessionsFromFile(filePath: string): TimeSession[] {
    if (!fs.existsSync(filePath)) {
      return [];
    }

    try {
      const fileContent = fs.readFileSync(filePath, "utf8");
      const lines = fileContent.split(/\r?\n/);

      // Skip header line
      if (lines.length > 0) {
        lines.shift();
      }

      return lines
        .filter((line) => line.trim() !== "") // Skip empty lines
        .map((line) => {
          const values = this.parseCSVLine(line);

          return {
            id: values[0],
            fileName: this.parseCSVValue(values[1]),
            filePath: this.parseCSVValue(values[2]),
            project: this.parseCSVValue(values[3]),
            startTime: new Date(values[4]),
            endTime: values[5] ? new Date(values[5]) : undefined,
            duration: Number(values[6]),
            category: values[7] ? this.parseCSVValue(values[7]) : undefined,
            notes: values[8] ? this.parseCSVValue(values[8]) : undefined,
          } as TimeSession;
        });
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to load sessions from CSV: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  /**
   * Loads sessions for a specific day
   */
  private loadSessionsForDay(date: Date): void {
    const filePath = this.getFilePathForDay(date);
    this.sessions = this.loadSessionsFromFile(filePath);
  }

  /**
   * Gets all CSV files in the base directory
   */
  private getAvailableDataFiles(): string[] {
    try {
      const files = fs
        .readdirSync(this.baseDirectory)
        .filter(
          (file) => file.endsWith(".csv") && file.startsWith("time-tracking-"),
        )
        .map((file) => path.join(this.baseDirectory, file));
      return files;
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to read directory: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  /**
   * Loads all time tracking sessions (from all days)
   * Can be limited to a date range
   */
  public loadSessions(startDate?: Date, endDate?: Date): TimeSession[] {
    let allSessions: TimeSession[] = [];

    if (startDate && endDate) {
      // Load sessions for date range
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const filePath = this.getFilePathForDay(currentDate);
        const dailySessions = this.loadSessionsFromFile(filePath);
        allSessions = [...allSessions, ...dailySessions];

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
    } else {
      // Load all available sessions
      const files = this.getAvailableDataFiles();
      for (const file of files) {
        const dailySessions = this.loadSessionsFromFile(file);
        allSessions = [...allSessions, ...dailySessions];
      }
    }

    // Sort by start time
    allSessions.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    return allSessions;
  }

  /**
   * Loads sessions for the current day
   */
  public loadTodaySessions(): TimeSession[] {
    const today = new Date();
    this.loadSessionsForDay(today);
    return [...this.sessions];
  }

  /**
   * Gets statistics about time spent per category
   * Can be limited to a date range
   */
  public getCategoryStats(
    startDate?: Date,
    endDate?: Date,
  ): { category: string; duration: number }[] {
    // Get all sessions in the date range
    const sessions = this.loadSessions(startDate, endDate);

    // Group by category and sum durations
    const categoryMap = new Map<string, number>();

    for (const session of sessions) {
      const category = session.category || "Uncategorized";
      const currentValue = categoryMap.get(category) || 0;
      categoryMap.set(category, currentValue + session.duration);
    }

    // Convert map to array
    return Array.from(categoryMap.entries()).map(([category, duration]) => ({
      category,
      duration,
    }));
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
    // Get all sessions in the date range
    const sessions = this.loadSessions(startDate, endDate);

    // Sum durations for the specified project
    return sessions
      .filter((session) => session.project === project)
      .reduce((total, session) => total + session.duration, 0);
  }

  /**
   * Gets stats by day for a date range
   */
  public getDailyStats(
    startDate: Date,
    endDate: Date,
  ): { date: string; duration: number }[] {
    const result: { date: string; duration: number }[] = [];

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = this.formatDateToString(currentDate);
      const filePath = this.getFilePathForDay(currentDate);
      const dailySessions = this.loadSessionsFromFile(filePath);

      const totalDuration = dailySessions.reduce(
        (sum, session) => sum + session.duration,
        0,
      );

      result.push({
        date: dateStr,
        duration: totalDuration,
      });

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return result;
  }

  /**
   * Migrates data from old format (single CSV) to new format (daily CSV files)
   * This should be called once during upgrade
   */
  public migrateFromSingleFile(oldFilePath: string): boolean {
    if (!fs.existsSync(oldFilePath)) {
      return false;
    }

    try {
      // Load all sessions from the old file
      const oldSessions = this.loadSessionsFromFile(oldFilePath);

      // Group sessions by day
      const sessionsByDay = new Map<string, TimeSession[]>();

      for (const session of oldSessions) {
        const dateKey = this.formatDateToString(session.startTime);
        if (!sessionsByDay.has(dateKey)) {
          sessionsByDay.set(dateKey, []);
        }
        sessionsByDay.get(dateKey)?.push(session);
      }

      // Save each group to its own file
      for (const [dateKey, sessions] of sessionsByDay.entries()) {
        const date = new Date(dateKey);
        const filePath = this.getFilePathForDay(date);
        this.saveSessionsToFile(sessions, filePath);
      }

      // Create a backup of the old file
      const backupPath = `${oldFilePath}.bak`;
      fs.copyFileSync(oldFilePath, backupPath);

      // Optionally delete the old file
      // fs.unlinkSync(oldFilePath);

      return true;
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to migrate data: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }

  /**
   * Closes any resources (no-op for CSV implementation)
   */
  public close(): void {
    // No resources to close for file-based storage
  }
}
