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

use std::collections::HashSet;

use chatmail_config::{AppConfig, DbMailPorts};

/// Allowed destination ports for SS relay (Madmail `ssAllowedPorts` defaults).
pub fn build_allowed_ports(file: &AppConfig, db: &DbMailPorts) -> HashSet<String> {
    if !file.ss_allowed_ports.is_empty() {
        return file.ss_allowed_ports.iter().cloned().collect();
    }

    let mut ports: HashSet<String> = ["3478", "5349", "25", "143", "465", "587", "993"]
        .into_iter()
        .map(str::to_string)
        .collect();

    if file.iroh_port > 0 {
        ports.insert(file.iroh_port.to_string());
    }

    for p in [
        file.smtp_listen.as_deref(),
        file.submission_listen.as_deref(),
        file.submission_tls_listen.as_deref(),
        file.imap_listen.as_deref(),
        file.imap_tls_listen.as_deref(),
        file.http_listen.as_deref(),
        file.http_tls_listen.as_deref(),
        file.turn_listen_udp.as_deref(),
        file.turn_listen_tcp.as_deref(),
        db.smtp_port.as_deref(),
        db.submission_port.as_deref(),
        db.submission_tls_port.as_deref(),
        db.imap_port.as_deref(),
        db.imap_tls_port.as_deref(),
        db.http_port.as_deref(),
        db.https_port.as_deref(),
    ] {
        if let Some(port) = port_from_listen(p) {
            ports.insert(port);
        }
    }
    ports
}

fn port_from_listen(listen: Option<&str>) -> Option<String> {
    let s = listen?.trim();
    if s.is_empty() {
        return None;
    }
    let addr = s.rsplit(':').next()?;
    if addr.chars().all(|c| c.is_ascii_digit()) {
        Some(addr.to_string())
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chatmail_config::{AppConfig, DbMailPorts};

    #[test]
    fn build_allowed_ports_uses_explicit_list_when_set() {
        let file = AppConfig {
            ss_allowed_ports: vec!["9999".into(), "8888".into()],
            ..Default::default()
        };
        let ports = build_allowed_ports(&file, &DbMailPorts::default());
        assert_eq!(ports.len(), 2);
        assert!(ports.contains("9999"));
        assert!(ports.contains("8888"));
        assert!(!ports.contains("25"));
    }

    #[test]
    fn build_allowed_ports_includes_defaults_and_listen_ports() {
        let file = AppConfig {
            smtp_listen: Some("0.0.0.0:2525".into()),
            imap_tls_listen: Some("[::]:1993".into()),
            iroh_port: 4242,
            ..Default::default()
        };
        let db = DbMailPorts {
            http_port: Some("8080".into()),
            ..Default::default()
        };
        let ports = build_allowed_ports(&file, &db);
        for expected in [
            "3478", "5349", "25", "143", "465", "587", "993", "4242", "2525", "1993", "8080",
        ] {
            assert!(ports.contains(expected), "missing port {expected}");
        }
    }

    #[test]
    fn port_from_listen_extracts_numeric_suffix() {
        assert_eq!(
            port_from_listen(Some("0.0.0.0:587")),
            Some("587".to_string())
        );
        assert_eq!(port_from_listen(Some("  ")), None);
        assert_eq!(port_from_listen(Some("host:name")), None);
        assert_eq!(port_from_listen(None), None);
    }
}
