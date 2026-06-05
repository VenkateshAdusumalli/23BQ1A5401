import os
import heapq
from datetime import datetime
from typing import Any, Dict, List, Tuple

import requests
from dotenv import load_dotenv

from logging_middleware import logger

API_URL = "http://4.224.186.213/evaluation-service/notifications"
WEIGHTS = {
    "Placement": 3,
    "Result": 2,
    "Event": 1,
}


def fetch_notifications() -> List[Dict[str, Any]]:
    logger.info("Entering fetch_notifications")
    token = os.getenv("ACCESS_TOKEN")
    if not token:
        logger.error("Missing ACCESS_TOKEN environment variable")
        raise RuntimeError(
            "Missing ACCESS_TOKEN env var for the protected API."
        )

    headers = {"Authorization": f"Bearer {token}"}

    try:
        logger.info("API request started")
        response = requests.get(API_URL, headers=headers, timeout=15)
        logger.info("API response received")
    except requests.RequestException as exc:
        logger.error("API request failed", exc_info=True)
        raise RuntimeError(f"API request failed: {exc}") from exc

    if response.status_code != 200:
        logger.error("API returned error status %s", response.status_code)
        raise RuntimeError(
            f"API returned status {response.status_code}: {response.text}"
        )

    try:
        payload = response.json()
    except ValueError as exc:
        logger.error("Invalid JSON response from API", exc_info=True)
        raise RuntimeError("Invalid JSON response from API") from exc

    notifications = payload.get("notifications")
    if not isinstance(notifications, list):
        logger.error("Invalid response: notifications missing or not a list")
        raise RuntimeError("Invalid response: 'notifications' is missing or not a list")

    logger.info("Fetched %d notifications", len(notifications))
    logger.info("Exiting fetch_notifications")
    return notifications


def _parse_timestamp(timestamp: str) -> int:
    logger.debug("Entering _parse_timestamp")
    try:
        dt = datetime.strptime(timestamp, "%Y-%m-%d %H:%M:%S")
    except (TypeError, ValueError):
        logger.warning("Invalid timestamp format: %s", timestamp)
        return 0
    parsed = int(dt.timestamp())
    logger.debug("Exiting _parse_timestamp")
    return parsed


def calculate_priority(notification: Dict[str, Any]) -> int:
    logger.debug("Entering calculate_priority")
    notif_type = notification.get("Type")
    weight = WEIGHTS.get(str(notif_type), 0)
    timestamp = _parse_timestamp(notification.get("Timestamp"))
    # Weight dominates recency, and recency breaks ties within the same type.
    score = weight * 10**12 + timestamp
    logger.debug("Priority score calculated: %s", score)
    logger.debug("Exiting calculate_priority")
    return score


def get_top_notifications(
    notifications: List[Dict[str, Any]], k: int = 10
) -> List[Tuple[int, Dict[str, Any]]]:
    logger.info("Entering get_top_notifications")
    heap: List[Tuple[int, Dict[str, Any]]] = []

    for notif in notifications:
        if not isinstance(notif, dict):
            logger.warning("Skipping invalid notification item")
            continue

        if (
            "ID" not in notif
            or "Type" not in notif
            or "Message" not in notif
            or "Timestamp" not in notif
        ):
            logger.warning("Skipping notification with missing fields")
            continue

        priority = calculate_priority(notif)
        entry = (priority, notif)

        if len(heap) < k:
            logger.debug("Heap insertion for notification %s", notif.get("ID"))
            heapq.heappush(heap, entry)
        else:
            if priority > heap[0][0]:
                logger.debug(
                    "Heap replacement: %s replaced by %s",
                    heap[0][1].get("ID"),
                    notif.get("ID"),
                )
                heapq.heapreplace(heap, entry)

        # Min heap keeps only the top k items with O(log k) updates.
    top = sorted(heap, key=lambda x: x[0], reverse=True)
    logger.info("Top %d notifications generated", len(top))
    logger.info("Exiting get_top_notifications")
    return top


def display_notifications(top_notifications: List[Tuple[int, Dict[str, Any]]]) -> None:
    logger.info("Entering display_notifications")
    headers = [
        "Rank",
        "Type",
        "Message",
        "Timestamp",
        "Priority Score",
    ]

    rows = []
    for idx, (priority, notif) in enumerate(top_notifications, start=1):
        rows.append(
            [
                str(idx),
                str(notif.get("Type", "")),
                str(notif.get("Message", "")),
                str(notif.get("Timestamp", "")),
                str(priority),
            ]
        )

    widths = [len(h) for h in headers]
    for row in rows:
        for i, cell in enumerate(row):
            widths[i] = max(widths[i], len(cell))

    def fmt(row: List[str]) -> str:
        return " | ".join(cell.ljust(widths[i]) for i, cell in enumerate(row))

    print(fmt(headers))
    print("-+-".join("-" * w for w in widths))
    for row in rows:
        print(fmt(row))
    logger.info("Output displayed")
    logger.info("Exiting display_notifications")


def main() -> int:
    logger.info("Application started")
    try:
        load_dotenv()
        notifications = fetch_notifications()
        top_notifications = get_top_notifications(notifications, k=10)
        display_notifications(top_notifications)
    except RuntimeError as exc:
        logger.error("Application error: %s", exc)
        return 1

    logger.info("Application completed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
