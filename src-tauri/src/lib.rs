mod commands;
mod watcher;
mod window_presets;

use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{Emitter, WebviewWindowBuilder, WebviewUrl, Manager, RunEvent};
use tauri_plugin_cli::CliExt;
use window_presets::{PeekConfig, WindowSize, FULL_SIZE, PEEK_MIN_SIZE, resolve_preset};

/// Size used for the Full-mode safe-defaults fallback when the primary
/// `WebviewWindowBuilder` fails (e.g. due to a corrupted window-state file
/// restored by `tauri_plugin_window_state`). Kept as a tiny helper so it can
/// be unit-tested without launching a Tauri runtime.
const fn safe_default_full_size() -> WindowSize {
    FULL_SIZE
}

/// Stores the window mode so the frontend can query it via a Tauri command.
#[derive(Debug, Default)]
pub struct WindowModeState(pub Mutex<String>);

/// Stores CLI arguments so the frontend can pull them after initialization.
#[derive(Debug, Clone, serde::Serialize)]
pub struct CliArgsData {
    pub file: Option<String>,
    pub clipboard: bool,
    pub dir: Option<String>,
}

pub struct CliArgsState(pub Mutex<Option<CliArgsData>>);

/// Buffers `(event_name, payload)` pairs emitted before the frontend
/// is ready to receive them. Drained by the `flush_pending_events`
/// command once the frontend has registered its Tauri event listeners.
///
/// See issue #70: `tauri_plugin_single_instance`'s callback can fire
/// before `.setup()` completes, in which case the main webview window
/// does not yet exist and any `emit` call would be dropped.
#[derive(Default)]
pub struct PendingEventBuffer(pub Mutex<Vec<(String, String)>>);

/// Drain all buffered events from `PendingEventBuffer` and invoke
/// `emit_fn` for each. On poisoned mutex, this is a silent no-op
/// (we prefer to drop a few buffered events over panicking).
///
/// Extracted as a pure helper so it can be unit-tested without
/// requiring a Tauri runtime / `AppHandle`.
pub(crate) fn drain_pending_events<F>(buffer: &PendingEventBuffer, mut emit_fn: F)
where
    F: FnMut(&str, String),
{
    if let Ok(mut buf) = buffer.0.lock() {
        for (event, payload) in buf.drain(..) {
            emit_fn(&event, payload);
        }
    }
}

/// Determine PeekConfig from CLI args and stdin state.
/// `screen_width` and `screen_height` are used for the "half" preset.
fn resolve_peek_config(matches: &tauri_plugin_cli::Matches, screen_width: f64, screen_height: f64) -> PeekConfig {
    let has_peek_flag = matches
        .args
        .get("peek")
        .map(|a| a.occurrences > 0)
        .unwrap_or(false);

    let has_no_peek_flag = matches
        .args
        .get("no-peek")
        .map(|a| a.occurrences > 0)
        .unwrap_or(false);

    let has_no_focus = matches
        .args
        .get("no-focus")
        .map(|a| a.occurrences > 0)
        .unwrap_or(false);

    let size_preset = matches.args.get("size").and_then(|a| {
        if let serde_json::Value::String(s) = &a.value {
            if !s.is_empty() {
                Some(s.clone())
            } else {
                None
            }
        } else {
            None
        }
    });

    // Determine peek mode:
    // --peek explicitly enables peek mode
    // Without --peek, always use full mode
    let is_peek = has_peek_flag && !has_no_peek_flag;

    // Resolve size preset (default depends on mode)
    let default_preset = if is_peek { "peek" } else { "full" };
    let preset_name = size_preset.as_deref().unwrap_or(default_preset);
    let size = resolve_preset(preset_name, screen_width, screen_height);

    PeekConfig {
        is_peek,
        no_focus: has_no_focus && is_peek, // no-focus only applies in peek mode
        size,
    }
}

/// Create the application window based on peek configuration.
/// On fallback from peek to full mode, updates the managed `WindowModeState`.
fn create_window(app: &tauri::App, peek_config: &PeekConfig) -> Result<(), Box<dyn std::error::Error>> {
    if peek_config.is_peek {
        // Peek mode: small, no decorations, always on top, transparent for border-radius
        let mut builder = WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
            .title("")
            .inner_size(peek_config.size.width, peek_config.size.height)
            .min_inner_size(PEEK_MIN_SIZE.width, PEEK_MIN_SIZE.height)
            .decorations(false)
            .always_on_top(true)
            .resizable(true)
            .visible(false);

        if peek_config.no_focus {
            builder = builder.focused(false);
        }

        match builder.build() {
            Ok(w) => {
                w.show().ok();
            }
            Err(e) => {
                eprintln!(
                    "Failed to create peek window: {}, falling back to full window",
                    e
                );
                // Fallback: create a full window instead
                let fallback = WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
                    .title("kusa")
                    .inner_size(FULL_SIZE.width, FULL_SIZE.height)
                    .min_inner_size(400.0, 300.0)
                    .decorations(true)
                    .visible(false)
                    .build()?;
                fallback.show().ok();
                // Update managed state and emit full mode (fallback)
                if let Ok(mut mode) = app.state::<WindowModeState>().0.lock() {
                    *mode = "full".to_string();
                }
                app.emit("window-mode", "full").ok();
                return Ok(());
            }
        }
    } else {
        // Full mode: standard window with decorations.
        // On primary build failure, retry with a safe-defaults builder that
        // does not depend on any plugin-restored state (e.g. a corrupted
        // window-state file from `tauri_plugin_window_state`).
        let result = WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
            .title("kusa")
            .inner_size(peek_config.size.width, peek_config.size.height)
            .min_inner_size(400.0, 300.0)
            .decorations(true)
            .visible(false)
            .build();
        let window = match result {
            Ok(w) => w,
            Err(e) => {
                eprintln!(
                    "Failed to create full window: {}, retrying with safe defaults",
                    e
                );
                let safe = safe_default_full_size();
                WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
                    .title("kusa")
                    .inner_size(safe.width, safe.height)
                    .decorations(true)
                    .visible(false)
                    .build()?
            }
        };
        if let Err(e) = window.show() {
            eprintln!("Failed to show window: {}", e);
        }
    }

    Ok(())
}

fn resolve_and_emit<R: tauri::Runtime, E: Emitter<R>>(emitter: &E, raw_path: &str) {
    let path = PathBuf::from(raw_path);
    let canonical = match std::fs::canonicalize(&path) {
        Ok(p) => p,
        Err(_) => {
            if let Err(e) = emitter.emit("cli-open", raw_path.to_string()) {
                eprintln!("Failed to emit cli-open event: {}", e);
            }
            return;
        }
    };

    if canonical.is_dir() {
        if let Err(e) = emitter.emit("cli-open-dir", canonical.to_string_lossy().to_string()) {
            eprintln!("Failed to emit cli-open-dir event: {}", e);
        }
    } else if let Err(e) = emitter.emit("cli-open", canonical.to_string_lossy().to_string()) {
        eprintln!("Failed to emit cli-open event: {}", e);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Capture original CWD before Tauri may change it (e.g. tauri dev runs from src-tauri/)
    let original_cwd = std::env::current_dir().ok();

    // Read stdin before Tauri init (must happen before event loop)
    let stdin_content = commands::read_stdin_if_piped();

    tauri::Builder::default()
        .manage(commands::StdinState {
            content: stdin_content,
        })
        .manage(WindowModeState::default())
        .manage(CliArgsState(Mutex::new(None)))
        .manage(watcher::FileWatcherState::default())
        .manage(PendingEventBuffer::default())
        .invoke_handler(tauri::generate_handler![
            commands::read_file,
            commands::list_md_files,
            commands::search_md_files,
            commands::read_stdin,
            commands::read_clipboard,
            commands::fetch_url,
            commands::write_file,
            commands::save_preference,
            commands::load_preference,
            commands::promote_to_full,
            commands::get_window_mode,
            commands::get_cli_args,
            commands::start_file_watch,
            commands::stop_file_watch,
            commands::flush_pending_events,
        ])
        .plugin(
            tauri_plugin_single_instance::init(|app, args, _cwd| {
                // If a 2nd instance ships a path argument, we either emit
                // it directly (window already exists) or buffer it for
                // delivery once the frontend listeners are registered.
                // See issue #70 — the single-instance callback can fire
                // before `.setup()` completes the window builder.
                if let Some(path) = args.get(1) {
                    if app.get_webview_window("main").is_some() {
                        resolve_and_emit(app, path);
                    } else if let Some(state) = app.try_state::<PendingEventBuffer>() {
                        if let Ok(mut buf) = state.0.lock() {
                            buf.push(("cli-open".to_string(), path.clone()));
                        }
                    }
                }
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.set_focus();
                }
            }),
        )
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_cli::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(move |app| {
            // Get actual monitor dimensions for the "half" preset.
            // Falls back to 1920x1080 if the primary monitor cannot be detected.
            let (screen_width, screen_height) = app
                .primary_monitor()
                .ok()
                .flatten()
                .map(|m| {
                    let size = m.size();
                    let scale = m.scale_factor();
                    // Convert physical pixels to logical pixels
                    (size.width as f64 / scale, size.height as f64 / scale)
                })
                .unwrap_or((1920.0, 1080.0));

            // Parse CLI arguments
            let (file_path, clipboard_flag, peek_config) = if let Ok(matches) = app.cli().matches() {
                let file = matches.args.get("file").and_then(|a| {
                    if let serde_json::Value::String(path) = &a.value {
                        if !path.is_empty() {
                            Some(path.clone())
                        } else {
                            None
                        }
                    } else {
                        None
                    }
                });

                let clipboard = matches
                    .args
                    .get("clipboard")
                    .map(|a| a.value == serde_json::Value::Bool(true))
                    .unwrap_or(false);

                let config = resolve_peek_config(&matches, screen_width, screen_height);
                (file, clipboard, config)
            } else {
                (None, false, PeekConfig::default())
            };

            // Store window mode in managed state so the frontend can query it
            let mode_str = if peek_config.is_peek { "peek" } else { "full" };
            {
                let state = app.state::<WindowModeState>();
                let mut mode = state.0.lock().expect("window mode lock poisoned");
                *mode = mode_str.to_string();
            }

            // Create the window.
            // If this fails (including the safe-defaults fallback for full
            // mode), propagate the error so Tauri panics at startup rather
            // than leaving a windowless zombie process.
            if let Err(e) = create_window(app, &peek_config) {
                eprintln!("Fatal: failed to create window: {}", e);
                return Err(e);
            }

            // Resolve file path to absolute, trying multiple base directories
            let resolved_file = file_path.as_ref().map(|path| {
                let p = PathBuf::from(path);
                // If already absolute, just canonicalize
                if p.is_absolute() {
                    return std::fs::canonicalize(&p)
                        .map(|c| c.to_string_lossy().to_string())
                        .unwrap_or_else(|_| path.clone());
                }
                // Try relative to current cwd
                std::fs::canonicalize(&p)
                    .or_else(|_| {
                        // Try relative to original CWD
                        if let Some(ref cwd) = original_cwd {
                            std::fs::canonicalize(cwd.join(path))
                        } else {
                            Err(std::io::Error::new(std::io::ErrorKind::NotFound, ""))
                        }
                    })
                    .or_else(|_| {
                        // During `tauri dev`, cwd may be src-tauri/ — try parent
                        if let Some(ref cwd) = original_cwd {
                            if let Some(parent) = cwd.parent() {
                                std::fs::canonicalize(parent.join(path))
                            } else {
                                Err(std::io::Error::new(std::io::ErrorKind::NotFound, ""))
                            }
                        } else {
                            Err(std::io::Error::new(std::io::ErrorKind::NotFound, ""))
                        }
                    })
                    .map(|c| c.to_string_lossy().to_string())
                    .unwrap_or_else(|_| path.clone())
            });

            let resolved_dir = if file_path.is_none() {
                // No file arg: use original CWD for directory listing
                original_cwd.as_ref()
                    .map(|c| c.to_string_lossy().to_string())
            } else {
                // Check if the resolved path is a directory
                resolved_file.as_ref().and_then(|f| {
                    let p = PathBuf::from(f);
                    if p.is_dir() {
                        Some(f.clone())
                    } else {
                        None
                    }
                })
            };

            // If the resolved path was a directory, clear the file
            let final_file = if resolved_dir.is_some() && file_path.is_some() {
                None
            } else {
                resolved_file
            };

            let cli_args_data = CliArgsData {
                file: final_file.clone(),
                clipboard: clipboard_flag,
                dir: resolved_dir.clone(),
            };

            {
                let state = app.state::<CliArgsState>();
                let mut args = state.0.lock().expect("cli args lock poisoned");
                *args = Some(cli_args_data);
            }

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building kusa")
        .run(|app, event| {
            if let RunEvent::Opened { urls } = event {
                for url in urls {
                    if let Ok(path) = url.to_file_path() {
                        let path_str = path.to_string_lossy().to_string();
                        resolve_and_emit(app, &path_str);
                    }
                }
            }
        });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn safe_default_full_size_matches_full_size() {
        let s = safe_default_full_size();
        assert_eq!(s.width, FULL_SIZE.width);
        assert_eq!(s.height, FULL_SIZE.height);
    }

    #[test]
    fn safe_default_full_size_is_positive() {
        let s = safe_default_full_size();
        assert!(s.width > 0.0, "fallback width must be positive");
        assert!(s.height > 0.0, "fallback height must be positive");
    }
}
