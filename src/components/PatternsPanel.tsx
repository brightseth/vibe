import { useState, useEffect } from "react";
import { getCommonPatterns, getFrictionPoints, analyzeDesirePaths, type PatternSuggestion } from "../lib/tracking";

export default function PatternsPanel() {
  const [patterns, setPatterns] = useState<[string, number][]>([]);
  const [suggestions, setSuggestions] = useState<PatternSuggestion[]>([]);
  const [friction, setFriction] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPatterns();
    const interval = setInterval(loadPatterns, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadPatterns = async () => {
    setLoading(true);
    try {
      const [commonPatterns, desirePaths, frictionPoints] = await Promise.all([
        getCommonPatterns(24, 3),
        analyzeDesirePaths(),
        getFrictionPoints(24),
      ]);

      setPatterns(commonPatterns);
      setSuggestions(desirePaths);
      setFriction(frictionPoints);
    } catch (error) {
      console.error("Failed to load patterns:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "20px", flex: 1, overflow: "auto" }}>
      <div>
        <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
          <span>🧭</span> Desire Paths
        </h3>
        <p style={{ fontSize: "11px", color: "#888", marginBottom: "16px", lineHeight: "1.5" }}>
          Emerging patterns from actual usage. The interface evolves based on what people really do.
        </p>

        {loading ? (
          <div style={{ fontSize: "12px", color: "#666", textAlign: "center", padding: "20px 0" }}>
            Analyzing behavior...
          </div>
        ) : suggestions.length === 0 ? (
          <div style={{ fontSize: "12px", color: "#666", textAlign: "center", padding: "20px 0" }}>
            Not enough data yet. Keep using the terminal!
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                style={{
                  background: "#1a1a1a",
                  border: "1px solid #333",
                  borderRadius: "6px",
                  padding: "12px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "#6B8FFF" }}>
                    {suggestion.interaction_type.replace(/_/g, " ")}
                  </div>
                  <div
                    style={{
                      background: "#6B8FFF20",
                      color: "#6B8FFF",
                      fontSize: "10px",
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: "12px",
                    }}
                  >
                    {suggestion.count}x
                  </div>
                </div>
                <div style={{ fontSize: "11px", color: "#bbb", lineHeight: "1.5" }}>
                  {suggestion.suggestion}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
          <span>📊</span> Common Patterns
        </h3>

        {patterns.length === 0 ? (
          <div style={{ fontSize: "12px", color: "#666" }}>No patterns detected yet</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {patterns.map(([type, count], index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  background: "#1a1a1a",
                  borderRadius: "4px",
                  fontSize: "12px",
                }}
              >
                <span style={{ color: "#ccc" }}>{type.replace(/_/g, " ")}</span>
                <span style={{ color: "#888" }}>{count}x</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {friction.length > 0 && (
        <div>
          <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span>⚠️</span> Friction Points
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {friction.slice(0, 5).map((point, index) => (
              <div
                key={index}
                style={{
                  padding: "10px 12px",
                  background: "#2a1a1a",
                  border: "1px solid #442",
                  borderRadius: "4px",
                }}
              >
                <div style={{ fontSize: "11px", color: "#ff8888", fontWeight: 600, marginBottom: "4px" }}>
                  {point.interaction_type.replace(/_/g, " ")}
                </div>
                <div style={{ fontSize: "10px", color: "#aaa" }}>
                  {point.context}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ fontSize: "10px", color: "#555", textAlign: "center", paddingTop: "12px", borderTop: "1px solid #222" }}>
        This panel evolves as you use the terminal. Patterns become features.
      </div>
    </div>
  );
}
