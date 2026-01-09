import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { invoke } from "@tauri-apps/api/tauri";
import "@xterm/xterm/css/xterm.css";

interface Event {
  id: string;
  session_id: string;
  ts: string;
  kind: string;
  data: string;
}

const Terminal = forwardRef((props, ref) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const sessionIdRef = useRef<string | null>(null); // Use ref to avoid closure issues
  const isReplayingRef = useRef(false);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    replaySession: async (replaySessionId: string, speed: "instant" | "2x" | "realtime", fromTimestamp?: number) => {
      if (!xtermRef.current || isReplayingRef.current) return;

      isReplayingRef.current = true;
      const term = xtermRef.current;

      try {
        // Fetch session events
        let events = await invoke<Event[]>("get_session_events", { sessionId: replaySessionId });

        // Filter events if fromTimestamp is provided
        if (fromTimestamp !== undefined) {
          events = events.filter(event => {
            const eventTime = new Date(event.ts).getTime();
            return eventTime >= fromTimestamp;
          });
        }

        // Clear terminal
        term.clear();
        if (fromTimestamp !== undefined) {
          term.write("\x1b[36m[Replaying from command...]\x1b[0m\r\n\r\n");
        } else {
          term.write("\x1b[36m[Replaying session...]\x1b[0m\r\n\r\n");
        }

        // Calculate timing multiplier
        const speedMultiplier = speed === "instant" ? 0 : speed === "2x" ? 0.5 : 1;

        // Replay events
        for (let i = 0; i < events.length; i++) {
          const event = events[i];

          // Only replay output events
          if (event.kind === "pty_out") {
            term.write(event.data);
          }

          // Add delay based on timing (except for instant)
          if (speedMultiplier > 0 && i < events.length - 1) {
            const currentTime = new Date(event.ts).getTime();
            const nextTime = new Date(events[i + 1].ts).getTime();
            const delay = (nextTime - currentTime) * speedMultiplier;

            if (delay > 0) {
              await new Promise(resolve => setTimeout(resolve, Math.min(delay, 1000))); // Cap at 1s
            }
          }
        }

        term.write("\r\n\r\n\x1b[36m[Replay complete]\x1b[0m\r\n");
      } catch (error) {
        console.error("Replay failed:", error);
        term.write("\r\n\x1b[31m[Replay failed]\x1b[0m\r\n");
      } finally {
        isReplayingRef.current = false;
      }
    },
  }));

  useEffect(() => {
    if (!terminalRef.current) return;

    // Create xterm instance
    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: "'SF Mono', 'Monaco', 'Menlo', monospace",
      theme: {
        background: "#000000",
        foreground: "#ffffff",
        cursor: "#6B8FFF",
        black: "#000000",
        red: "#ff5555",
        green: "#50fa7b",
        yellow: "#f1fa8c",
        blue: "#6B8FFF",
        magenta: "#ff79c6",
        cyan: "#8be9fd",
        white: "#bfbfbf",
        brightBlack: "#4d4d4d",
        brightRed: "#ff6e67",
        brightGreen: "#5af78e",
        brightYellow: "#f4f99d",
        brightBlue: "#8FA8FF",
        brightMagenta: "#ff92d0",
        brightCyan: "#9aedfe",
        brightWhite: "#e6e6e6",
      },
      allowProposedApi: true,
    });

    // Add addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);

    // Open terminal
    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Focus the terminal so it can receive keyboard input
    term.focus();

    // Handle resize
    const handleResize = () => {
      fitAddon.fit();
      if (sessionId) {
        invoke("resize_pty", {
          cols: term.cols,
          rows: term.rows,
        }).catch(console.error);
      }
    };

    window.addEventListener("resize", handleResize);

    // Global click handler to refocus terminal
    const handleGlobalClick = () => term.focus();
    window.addEventListener("click", handleGlobalClick);

    // Handle user input
    term.onData((data) => {
      // Use ref to get current session ID (avoids closure issue)
      const currentSessionId = sessionIdRef.current;
      if (currentSessionId) {
        const encoder = new TextEncoder();
        const bytes = encoder.encode(data);
        invoke("send_input", { data: Array.from(bytes) }).catch(console.error);
      }
    });

    // Start PTY session
    invoke<string>("start_session", {
      cols: term.cols,
      rows: term.rows,
    })
      .then((id) => {
        setSessionId(id);
        sessionIdRef.current = id; // Update ref for input handler
        localStorage.setItem("vibe_current_session", id); // Make available globally
        setIsReady(true);
        // Focus terminal again after session starts
        setTimeout(() => term.focus(), 100);
      })
      .catch((error) => {
        console.error("Failed to start session:", error);
        term.write("\r\n\x1b[31mFailed to start terminal session\x1b[0m\r\n");
      });

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("click", handleGlobalClick);
      if (sessionId) {
        invoke("end_session").catch(console.error);
      }
      term.dispose();
    };
  }, []);

  // Output polling loop
  useEffect(() => {
    if (!isReady || !xtermRef.current) return;

    const pollInterval = setInterval(() => {
      // Read terminal output
      invoke<number[] | null>("read_output")
        .then((output) => {
          if (output && xtermRef.current) {
            const decoder = new TextDecoder();
            const text = decoder.decode(new Uint8Array(output));
            xtermRef.current.write(text);
          }
        })
        .catch(console.error);

      // Process OSC events for command tracking
      invoke("process_osc_events").catch(console.error);
    }, 10); // Poll every 10ms for low latency

    return () => clearInterval(pollInterval);
  }, [isReady]);

  return (
    <div
      ref={terminalRef}
      onClick={() => {
        // Focus terminal when clicked
        if (xtermRef.current) {
          xtermRef.current.focus();
        }
      }}
      style={{
        width: "100%",
        height: "100%",
        padding: "8px",
        cursor: "text",
      }}
    />
  );
});

Terminal.displayName = "Terminal";
export default Terminal;
