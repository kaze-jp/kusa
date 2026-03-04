//! File system watcher module.
//!
//! Uses the `notify` crate to watch a single file for changes and deletions.
//! Emits Tauri events (`file-changed`, `file-deleted`) to the frontend with
//! 300ms debounce to coalesce rapid consecutive writes.

use notify::{
    Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher,
};
use std::path::PathBuf;
use std::sync::mpsc;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

/// Debounce interval for file change events (300ms).
const DEBOUNCE_MS: u64 = 300;

/// Managed state wrapper for the file watcher.
pub struct FileWatcherState {
    inner: Mutex<Option<FileWatcherHandle>>,
}

impl Default for FileWatcherState {
    fn default() -> Self {
        Self {
            inner: Mutex::new(None),
        }
    }
}

impl FileWatcherState {
    /// Start watching the given file path. Stops any existing watch first.
    pub fn start(&self, app: AppHandle, path: String) -> Result<(), String> {
        let mut guard = self
            .inner
            .lock()
            .map_err(|e| format!("Watcher lock poisoned: {}", e))?;

        // Stop existing watcher if any
        if let Some(handle) = guard.take() {
            handle.stop();
        }

        let handle = FileWatcherHandle::new(app, path)?;
        *guard = Some(handle);
        Ok(())
    }

    /// Stop the current file watch, if any.
    pub fn stop(&self) -> Result<(), String> {
        let mut guard = self
            .inner
            .lock()
            .map_err(|e| format!("Watcher lock poisoned: {}", e))?;

        if let Some(handle) = guard.take() {
            handle.stop();
        }
        Ok(())
    }
}

/// Internal handle for a running file watcher.
/// Dropping or calling `stop()` will terminate the watcher thread.
struct FileWatcherHandle {
    /// Signals the debounce thread to stop.
    shutdown: Arc<Mutex<bool>>,
    /// The notify watcher itself. Kept alive so watching continues.
    _watcher: RecommendedWatcher,
}

impl FileWatcherHandle {
    fn new(app: AppHandle, path: String) -> Result<Self, String> {
        let canonical = std::fs::canonicalize(&path)
            .map_err(|e| format!("Cannot resolve path '{}': {}", path, e))?;

        // Watch the parent directory (more reliable for atomic-write editors)
        let watch_dir = canonical
            .parent()
            .ok_or_else(|| format!("Cannot determine parent directory of '{}'", path))?
            .to_path_buf();

        let target_path = canonical.clone();
        let shutdown = Arc::new(Mutex::new(false));
        let shutdown_clone = Arc::clone(&shutdown);

        // Channel for notify events -> debounce thread
        let (tx, rx) = mpsc::channel::<WatchEvent>();

        // Create the notify watcher
        let mut watcher = RecommendedWatcher::new(
            move |result: Result<Event, notify::Error>| {
                if let Ok(event) = result {
                    let watch_event = classify_event(&event, &target_path);
                    if let Some(ev) = watch_event {
                        let _ = tx.send(ev);
                    }
                }
            },
            Config::default(),
        )
        .map_err(|e| format!("Failed to create file watcher: {}", e))?;

        watcher
            .watch(&watch_dir, RecursiveMode::NonRecursive)
            .map_err(|e| format!("Failed to watch '{}': {}", watch_dir.display(), e))?;

        // Spawn debounce thread
        let watched_path_str = canonical.to_string_lossy().to_string();
        std::thread::spawn(move || {
            debounce_loop(rx, app, &watched_path_str, shutdown_clone);
        });

        Ok(Self {
            shutdown,
            _watcher: watcher,
        })
    }

    fn stop(self) {
        if let Ok(mut flag) = self.shutdown.lock() {
            *flag = true;
        }
        // _watcher is dropped here, which stops the notify watcher
    }
}

/// Internal event types we care about.
#[derive(Debug, Clone, PartialEq)]
enum WatchEvent {
    Changed,
    Deleted,
}

/// Classify a notify event into our internal event type.
/// Only fires for events that affect the target file path.
fn classify_event(event: &Event, target: &PathBuf) -> Option<WatchEvent> {
    // Check if any of the event's paths match our target file
    let affects_target = event.paths.iter().any(|p| {
        // Direct match or match via canonicalization
        p == target || std::fs::canonicalize(p).ok().as_ref() == Some(target)
    });

    if !affects_target {
        return None;
    }

    match &event.kind {
        EventKind::Modify(_) => Some(WatchEvent::Changed),
        EventKind::Create(_) => Some(WatchEvent::Changed), // re-creation after delete
        EventKind::Remove(_) => Some(WatchEvent::Deleted),
        _ => None,
    }
}

/// Debounce loop: coalesces rapid events and emits Tauri events.
fn debounce_loop(
    rx: mpsc::Receiver<WatchEvent>,
    app: AppHandle,
    watched_path: &str,
    shutdown: Arc<Mutex<bool>>,
) {
    let debounce_duration = Duration::from_millis(DEBOUNCE_MS);
    let mut pending_event: Option<WatchEvent> = None;
    let mut last_event_time: Option<Instant> = None;

    loop {
        // Check shutdown flag
        if let Ok(flag) = shutdown.lock() {
            if *flag {
                break;
            }
        }

        // Wait for events with a short timeout so we can check debounce/shutdown
        match rx.recv_timeout(Duration::from_millis(50)) {
            Ok(event) => {
                // For deletions, emit immediately (no debounce)
                if event == WatchEvent::Deleted {
                    pending_event = None;
                    last_event_time = None;
                    let _ = app.emit("file-deleted", watched_path.to_string());
                    continue;
                }

                // For changes, start/reset debounce timer
                pending_event = Some(event);
                last_event_time = Some(Instant::now());
            }
            Err(mpsc::RecvTimeoutError::Timeout) => {
                // Check if debounce timer has elapsed
                if let (Some(_event), Some(time)) = (&pending_event, last_event_time) {
                    if time.elapsed() >= debounce_duration {
                        let _ = app.emit("file-changed", watched_path.to_string());
                        pending_event = None;
                        last_event_time = None;
                    }
                }
            }
            Err(mpsc::RecvTimeoutError::Disconnected) => {
                // Channel closed, watcher was dropped
                break;
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use notify::event::{CreateKind, ModifyKind, RemoveKind};

    fn make_event(kind: EventKind, paths: Vec<PathBuf>) -> Event {
        Event {
            kind,
            paths,
            attrs: Default::default(),
        }
    }

    #[test]
    fn test_classify_modify_event() {
        let target = PathBuf::from("/tmp/test.md");
        let event = make_event(
            EventKind::Modify(ModifyKind::Data(notify::event::DataChange::Content)),
            vec![PathBuf::from("/tmp/test.md")],
        );
        assert_eq!(classify_event(&event, &target), Some(WatchEvent::Changed));
    }

    #[test]
    fn test_classify_create_event() {
        let target = PathBuf::from("/tmp/test.md");
        let event = make_event(
            EventKind::Create(CreateKind::File),
            vec![PathBuf::from("/tmp/test.md")],
        );
        assert_eq!(classify_event(&event, &target), Some(WatchEvent::Changed));
    }

    #[test]
    fn test_classify_remove_event() {
        let target = PathBuf::from("/tmp/test.md");
        let event = make_event(
            EventKind::Remove(RemoveKind::File),
            vec![PathBuf::from("/tmp/test.md")],
        );
        assert_eq!(classify_event(&event, &target), Some(WatchEvent::Deleted));
    }

    #[test]
    fn test_classify_unrelated_path() {
        let target = PathBuf::from("/tmp/test.md");
        let event = make_event(
            EventKind::Modify(ModifyKind::Data(notify::event::DataChange::Content)),
            vec![PathBuf::from("/tmp/other.md")],
        );
        assert_eq!(classify_event(&event, &target), None);
    }

    #[test]
    fn test_classify_other_event_kind() {
        let target = PathBuf::from("/tmp/test.md");
        let event = make_event(
            EventKind::Access(notify::event::AccessKind::Read),
            vec![PathBuf::from("/tmp/test.md")],
        );
        assert_eq!(classify_event(&event, &target), None);
    }
}
