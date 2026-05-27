// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

/// Extract the owning `.app` bundle path from an executable path string.
///
/// Uses a trailing-match strategy (`rfind(".app/")`) so that when the executable
/// lives inside a nested `.app/` bundle (e.g. an outer bundle that contains a
/// nested helper bundle), the *inner* — i.e. directly-owning — bundle is selected.
///
/// Returns `Some(&exe_str[..idx + 4])` (i.e. the prefix including the trailing `.app`
/// but excluding the `/`) when `".app/"` is found, otherwise `None`.
///
/// Gated on `cfg(test)` OR `cfg(all(not(debug_assertions), target_os = "macos"))` so
/// the helper compiles wherever the relaunch block uses it, *and* whenever tests run.
#[cfg(any(test, all(not(debug_assertions), target_os = "macos")))]
fn extract_app_path(exe_str: &str) -> Option<&str> {
    exe_str.rfind(".app/").map(|idx| &exe_str[..idx + 4])
}

fn main() {
    // Handle --version / -V before anything else (works in both debug and release)
    {
        let args: Vec<String> = std::env::args().collect();
        if args.iter().any(|a| a == "--version" || a == "-V") {
            println!("kusa {}", env!("CARGO_PKG_VERSION"));
            return;
        }
    }

    // In release builds on macOS, relaunch via `open` so the CLI returns immediately.
    // Uses a hidden --launched flag to prevent infinite relaunch loops:
    //   - First invocation (from terminal): no flag → relaunch via `open -a` → return
    //   - Second invocation (via `open`): --launched present → skip relaunch → run app
    // Piped stdin (e.g. `cat file | kusa`) is NOT a terminal, so it runs directly.
    // If the `open -a` spawn fails (or the bundle path is invalid / non-existent),
    // kusa falls back to in-process launch and prints a `kusa:`-prefixed diagnostic
    // to stderr — the window is always shown, even at the cost of CLI detach.
    #[cfg(all(not(debug_assertions), target_os = "macos"))]
    {
        let args: Vec<String> = std::env::args().collect();
        let already_launched = args.iter().any(|a| a == "--launched");

        // Check if stdin is a pipe (actual piped content like `cat file | kusa`).
        // /dev/null and terminals are NOT pipes, so we detach in both cases.
        let stdin_is_pipe = {
            use std::os::unix::io::AsRawFd;
            unsafe {
                let mut stat: libc::stat = std::mem::zeroed();
                if libc::fstat(std::io::stdin().as_raw_fd(), &mut stat) == 0 {
                    (stat.st_mode & libc::S_IFMT) == libc::S_IFIFO
                } else {
                    false
                }
            }
        };

        if !already_launched && !stdin_is_pipe {
            'relaunch: {
                let Ok(exe) = std::env::current_exe() else {
                    break 'relaunch;
                };
                let exe_str = exe.to_string_lossy().to_string();
                let Some(candidate) = extract_app_path(&exe_str) else {
                    break 'relaunch;
                };

                // Validate the candidate bundle path before handing it to `open -a`.
                // This prevents the historical silent failure where matching the
                // wrong `.app/` substring caused `open -a` to be invoked with a path
                // that did not exist, and `spawn()`'s `Err` was discarded.
                let canonical = match std::fs::canonicalize(candidate) {
                    Ok(p) => p,
                    Err(e) => {
                        eprintln!(
                            "kusa: candidate bundle path '{}' is not accessible ({}); falling back to in-process launch",
                            candidate, e
                        );
                        break 'relaunch;
                    }
                };
                if !canonical.is_dir()
                    || canonical.extension().and_then(|s| s.to_str()) != Some("app")
                {
                    eprintln!(
                        "kusa: candidate bundle path '{}' is not a .app bundle; falling back to in-process launch",
                        canonical.display()
                    );
                    break 'relaunch;
                }

                // Collect user args (skip program name), exclude internal flags
                let user_args: Vec<String> = args
                    .iter()
                    .skip(1)
                    .filter(|a| a.as_str() != "--launched")
                    .cloned()
                    .collect();

                // Resolve relative file paths to absolute before relaunching.
                // `open -a` changes cwd, so relative paths must be resolved here.
                let cwd = std::env::current_dir().ok();
                let resolved_args: Vec<String> = user_args
                    .iter()
                    .map(|arg| {
                        if !arg.starts_with('-') {
                            let p = std::path::Path::new(arg);
                            // Already absolute — just canonicalize if possible
                            if p.is_absolute() {
                                return std::fs::canonicalize(p)
                                    .map(|a| a.to_string_lossy().to_string())
                                    .unwrap_or_else(|_| arg.clone());
                            }
                            // Relative path — resolve against cwd
                            if let Some(ref cwd) = cwd {
                                let abs = cwd.join(p);
                                // Use canonicalize if the file exists, otherwise keep the joined path
                                return std::fs::canonicalize(&abs)
                                    .unwrap_or(abs)
                                    .to_string_lossy()
                                    .to_string();
                            }
                        }
                        arg.clone()
                    })
                    .collect();

                let mut cmd = std::process::Command::new("open");
                cmd.arg("-a").arg(&canonical).arg("--args");
                cmd.arg("--launched");
                cmd.args(&resolved_args);
                match cmd.spawn() {
                    Ok(_) => return,
                    Err(e) => {
                        eprintln!(
                            "kusa: failed to relaunch via `open -a {}`: {}",
                            canonical.display(),
                            e
                        );
                        eprintln!(
                            "kusa: falling back to in-process launch (CLI process will not detach)"
                        );
                        // Fall through to kusa_lib::run() below
                    }
                }
            }
        }
    }
    kusa_lib::run()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extract_app_path_single_bundle() {
        assert_eq!(
            extract_app_path("/Applications/kusa.app/Contents/MacOS/kusa"),
            Some("/Applications/kusa.app")
        );
    }

    #[test]
    fn extract_app_path_nested_bundles() {
        assert_eq!(
            extract_app_path(
                "/Applications/Outer.app/Contents/Frameworks/Inner.app/Contents/MacOS/kusa"
            ),
            Some("/Applications/Outer.app/Contents/Frameworks/Inner.app")
        );
    }

    #[test]
    fn extract_app_path_no_bundle() {
        assert_eq!(extract_app_path("/usr/local/bin/kusa"), None);
    }

    #[test]
    fn extract_app_path_trailing_slash() {
        assert_eq!(extract_app_path("/path/foo.app/"), Some("/path/foo.app"));
    }

    #[test]
    fn extract_app_path_empty_string() {
        assert_eq!(extract_app_path(""), None);
    }

    #[test]
    fn extract_app_path_app_in_middle_only() {
        // `.app.backup/` does not contain the substring `.app/`, so the
        // helper must return None — confirming that we match on the *exact*
        // bundle separator, not a generic `.app` suffix.
        assert_eq!(extract_app_path("/path/foo.app.backup/kusa"), None);
    }
}
