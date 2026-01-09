import { useState, useEffect } from "react";
import { vibeClient, type VibeUser, type LiveSession } from "../lib/vibeClient";
import GamesPanel from "./GamesPanel";
import PatternsPanel from "./PatternsPanel";
import { track } from "../lib/tracking";

interface SocialSidebarProps {
  onUserClick: (handle: string) => void;
  onWatchSession: (userHandle: string, sessionId: string) => void;
}

export default function SocialSidebar({ onUserClick, onWatchSession }: SocialSidebarProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<VibeUser[]>([]);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [handle, setHandle] = useState("");
  const [oneLiner, setOneLiner] = useState("");
  const [showSetup, setShowSetup] = useState(false);
  const [activeTab, setActiveTab] = useState<"people" | "games" | "patterns">("people");

  useEffect(() => {
    // Try to load saved /vibe identity
    const savedHandle = localStorage.getItem("vibe_handle");
    const savedOneLiner = localStorage.getItem("vibe_oneliner");

    if (savedHandle && savedOneLiner) {
      connectToVibe(savedHandle, savedOneLiner);
    } else {
      setShowSetup(true);
    }
  }, []);

  const connectToVibe = async (h: string, ol: string) => {
    const success = await vibeClient.initialize(h, ol);
    if (success) {
      setIsConnected(true);
      setShowSetup(false);
      localStorage.setItem("vibe_handle", h);
      localStorage.setItem("vibe_oneliner", ol);
      loadOnlineUsers();
    }
  };

  const loadOnlineUsers = async () => {
    const users = await vibeClient.getOnlineUsers();
    setOnlineUsers(users);
  };

  const loadLiveSessions = async () => {
    const sessions = await vibeClient.getLiveSessions();
    setLiveSessions(sessions);
  };

  useEffect(() => {
    if (!isConnected) return;

    // Poll for online users and live sessions every 10 seconds
    const interval = setInterval(() => {
      loadOnlineUsers();
      loadLiveSessions();
    }, 10000);

    // Load immediately
    loadLiveSessions();

    return () => clearInterval(interval);
  }, [isConnected]);

  if (showSetup) {
    return (
      <div
        style={{
          width: "300px",
          background: "#0a0a0a",
          borderLeft: "1px solid #222",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <h3 style={{ fontSize: "14px", fontWeight: 600, margin: 0 }}>
          Connect to /vibe
        </h3>
        <input
          type="text"
          placeholder="Your handle (e.g., seth)"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
          style={{
            background: "#1a1a1a",
            border: "1px solid #333",
            borderRadius: "4px",
            padding: "8px",
            color: "#fff",
            fontSize: "13px",
            outline: "none",
          }}
        />
        <input
          type="text"
          placeholder="What are you building?"
          value={oneLiner}
          onChange={(e) => setOneLiner(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.stopPropagation();
              if (handle && oneLiner) {
                connectToVibe(handle, oneLiner);
              }
            }
          }}
          style={{
            background: "#1a1a1a",
            border: "1px solid #333",
            borderRadius: "4px",
            padding: "8px",
            color: "#fff",
            fontSize: "13px",
            outline: "none",
          }}
        />
        <button
          onClick={() => handle && oneLiner && connectToVibe(handle, oneLiner)}
          style={{
            background: "#6B8FFF",
            border: "none",
            borderRadius: "4px",
            padding: "8px",
            color: "#fff",
            fontSize: "13px",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Connect
        </button>
        <p style={{ fontSize: "11px", color: "#666", margin: 0 }}>
          Cmd+Shift+S - Sessions
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "300px",
        background: "#0a0a0a",
        borderLeft: "1px solid #222",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Tab switcher */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid #222",
          padding: "8px 16px 0",
        }}
      >
        <button
          onClick={() => {
            const sessionId = localStorage.getItem("vibe_current_session") || "unknown";
            track.tabSwitched(sessionId, activeTab, "people");
            setActiveTab("people");
          }}
          style={{
            flex: 1,
            background: "none",
            border: "none",
            borderBottom: activeTab === "people" ? "2px solid #6B8FFF" : "2px solid transparent",
            color: activeTab === "people" ? "#fff" : "#888",
            padding: "8px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          People
        </button>
        <button
          onClick={() => {
            const sessionId = localStorage.getItem("vibe_current_session") || "unknown";
            track.tabSwitched(sessionId, activeTab, "games");
            setActiveTab("games");
          }}
          style={{
            flex: 1,
            background: "none",
            border: "none",
            borderBottom: activeTab === "games" ? "2px solid #6B8FFF" : "2px solid transparent",
            color: activeTab === "games" ? "#fff" : "#888",
            padding: "8px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Games
        </button>
        <button
          onClick={() => {
            const sessionId = localStorage.getItem("vibe_current_session") || "unknown";
            track.tabSwitched(sessionId, activeTab, "patterns");
            setActiveTab("patterns");
          }}
          style={{
            flex: 1,
            background: "none",
            border: "none",
            borderBottom: activeTab === "patterns" ? "2px solid #6B8FFF" : "2px solid transparent",
            color: activeTab === "patterns" ? "#fff" : "#888",
            padding: "8px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Patterns
        </button>
      </div>

      {activeTab === "people" ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "16px" }}>
          <div style={{ marginBottom: "16px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>
              Online ({onlineUsers.length})
            </h3>
            {isConnected ? (
              <div style={{ fontSize: "11px", color: "#50fa7b" }}>
                ● Connected to /vibe
              </div>
            ) : (
              <div style={{ fontSize: "11px", color: "#666" }}>
                ○ Connecting...
              </div>
            )}
          </div>

          {/* Online users list */}
          <div style={{ flex: 1, overflow: "auto" }}>
            {onlineUsers.length === 0 ? (
              <div style={{ fontSize: "12px", color: "#666" }}>
                No one else online right now
              </div>
            ) : (
              onlineUsers.map((user) => {
                const liveSession = liveSessions.find(s => s.user_handle === user.handle);
                return (
                  <div
                    key={user.handle}
                    style={{
                      padding: "8px",
                      marginBottom: "4px",
                      background: "#1a1a1a",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#252525";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#1a1a1a";
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div
                        onClick={() => {
                          const sessionId = localStorage.getItem("vibe_current_session") || "unknown";
                          track.userClicked(sessionId, user.handle);
                          onUserClick(user.handle);
                        }}
                        style={{ flex: 1 }}
                      >
                        <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "2px", display: "flex", alignItems: "center", gap: "6px" }}>
                          @{user.handle}
                          {liveSession && (
                            <span
                              style={{
                                fontSize: "9px",
                                color: "#ff5555",
                                background: "#ff555520",
                                padding: "2px 6px",
                                borderRadius: "8px",
                                fontWeight: 600,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <span style={{ fontSize: "6px" }}>●</span> LIVE
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: "11px", color: "#888" }}>
                          {user.oneLiner}
                        </div>
                      </div>
                      {liveSession && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const sessionId = localStorage.getItem("vibe_current_session") || "unknown";
                            track.sessionViewed(sessionId, liveSession.session_id);
                            onWatchSession(user.handle, liveSession.session_id);
                          }}
                          style={{
                            background: "#ff555520",
                            border: "1px solid #ff5555",
                            borderRadius: "4px",
                            color: "#ff5555",
                            fontSize: "10px",
                            padding: "4px 8px",
                            cursor: "pointer",
                            fontWeight: 600,
                          }}
                        >
                          Watch
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div style={{ fontSize: "11px", color: "#444", marginTop: "16px" }}>
            <div>Cmd+Shift+S - Sessions</div>
          </div>
        </div>
      ) : activeTab === "games" ? (
        <GamesPanel />
      ) : (
        <PatternsPanel />
      )}
    </div>
  );
}
