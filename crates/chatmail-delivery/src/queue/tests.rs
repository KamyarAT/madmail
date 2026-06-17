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

#[cfg(test)]
mod unit {
    use std::time::Duration;

    use chatmail_config::QueueSettings;

    use super::super::config::QueueConfig;

    #[test]
    fn retry_delay_exponential() {
        let cfg = QueueConfig::from_settings(
            std::path::Path::new("/tmp"),
            &QueueSettings {
                initial_retry_secs: 900,
                retry_time_scale: 1.25,
                ..QueueSettings::default()
            },
        );
        assert_eq!(cfg.retry_delay(1), Duration::from_secs(900));
        assert_eq!(cfg.retry_delay(2), Duration::from_secs(1125));
    }

    #[test]
    fn max_delivery_time_default_ten_minutes() {
        assert_eq!(QueueSettings::default().max_delivery_secs, 600);
    }

    #[test]
    fn is_expired_after_max_delivery_time() {
        use super::super::store::{now_unix, QueueMeta};

        let cfg = QueueConfig::from_settings(
            std::path::Path::new("/tmp"),
            &QueueSettings {
                max_delivery_secs: 600,
                ..QueueSettings::default()
            },
        );
        let now = now_unix();
        let fresh = QueueMeta {
            id: "a".into(),
            mail_from: "b@c".into(),
            rcpt_to: "d@e".into(),
            tries_count: 0,
            queued_at_unix: now,
            last_attempt_unix: 0,
            next_attempt_unix: now,
            last_error: None,
        };
        assert!(!cfg.is_expired(&fresh));

        let stale = QueueMeta {
            queued_at_unix: now.saturating_sub(601),
            ..fresh.clone()
        };
        assert!(cfg.is_expired(&stale));
    }

    #[test]
    fn from_settings_clamps_invalid_values_to_minimums() {
        let cfg = QueueConfig::from_settings(
            std::path::Path::new("/state"),
            &QueueSettings {
                max_tries: 0,
                max_parallelism: 0,
                initial_retry_secs: 0,
                retry_time_scale: 0.5,
                max_delivery_secs: 0,
                ..QueueSettings::default()
            },
        );
        assert_eq!(cfg.max_tries, 1);
        assert_eq!(cfg.max_parallelism, 1);
        assert_eq!(cfg.initial_retry, Duration::from_secs(1));
        assert!((cfg.retry_time_scale - 1.0).abs() < f64::EPSILON);
        assert_eq!(cfg.max_delivery_time, Duration::from_secs(1));
        assert_eq!(
            cfg.location,
            std::path::Path::new("/state").join("remote_queue")
        );
    }

    #[test]
    fn is_expired_falls_back_to_last_attempt_for_legacy_meta() {
        use super::super::store::{now_unix, QueueMeta};

        let cfg = QueueConfig::from_settings(
            std::path::Path::new("/tmp"),
            &QueueSettings {
                max_delivery_secs: 60,
                ..QueueSettings::default()
            },
        );
        let now = now_unix();
        let legacy = QueueMeta {
            id: "legacy".into(),
            mail_from: "a@b".into(),
            rcpt_to: "c@d".into(),
            tries_count: 1,
            queued_at_unix: 0,
            last_attempt_unix: now.saturating_sub(120),
            next_attempt_unix: now,
            last_error: None,
        };
        assert!(cfg.is_expired(&legacy));
    }

    #[test]
    fn effective_queued_at_prefers_queued_at_unix() {
        use super::super::store::QueueMeta;

        let meta = QueueMeta {
            id: "x".into(),
            mail_from: "a@b".into(),
            rcpt_to: "c@d".into(),
            tries_count: 0,
            queued_at_unix: 100,
            last_attempt_unix: 200,
            next_attempt_unix: 300,
            last_error: None,
        };
        assert_eq!(meta.effective_queued_at(), 100);
    }
}
