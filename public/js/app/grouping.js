export const GROUP_COLORS = [
  "yellow",
  "blue",
  "green",
  "purple",
  "pink",
  "orange",
  "red",
];

function getSortTimestamp(item) {
  const raw = item?.created_at || 0;
  const time = Date.parse(raw);
  return Number.isNaN(time) ? 0 : time;
}

export function sortItemsByGroup(items = []) {
  const groups = new Map();
  items.forEach((item) => {
    const hasGroup = Boolean(item?.group_id);
    const key = hasGroup ? `g:${item.group_id}` : `u:${item.id}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        items: [],
        newest: 0,
      });
    }
    const group = groups.get(key);
    const timestamp = getSortTimestamp(item);
    group.items.push(item);
    if (timestamp > group.newest) {
      group.newest = timestamp;
    }
  });

  const sortedGroups = Array.from(groups.values()).sort((a, b) => {
    if (a.newest !== b.newest) return b.newest - a.newest;
    return a.key.localeCompare(b.key);
  });

  return sortedGroups.flatMap((group) => {
    const sortedItems = [...group.items].sort((a, b) => {
      const aTime = getSortTimestamp(a);
      const bTime = getSortTimestamp(b);
      if (aTime !== bTime) return bTime - aTime;
      return String(b.id).localeCompare(String(a.id));
    });
    return sortedItems;
  });
}

export function captureGridPositions(container, selector, datasetKey) {
  const positions = new Map();
  if (!container) return positions;
  container.querySelectorAll(selector).forEach((card) => {
    const id = card.dataset[datasetKey];
    if (!id) return;
    positions.set(id, card.getBoundingClientRect());
  });
  return positions;
}

export function animateGridReorder(
  container,
  selector,
  datasetKey,
  previousPositions,
) {
  if (!container || !previousPositions || previousPositions.size === 0) return;
  container.querySelectorAll(selector).forEach((card) => {
    const id = card.dataset[datasetKey];
    const previous = previousPositions.get(id);
    if (!previous) return;
    const next = card.getBoundingClientRect();
    const deltaX = previous.left - next.left;
    const deltaY = previous.top - next.top;
    if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) return;
    card.animate(
      [
        { transform: `translate(${deltaX}px, ${deltaY}px)` },
        { transform: "translate(0, 0)" },
      ],
      {
        duration: 260,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    );
  });
}

export async function linkGroupItems(sourceId, targetId) {
  const response = await fetch("/api/commands/link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceId, targetId }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Failed to link items");
  }
  return data;
}
