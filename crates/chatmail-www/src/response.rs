// Copyright (C) 2026 themadorg
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.
//
// SPDX-License-Identifier: AGPL-3.0-or-later

//! Shared JSON + CORS helpers for WebIMAP / WebSMTP.

use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::Serialize;
use serde_json::json;

pub fn set_cors(headers: &mut axum::http::HeaderMap) {
    headers.insert("Access-Control-Allow-Origin", "*".parse().unwrap());
    headers.insert(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS".parse().unwrap(),
    );
    headers.insert(
        "Access-Control-Allow-Headers",
        "Content-Type, X-Email, X-Password".parse().unwrap(),
    );
}

pub fn json_ok<T: Serialize>(status: StatusCode, value: &T) -> Response {
    let mut resp = (status, Json(value)).into_response();
    set_cors(resp.headers_mut());
    resp
}

pub fn json_err(status: StatusCode, message: &str) -> Response {
    let mut resp = (status, Json(json!({ "error": message }))).into_response();
    set_cors(resp.headers_mut());
    resp
}

pub fn options_preflight() -> Response {
    let mut resp = StatusCode::NO_CONTENT.into_response();
    set_cors(resp.headers_mut());
    resp
}

#[cfg(test)]
mod tests {
    use axum::body::to_bytes;
    use axum::http::{HeaderValue, StatusCode};
    use serde_json::json;

    use super::*;

    fn cors_origin(resp: &Response) -> &HeaderValue {
        resp.headers()
            .get("Access-Control-Allow-Origin")
            .expect("cors header")
    }

    #[tokio::test]
    async fn json_ok_includes_cors_and_body() {
        let resp = json_ok(StatusCode::OK, &json!({"ok": true}));
        assert_eq!(resp.status(), StatusCode::OK);
        assert_eq!(cors_origin(&resp), "*");
        let body = to_bytes(resp.into_body(), usize::MAX).await.unwrap();
        assert_eq!(body.as_ref(), br#"{"ok":true}"#);
    }

    #[tokio::test]
    async fn json_err_includes_cors_and_error_field() {
        let resp = json_err(StatusCode::BAD_REQUEST, "bad input");
        assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
        assert_eq!(cors_origin(&resp), "*");
        let body = to_bytes(resp.into_body(), usize::MAX).await.unwrap();
        assert_eq!(body.as_ref(), br#"{"error":"bad input"}"#);
    }

    #[tokio::test]
    async fn options_preflight_is_no_content_with_cors() {
        let resp = options_preflight();
        assert_eq!(resp.status(), StatusCode::NO_CONTENT);
        assert_eq!(cors_origin(&resp), "*");
        assert!(resp.headers().get("Access-Control-Allow-Methods").is_some());
    }
}
