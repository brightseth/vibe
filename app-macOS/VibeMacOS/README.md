# /vibe macOS Menu Bar App

A native macOS menu bar app that provides easy access to /vibe installation and updates.

## Features

- Lives in the menu bar (no dock icon)
- Install /vibe with one click
- Check for updates
- View installation progress in real-time
- Quick access to ~/.vibe directory

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
