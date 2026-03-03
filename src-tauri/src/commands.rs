use base64::Engine;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use std::time::UNIX_EPOCH;

/// Shared type for all input sources (file, stdin, clipboard, github, url)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InputContent {
    pub source: String,
    pub content: String,
    pub title: String,
    pub file_path: Option<String>,
}

/// State holder for stdin content, read before Tauri init
pub struct StdinState {
    pub content: Option<InputContent>,
}

// --- Existing commands ---

#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    let canonical = fs::canonicalize(&path)
        .map_err(|e| format!("Cannot resolve path '{}': {}", path, e))?;

    fs::read_to_string(&canonical)
        .map_err(|e| format!("Cannot read file '{}': {}", canonical.display(), e))
}

#[derive(Debug, Serialize)]
pub struct MdFileEntry {
    pub name: String,
    pub path: String,
    pub modified_at: u64,
    pub size: u64,
}

#[tauri::command]
pub fn list_md_files(dir_path: String) -> Result<Vec<MdFileEntry>, String> {
    let canonical = fs::canonicalize(&dir_path)
        .map_err(|e| format!("Cannot resolve directory '{}': {}", dir_path, e))?;

    if !canonical.is_dir() {
        return Err(format!("'{}' is not a directory", canonical.display()));
    }

    let entries = fs::read_dir(&canonical)
        .map_err(|e| format!("Cannot read directory '{}': {}", canonical.display(), e))?;

    let mut files: Vec<MdFileEntry> = Vec::new();

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }

        let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
        if ext != "md" && ext != "markdown" && ext != "mdx" {
            continue;
        }

        let name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();

        let metadata = entry.metadata().ok();

        let modified_at = metadata
            .as_ref()
            .and_then(|m| m.modified().ok())
            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
            .map(|d| d.as_secs())
            .unwrap_or(0);

        let size = metadata.as_ref().map(|m| m.len()).unwrap_or(0);

        files.push(MdFileEntry {
            name,
            path: path.to_string_lossy().to_string(),
            modified_at,
            size,
        });
    }

    files.sort_by(|a, b| b.modified_at.cmp(&a.modified_at));

    Ok(files)
}

// --- New commands for universal-input ---

/// Read stdin content that was captured before Tauri init.
/// Returns None if no stdin pipe was detected or content was empty.
#[tauri::command]
pub fn read_stdin(state: tauri::State<'_, StdinState>) -> Option<InputContent> {
    state.content.clone()
}

/// Read text content from the system clipboard.
#[tauri::command]
pub async fn read_clipboard(
    app: tauri::AppHandle,
) -> Result<InputContent, String> {
    use tauri_plugin_clipboard_manager::ClipboardExt;

    let text = app
        .clipboard()
        .read_text()
        .map_err(|e| format!("クリップボードの読み取りに失敗しました: {}", e))?;

    if text.trim().is_empty() {
        return Err("クリップボードにテキストが見つかりません".to_string());
    }

    Ok(InputContent {
        source: "clipboard".to_string(),
        content: text,
        title: "(clipboard)".to_string(),
        file_path: None,
    })
}

/// GitHub Contents API response structure
#[derive(Debug, Deserialize)]
struct GitHubContentsResponse {
    content: String,
    encoding: String,
    #[allow(dead_code)]
    name: String,
}

/// Decode base64-encoded content from GitHub API
fn decode_github_content(response: &GitHubContentsResponse) -> Result<String, String> {
    if response.encoding != "base64" {
        return Err(format!(
            "サポートされていないエンコーディング: {}",
            response.encoding
        ));
    }

    let cleaned = response.content.replace('\n', "").replace('\r', "");
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(&cleaned)
        .map_err(|e| format!("base64 デコードエラー: {}", e))?;
    String::from_utf8(bytes).map_err(|e| format!("UTF-8 デコードエラー: {}", e))
}

/// Fetch content from a URL. If is_github_api is true, parse as GitHub Contents API response.
#[tauri::command]
pub async fn fetch_url(
    url: String,
    is_github_api: bool,
    title: String,
) -> Result<InputContent, String> {
    // Validate URL scheme
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err(format!(
            "サポートされていないURLスキーム。http:// または https:// のみ対応: {}",
            url
        ));
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .user_agent("kusa-md-viewer")
        .build()
        .map_err(|e| format!("HTTPクライアントの構築に失敗しました: {}", e))?;

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                "リクエストがタイムアウトしました（10秒）".to_string()
            } else if e.is_connect() {
                format!("ネットワーク接続エラー: {}", e)
            } else {
                format!("ネットワーク接続エラー: {}", e)
            }
        })?;

    let status = response.status();

    if !status.is_success() {
        // Check for GitHub rate limit
        if status.as_u16() == 403 {
            let rate_remaining = response
                .headers()
                .get("x-ratelimit-remaining")
                .and_then(|v| v.to_str().ok())
                .and_then(|v| v.parse::<u64>().ok());

            let rate_reset = response
                .headers()
                .get("x-ratelimit-reset")
                .and_then(|v| v.to_str().ok())
                .and_then(|v| v.parse::<u64>().ok());

            if rate_remaining == Some(0) {
                let wait_msg = if let Some(reset) = rate_reset {
                    let now = std::time::SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_secs();
                    let minutes = if reset > now {
                        (reset - now + 59) / 60
                    } else {
                        1
                    };
                    format!(
                        "GitHub API レート制限に到達しました。約 {} 分後にリトライしてください",
                        minutes
                    )
                } else {
                    "GitHub API レート制限に到達しました。しばらく待ってからリトライしてください"
                        .to_string()
                };
                return Err(wait_msg);
            }
        }

        if status.as_u16() == 404 {
            return Err(if is_github_api {
                "リポジトリまたはファイルが見つかりません".to_string()
            } else {
                format!("ページが見つかりません (404): {}", url)
            });
        }

        return Err(format!("HTTP エラー {}: {}", status.as_u16(), status.canonical_reason().unwrap_or("Unknown")));
    }

    let source = if is_github_api { "github" } else { "url" };

    let content = if is_github_api {
        let gh_response: GitHubContentsResponse = response
            .json()
            .await
            .map_err(|e| format!("GitHub APIレスポンスのパースに失敗しました: {}", e))?;
        decode_github_content(&gh_response)?
    } else {
        response
            .text()
            .await
            .map_err(|e| format!("レスポンス本文の読み取りに失敗しました: {}", e))?
    };

    Ok(InputContent {
        source: source.to_string(),
        content,
        title,
        file_path: None,
    })
}

/// Read stdin if it's connected to a pipe (not a terminal).
/// Must be called before Tauri builder init.
/// Returns None if stdin is a terminal or content is empty.
pub fn read_stdin_if_piped() -> Option<InputContent> {
    use is_terminal::IsTerminal;
    use std::io::Read;

    if std::io::stdin().is_terminal() {
        return None;
    }

    let mut buffer = String::new();
    // Limit to 10MB to prevent memory exhaustion
    let limit = 10 * 1024 * 1024;
    match std::io::stdin().take(limit).read_to_string(&mut buffer) {
        Ok(_) if !buffer.trim().is_empty() => Some(InputContent {
            source: "stdin".to_string(),
            content: buffer,
            title: "(stdin)".to_string(),
            file_path: None,
        }),
        _ => None,
    }
}

// --- New commands for inline-edit ---

#[derive(Debug, Serialize)]
pub struct WriteFileResult {
    pub bytes_written: u64,
}

#[tauri::command]
pub fn write_file(path: String, content: String) -> Result<WriteFileResult, String> {
    // Resolve and canonicalize the path (parent must exist)
    let target = PathBuf::from(&path);

    let parent = target
        .parent()
        .ok_or_else(|| format!("Invalid path '{}': no parent directory", path))?;

    let canonical_parent = fs::canonicalize(parent)
        .map_err(|e| format!("Cannot resolve parent directory '{}': {}", parent.display(), e))?;

    let file_name = target
        .file_name()
        .ok_or_else(|| format!("Invalid path '{}': no file name", path))?;

    let canonical_path = canonical_parent.join(file_name);

    // Atomic write: write to temp file, then rename
    let temp_path = canonical_path.with_extension("tmp.kusa");

    let bytes = content.as_bytes();

    // Write content to temporary file
    let mut file = fs::File::create(&temp_path)
        .map_err(|e| format!("Cannot create temp file '{}': {}", temp_path.display(), e))?;

    file.write_all(bytes).map_err(|e| {
        // Clean up temp file on write failure
        let _ = fs::remove_file(&temp_path);
        format!("Cannot write to '{}': {}", temp_path.display(), e)
    })?;

    file.flush().map_err(|e| {
        let _ = fs::remove_file(&temp_path);
        format!("Cannot flush '{}': {}", temp_path.display(), e)
    })?;

    // Rename temp file to target (atomic on same filesystem)
    fs::rename(&temp_path, &canonical_path).map_err(|e| {
        let _ = fs::remove_file(&temp_path);
        format!(
            "Cannot rename '{}' to '{}': {}",
            temp_path.display(),
            canonical_path.display(),
            e
        )
    })?;

    Ok(WriteFileResult {
        bytes_written: bytes.len() as u64,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn test_read_file_success() {
        let dir = TempDir::new().unwrap();
        let file_path = dir.path().join("test.md");
        fs::write(&file_path, "# Hello\nWorld").unwrap();

        let result = read_file(file_path.to_string_lossy().to_string());
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "# Hello\nWorld");
    }

    #[test]
    fn test_read_file_not_found() {
        let result = read_file("/nonexistent/path/file.md".to_string());
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Cannot resolve path"));
    }

    #[test]
    fn test_read_file_non_md() {
        let dir = TempDir::new().unwrap();
        let file_path = dir.path().join("test.txt");
        fs::write(&file_path, "plain text content").unwrap();

        let result = read_file(file_path.to_string_lossy().to_string());
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "plain text content");
    }

    #[test]
    fn test_list_md_files_success() {
        let dir = TempDir::new().unwrap();
        fs::write(dir.path().join("readme.md"), "# Readme").unwrap();
        fs::write(dir.path().join("notes.markdown"), "# Notes").unwrap();
        fs::write(dir.path().join("page.mdx"), "export default MDXPage").unwrap();
        fs::write(dir.path().join("code.rs"), "fn main() {}").unwrap();

        let result = list_md_files(dir.path().to_string_lossy().to_string());
        assert!(result.is_ok());
        let files = result.unwrap();
        assert_eq!(files.len(), 3);
        assert!(files.iter().any(|f| f.name == "readme.md"));
        assert!(files.iter().any(|f| f.name == "notes.markdown"));
        assert!(files.iter().any(|f| f.name == "page.mdx"));
    }

    #[test]
    fn test_list_md_files_empty_dir() {
        let dir = TempDir::new().unwrap();
        let result = list_md_files(dir.path().to_string_lossy().to_string());
        assert!(result.is_ok());
        assert!(result.unwrap().is_empty());
    }

    #[test]
    fn test_list_md_files_not_found() {
        let result = list_md_files("/nonexistent/directory".to_string());
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Cannot resolve directory"));
    }

    // --- InputContent tests ---

    #[test]
    fn test_input_content_serialization() {
        let content = InputContent {
            source: "stdin".to_string(),
            content: "# Hello".to_string(),
            title: "(stdin)".to_string(),
            file_path: None,
        };
        let json = serde_json::to_string(&content).unwrap();
        assert!(json.contains("\"source\":\"stdin\""));
        assert!(json.contains("\"filePath\":null"));
    }

    #[test]
    fn test_input_content_with_file_path() {
        let content = InputContent {
            source: "file".to_string(),
            content: "# Test".to_string(),
            title: "test.md".to_string(),
            file_path: Some("/path/to/test.md".to_string()),
        };
        let json = serde_json::to_string(&content).unwrap();
        assert!(json.contains("\"source\":\"file\""));
        assert!(json.contains("\"filePath\":\"/path/to/test.md\""));
    }

    // --- GitHub base64 decode tests ---

    #[test]
    fn test_decode_github_content_success() {
        let response = GitHubContentsResponse {
            content: base64::engine::general_purpose::STANDARD.encode("# Hello World"),
            encoding: "base64".to_string(),
            name: "README.md".to_string(),
        };
        let result = decode_github_content(&response);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "# Hello World");
    }

    #[test]
    fn test_decode_github_content_with_newlines() {
        // GitHub API returns base64 with newline characters inserted
        let raw = base64::engine::general_purpose::STANDARD.encode("# Hello\nWorld\n\nThis is a test");
        let with_newlines = raw
            .chars()
            .enumerate()
            .flat_map(|(i, c)| {
                if i > 0 && i % 60 == 0 {
                    vec!['\n', c]
                } else {
                    vec![c]
                }
            })
            .collect::<String>();

        let response = GitHubContentsResponse {
            content: with_newlines,
            encoding: "base64".to_string(),
            name: "test.md".to_string(),
        };
        let result = decode_github_content(&response);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "# Hello\nWorld\n\nThis is a test");
    }

    #[test]
    fn test_decode_github_content_unsupported_encoding() {
        let response = GitHubContentsResponse {
            content: "not base64".to_string(),
            encoding: "utf-8".to_string(),
            name: "test.md".to_string(),
        };
        let result = decode_github_content(&response);
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .contains("サポートされていないエンコーディング"));
    }

    #[test]
    fn test_decode_github_content_invalid_base64() {
        let response = GitHubContentsResponse {
            content: "not-valid-base64!!!".to_string(),
            encoding: "base64".to_string(),
            name: "test.md".to_string(),
        };
        let result = decode_github_content(&response);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("base64 デコードエラー"));
    }

    #[test]
    fn test_decode_github_content_invalid_utf8() {
        // Encode invalid UTF-8 bytes
        let invalid_bytes: Vec<u8> = vec![0xFF, 0xFE, 0xFD];
        let encoded = base64::engine::general_purpose::STANDARD.encode(&invalid_bytes);
        let response = GitHubContentsResponse {
            content: encoded,
            encoding: "base64".to_string(),
            name: "test.md".to_string(),
        };
        let result = decode_github_content(&response);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("UTF-8 デコードエラー"));
    }

    // --- write_file tests ---

    #[test]
    fn test_write_file_success() {
        let dir = TempDir::new().unwrap();
        let file_path = dir.path().join("output.md");
        // Create the file first so the path is valid
        fs::write(&file_path, "").unwrap();

        let content = "# Written\nBy kusa".to_string();
        let result = write_file(file_path.to_string_lossy().to_string(), content.clone());
        assert!(result.is_ok());
        let res = result.unwrap();
        assert_eq!(res.bytes_written, content.len() as u64);

        // Verify file content
        let read_back = fs::read_to_string(&file_path).unwrap();
        assert_eq!(read_back, content);
    }

    #[test]
    fn test_write_file_new_file() {
        let dir = TempDir::new().unwrap();
        let file_path = dir.path().join("new_file.md");

        let content = "# New file".to_string();
        let result = write_file(file_path.to_string_lossy().to_string(), content.clone());
        assert!(result.is_ok());

        let read_back = fs::read_to_string(&file_path).unwrap();
        assert_eq!(read_back, content);
    }

    #[test]
    fn test_write_file_nonexistent_parent() {
        let result = write_file(
            "/nonexistent/parent/dir/file.md".to_string(),
            "content".to_string(),
        );
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Cannot resolve parent"));
    }

    #[test]
    fn test_write_file_no_temp_file_left() {
        let dir = TempDir::new().unwrap();
        let file_path = dir.path().join("clean.md");

        let content = "# Clean".to_string();
        let _ = write_file(file_path.to_string_lossy().to_string(), content);

        // Ensure no .tmp.kusa file remains
        let temp_path = file_path.with_extension("tmp.kusa");
        assert!(!temp_path.exists());
    }
}
