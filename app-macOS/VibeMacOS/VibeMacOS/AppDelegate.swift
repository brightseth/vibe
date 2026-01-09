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

        menu.addItem(NSMenuItem.separator())

        // Install
        menu.addItem(NSMenuItem(title: "Install /vibe", action: #selector(runInstall), keyEquivalent: "i"))

        // Update
        menu.addItem(NSMenuItem(title: "Check for Updates", action: #selector(checkUpdates), keyEquivalent: "u"))

        menu.addItem(NSMenuItem.separator())

        // Open vibe directory
        menu.addItem(NSMenuItem(title: "Open ~/.vibe", action: #selector(openVibeDirectory), keyEquivalent: "o"))

        menu.addItem(NSMenuItem.separator())

        // Quit
        menu.addItem(NSMenuItem(title: "Quit", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q"))

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

    @objc func runInstall() {
        guard let installManager = installManager else { return }

        // Show output window
        showOutputWindow(title: "Installing /vibe")

        // Find install.sh in the parent directory
        let installScript = FileManager.default.currentDirectoryPath + "/../install.sh"

        installManager.runScript(at: installScript) { [weak self] output in
            DispatchQueue.main.async {
                self?.outputWindow?.appendOutput(output)
            }
        } completion: { [weak self] success in
            DispatchQueue.main.async {
                if success {
                    self?.outputWindow?.appendOutput("\n✅ Installation complete!\n")
                    self?.setupMenu() // Refresh menu status
                } else {
                    self?.outputWindow?.appendOutput("\n❌ Installation failed\n")
                }
            }
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
}
