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

//! TURN relay UDP port range (RFC 8656 dynamic ports by default).

/// Default minimum relay port ([RFC 8656] dynamic range).
pub const DEFAULT_TURN_RELAY_PORT_MIN: u16 = 49152;
/// Default maximum relay port (inclusive).
pub const DEFAULT_TURN_RELAY_PORT_MAX: u16 = 65535;

/// Inclusive UDP port range for TURN media relay allocations.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TurnRelayPortRange {
    pub min: u16,
    pub max: u16,
}

impl TurnRelayPortRange {
    pub const fn default_range() -> Self {
        Self {
            min: DEFAULT_TURN_RELAY_PORT_MIN,
            max: DEFAULT_TURN_RELAY_PORT_MAX,
        }
    }

    /// Resolve file/DB values (`0` = use default for that bound).
    pub fn resolve(min: u16, max: u16) -> Self {
        Self {
            min: if min == 0 {
                DEFAULT_TURN_RELAY_PORT_MIN
            } else {
                min
            },
            max: if max == 0 {
                DEFAULT_TURN_RELAY_PORT_MAX
            } else {
                max
            },
        }
    }

    pub fn contains(&self, port: u16) -> bool {
        port >= self.min && port <= self.max
    }

    /// Validate range and ensure it does not include the TURN control/STUN port.
    pub fn validate(&self, turn_control_port: u16) -> Result<(), String> {
        if self.min == 0 || self.max == 0 {
            return Err("relay port bounds must be 1-65535".into());
        }
        if self.min > self.max {
            return Err(format!(
                "turn relay port min ({}) must be <= max ({})",
                self.min, self.max
            ));
        }
        if self.contains(turn_control_port) {
            return Err(format!(
                "turn relay port range {}-{} must not include TURN control port {turn_control_port}",
                self.min, self.max
            ));
        }
        Ok(())
    }
}

impl Default for TurnRelayPortRange {
    fn default() -> Self {
        Self::default_range()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolve_zero_uses_defaults() {
        let r = TurnRelayPortRange::resolve(0, 0);
        assert_eq!(r.min, 49152);
        assert_eq!(r.max, 65535);
    }

    #[test]
    fn resolve_partial_defaults() {
        let r = TurnRelayPortRange::resolve(50_000, 0);
        assert_eq!(r.min, 50_000);
        assert_eq!(r.max, 65535);
        let r = TurnRelayPortRange::resolve(0, 50_100);
        assert_eq!(r.min, 49152);
        assert_eq!(r.max, 50_100);
    }

    #[test]
    fn contains_inclusive_bounds() {
        let r = TurnRelayPortRange::resolve(50_000, 50_010);
        assert!(!r.contains(49_999));
        assert!(r.contains(50_000));
        assert!(r.contains(50_005));
        assert!(r.contains(50_010));
        assert!(!r.contains(50_011));
    }

    #[test]
    fn rejects_min_greater_than_max() {
        let r = TurnRelayPortRange::resolve(50_100, 50_000);
        assert!(r.validate(3478).is_err());
    }

    #[test]
    fn accepts_valid_range_clear_of_control_port() {
        let r = TurnRelayPortRange::resolve(50_000, 50_100);
        assert!(r.validate(3478).is_ok());
        assert!(r.validate(4478).is_ok());
    }

    #[test]
    fn rejects_control_port_inside_range() {
        let r = TurnRelayPortRange::resolve(3000, 4000);
        assert!(r.validate(3478).is_err());
    }

    #[test]
    fn default_range_matches_rfc_dynamic_ports() {
        let r = TurnRelayPortRange::default_range();
        assert_eq!(r.min, 49152);
        assert_eq!(r.max, 65535);
        assert!(r.validate(3478).is_ok());
    }
}
