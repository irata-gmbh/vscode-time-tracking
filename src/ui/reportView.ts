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
  private dateRange: { startDate: Date; endDate: Date };

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly timeTracker: TimeTrackerModel,
  ) {
    // Default to showing last 7 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 6); // Last 7 days including today

    this.dateRange = { startDate, endDate };

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
        case "changeDateRange":
          if (message.days) {
            this.updateDateRange(message.days);
            webviewView.webview.html = this.getHtmlForWebview(
              webviewView.webview,
            );
          }
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
   * Updates the date range for the report
   */
  private updateDateRange(days: number): void {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - (days - 1)); // Include today in count
    this.dateRange = { startDate, endDate };
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
    // Get sessions for the current date range
    const sessions = this.timeTracker.getSessionsInRange(
      this.dateRange.startDate,
      this.dateRange.endDate,
    );

    const sessionsByDay = groupSessionsByDay(sessions);
    const sessionsByProject = groupSessionsByProject(sessions);

    // Get the daily stats for a visual chart
    const dailyStats = this.timeTracker.getDailyStats(
      this.dateRange.startDate,
      this.dateRange.endDate,
    );

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

    // Format date range for display
    const startDateStr = this.dateRange.startDate.toLocaleDateString();
    const endDateStr = this.dateRange.endDate.toLocaleDateString();

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
                    margin: 0 5px;
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
                details {
                    margin: 0;
                    border: none;
                }
                summary {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px;
                    cursor: pointer;
                    background-color: var(--vscode-list-activeSelectionBackground);
                    color: var(--vscode-list-activeSelectionForeground);
                    border-radius: 3px;
                    transition: background-color 0.2s;
                }
                summary:hover {
                    background-color: var(--vscode-list-hoverBackground);
                }
                details[open] > summary {
                    border-bottom-left-radius: 0;
                    border-bottom-right-radius: 0;
                }
                details > table {
                    border-top: none;
                    border-top-left-radius: 0;
                    border-top-right-radius: 0;
                    background-color: var(--vscode-editor-inactiveSelectionBackground);
                }
                .date-range {
                    text-align: center;
                    margin-bottom: 15px;
                }
                .date-range-selector {
                    display: flex;
                    justify-content: center;
                    margin-top: 10px;
                }
                .date-range-selector button.active {
                    background-color: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                }
                .chart {
                    height: 100px;
                    display: flex;
                    align-items: flex-end;
                    margin-top: 15px;
                    margin-bottom: 15px;
                }
                .chart-bar {
                    flex: 1;
                    margin: 0 1px;
                    background-color: var(--vscode-charts-blue);
                    position: relative;
                    min-height: 1px;
                }
                .chart-label {
                    text-align: center;
                    font-size: 10px;
                    margin-top: 5px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
            </style>
        </head>
        <body>
            <div class="section">
                <h2>Time Tracking Summary</h2>
                <div class="date-range">
                    <div>Date Range: ${startDateStr} - ${endDateStr}</div>
                    <div class="date-range-selector">
                        <button id="day1" class="${this.dateRange.endDate.getDate() - this.dateRange.startDate.getDate() + 1 === 1 ? "active" : ""}">Today</button>
                        <button id="day7" class="${this.dateRange.endDate.getDate() - this.dateRange.startDate.getDate() + 1 === 7 ? "active" : ""}">Week</button>
                        <button id="day14" class="${this.dateRange.endDate.getDate() - this.dateRange.startDate.getDate() + 1 === 14 ? "active" : ""}">2 Weeks</button>
                        <button id="day30" class="${this.dateRange.endDate.getDate() - this.dateRange.startDate.getDate() + 1 === 30 ? "active" : ""}">Month</button>
                    </div>
                </div>
                
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
                
                <!-- Daily activity chart -->
                <div class="chart">
                    ${this.renderDailyChart(dailyStats)}
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
                
                // Add toggle behavior for all details elements
                document.querySelectorAll('details').forEach(details => {
                    details.addEventListener('toggle', () => {
                        // Persist the open state if needed in the future
                    });
                });
                
                // Date range selector buttons
                document.getElementById('day1').addEventListener('click', () => {
                    vscode.postMessage({ command: 'changeDateRange', days: 1 });
                });
                document.getElementById('day7').addEventListener('click', () => {
                    vscode.postMessage({ command: 'changeDateRange', days: 7 });
                });
                document.getElementById('day14').addEventListener('click', () => {
                    vscode.postMessage({ command: 'changeDateRange', days: 14 });
                });
                document.getElementById('day30').addEventListener('click', () => {
                    vscode.postMessage({ command: 'changeDateRange', days: 30 });
                });
            </script>
        </body>
        </html>`;
  }

  /**
   * Renders a chart of daily activity
   */
  private renderDailyChart(
    dailyStats: { date: string; duration: number }[],
  ): string {
    if (dailyStats.length === 0) {
      return "";
    }

    // Find maximum duration for scaling
    const maxDuration = Math.max(...dailyStats.map((stat) => stat.duration));

    let chartHtml = "";

    dailyStats.forEach((day) => {
      // Calculate percentage height (minimum 1%)
      const heightPercent = maxDuration
        ? Math.max(1, Math.round((day.duration / maxDuration) * 100))
        : 1;

      // Get day of week abbreviation
      const dayOfWeek = new Date(day.date).toLocaleDateString(undefined, {
        weekday: "short",
      });

      chartHtml += `
        <div style="display: flex; flex-direction: column; flex: 1;">
          <div class="chart-bar" style="height: ${heightPercent}%" title="${formatDuration(day.duration)}"></div>
          <div class="chart-label">${dayOfWeek}</div>
        </div>
      `;
    });

    return chartHtml;
  }

  /**
   * Renders the project time table
   */
  private renderProjectTable(
    sessionsByProject: Record<string, TimeSession[]>,
  ): string {
    if (Object.keys(sessionsByProject).length === 0) {
      return '<div class="no-data">No project data available for this period</div>';
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
      return '<div class="no-data">No activity data available for this period</div>';
    }

    // Get dates sorted in descending order
    const dates = Object.keys(sessionsByDay).sort().reverse();

    let activityHtml = "";

    // Show up to the maximum number of days in our date range
    const daysToShow = Math.min(
      dates.length,
      Math.floor(
        (this.dateRange.endDate.getTime() -
          this.dateRange.startDate.getTime()) /
          (24 * 60 * 60 * 1000),
      ) + 1,
    );

    const recentDates = dates.slice(0, daysToShow);

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
                                <th>Project / File</th>
                                <th>Duration</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

      // Group sessions by project and file path (but display only project and filename)
      const projectFileGroups: Record<string, TimeSession[]> = {};
      sessions.forEach((session) => {
        // Create a unique key combining project and filePath (for grouping)
        const groupKey = `${session.project}:${session.filePath}`;
        if (!projectFileGroups[groupKey]) {
          projectFileGroups[groupKey] = [];
        }
        projectFileGroups[groupKey].push(session);
      });

      // Sort groups by total duration (descending)
      const sortedGroups = Object.entries(projectFileGroups)
        .map(([groupKey, groupSessions]) => {
          const [project, filePath] = groupKey.split(":", 2); // Split only first colon to handle file paths with colons
          const fileName = filePath.split(/[\\/]/).pop() || "Untitled"; // Extract just the file name for display

          const totalDuration = groupSessions.reduce(
            (sum, session) => sum + session.duration,
            0,
          );

          return { project, fileName, filePath, groupSessions, totalDuration };
        })
        .sort((a, b) => b.totalDuration - a.totalDuration);

      sortedGroups.forEach(
        ({ project, fileName, filePath, groupSessions, totalDuration }) => {
          activityHtml += `
          <tr>
            <td colspan="2" style="padding: 0">
              <details>
                <summary style="padding: 6px; display: flex; justify-content: space-between; cursor: pointer;">
                  <span>${project} / ${fileName}</span>
                  <strong>${formatDuration(totalDuration)}</strong>
                </summary>
                <table style="width: 100%; margin: 0; background-color: var(--vscode-editor-inactiveSelectionBackground);">
                  <tbody>
        `;

          // Sort sessions by duration (descending)
          const sortedSessions = [...groupSessions].sort(
            (a, b) => b.duration - a.duration,
          );

          sortedSessions.forEach((session) => {
            // Format the start time to show in the details
            const startTime = new Date(session.startTime).toLocaleTimeString();
            const endTimeStr = session.endTime
              ? new Date(session.endTime).toLocaleTimeString()
              : "ongoing";

            activityHtml += `
            <tr>
              <td style="width: 70%">${startTime} - ${endTimeStr}</td>
              <td style="width: 30%">${formatDuration(session.duration)}</td>
            </tr>
          `;
          });

          activityHtml += `
                  </tbody>
                </table>
              </details>
            </td>
          </tr>
        `;
        },
      );

      activityHtml += `
                        </tbody>
                    </table>
                </div>
            `;
    });

    return activityHtml;
  }
}
