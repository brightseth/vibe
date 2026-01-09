// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;
mod osc;
mod pty;
mod zdotdir;

use db::Database;
use osc::OscEvent;
use pty::PtySession;
use std::sync::Mutex;
use tauri::State;

struct AppState {
    db: Mutex<Database>,
    pty: Mutex<Option<PtySession>>,
    current_command_id: Mutex<Option<String>>,
}

#[tauri::command]
fn start_session(
    state: State<AppState>,
    cols: u16,
    rows: u16,
) -> Result<String, String> {
    let cwd = std::env::current_dir()
        .unwrap_or_else(|_| std::path::PathBuf::from("/"))
        .to_string_lossy()
        .to_string();

    let shell = if cfg!(target_os = "macos") {
        "/bin/zsh".to_string()
    } else {
        std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".to_string())
    };

    // Create session in database
    let db = state.db.lock().unwrap();
    let session = db
        .create_session(&cwd, &shell)
        .map_err(|e| format!("Failed to create session: {}", e))?;

    let session_id = session.id.clone();

    // Create PTY
    let pty_session = PtySession::new(session_id.clone(), cols, rows)
        .map_err(|e| format!("Failed to create PTY: {}", e))?;

    let mut pty = state.pty.lock().unwrap();
    *pty = Some(pty_session);

    Ok(session_id)
}

#[tauri::command]
fn send_input(state: State<AppState>, data: Vec<u8>) -> Result<(), String> {
    let pty = state.pty.lock().unwrap();
    if let Some(ref session) = *pty {
        session
            .write_input(&data)
            .map_err(|e| format!("Failed to write input: {}", e))?;

        // Log input to database
        let db = state.db.lock().unwrap();
        let data_str = String::from_utf8_lossy(&data).to_string();
        db.add_event(&session.session_id, "user_in", &data_str)
            .map_err(|e| format!("Failed to log input: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
fn read_output(state: State<AppState>) -> Result<Option<Vec<u8>>, String> {
    let pty = state.pty.lock().unwrap();
    if let Some(ref session) = *pty {
        if let Some(data) = session.read_output() {
            // Log output to database
            let db = state.db.lock().unwrap();
            let data_str = String::from_utf8_lossy(&data).to_string();
            db.add_event(&session.session_id, "pty_out", &data_str)
                .ok(); // Don't fail on log errors

            return Ok(Some(data));
        }
    }
    Ok(None)
}

#[tauri::command]
fn process_osc_events(state: State<AppState>) -> Result<(), String> {
    let pty = state.pty.lock().unwrap();
    if let Some(ref session) = *pty {
        let events = session.read_osc_events();
        let session_id = session.session_id.clone();
        drop(pty); // Release lock before database operations

        for event in events {
            match event {
                OscEvent::CommandText(cmd_text) => {
                    // Command starting - create new command record
                    let db = state.db.lock().unwrap();
                    match db.create_command(&session_id, &cmd_text) {
                        Ok(cmd_id) => {
                            println!("🎵 Command started: {}", cmd_text);
                            let mut current = state.current_command_id.lock().unwrap();
                            *current = Some(cmd_id);
                        }
                        Err(e) => eprintln!("Failed to create command: {}", e),
                    }
                }
                OscEvent::CommandEnd(exit_code) => {
                    // Command ended - update with exit code
                    let db = state.db.lock().unwrap();
                    if let Err(e) = db.end_command(&session_id, exit_code) {
                        eprintln!("Failed to end command: {}", e);
                    } else {
                        let emoji = if exit_code == 0 { "✅" } else { "❌" };
                        println!("{} Command completed with exit code: {}", emoji, exit_code);
                    }
                    let mut current = state.current_command_id.lock().unwrap();
                    *current = None;
                }
                _ => {} // Ignore other OSC events for now
            }
        }
    }
    Ok(())
}

#[tauri::command]
fn resize_pty(state: State<AppState>, cols: u16, rows: u16) -> Result<(), String> {
    let mut pty = state.pty.lock().unwrap();
    if let Some(ref mut session) = *pty {
        session
            .resize(cols, rows)
            .map_err(|e| format!("Failed to resize: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
fn end_session(state: State<AppState>) -> Result<(), String> {
    let mut pty = state.pty.lock().unwrap();
    if let Some(session) = pty.take() {
        let db = state.db.lock().unwrap();
        db.end_session(&session.session_id)
            .map_err(|e| format!("Failed to end session: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
fn get_recent_sessions(state: State<AppState>, limit: usize) -> Result<Vec<db::Session>, String> {
    let db = state.db.lock().unwrap();
    db.get_recent_sessions(limit)
        .map_err(|e| format!("Failed to get sessions: {}", e))
}

#[tauri::command]
fn get_session_events(state: State<AppState>, session_id: String) -> Result<Vec<db::Event>, String> {
    let db = state.db.lock().unwrap();
    db.get_events(&session_id)
        .map_err(|e| format!("Failed to get events: {}", e))
}

#[tauri::command]
fn get_sessions_with_commands(state: State<AppState>, limit: usize) -> Result<Vec<db::SessionSummary>, String> {
    let db = state.db.lock().unwrap();
    db.get_sessions_with_commands(limit)
        .map_err(|e| format!("Failed to get sessions: {}", e))
}

#[tauri::command]
fn get_commands(state: State<AppState>, session_id: String) -> Result<Vec<db::Command>, String> {
    let db = state.db.lock().unwrap();
    db.get_commands(&session_id)
        .map_err(|e| format!("Failed to get commands: {}", e))
}

#[tauri::command]
fn export_session_json(state: State<AppState>, session_id: String) -> Result<String, String> {
    let db = state.db.lock().unwrap();

    // Get session
    let session = db.get_session(&session_id)
        .map_err(|e| format!("Failed to get session: {}", e))?
        .ok_or("Session not found")?;

    // Get commands
    let commands = db.get_commands(&session_id)
        .map_err(|e| format!("Failed to get commands: {}", e))?;

    // Get events
    let events = db.get_events(&session_id)
        .map_err(|e| format!("Failed to get events: {}", e))?;

    // Build export structure
    let export = serde_json::json!({
        "version": "1.0",
        "exported_at": chrono::Utc::now().to_rfc3339(),
        "session": session,
        "commands": commands,
        "events": events,
    });

    serde_json::to_string_pretty(&export)
        .map_err(|e| format!("Failed to serialize: {}", e))
}

// Interaction tracking commands
#[tauri::command]
fn track_interaction(
    state: State<AppState>,
    session_id: String,
    interaction_type: String,
    context: String,
    target: Option<String>,
    outcome: String,
    metadata: Option<String>,
) -> Result<String, String> {
    let db = state.db.lock().unwrap();
    db.track_interaction(
        &session_id,
        &interaction_type,
        &context,
        target.as_deref(),
        &outcome,
        metadata.as_deref(),
    )
    .map_err(|e| format!("Failed to track interaction: {}", e))
}

#[tauri::command]
fn get_interaction_patterns(
    state: State<AppState>,
    limit: usize,
) -> Result<Vec<db::Interaction>, String> {
    let db = state.db.lock().unwrap();
    db.get_interaction_patterns(limit)
        .map_err(|e| format!("Failed to get patterns: {}", e))
}

#[tauri::command]
fn get_common_patterns(
    state: State<AppState>,
    hours: i64,
    min_occurrences: i32,
) -> Result<Vec<(String, i64)>, String> {
    let db = state.db.lock().unwrap();
    db.get_common_patterns(hours, min_occurrences)
        .map_err(|e| format!("Failed to get common patterns: {}", e))
}

#[tauri::command]
fn get_friction_points(
    state: State<AppState>,
    hours: i64,
) -> Result<Vec<db::Interaction>, String> {
    let db = state.db.lock().unwrap();
    db.get_friction_points(hours)
        .map_err(|e| format!("Failed to get friction points: {}", e))
}

fn main() {
    // Initialize database
    let db = Database::new().expect("Failed to initialize database");

    tauri::Builder::default()
        .manage(AppState {
            db: Mutex::new(db),
            pty: Mutex::new(None),
            current_command_id: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            start_session,
            send_input,
            read_output,
            process_osc_events,
            resize_pty,
            end_session,
            get_recent_sessions,
            get_session_events,
            get_sessions_with_commands,
            get_commands,
            export_session_json,
            track_interaction,
            get_interaction_patterns,
            get_common_patterns,
            get_friction_points,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
