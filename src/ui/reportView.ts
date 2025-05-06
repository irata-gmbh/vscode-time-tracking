import * as vscode from "vscode";
import type { TimeSession, TimeTrackerModel } from "../models/timeTracker";
import {
  formatDate,
  formatDuration,
  groupSessionsByDay,
  groupSessionsByProject,
} from "../utils/timeUtils";

/**
 * WebviewProvider for displaying time tracking reports
 */
export class ReportViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "timeTracking.reportView";
  private refreshTimer: NodeJS.Timeout | undefined;
  private webviewView: vscode.WebviewView | undefined;
  private disposables: vscode.Disposable[] = [];

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly timeTracker: TimeTrackerModel,
  ) {
    // Listen for configuration changes
    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("timeTracking.reportRefreshInterval")) {
          // Restart the auto-refresh timer with the new interval
          if (this.webviewView?.visible) {
            this.startAutoRefresh();
          }
        }
      }),
    );
  }

  /**
   * Disposes of all resources
   */
  public dispose(): void {
    this.stopAutoRefresh();
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }

  /**
   * Resolves the webview view
   */
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken,
  ): void | Thenable<void> {
    this.webviewView = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage((message) => {
      switch (message.command) {
        case "refresh":
          webviewView.webview.html = this.getHtmlForWebview(
            webviewView.webview,
          );
          break;
        case "filterByProject":
          // TODO: Implement filtering by project
          break;
        case "filterByCategory":
          // TODO: Implement filtering by category
          break;
      }
    });

    // Start auto-refresh timer
    this.startAutoRefresh();

    // When the webview is hidden, stop the auto refresh
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        this.startAutoRefresh();
      } else {
        this.stopAutoRefresh();
      }
    });

    // When the webview is disposed, stop the auto refresh
    webviewView.onDidDispose(() => {
      this.stopAutoRefresh();
    });
  }

  /**
   * Starts the auto-refresh timer
   */
  private startAutoRefresh(): void {
    // Stop any existing timer first
    this.stopAutoRefresh();

    // Get the refresh interval from configuration (in seconds)
    const config = vscode.workspace.getConfiguration("timeTracking");
    const refreshIntervalSeconds = config.get<number>(
      "reportRefreshInterval",
      10,
    );
    const refreshInterval = refreshIntervalSeconds * 1000; // Convert to milliseconds

    // Start new timer
    this.refreshTimer = setInterval(() => {
      if (this.webviewView?.visible) {
        this.webviewView.webview.html = this.getHtmlForWebview(
          this.webviewView.webview,
        );
      }
    }, refreshInterval);
  }

  /**
   * Stops the auto-refresh timer
   */
  private stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }
  }

  /**
   * Generates HTML for the webview
   */
  private getHtmlForWebview(webview: vscode.Webview): string {
    const sessions = this.timeTracker.getSessions();
    const sessionsByDay = groupSessionsByDay(sessions);
    const sessionsByProject = groupSessionsByProject(sessions);

    // Calculate total time
    const totalTime = sessions.reduce(
      (sum, session) => sum + session.duration,
      0,
    );

    // Get the refresh interval for display
    const config = vscode.workspace.getConfiguration("timeTracking");
    const refreshIntervalSeconds = config.get<number>(
      "reportRefreshInterval",
      10,
    );

    // Generate HTML for report
    return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Time Tracking Report</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    padding: 10px;
                    color: var(--vscode-foreground);
                }
                .section {
                    margin-bottom: 20px;
                }
                h2 {
                    margin-bottom: 5px;
                    border-bottom: 1px solid var(--vscode-panel-border);
                    padding-bottom: 5px;
                }
                table {
                    border-collapse: collapse;
                    width: 100%;
                }
                th, td {
                    text-align: left;
                    padding: 6px;
                    border-bottom: 1px solid var(--vscode-panel-border);
                }
                .summary {
                    display: flex;
                    justify-content: space-between;
                    padding: 10px;
                    background-color: var(--vscode-editor-background);
                    border-radius: 4px;
                    margin-bottom: 15px;
                }
                .summary div {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                .summary-value {
                    font-size: 18px;
                    font-weight: bold;
                }
                .summary-label {
                    font-size: 12px;
                    opacity: 0.7;
                }
                button {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 6px 10px;
                    border-radius: 2px;
                    cursor: pointer;
                }
                button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                .no-data {
                    text-align: center;
                    padding: 20px;
                    font-style: italic;
                    opacity: 0.7;
                }
                .auto-refresh-info {
                    text-align: center;
                    font-size: 12px;
                    opacity: 0.7;
                    margin-top: 5px;
                }
            </style>
        </head>
        <body>
            <div class="section">
                <h2>Time Tracking Summary</h2>
                <div class="summary">
                    <div>
                        <span class="summary-value">${formatDuration(totalTime)}</span>
                        <span class="summary-label">Total Time</span>
                    </div>
                    <div>
                        <span class="summary-value">${Object.keys(sessionsByProject).length}</span>
                        <span class="summary-label">Projects</span>
                    </div>
                    <div>
                        <span class="summary-value">${sessions.length}</span>
                        <span class="summary-label">Sessions</span>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <h2>Time By Project</h2>
                ${this.renderProjectTable(sessionsByProject)}
            </div>
            
            <div class="section">
                <h2>Recent Activity</h2>
                ${this.renderRecentActivity(sessionsByDay)}
            </div>
            
            <div style="text-align: center; margin-top: 20px;">
                <button id="refreshButton">Refresh Data</button>
                <div class="auto-refresh-info">Auto-refreshes every ${refreshIntervalSeconds} seconds</div>
            </div>
            
            <script>
                const vscode = acquireVsCodeApi();
                document.getElementById('refreshButton').addEventListener('click', () => {
                    vscode.postMessage({ command: 'refresh' });
                });
            </script>
        </body>
        </html>`;
  }

  /**
   * Renders the project time table
   */
  private renderProjectTable(
    sessionsByProject: Record<string, TimeSession[]>,
  ): string {
    if (Object.keys(sessionsByProject).length === 0) {
      return '<div class="no-data">No project data available yet</div>';
    }

    // Calculate total time for each project
    const projectTimes = Object.entries(sessionsByProject).map(
      ([project, sessions]) => {
        const totalTime = sessions.reduce(
          (sum, session) => sum + session.duration,
          0,
        );
        return { project, totalTime };
      },
    );

    // Sort by most time spent
    projectTimes.sort((a, b) => b.totalTime - a.totalTime);

    let tableHtml = `
            <table>
                <thead>
                    <tr>
                        <th>Project</th>
                        <th>Total Time</th>
                    </tr>
                </thead>
                <tbody>
        `;

    projectTimes.forEach(({ project, totalTime }) => {
      tableHtml += `
                <tr>
                    <td>${project}</td>
                    <td>${formatDuration(totalTime)}</td>
                </tr>
            `;
    });

    tableHtml += `
                </tbody>
            </table>
        `;

    return tableHtml;
  }

  /**
   * Renders recent activity
   */
  private renderRecentActivity(
    sessionsByDay: Record<string, TimeSession[]>,
  ): string {
    if (Object.keys(sessionsByDay).length === 0) {
      return '<div class="no-data">No activity data available yet</div>';
    }

    // Get dates sorted in descending order
    const dates = Object.keys(sessionsByDay).sort().reverse();

    let activityHtml = "";

    // Show last 7 days at most
    const recentDates = dates.slice(0, 7);

    recentDates.forEach((date) => {
      const sessions = sessionsByDay[date];
      const totalTime = sessions.reduce(
        (sum, session) => sum + session.duration,
        0,
      );

      activityHtml += `
                <div style="margin-bottom: 10px;">
                    <h3 style="margin-bottom: 5px;">${date} - ${formatDuration(totalTime)}</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>File</th>
                                <th>Project</th>
                                <th>Duration</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

      // Sort sessions by duration (descending)
      const sortedSessions = [...sessions].sort(
        (a, b) => b.duration - a.duration,
      );

      sortedSessions.forEach((session) => {
        activityHtml += `
                    <tr>
                        <td>${session.fileName}</td>
                        <td>${session.project}</td>
                        <td>${formatDuration(session.duration)}</td>
                    </tr>
                `;
      });

      activityHtml += `
                        </tbody>
                    </table>
                </div>
            `;
    });

    return activityHtml;
  }
}
