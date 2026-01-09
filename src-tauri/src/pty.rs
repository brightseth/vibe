use anyhow::{Context, Result};
use crossbeam_channel::{unbounded, Receiver, Sender};
use portable_pty::{CommandBuilder, NativePtySystem, PtyPair, PtySize, PtySystem};
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use std::thread;

use crate::osc::{OscEvent, OscParser};
use crate::zdotdir::ZdotdirSetup;

pub struct PtySession {
    pub session_id: String,
    pub nonce: String,
    pty_pair: PtyPair,
    output_rx: Receiver<Vec<u8>>,
    osc_events_rx: Receiver<OscEvent>,
    writer_tx: Sender<Vec<u8>>,
    zdotdir: ZdotdirSetup,
    _reader_handle: thread::JoinHandle<()>,
    _writer_handle: thread::JoinHandle<()>,
}

impl PtySession {
    pub fn new(session_id: String, cols: u16, rows: u16) -> Result<Self> {
        let pty_system = NativePtySystem::default();

        // Create PTY
        let pty_pair = pty_system
            .openpty(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .context("Failed to create PTY")?;

        // Set up ZDOTDIR wrapper for shell integration
        let zdotdir = ZdotdirSetup::create(&session_id)?;

        // Determine shell
        let shell = if cfg!(target_os = "macos") {
            "/bin/zsh".to_string()
        } else {
            std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".to_string())
        };

        // Get current directory
        let cwd = std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from("/"));

        // Spawn shell with ZDOTDIR
        let mut cmd = CommandBuilder::new(&shell);
        cmd.cwd(cwd);
        cmd.env("ZDOTDIR", zdotdir.zdotdir_path.to_str().unwrap());

        let child = pty_pair
            .slave
            .spawn_command(cmd)
            .context("Failed to spawn shell")?;

        println!(
            "🎸 Spawned shell: {} (PID: {:?}) with VIBE integration",
            shell,
            child.process_id()
        );

        // Create channels
        let (output_tx, output_rx) = unbounded::<Vec<u8>>();
        let (osc_events_tx, osc_events_rx) = unbounded::<OscEvent>();
        let (writer_tx, writer_rx) = unbounded::<Vec<u8>>();

        // Create OSC parser
        let nonce = zdotdir.nonce.clone();
        let mut osc_parser = OscParser::new(nonce.clone());

        // Reader thread: PTY → frontend + OSC parser
        let mut reader = pty_pair
            .master
            .try_clone_reader()
            .context("Failed to clone PTY reader")?;

        let reader_handle = thread::spawn(move || {
            let mut buf = [0u8; 8192];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) => {
                        println!("PTY reader: EOF");
                        break;
                    }
                    Ok(n) => {
                        let data = buf[..n].to_vec();

                        // Parse OSC sequences
                        let events = osc_parser.feed(&data);
                        for event in events {
                            if osc_events_tx.send(event).is_err() {
                                println!("OSC events channel closed");
                                break;
                            }
                        }

                        // Send raw output to frontend
                        if output_tx.send(data).is_err() {
                            println!("PTY reader: output channel closed");
                            break;
                        }
                    }
                    Err(e) => {
                        eprintln!("PTY reader error: {}", e);
                        break;
                    }
                }
            }
        });

        // Writer thread: frontend → PTY
        let writer = Arc::new(Mutex::new(
            pty_pair
                .master
                .take_writer()
                .context("Failed to take PTY writer")?,
        ));

        let writer_handle = thread::spawn(move || {
            while let Ok(data) = writer_rx.recv() {
                if let Ok(mut w) = writer.lock() {
                    if w.write_all(&data).is_err() {
                        break;
                    }
                    let _ = w.flush();
                }
            }
        });

        Ok(PtySession {
            session_id,
            nonce,
            pty_pair,
            output_rx,
            osc_events_rx,
            writer_tx,
            zdotdir,
            _reader_handle: reader_handle,
            _writer_handle: writer_handle,
        })
    }

    /// Read output from PTY (for frontend display)
    pub fn read_output(&self) -> Option<Vec<u8>> {
        self.output_rx.try_recv().ok()
    }

    /// Read OSC events (for command tracking)
    pub fn read_osc_events(&self) -> Vec<OscEvent> {
        let mut events = Vec::new();
        while let Ok(event) = self.osc_events_rx.try_recv() {
            events.push(event);
        }
        events
    }

    /// Write input to PTY
    pub fn write_input(&self, data: &[u8]) -> Result<()> {
        self.writer_tx
            .send(data.to_vec())
            .context("Failed to send input to PTY")?;
        Ok(())
    }

    /// Resize PTY
    pub fn resize(&mut self, cols: u16, rows: u16) -> Result<()> {
        self.pty_pair
            .master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .context("Failed to resize PTY")?;
        Ok(())
    }
}

impl Drop for PtySession {
    fn drop(&mut self) {
        // Clean up ZDOTDIR
        if let Err(e) = self.zdotdir.cleanup() {
            eprintln!("Failed to cleanup ZDOTDIR: {}", e);
        }
    }
}
