// Interaction tracking - captures behavioral patterns for UI evolution
import { invoke } from "@tauri-apps/api";

export interface Interaction {
  id: string;
  session_id: string;
  timestamp: string;
  interaction_type: string;
  context: string;
  target: string | null;
  outcome: string;
  metadata: string | null;
}

export interface PatternSuggestion {
  interaction_type: string;
  count: number;
  suggestion: string;
}

// Track any user interaction
export async function trackInteraction(
  sessionId: string,
  interactionType: string,
  context: string,
  target?: string,
  outcome: string = "success",
  metadata?: any
): Promise<void> {
  try {
    await invoke("track_interaction", {
      sessionId,
      interactionType,
      context,
      target: target || null,
      outcome,
      metadata: metadata ? JSON.stringify(metadata) : null,
    });
  } catch (error) {
    console.error("Failed to track interaction:", error);
  }
}

// Get recent interaction patterns
export async function getPatterns(limit: number = 100): Promise<Interaction[]> {
  try {
    return await invoke<Interaction[]>("get_interaction_patterns", { limit });
  } catch (error) {
    console.error("Failed to get patterns:", error);
    return [];
  }
}

// Get common behaviors (desire paths)
export async function getCommonPatterns(
  hours: number = 24,
  minOccurrences: number = 3
): Promise<[string, number][]> {
  try {
    return await invoke<[string, number][]>("get_common_patterns", {
      hours,
      minOccurrences,
    });
  } catch (error) {
    console.error("Failed to get common patterns:", error);
    return [];
  }
}

// Get friction points (where users struggle)
export async function getFrictionPoints(hours: number = 24): Promise<Interaction[]> {
  try {
    return await invoke<Interaction[]>("get_friction_points", { hours });
  } catch (error) {
    console.error("Failed to get friction points:", error);
    return [];
  }
}

// Analyze patterns and suggest UI improvements
export async function analyzeDesirePaths(): Promise<PatternSuggestion[]> {
  const patterns = await getCommonPatterns(24, 5);
  const suggestions: PatternSuggestion[] = [];

  for (const [interactionType, count] of patterns) {
    let suggestion = "";

    // Pattern matching → UI suggestions
    if (interactionType === "message_sent" && count > 20) {
      suggestion = "People are messaging a lot. Consider adding quick-reply shortcuts.";
    } else if (interactionType === "game_started" && count > 10) {
      suggestion = "Games are popular! Add a 'Recent Games' quick-access panel.";
    } else if (interactionType === "session_viewed" && count > 15) {
      suggestion = "Session viewing is common. Add 'Watch Live' notification.";
    } else if (interactionType === "user_clicked" && count > 30) {
      suggestion = "Users click profiles a lot. Add hover previews.";
    } else if (interactionType.includes("_abandoned")) {
      suggestion = `Flow '${interactionType}' is being abandoned. Simplify it.`;
    }

    if (suggestion) {
      suggestions.push({
        interaction_type: interactionType,
        count,
        suggestion,
      });
    }
  }

  return suggestions;
}

// Track helpers for common interactions
export const track = {
  messageSent: (sessionId: string, recipient: string, message: string) =>
    trackInteraction(
      sessionId,
      "message_sent",
      `Sent message to @${recipient}`,
      recipient,
      "success",
      { message_length: message.length }
    ),

  gameStarted: (sessionId: string, gameType: string) =>
    trackInteraction(
      sessionId,
      "game_started",
      `Started ${gameType} game`,
      gameType,
      "success"
    ),

  gameMove: (sessionId: string, gameId: string, gameType: string) =>
    trackInteraction(
      sessionId,
      "game_move",
      `Made move in ${gameType}`,
      gameId,
      "success"
    ),

  sessionViewed: (sessionId: string, targetSessionId: string) =>
    trackInteraction(
      sessionId,
      "session_viewed",
      `Viewed session ${targetSessionId.slice(0, 8)}`,
      targetSessionId,
      "success"
    ),

  sessionShared: (sessionId: string, targetSessionId: string) =>
    trackInteraction(
      sessionId,
      "session_shared",
      `Shared session ${targetSessionId.slice(0, 8)}`,
      targetSessionId,
      "success"
    ),

  userClicked: (sessionId: string, userHandle: string) =>
    trackInteraction(
      sessionId,
      "user_clicked",
      `Clicked on @${userHandle}`,
      userHandle,
      "success"
    ),

  tabSwitched: (sessionId: string, fromTab: string, toTab: string) =>
    trackInteraction(
      sessionId,
      "tab_switched",
      `Switched from ${fromTab} to ${toTab}`,
      toTab,
      "success"
    ),

  commandRun: (sessionId: string, command: string, exitCode: number) =>
    trackInteraction(
      sessionId,
      "command_run",
      command,
      null,
      exitCode === 0 ? "success" : "error",
      { exit_code: exitCode }
    ),

  flowAbandoned: (sessionId: string, flowName: string, reason?: string) =>
    trackInteraction(
      sessionId,
      `${flowName}_abandoned`,
      reason || "User abandoned flow",
      null,
      "abandoned"
    ),

  friction: (sessionId: string, action: string, reason: string) =>
    trackInteraction(
      sessionId,
      action,
      reason,
      null,
      "friction"
    ),
};
