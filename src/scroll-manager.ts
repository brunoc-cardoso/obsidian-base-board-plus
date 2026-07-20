export interface BoardScrollState {
  boardLeft: number;
  viewTop: number;
  columnTops: Map<string, number>;
}

export function captureScrollState(
  containerEl: HTMLElement,
  scrollEl: HTMLElement,
): BoardScrollState {
  const boardEl = containerEl.querySelector<HTMLElement>(".base-board-board");
  const columnTops = new Map<string, number>();

  boardEl
    ?.querySelectorAll<HTMLElement>(".base-board-column")
    .forEach((columnEl) => {
      const name = columnEl.dataset.columnName;
      const cardsEl = columnEl.querySelector<HTMLElement>(".base-board-cards");
      if (name && cardsEl) columnTops.set(name, cardsEl.scrollTop);
    });

  return {
    boardLeft: boardEl?.scrollLeft ?? 0,
    viewTop: scrollEl.scrollTop,
    columnTops,
  };
}

export function restoreScrollState(
  boardEl: HTMLElement,
  scrollEl: HTMLElement,
  state: BoardScrollState,
): void {
  // All columns are attached, so these assignments restore against the final
  // layout and cannot race a deferred callback from an earlier render.
  boardEl.scrollLeft = state.boardLeft;
  scrollEl.scrollTop = state.viewTop;

  boardEl
    .querySelectorAll<HTMLElement>(".base-board-column")
    .forEach((columnEl) => {
      const name = columnEl.dataset.columnName;
      const cardsEl = columnEl.querySelector<HTMLElement>(".base-board-cards");
      const scrollTop = name ? state.columnTops.get(name) : undefined;
      if (cardsEl && scrollTop !== undefined) {
        cardsEl.scrollTop = scrollTop;
      }
    });
}
