import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as vscode from "vscode";
import type { TimeSession } from "../models/timeTracker";

/**
 * Service that manages CSV file operations for time tracking data
 */
export class DatabaseService {
  private filePath: string;
  private sessions: TimeSession[] = [];
  private readonly CSV_HEADER =
    "id,fileName,filePath,project,startTime,endTime,duration,category,notes";

  /**
   * Creates a new DatabaseService
   */
  constructor() {
    this.filePath = this.getFilePath();
    this.ensureDirectoryExists(this.filePath);

    try {
      this.loadSessionsFromFile();
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to initialize CSV file: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Gets the CSV file path from settings or uses the default
   */
  private getFilePath(): string {
    const configPath = vscode.workspace
      .getConfiguration("timeTracking")
      .get<string>("csvFilePath", "~/time-tracking.csv");

    // Expand home directory if path starts with ~
    if (configPath.startsWith("~/")) {
      return path.join(os.homedir(), configPath.substring(2));
    }

    return configPath;
  }

  /**
   * Ensures that the directory for the CSV file exists
   */
  private ensureDirectoryExists(filePath: string): void {
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to create directory: ${error instanceof Error ? error.message : String(error)}`,
        );
        throw error;
      }
    }

    // Create the CSV file with headers if it doesn't exist
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
   * Saves a time tracking session to the CSV file
   */
  public saveSession(session: TimeSession): void {
    try {
      // Add session to in-memory cache
      const existingIndex = this.sessions.findIndex((s) => s.id === session.id);
      if (existingIndex >= 0) {
        this.sessions[existingIndex] = { ...session };
      } else {
        this.sessions.push({ ...session });
      }

      // Convert session to CSV line
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

      // If this is an update to an existing session, rewrite the entire file
      if (existingIndex >= 0) {
        this.saveAllSessions();
      } else {
        // Otherwise append the new session
        fs.appendFileSync(this.filePath, `${line}\n`, "utf8");
      }
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to save session: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Saves all sessions to the CSV file (used for updates)
   */
  private saveAllSessions(): void {
    try {
      // Start with header
      let fileContent = `${this.CSV_HEADER}\n`;

      // Add each session as a line
      this.sessions.forEach((session) => {
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

      // Write to file
      fs.writeFileSync(this.filePath, fileContent, "utf8");
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to save sessions: ${error instanceof Error ? error.message : String(error)}`,
      );
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
   * Loads sessions from the CSV file into memory
   */
  private loadSessionsFromFile(): void {
    if (!fs.existsSync(this.filePath)) {
      this.sessions = [];
      return;
    }

    try {
      const fileContent = fs.readFileSync(this.filePath, "utf8");
      const lines = fileContent.split(/\r?\n/);

      // Skip header line
      if (lines.length > 0) {
        lines.shift();
      }

      this.sessions = lines
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
      this.sessions = [];
    }
  }

  /**
   * Loads all time tracking sessions
   */
  public loadSessions(): TimeSession[] {
    // Reload from file to make sure we have latest data
    this.loadSessionsFromFile();
    return [...this.sessions];
  }

  /**
   * Gets statistics about time spent per category
   */
  public getCategoryStats(): { category: string; duration: number }[] {
    // Make sure we have latest data
    this.loadSessionsFromFile();

    // Group by category and sum durations
    const categoryMap = new Map<string, number>();

    for (const session of this.sessions) {
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
   */
  public getProjectTotalTime(project: string): number {
    // Make sure we have latest data
    this.loadSessionsFromFile();

    // Sum durations for the specified project
    return this.sessions
      .filter((session) => session.project === project)
      .reduce((total, session) => total + session.duration, 0);
  }

  /**
   * Closes any resources (no-op for CSV implementation)
   */
  public close(): void {
    // No resources to close for file-based storage
  }
}
