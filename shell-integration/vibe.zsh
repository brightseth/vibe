# Vibe Terminal - Shell Integration for zsh
# Emits OSC 133 sequences for command boundary detection

# OSC 133 sequences:
# A = Command start (prompt)
# B = Command input start
# C = Command execution start
# D;exit_code = Command end with exit code

# Emit OSC sequence
__vibe_osc() {
    printf "\033]133;%s\007" "$1"
}

# Before showing prompt
__vibe_prompt_start() {
    __vibe_osc "A"
}

# Before accepting command input
__vibe_command_start() {
    __vibe_osc "B"
}

# Before executing command
__vibe_preexec() {
    __vibe_osc "C"
}

# After command completes
__vibe_precmd() {
    local exit_code=$?
    __vibe_osc "D;${exit_code}"
    __vibe_prompt_start
}

# Hook into zsh's prompt system
autoload -Uz add-zsh-hook
add-zsh-hook precmd __vibe_precmd
add-zsh-hook preexec __vibe_preexec

# Emit initial prompt marker
__vibe_prompt_start
__vibe_command_start

# Load user's real zshrc if it exists
if [[ -n "$VIBE_USER_ZDOTDIR" && -f "$VIBE_USER_ZDOTDIR/.zshrc" ]]; then
    source "$VIBE_USER_ZDOTDIR/.zshrc"
fi
