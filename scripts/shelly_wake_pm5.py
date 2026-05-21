#!/usr/bin/env python3

import os
import sys
import time
import logging
import requests

PROJECT_DIR = "/home/demonstrator/dmb"
LOG_DIR = os.path.join(PROJECT_DIR, "session_logs")
LOG_FILE = os.path.join(LOG_DIR, "shellySwitch.log")

os.makedirs(LOG_DIR, exist_ok=True)

logging.basicConfig(
    filename=LOG_FILE,
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    filemode="a",
)

SHELLY_IP = os.environ.get("SHELLY_IP", "192.168.33.1")
RELAY_ID = int(os.environ.get("SHELLY_RELAY_ID", "0"))

# Normal mode:
#   Ensures Shelly output is ON.
#
# Power-cycle mode:
#   Turns Shelly OFF, waits, then turns it ON again.
#   Use this if PM5 needs an actual power reset/wake pulse.
#
# Run manually with:
#   SHELLY_POWER_CYCLE=1 python scripts/shelly_wake_pm5.py
POWER_CYCLE = os.environ.get("SHELLY_POWER_CYCLE", "0") == "1"

POWER_OFF_SECONDS = int(os.environ.get("SHELLY_POWER_OFF_SECONDS", "3"))
WAKE_WAIT_SECONDS = int(os.environ.get("SHELLY_WAKE_WAIT_SECONDS", "6"))

# Retry settings for cases where Wi-Fi/Shelly route is not ready yet.
SHELLY_CONNECT_RETRIES = int(os.environ.get("SHELLY_CONNECT_RETRIES", "30"))
SHELLY_CONNECT_RETRY_SECONDS = int(os.environ.get("SHELLY_CONNECT_RETRY_SECONDS", "2"))

BASE_URL = f"http://{SHELLY_IP}/rpc"


def log_and_print(message):
    print(message, flush=True)
    logging.info(message)


def call_rpc(path, timeout=5):
    url = f"{BASE_URL}/{path}"
    log_and_print(f"Calling: {url}")

    try:
        response = requests.get(url, timeout=timeout)
        log_and_print(f"HTTP status: {response.status_code}")
        log_and_print(f"Response: {response.text}")
        response.raise_for_status()
        return response.json()

    except requests.RequestException as e:
        logging.error(f"Shelly request failed: {e}")
        print(f"ERROR: Shelly request failed: {e}", flush=True)
        return None

    except ValueError:
        logging.error("Shelly response was not valid JSON")
        print("ERROR: Shelly response was not valid JSON", flush=True)
        return None


def wait_for_shelly():
    """
    Wait until Shelly API is reachable.

    This handles boot/login cases where the mini PC Wi-Fi connection to
    ShellyPlugSG3 is not ready immediately.
    """
    log_and_print("Waiting for Shelly API to become reachable...")

    for attempt in range(1, SHELLY_CONNECT_RETRIES + 1):
        info = call_rpc("Shelly.GetDeviceInfo", timeout=3)

        if info is not None:
            log_and_print("Shelly API is reachable.")
            return info

        log_and_print(
            f"Shelly not reachable yet. Retry {attempt}/{SHELLY_CONNECT_RETRIES}. "
            f"Waiting {SHELLY_CONNECT_RETRY_SECONDS} seconds..."
        )
        time.sleep(SHELLY_CONNECT_RETRY_SECONDS)

    log_and_print("ERROR: Shelly API did not become reachable in time.")
    return None


def get_status():
    return call_rpc(f"Switch.GetStatus?id={RELAY_ID}")


def switch_on():
    return call_rpc(f"Switch.Set?id={RELAY_ID}&on=true")


def switch_off():
    return call_rpc(f"Switch.Set?id={RELAY_ID}&on=false")


def confirm_output(expected_state):
    status = get_status()

    if status is None:
        return False, None

    output = status.get("output")
    log_and_print(f"Shelly output state is now: {output}")

    return output is expected_state, status


def main():
    log_and_print("=== Shelly PM5 wake sequence started ===")
    log_and_print(f"Using Shelly IP: {SHELLY_IP}")
    log_and_print(f"Using relay/switch id: {RELAY_ID}")
    log_and_print(f"SHELLY_POWER_CYCLE: {POWER_CYCLE}")
    log_and_print(f"SHELLY_POWER_OFF_SECONDS: {POWER_OFF_SECONDS}")
    log_and_print(f"SHELLY_WAKE_WAIT_SECONDS: {WAKE_WAIT_SECONDS}")

    info = wait_for_shelly()
    if info is None:
        print("ERROR: Could not reach Shelly. PM5 wake failed.", flush=True)
        return 1

    before = get_status()
    if before is None:
        print("ERROR: Could not read Shelly switch status. PM5 wake failed.", flush=True)
        return 1

    current_state = before.get("output")
    log_and_print(f"Current Shelly output state before wake: {current_state}")

    if POWER_CYCLE:
        log_and_print("Power-cycle mode enabled.")
        log_and_print("Turning Shelly output OFF...")

        off_result = switch_off()
        if off_result is None:
            print("ERROR: Failed to turn Shelly OFF.", flush=True)
            return 1

        log_and_print(f"Waiting {POWER_OFF_SECONDS} seconds with Shelly output OFF...")
        time.sleep(POWER_OFF_SECONDS)

        off_confirmed, _ = confirm_output(False)
        if not off_confirmed:
            print("WARNING: Shelly output was not confirmed OFF. Continuing to turn ON anyway.", flush=True)

        log_and_print("Turning Shelly output ON...")
        on_result = switch_on()
        if on_result is None:
            print("ERROR: Failed to turn Shelly ON.", flush=True)
            return 1

    else:
        if current_state is True:
            log_and_print("Shelly output is already ON. Keeping it ON.")
        else:
            log_and_print("Turning Shelly output ON...")
            on_result = switch_on()
            if on_result is None:
                print("ERROR: Failed to turn Shelly ON.", flush=True)
                return 1

    log_and_print(f"Waiting {WAKE_WAIT_SECONDS} seconds for PM5/dock to become ready...")
    time.sleep(WAKE_WAIT_SECONDS)

    final_confirmed, after = confirm_output(True)
    if after is None:
        print("ERROR: Could not confirm Shelly status after wake command.", flush=True)
        return 1

    final_state = after.get("output")
    log_and_print(f"Current Shelly output state after wake: {final_state}")

    if not final_confirmed:
        print("ERROR: Shelly output is not ON after wake sequence.", flush=True)
        return 1

    log_and_print("Shelly PM5 wake sequence completed successfully. Shelly remains ON.")
    return 0


if __name__ == "__main__":
    sys.exit(main())