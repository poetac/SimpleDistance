// Test setup: provide browser globals that jsdom lacks but our deps expect.
// Recharts' ResponsiveContainer uses ResizeObserver, which jsdom doesn't ship.

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

const g = globalThis as unknown as { ResizeObserver?: unknown };
if (!g.ResizeObserver) {
  g.ResizeObserver = ResizeObserverStub;
}
