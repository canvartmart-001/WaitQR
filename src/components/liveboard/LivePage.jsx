import { LiveBoardSection } from "./LiveBoardSection";

export function LivePage({ desks, now, nextForDesk, nextTwoForDesk }) {
  return (
    <main className="qp-page-shell">
      <section className="grid gap-5">
        <LiveBoardSection desks={desks} now={now} nextForDesk={nextForDesk} nextTwoForDesk={nextTwoForDesk} />
      </section>
    </main>
  );
}
