//! Log sanitizer to prevent credential leaks

/// Redacts sensitive keywords and bearer tokens from messages.
pub fn sanitize_log_message(msg: &str) -> String {
    let mut sanitized = msg.to_string();
    let keywords = ["sk-", "Bearer ", "token=", "key=", "password="];

    for kw in keywords {
        if let Some(idx) = sanitized.find(kw) {
            let start = idx + kw.len();
            let end = sanitized[start..]
                .find(|c: char| c.is_whitespace() || c == '&' || c == '"' || c == '\'')
                .map(|offset| start + offset)
                .unwrap_or(sanitized.len());
            
            if end > start {
                let mask = "***REDACTED***";
                sanitized.replace_range(start..end, mask);
            }
        }
    }
    sanitized
}
