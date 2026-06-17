// Copyright (C) 2026 themadorg
//
// SPDX-License-Identifier: AGPL-3.0-or-later

//! TURN relay allocations must use configured port range.

mod support;

use std::net::SocketAddr;
use std::time::Duration;

use chatmail_turn::{
    hmac_turn_password, spawn_turn_server_with_opts, turn_metadata_line, TurnSpawnOpts,
};
use support::turn_allocate;

const RELAY_MIN: u16 = 55_000;
const RELAY_MAX: u16 = 55_010;

#[tokio::test]
async fn turn_relay_ports_stay_in_configured_range() {
    let secret = "range-secret";
    let realm = "range.test";
    let listen: SocketAddr = {
        let s = std::net::UdpSocket::bind("127.0.0.1:0").unwrap();
        s.local_addr().unwrap()
    };
    let external = listen;

    let server = spawn_turn_server_with_opts(
        secret,
        realm,
        listen,
        external,
        TurnSpawnOpts {
            debug: false,
            test_relay_only: false,
            relay_port_min: RELAY_MIN,
            relay_port_max: RELAY_MAX,
        },
    )
    .await
    .expect("spawn turn");
    tokio::time::sleep(Duration::from_millis(300)).await;

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;
    let line = turn_metadata_line("127.0.0.1", listen.port(), secret, 3600, now).unwrap();
    let parsed = chatmail_turn::parse_turn_metadata(&line).unwrap();
    let username = parsed.expiration_timestamp.to_string();
    let _password = hmac_turn_password(secret, &username).unwrap();
    let relay_a = turn_allocate(listen, secret, realm, &username, None)
        .await
        .expect("allocate a");
    let relay_b = turn_allocate(listen, secret, realm, &username, None)
        .await
        .expect("allocate b");

    assert!(relay_a.port() >= RELAY_MIN && relay_a.port() <= RELAY_MAX);
    assert!(relay_b.port() >= RELAY_MIN && relay_b.port() <= RELAY_MAX);
    assert_ne!(relay_a.port(), relay_b.port());

    drop(server);
}
