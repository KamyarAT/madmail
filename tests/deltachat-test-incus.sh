#!/usr/bin/env bash
# Delta Chat RPC E2E (deltachat-test) in Incus: static binary deploy + cmlxc test runner.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TESTS_DIR="$(cd "$(dirname "$0")" && pwd)"

export ROOT TESTS_DIR
export CHATMAIL_BIN="${CHATMAIL_BIN:-$ROOT/target/release/madmail}"

DELTACHAT_TEST_DIR="${DELTACHAT_TEST_DIR:-$TESTS_DIR/deltachat-test}"
CMLXC_DIR="${CMLXC_DIR:-$TESTS_DIR/cmlxc}"

run_cmlxc() {
	if [[ -f "$CMLXC_DIR/pyproject.toml" ]]; then
		uv run --project "$CMLXC_DIR" cmlxc "$@"
	else
		cmlxc "$@"
	fi
}

run_tests_py() {
	uv run --project "$TESTS_DIR" python3 "$@"
}

INIT=0
MINI=0
MINI_ONLY=0
DEPLOY_ARGS=()
TEST_ARGS=()
RELAYS=()
TEST_FILTER=0

while [[ $# -gt 0 ]]; do
	case "$1" in
		--init)
			INIT=1
			shift
			;;
		--mini)
			MINI=1
			shift
			;;
		--mini-only)
			MINI=1
			MINI_ONLY=1
			shift
			;;
		--simple)
			TEST_ARGS=(--test-1 --test-2 --test-3 --test-4 --test-5 --test-6 --cool)
			TEST_FILTER=1
			shift
			;;
		--relay|--binary|--with-webadmin)
			if [[ "$1" == "--relay" ]]; then
				RELAYS+=("$2")
			fi
			DEPLOY_ARGS+=("$1" "$2")
			shift 2
			;;
		--test-*)
			if [[ $TEST_FILTER -eq 0 ]]; then
				TEST_ARGS=()
				TEST_FILTER=1
			fi
			TEST_ARGS+=("$1")
			shift
			;;
		--all|--cool|--color|--keep-lxc)
			TEST_ARGS+=("$1")
			shift
			;;
		--no-test|--domain)
			TEST_ARGS+=("$1" "$2")
			shift 2
			;;
		*)
			DEPLOY_ARGS+=("$1")
			shift
			;;
	esac
done

if [[ ${#TEST_ARGS[@]} -eq 0 ]]; then
	TEST_ARGS=(--all --cool)
fi

if [[ ! -f "$CHATMAIL_BIN" ]]; then
	echo "-- CHATMAIL_BIN not found; building static release binary..."
	make -C "$ROOT" build-release-static
	export CHATMAIL_BIN="$ROOT/target/release/madmail"
fi

if [[ ! -f "$DELTACHAT_TEST_DIR/main.py" ]]; then
	echo "deltachat-test suite missing: $DELTACHAT_TEST_DIR/main.py" >&2
	echo "Vendor context/madmail/tests/deltachat-test into tests/deltachat-test" >&2
	exit 1
fi

if [[ $INIT -eq 1 ]]; then
	echo "-- Initializing cmlxc (incus VMs, DNS, builder)..."
	run_cmlxc init
fi

export CHATMAIL_BIN
run_tests_py "$TESTS_DIR/deltachat-test-deploy.py" "${DEPLOY_ARGS[@]}"

if [[ ! -f "$TESTS_DIR/.deltachat-test-env" ]]; then
	echo "deploy step did not write $TESTS_DIR/.deltachat-test-env" >&2
	exit 1
fi

# shellcheck disable=SC1091
set -a
source "$TESTS_DIR/.deltachat-test-env"
set +a
export DELTACHAT_TEST_INCUS=1

# deltachat-test uses bare `ssh root@<ip>` for journalctl/config tweaks.
# cmlxc relays only accept the key in ~/.config/cmlxc/id_localchat (see ssh-config).
chmod +x "$TESTS_DIR/bin/ssh"
export PATH="$TESTS_DIR/bin:$PATH"
export DELTACHAT_TEST_SSH_CONFIG="${DELTACHAT_TEST_SSH_CONFIG:-$HOME/.config/cmlxc/ssh-config}"
export DELTACHAT_TEST_SSH_IDENTITY="${DELTACHAT_TEST_SSH_IDENTITY:-$HOME/.config/cmlxc/id_localchat}"

run_mini_test() {
	local relay1 relay2
	if [[ ${#RELAYS[@]} -ge 2 ]]; then
		relay1="${RELAYS[0]}"
		relay2="${RELAYS[1]}"
	elif [[ ${#RELAYS[@]} -eq 1 ]]; then
		relay1="${RELAYS[0]}"
		relay2="${RELAYS[0]}"
	else
		relay1=mad0
		relay2=mad1
	fi

	echo "-- Running cmlxc test-mini against ${relay1} ${relay2}"
	run_cmlxc test-mini "$relay1" "$relay2"
}

if [[ $MINI -eq 1 ]]; then
	run_mini_test
fi

if [[ $MINI_ONLY -eq 1 ]]; then
	exit 0
fi

echo "-- Running deltachat-test against REMOTE1=$REMOTE1 REMOTE2=$REMOTE2"
cd "$DELTACHAT_TEST_DIR"
run_tests_py main.py "${TEST_ARGS[@]}"