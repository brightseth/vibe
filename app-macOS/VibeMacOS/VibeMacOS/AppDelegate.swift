import Cocoa
import SwiftUI

class AppDelegate: NSObject, NSApplicationDelegate {
    var statusItem: NSStatusItem?
    var installManager: InstallManager?
    var outputWindow: OutputWindow?

    func applicationDidFinishLaunching(_ notification: Notification) {
        // Hide from dock - we're a menu bar app only
        NSApp.setActivationPolicy(.accessory)

        // Create status bar item
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)

        if let button = statusItem?.button {
            // Use a simple text icon for now - can be replaced with image
            button.title = "/vibe"
            button.action = #selector(toggleMenu)
            button.target = self
        }

        // Create install manager
        installManager = InstallManager()

        // Build menu
        setupMenu()

        // Check for first run
        checkFirstRun()
    }

    @objc func toggleMenu() {
        // Menu is shown automatically when clicking status item
    }

    func setupMenu() {
        let menu = NSMenu()

        // Status item
        let statusItem = NSMenuItem(title: "Status: \(getInstallStatus())", action: nil, keyEquivalent: "")
        statusItem.isEnabled = false
        menu.addItem(statusItem)

        // Version item
        let versionItem = NSMenuItem(title: "App Version: \(getAppVersion())", action: nil, keyEquivalent: "")
        versionItem.isEnabled = false
        menu.addItem(versionItem)

        menu.addItem(NSMenuItem.separator())

        // Install
        menu.addItem(NSMenuItem(title: "Install /vibe", action: #selector(runInstall), keyEquivalent: ""))

        // Update
        menu.addItem(NSMenuItem(title: "Check for Updates", action: #selector(checkUpdates), keyEquivalent: ""))

        menu.addItem(NSMenuItem.separator())

        // Open vibe directory
        menu.addItem(NSMenuItem(title: "Open ~/.vibe", action: #selector(openVibeDirectory), keyEquivalent: ""))

        menu.addItem(NSMenuItem.separator())

        // Quit
        menu.addItem(NSMenuItem(title: "Quit", action: #selector(NSApplication.terminate(_:)), keyEquivalent: ""))

        self.statusItem?.menu = menu
    }

    func getInstallStatus() -> String {
        let vibeDir = NSHomeDirectory() + "/.vibe"
        let repoDir = vibeDir + "/vibe-repo"

        let fileManager = FileManager.default

        if !fileManager.fileExists(atPath: repoDir) {
            return "Not Installed"
        }

        // Check if git repo exists and is up to date
        if fileManager.fileExists(atPath: repoDir + "/.git") {
            return "Installed"
        }

        return "Unknown"
    }

    func getAppVersion() -> String {
        let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "Unknown"
        let build = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "Unknown"
        return "\(version) (\(build))"
    }

    @objc func runInstall() {
        // Check if Claude Code is installed first
        if !isClaudeInstalled() {
            showClaudeNotInstalledAlert()
            return
        }

        // Use Terminal for interactive installation
        openTerminalForInstall()

        // Refresh menu after a delay to pick up installation status
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) { [weak self] in
            self?.setupMenu()
        }
    }

    @objc func checkUpdates() {
        guard let installManager = installManager else { return }

        let vibeDir = NSHomeDirectory() + "/.vibe/vibe-repo"

        if !FileManager.default.fileExists(atPath: vibeDir) {
            showAlert(title: "Not Installed", message: "Please install /vibe first")
            return
        }

        showOutputWindow(title: "Checking for Updates")

        // Run git pull
        installManager.runCommand("cd \(vibeDir) && git pull") { [weak self] output in
            DispatchQueue.main.async {
                self?.outputWindow?.appendOutput(output)
            }
        } completion: { [weak self] success in
            DispatchQueue.main.async {
                if success {
                    self?.outputWindow?.appendOutput("\n✅ Update check complete\n")
                } else {
                    self?.outputWindow?.appendOutput("\n❌ Update failed\n")
                }
            }
        }
    }

    @objc func openVibeDirectory() {
        let vibeDir = NSHomeDirectory() + "/.vibe"
        NSWorkspace.shared.selectFile(nil, inFileViewerRootedAtPath: vibeDir)
    }

    func showOutputWindow(title: String) {
        if outputWindow == nil {
            outputWindow = OutputWindow()
        }
        outputWindow?.show(title: title)
    }

    func showAlert(title: String, message: String) {
        let alert = NSAlert()
        alert.messageText = title
        alert.informativeText = message
        alert.alertStyle = .informational
        alert.addButton(withTitle: "OK")
        alert.runModal()
    }

    func checkFirstRun() {
        let defaults = UserDefaults.standard
        let hasRunBefore = defaults.bool(forKey: "HasRunBefore")

        // Check if /vibe is installed
        let vibeDir = NSHomeDirectory() + "/.vibe/vibe-repo"
        let isInstalled = FileManager.default.fileExists(atPath: vibeDir)

        if !hasRunBefore && !isInstalled {
            // Mark as run before showing the alert
            defaults.set(true, forKey: "HasRunBefore")

            // Check if Claude Code is installed first
            if !isClaudeInstalled() {
                DispatchQueue.main.async { [weak self] in
                    self?.showClaudeNotInstalledAlert()
                }
            } else {
                // Show prompt to install
                DispatchQueue.main.async { [weak self] in
                    self?.promptForInstallation()
                }
            }
        }
    }

    func isClaudeInstalled() -> Bool {
        // Try running 'which claude' with proper shell environment
        let task = Process()
        task.executableURL = URL(fileURLWithPath: "/bin/bash")
        task.arguments = ["-l", "-c", "which claude"]

        let pipe = Pipe()
        task.standardOutput = pipe
        task.standardError = pipe

        do {
            try task.run()
            task.waitUntilExit()

            // Read output to see if we got a path
            let data = pipe.fileHandleForReading.readDataToEndOfFile()
            if let output = String(data: data, encoding: .utf8), !output.isEmpty {
                return true
            }

            return task.terminationStatus == 0
        } catch {
            return false
        }
    }

    func showClaudeNotInstalledAlert() {
        let alert = NSAlert()
        alert.messageText = "Claude Code Not Found"
        alert.informativeText = "/vibe requires Claude Code to be installed.\n\nPlease install Claude Code first, then run this app again.\n\nVisit: https://github.com/anthropics/anthropic-quickstarts"
        alert.alertStyle = .warning
        alert.addButton(withTitle: "OK")
        alert.runModal()
    }

    func promptForInstallation() {
        let alert = NSAlert()
        alert.messageText = "Welcome to /vibe!"
        alert.informativeText = "/vibe is not installed yet. Would you like to install it now?\n\nThis will open Terminal for an interactive installation."
        alert.alertStyle = .informational
        alert.addButton(withTitle: "Install Now")
        alert.addButton(withTitle: "Later")

        let response = alert.runModal()

        if response == .alertFirstButtonReturn {
            // User clicked "Install Now"
            openTerminalForInstall()
        }
    }

    func openTerminalForInstall() {
        // Use the raw GitHub URL for the latest install.sh
        let installURL = "https://raw.githubusercontent.com/brightseth/vibe/main/install.sh"

        // Create a temporary script that Terminal will execute
        let tempDir = NSTemporaryDirectory()
        let scriptPath = (tempDir as NSString).appendingPathComponent("vibe-install-\(UUID().uuidString).command")

        let scriptContent = """
        #!/bin/bash
        # Set terminal window title with bold italic Unicode
        echo -ne "\\033]0;😎 𝐈𝐧𝐬𝐭𝐚𝐥𝐥𝐢𝐧𝐠 /𝐯𝐢𝐛𝐞\\007"
        clear
        echo "Installing /vibe..."
        echo ""
        curl -fsSL '\(installURL)' | bash
        echo ""
        echo "Installation of /vibe complete!"
        echo ""
        echo "Press any key to launch Claude Code..."
        read -n 1 -s
        # Update title before launching Claude
        echo -ne "\\033]0;𝑳𝒂𝒖𝒏𝒄𝒉𝒊𝒏𝒈 𝑪𝒍𝒂𝒖𝒅𝒆 𝑪𝒐𝒅𝒆\\007"
        claude
        """

        do {
            try scriptContent.write(toFile: scriptPath, atomically: true, encoding: .utf8)

            // Make it executable
            let chmod = Process()
            chmod.executableURL = URL(fileURLWithPath: "/bin/chmod")
            chmod.arguments = ["+x", scriptPath]
            try chmod.run()
            chmod.waitUntilExit()

            // Open with Terminal using NSWorkspace (no permissions needed)
            NSWorkspace.shared.openFile(scriptPath, withApplication: "Terminal")

        } catch {
            showAlert(title: "Error", message: "Failed to create installation script: \(error.localizedDescription)")
        }
    }
}
