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
WAKE_WAIT_SECONDS = int(os.environ.get("SHELLY_WAKE_WAIT_SECONDS", "6"))

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


def get_status():
    return call_rpc(f"Switch.GetStatus?id={RELAY_ID}")


def switch_on():
    return call_rpc(f"Switch.Set?id={RELAY_ID}&on=true")


def main():
    log_and_print("=== Shelly PM5 wake sequence started ===")
    log_and_print(f"Using Shelly IP: {SHELLY_IP}")
    log_and_print(f"Using relay/switch id: {RELAY_ID}")

    info = call_rpc("Shelly.GetDeviceInfo")
    if info is None:
        print("ERROR: Could not reach Shelly. PM5 wake failed.", flush=True)
        return 1

    before = get_status()
    if before is None:
        print("ERROR: Could not read Shelly switch status. PM5 wake failed.", flush=True)
        return 1

    current_state = before.get("output")
    log_and_print(f"Current Shelly output state before wake: {current_state}")

    log_and_print("Turning Shelly output ON...")
    result = switch_on()
    if result is None:
        print("ERROR: Failed to turn Shelly ON.", flush=True)
        return 1

    log_and_print(f"Waiting {WAKE_WAIT_SECONDS} seconds for PM5/dock to become ready...")
    time.sleep(WAKE_WAIT_SECONDS)

    after = get_status()
    if after is None:
        print("ERROR: Could not confirm Shelly status after ON command.", flush=True)
        return 1

    final_state = after.get("output")
    log_and_print(f"Current Shelly output state after wake: {final_state}")

    if final_state is not True:
        print("ERROR: Shelly output is not ON after wake sequence.", flush=True)
        return 1

    log_and_print("Shelly PM5 wake sequence completed successfully. Shelly remains ON.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
