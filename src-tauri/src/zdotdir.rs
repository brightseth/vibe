// ZDOTDIR wrapper generation for shell integration
// Creates a temporary .zshrc that sources user's config + VIBE integration

use anyhow::{Context, Result};
use rand::{Rng, thread_rng};
use rand::distributions::Alphanumeric;
use std::fs;
use std::path::PathBuf;

pub struct ZdotdirSetup {
    pub zdotdir_path: PathBuf,
    pub nonce: String,
}

impl ZdotdirSetup {
    pub fn create(session_id: &str) -> Result<Self> {
        // Generate random nonce for anti-spoofing
        let nonce: String = thread_rng()
            .sample_iter(&Alphanumeric)
            .take(32)
            .map(char::from)
            .collect();

        // Create session-specific ZDOTDIR
        let home = std::env::var("HOME").context("HOME not set")?;
        let zdotdir_path = PathBuf::from(&home)
            .join(".vibecodings/zshrc")
            .join(session_id);

        fs::create_dir_all(&zdotdir_path).context("Failed to create ZDOTDIR")?;

        // Get path to vibe.zsh
        let integration_path = PathBuf::from(&home)
            .join("vibe-terminal/shell-integration");

        // Read template
        let template_path = integration_path.join(".zshrc.template");
        let template = fs::read_to_string(&template_path)
            .context("Failed to read .zshrc.template")?;

        // Replace placeholders
        let zshrc_content = template
            .replace("{{SESSION_ID}}", session_id)
            .replace("{{NONCE}}", &nonce)
            .replace("{{VIBE_INTEGRATION_PATH}}", integration_path.to_str().unwrap());

        // Write .zshrc wrapper
        let zshrc_path = zdotdir_path.join(".zshrc");
        fs::write(&zshrc_path, zshrc_content)
            .context("Failed to write .zshrc")?;

        Ok(Self { zdotdir_path, nonce })
    }

    pub fn cleanup(&self) -> Result<()> {
        if self.zdotdir_path.exists() {
            fs::remove_dir_all(&self.zdotdir_path)
                .context("Failed to cleanup ZDOTDIR")?;
        }
        Ok(())
    }
}
