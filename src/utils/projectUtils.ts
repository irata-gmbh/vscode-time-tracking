import * as vscode from "vscode";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Detects the project name from various project files or falls back to directory name
 * @param workspaceFolder The workspace folder to check
 * @returns The detected project name
 */
export async function detectProjectName(
  workspaceFolder: vscode.WorkspaceFolder,
): Promise<string> {
  const folderPath = workspaceFolder.uri.fsPath;
  const projectFiles = [
    { file: "package.json", property: "name" },
    { file: "composer.json", property: "name" },
    {
      file: ".git/config",
      property: null,
      regExp: /^\s*url\s*=\s*.+\/([^\/]+?)(?:\.git)?$/m,
    },
    { file: "pubspec.yaml", property: "name", regExp: /^name:\s*(.+)$/m },
    {
      file: "pyproject.toml",
      property: "name",
      regExp: /name\s*=\s*["'](.+)["']/m,
    },
    { file: "setup.py", property: null, regExp: /name\s*=\s*["'](.+)["']/m },
  ];

  // Try to extract name from project files
  for (const { file, property, regExp } of projectFiles) {
    const filePath = path.join(folderPath, file);

    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf8");

        // For JSON files
        if (property && filePath.endsWith(".json")) {
          try {
            const json = JSON.parse(content);
            if (json[property]) {
              return json[property];
            }
          } catch (e) {
            // Continue if JSON parsing fails
          }
        }
        // For files with regex patterns
        else if (regExp) {
          const match = content.match(regExp);
          if (match?.[1]) {
            return match[1].trim();
          }
        }
      }
    } catch (error) {
      // Continue to next file if there's an error
    }
  }

  // Fall back to directory name
  return path.basename(folderPath);
}

/**
 * Gets the current project name based on active editor or workspace
 * @returns The current project name or "No Project" if not in a workspace
 */
export async function getCurrentProjectName(): Promise<string> {
  const editor = vscode.window.activeTextEditor;
  let workspaceFolder: vscode.WorkspaceFolder | undefined;

  // Try to get workspace from current editor
  if (editor) {
    workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
  }

  // If no workspace from editor, get the first workspace folder
  if (
    !workspaceFolder &&
    vscode.workspace.workspaceFolders &&
    vscode.workspace.workspaceFolders.length > 0
  ) {
    workspaceFolder = vscode.workspace.workspaceFolders[0];
  }

  // If we have a workspace folder, detect project name
  if (workspaceFolder) {
    return await detectProjectName(workspaceFolder);
  }

  return "No Project";
}
