import { useState, useEffect, useRef } from "react";
import Terminal from "./components/Terminal";
import SessionsDrawer from "./components/SessionsDrawer";
import SocialSidebar from "./components/SocialSidebar";
import DMPanel from "./components/DMPanel";

function App() {
  const [isSessionsDrawerOpen, setIsSessionsDrawerOpen] = useState(false);
  const [activeDM, setActiveDM] = useState<string | null>(null);
  const [watchingUser, setWatchingUser] = useState<{ handle: string; sessionId: string } | null>(null);
  const terminalRef = useRef<any>(null);

  const handleReplaySession = (sessionId: string, speed: "instant" | "2x" | "realtime", fromTimestamp?: number) => {
    if (terminalRef.current?.replaySession) {
      terminalRef.current.replaySession(sessionId, speed, fromTimestamp);
    }
  };

  const handleWatchSession = (userHandle: string, sessionId: string) => {
    setWatchingUser({ handle: userHandle, sessionId });
    // Trigger watch mode in terminal
    if (terminalRef.current?.replaySession) {
      terminalRef.current.replaySession(sessionId, "realtime");
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+Shift+S (Mac) or Ctrl+Shift+S (Windows/Linux) - Sessions
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "S" || e.key === "s")) {
        e.preventDefault();
        setIsSessionsDrawerOpen((prev) => !prev);
      }
      // Escape to close
      if (e.key === "Escape") {
        if (watchingUser) setWatchingUser(null);
        else if (activeDM) setActiveDM(null);
        else if (isSessionsDrawerOpen) setIsSessionsDrawerOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSessionsDrawerOpen, activeDM]);

  return (
    <div style={{ width: "100%", height: "100vh", display: "flex" }}>
      {/* Terminal (80%) */}
      <div style={{ flex: 1 }}>
        <Terminal ref={terminalRef} />
      </div>

      {/* Social Sidebar - /vibe network */}
      <SocialSidebar
        onUserClick={(handle) => setActiveDM(handle)}
        onWatchSession={handleWatchSession}
      />

      {/* Sessions Drawer */}
      <SessionsDrawer
        isOpen={isSessionsDrawerOpen}
        onClose={() => setIsSessionsDrawerOpen(false)}
        onReplaySession={handleReplaySession}
      />

      {/* DM Panel */}
      {activeDM && (
        <DMPanel
          recipient={activeDM}
          onClose={() => setActiveDM(null)}
        />
      )}

      {/* Watch Mode Indicator */}
      {watchingUser && (
        <div
          style={{
            position: "fixed",
            top: "16px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#1a1a1a",
            border: "2px solid #ff5555",
            borderRadius: "8px",
            padding: "12px 20px",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            gap: "12px",
            boxShadow: "0 4px 12px rgba(255, 85, 85, 0.3)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                width: "8px",
                height: "8px",
                background: "#ff5555",
                borderRadius: "50%",
                animation: "pulse 2s infinite",
              }}
            />
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#fff" }}>
              Watching @{watchingUser.handle}
            </span>
          </div>
          <button
            onClick={() => setWatchingUser(null)}
            style={{
              background: "#ff555520",
              border: "1px solid #ff5555",
              borderRadius: "4px",
              color: "#ff5555",
              fontSize: "11px",
              padding: "4px 12px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Stop Watching
          </button>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

export default App;
