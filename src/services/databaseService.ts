import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import Database from "better-sqlite3";
import * as vscode from "vscode";
import type { TimeSession } from "../models/timeTracker";

/**
 * Service that manages SQLite database operations for time tracking data
 */
export class DatabaseService {
  private db: Database.Database;

  /**
   * Creates a new DatabaseService
   */
  constructor() {
    const dbPath = this.getDbPath();
    this.ensureDbDirectoryExists(dbPath);

    try {
      this.db = new Database(dbPath);
      this.initializeDatabase();
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to initialize database: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Gets the database path from settings or uses the default
   */
  private getDbPath(): string {
    const configPath = vscode.workspace
      .getConfiguration("timeTracking")
      .get<string>("databasePath", "~/time-tracking.sql");

    // Expand home directory if path starts with ~
    if (configPath.startsWith("~/")) {
      return path.join(os.homedir(), configPath.substring(2));
    }

    return configPath;
  }

  /**
   * Ensures that the directory for the database file exists
   */
  private ensureDbDirectoryExists(dbPath: string): void {
    const dbDir = path.dirname(dbPath);

    if (!fs.existsSync(dbDir)) {
      try {
        fs.mkdirSync(dbDir, { recursive: true });
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to create database directory: ${error instanceof Error ? error.message : String(error)}`,
        );
        throw error;
      }
    }
  }

  /**
   * Initializes the database schema if it doesn't already exist
   */
  private initializeDatabase(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        fileName TEXT NOT NULL,
        filePath TEXT NOT NULL,
        project TEXT NOT NULL,
        startTime TEXT NOT NULL,
        endTime TEXT,
        duration INTEGER NOT NULL,
        category TEXT,
        notes TEXT
      )
    `);
  }

  /**
   * Saves a time tracking session to the database
   */
  public saveSession(session: TimeSession): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO sessions (id, fileName, filePath, project, startTime, endTime, duration, category, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      stmt.run(
        session.id,
        session.fileName,
        session.filePath,
        session.project,
        session.startTime.toISOString(),
        session.endTime ? session.endTime.toISOString() : null,
        session.duration,
        session.category || null,
        session.notes || null,
      );
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to save session: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Loads all time tracking sessions from the database
   */
  public loadSessions(): TimeSession[] {
    try {
      const stmt = this.db.prepare("SELECT * FROM sessions");
      const rows = stmt.all();

      return rows.map((row: any) => ({
        id: row.id,
        fileName: row.fileName,
        filePath: row.filePath,
        project: row.project,
        startTime: new Date(row.startTime),
        endTime: row.endTime ? new Date(row.endTime) : undefined,
        duration: row.duration,
        category: row.category || undefined,
        notes: row.notes || undefined,
      }));
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to load sessions: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  /**
   * Gets statistics about time spent per category
   */
  public getCategoryStats(): { category: string; duration: number }[] {
    try {
      const stmt = this.db.prepare(`
        SELECT COALESCE(category, 'Uncategorized') as category, SUM(duration) as duration
        FROM sessions
        GROUP BY category
      `);
      const rows = stmt.all() as { category: string; duration: number }[];
      return rows;
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to get category stats: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  /**
   * Gets total time spent on a specific project
   */
  public getProjectTotalTime(project: string): number {
    try {
      const stmt = this.db.prepare(`
        SELECT SUM(duration) as total
        FROM sessions
        WHERE project = ?
      `);
      const result = stmt.get(project) as { total: number | null };
      return result?.total ?? 0;
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to get project time: ${error instanceof Error ? error.message : String(error)}`,
      );
      return 0;
    }
  }

  /**
   * Closes the database connection
   */
  public close(): void {
    if (this.db) {
      this.db.close();
    }
  }
}
