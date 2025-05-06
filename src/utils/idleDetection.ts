import * as vscode from "vscode";

/**
 * Handles idle detection for more accurate time tracking
 */
export class IdleDetector {
  private lastActivity: number = Date.now();
  private idleThreshold: number;
  private idleCheckInterval = 60000; // Check every minute
  private timer: NodeJS.Timeout | undefined;
  private idleDetected = false;
  private disposables: vscode.Disposable[] = [];
  private activeNotification: vscode.MessageItem | undefined;
  private autoDismissEnabled = true;

  /**
   * Creates a new idle detector
   * @param idleThresholdSeconds Seconds of inactivity before considered idle
   * @param onIdleDetected Callback when user goes idle
   * @param onUserReturned Callback when user returns from idle state
   */
  constructor(
    private idleThresholdSeconds: number,
    private onIdleDetected: () => void,
    private onUserReturned?: () => void,
  ) {
    this.idleThreshold = idleThresholdSeconds * 1000; // Convert to milliseconds
    this.updateIdleThresholdFromConfig();
    this.updateAutoDismissFromConfig();

    // Listen for configuration changes
    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("timeTracking.idleThreshold")) {
          this.updateIdleThresholdFromConfig();
        }
        if (
          e.affectsConfiguration("timeTracking.autoDismissIdleNotification")
        ) {
          this.updateAutoDismissFromConfig();
        }
      }),
    );
  }

  /**
   * Starts monitoring for idle state
   */
  public startMonitoring(): void {
    // Record activity for various events
    this.registerActivityEvents();

    // Start the idle check timer
    this.timer = setInterval(
      () => this.checkIdleState(),
      this.idleCheckInterval,
    );
  }

  /**
   * Stops idle monitoring
   */
  public stopMonitoring(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  /**
   * Sets the active notification that should be dismissed on activity
   * @param notification The notification message item to dismiss
   */
  public setActiveNotification(notification: vscode.MessageItem): void {
    this.activeNotification = notification;
  }

  /**
   * Clears the active notification reference
   */
  public clearActiveNotification(): void {
    this.activeNotification = undefined;
  }

  /**
   * Records user activity to reset the idle timer
   */
  public recordActivity(): void {
    this.lastActivity = Date.now();

    // If user was previously idle and is now active again
    if (this.idleDetected) {
      this.idleDetected = false;

      // Dismiss any active idle notification if it exists and auto-dismiss is enabled
      if (this.activeNotification && this.autoDismissEnabled) {
        vscode.commands.executeCommand("workbench.action.closeNotification");
        this.clearActiveNotification();
      }

      if (this.onUserReturned) {
        this.onUserReturned();
      }
    }
  }

  /**
   * Checks if the user is currently idle
   */
  private checkIdleState(): void {
    const now = Date.now();
    const timeSinceLastActivity = now - this.lastActivity;
    // If idle threshold exceeded and we haven't already detected idle
    if (timeSinceLastActivity > this.idleThreshold && !this.idleDetected) {
      this.idleDetected = true;
      this.onIdleDetected();
    }
  }

  /**
   * Returns whether the user is currently in idle state
   */
  public isIdle(): boolean {
    return this.idleDetected;
  }

  /**
   * Returns time since last activity in milliseconds
   */
  public getTimeSinceLastActivity(): number {
    return Date.now() - this.lastActivity;
  }

  /**
   * Updates idle threshold from extension configuration
   */
  private updateIdleThresholdFromConfig(): void {
    const config = vscode.workspace.getConfiguration("timeTracking");
    const configThreshold = config.get<number>("idleThreshold");

    if (configThreshold !== undefined) {
      this.idleThresholdSeconds = configThreshold;
      this.idleThreshold = configThreshold * 1000; // Convert to milliseconds
    }
  }

  /**
   * Updates auto dismiss setting from extension configuration
   */
  private updateAutoDismissFromConfig(): void {
    const config = vscode.workspace.getConfiguration("timeTracking");
    const autoDismiss = config.get<boolean>("autoDismissIdleNotification");

    if (autoDismiss !== undefined) {
      this.autoDismissEnabled = autoDismiss;
    }
  }

  /**
   * Registers all the activity events to monitor
   */
  private registerActivityEvents(): void {
    // Editor events
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(() => this.recordActivity()),
      vscode.window.onDidChangeTextEditorSelection(() => this.recordActivity()),
      vscode.window.onDidChangeTextEditorVisibleRanges(() =>
        this.recordActivity(),
      ),

      // Document events
      vscode.workspace.onDidChangeTextDocument(() => this.recordActivity()),

      // Terminal events
      vscode.window.onDidChangeActiveTerminal(() => this.recordActivity()),
      vscode.window.onDidOpenTerminal(() => this.recordActivity()),

      // Other UI events
      vscode.window.onDidChangeWindowState(() => this.recordActivity()),
    );
  }

  /**
   * Disposes all registered event listeners
   */
  public dispose(): void {
    this.stopMonitoring();
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}
