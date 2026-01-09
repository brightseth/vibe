# /vibe macOS Menu Bar App

A native macOS menu bar app that provides easy access to /vibe installation and updates.

## Features

- Lives in the menu bar (no dock icon)
- Install /vibe with one click
- Check for updates
- View installation progress in real-time
- Quick access to ~/.vibe directory

## Setup Instructions

### 1. Create Xcode Project

Since Xcode project files are complex binary formats, follow these steps to create the project:

1. Open Xcode
2. Create a new project: **File → New → Project**
3. Choose **macOS → App** template
4. Configure:
   - **Product Name**: `VibeMacOS`
   - **Team**: Select your developer team
   - **Organization Identifier**: `dev.slashvibe` (or your preference)
   - **Interface**: SwiftUI
   - **Language**: Swift
   - Uncheck "Use Core Data"
   - Uncheck "Include Tests"
5. Save to: `app-macOS/` directory (choose this folder, it will create VibeMacOS.xcodeproj)

### 2. Replace Source Files

After creating the project, replace the generated files with our custom ones:

1. In Xcode, delete the generated `ContentView.swift` file
2. Add our files to the project:
   - `VibeMacOSApp.swift` (replace the generated one)
   - `AppDelegate.swift`
   - `InstallManager.swift`
   - `OutputWindow.swift`
3. Make sure `Info.plist` is used (should be automatic)

### 3. Configure Build Settings

In Xcode:

1. Select the project in the navigator
2. Select the **VibeMacOS** target
3. Go to **Signing & Capabilities**
   - Select your team
   - Ensure "Automatically manage signing" is checked
4. Go to **Info** tab
   - Verify "Application is agent (UIElement)" is set to YES (from LSUIElement in plist)

### 4. Build and Run

1. Press **Cmd+B** to build
2. Press **Cmd+R** to run
3. The app should appear in your menu bar showing "/vibe"

## Usage

Once running, click the "/vibe" menu bar item to see options:

- **Status**: Shows if /vibe is installed
- **Install /vibe**: Runs the install.sh script
- **Check for Updates**: Pulls latest from git
- **Open ~/.vibe**: Opens the vibe directory in Finder
- **Quit**: Exits the app

## Distribution

To distribute the app:

1. Archive the app: **Product → Archive**
2. Export as a signed app
3. Notarize with Apple (for distribution outside App Store)

## File Structure

```
app-macOS/
├── VibeMacOS/
│   ├── VibeMacOSApp.swift      # Main app entry point
│   ├── AppDelegate.swift       # Menu bar logic
│   ├── InstallManager.swift    # Script execution
│   ├── OutputWindow.swift      # Progress window
│   ├── Info.plist             # App configuration
│   └── Resources/             # Assets (icon, etc.)
└── VibeMacOS.xcodeproj/        # Xcode project (created by you)
```

## Notes

- The app uses `/bin/bash` to run install.sh
- Output is shown in a separate window during installation
- LSUIElement in Info.plist makes it a menu bar only app (no dock icon)
- Requires macOS 12.0+ (can adjust deployment target if needed)
