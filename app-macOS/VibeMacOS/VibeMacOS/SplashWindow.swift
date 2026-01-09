import Cocoa

class SplashWindow: NSWindow {

  init() {
    let windowSize = NSSize(width: 400, height: 300)
    let screenSize = NSScreen.main?.frame.size ?? NSSize(width: 1920, height: 1080)
    let origin = NSPoint(
      x: (screenSize.width - windowSize.width) / 2,
      y: (screenSize.height - windowSize.height) / 2
    )

    super.init(
      contentRect: NSRect(origin: origin, size: windowSize),
      styleMask: [.borderless],
      backing: .buffered,
      defer: false
    )

    // Window setup
    self.isOpaque = false
    self.backgroundColor = NSColor.clear
    self.level = .floating
    self.hasShadow = true
    self.isReleasedWhenClosed = false

    // Create content view
    let contentView = NSView(frame: NSRect(origin: .zero, size: windowSize))

    // Background with rounded corners
    let backgroundLayer = CALayer()
    backgroundLayer.frame = contentView.bounds
    backgroundLayer.backgroundColor = NSColor.windowBackgroundColor.cgColor
    backgroundLayer.cornerRadius = 20
    backgroundLayer.shadowColor = NSColor.black.cgColor
    backgroundLayer.shadowOpacity = 0.3
    backgroundLayer.shadowOffset = CGSize(width: 0, height: -5)
    backgroundLayer.shadowRadius = 15
    contentView.wantsLayer = true
    contentView.layer?.addSublayer(backgroundLayer)

    // Icon
    let iconImageView = NSImageView(frame: NSRect(x: 150, y: 150, width: 100, height: 100))
    iconImageView.image = NSImage(named: "SplashIcon")
    iconImageView.imageScaling = .scaleProportionallyUpOrDown
    contentView.addSubview(iconImageView)

    // Welcome text
    let welcomeLabel = NSTextField(labelWithString: "welcome to")
    welcomeLabel.font = NSFont.systemFont(ofSize: 24, weight: .light)
    welcomeLabel.textColor = NSColor.secondaryLabelColor
    welcomeLabel.alignment = .center
    welcomeLabel.frame = NSRect(x: 0, y: 120, width: windowSize.width, height: 30)
    contentView.addSubview(welcomeLabel)

    // /vibe text
    let vibeLabel = NSTextField(labelWithString: "/vibe")
    vibeLabel.font = NSFont.systemFont(ofSize: 48, weight: .bold)
    vibeLabel.textColor = NSColor.labelColor
    vibeLabel.alignment = .center
    vibeLabel.frame = NSRect(x: 0, y: 70, width: windowSize.width, height: 60)
    contentView.addSubview(vibeLabel)

    // Tagline
    let taglineLabel = NSTextField(labelWithString: "terminal-native social")
    taglineLabel.font = NSFont.systemFont(ofSize: 14, weight: .regular)
    taglineLabel.textColor = NSColor.tertiaryLabelColor
    taglineLabel.alignment = .center
    taglineLabel.frame = NSRect(x: 0, y: 45, width: windowSize.width, height: 20)
    contentView.addSubview(taglineLabel)

    self.contentView = contentView

    // Add fade-in animation
    self.alphaValue = 0
    NSAnimationContext.runAnimationGroup { context in
      context.duration = 0.3
      self.animator().alphaValue = 1.0
    }
  }

  func dismiss() {
    NSAnimationContext.runAnimationGroup({ context in
      context.duration = 0.3
      self.animator().alphaValue = 0
    }, completionHandler: {
      self.close()
    })
  }
}
