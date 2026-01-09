import Cocoa
import SwiftUI

class OutputWindow: NSObject {
    var window: NSWindow?
    var textView: NSTextView?

    func show(title: String) {
        if window == nil {
            createWindow()
        }

        window?.title = title
        textView?.string = ""
        window?.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    func createWindow() {
        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 600, height: 400),
            styleMask: [.titled, .closable, .resizable],
            backing: .buffered,
            defer: false
        )

        window.center()
        window.isReleasedWhenClosed = false

        // Create scroll view with text view
        let scrollView = NSScrollView(frame: window.contentView!.bounds)
        scrollView.autoresizingMask = [.width, .height]
        scrollView.hasVerticalScroller = true
        scrollView.hasHorizontalScroller = false

        let textView = NSTextView(frame: scrollView.bounds)
        textView.autoresizingMask = [.width, .height]
        textView.isEditable = false
        textView.isSelectable = true
        textView.font = NSFont.monospacedSystemFont(ofSize: 11, weight: .regular)
        textView.textContainerInset = NSSize(width: 10, height: 10)

        scrollView.documentView = textView

        window.contentView?.addSubview(scrollView)

        self.window = window
        self.textView = textView
    }

    func appendOutput(_ text: String) {
        guard let textView = textView else { return }

        let attributedString = NSAttributedString(
            string: text,
            attributes: [
                .font: NSFont.monospacedSystemFont(ofSize: 11, weight: .regular),
                .foregroundColor: NSColor.textColor
            ]
        )

        textView.textStorage?.append(attributedString)

        // Scroll to bottom
        textView.scrollToEndOfDocument(nil)
    }

    func close() {
        window?.close()
    }
}
