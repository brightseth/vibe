import { useState, useRef, useEffect } from "react";
import { vibeClient, type VibeMessage } from "../lib/vibeClient";
import { track } from "../lib/tracking";

interface DMPanelProps {
  recipient: string;
  onClose: () => void;
}

export default function DMPanel({ recipient, onClose }: DMPanelProps) {
  const [messages, setMessages] = useState<VibeMessage[]>([]);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus input when panel opens
    setTimeout(() => inputRef.current?.focus(), 100);

    // Load messages for this recipient
    loadMessages();
  }, [recipient]);

  const loadMessages = async () => {
    const allMessages = await vibeClient.getMessages();
    // Filter messages with this recipient
    const threadMessages = allMessages.filter(
      (m) => m.from === recipient || m.to === recipient
    );
    setMessages(threadMessages);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const success = await vibeClient.sendMessage(recipient, input);
    if (success) {
      // Add to local state optimistically
      const newMessage: VibeMessage = {
        id: Date.now().toString(),
        from: "you",
        to: recipient,
        content: input,
        timestamp: new Date().toISOString(),
      };
      setMessages([...messages, newMessage]);

      // Track interaction for pattern analysis
      const sessionId = localStorage.getItem("vibe_current_session") || "unknown";
      track.messageSent(sessionId, recipient, input);

      setInput("");
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 300, // Leave space for social sidebar
        height: "300px",
        background: "#1a1a1a",
        borderTop: "1px solid #333",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        color: "#fff",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #333",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "14px", fontWeight: 600 }}>
            @{recipient}
          </span>
          <span style={{ fontSize: "11px", color: "#666" }}>
            {messages.length} messages
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#888",
            fontSize: "20px",
            cursor: "pointer",
            padding: "0 8px",
          }}
        >
          ×
        </button>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {messages.length === 0 ? (
          <div style={{ fontSize: "13px", color: "#666", textAlign: "center" }}>
            No messages yet. Say hi!
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: msg.from === "you" ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  color: "#666",
                  marginBottom: "4px",
                }}
              >
                {msg.from === "you" ? "You" : `@${msg.from}`}
              </div>
              <div
                style={{
                  background: msg.from === "you" ? "#6B8FFF" : "#2a2a2a",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  maxWidth: "70%",
                  fontSize: "13px",
                }}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div
        style={{
          borderTop: "1px solid #333",
          padding: "12px 16px",
          display: "flex",
          gap: "8px",
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.stopPropagation();
              sendMessage();
            }
          }}
          onClick={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
          placeholder={`Message @${recipient}...`}
          style={{
            flex: 1,
            background: "#2a2a2a",
            border: "1px solid #444",
            borderRadius: "4px",
            padding: "8px 12px",
            color: "#fff",
            fontSize: "13px",
            outline: "none",
          }}
        />
        <button
          onClick={sendMessage}
          style={{
            background: "#6B8FFF",
            border: "none",
            borderRadius: "4px",
            padding: "8px 16px",
            color: "#fff",
            fontSize: "13px",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
