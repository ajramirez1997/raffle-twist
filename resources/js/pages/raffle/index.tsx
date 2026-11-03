import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { Dice5, LogOut, Sparkles, Trophy, Users } from 'lucide-react';
import { spin as spinRaffle } from '@/actions/App/Http/Controllers/RaffleController';

type Participant = {
    id: number;
    raffle_number: string;
};

type Winner = {
    id: number;
    raffle_number: string;
    won_at: string;
};

type Props = {
    participants: Participant[];
    winners: Winner[];
    winnerCount: number;
    flash: {
        winner: Winner | null;
    };
};

export default function Raffle({
    participants,
    winners,
    winnerCount,
    flash,
}: Props) {
    const [displayNumber, setDisplayNumber] = useState(
        winners[0]?.raffle_number ?? '------',
    );
    const [winnerNumber, setWinnerNumber] = useState<string | null>(
        winners[0]?.raffle_number ?? null,
    );
    const [spinning, setSpinning] = useState(false);
    const [spinError, setSpinError] = useState<string | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const winnerTarget = useRef<string | null>(null);
    const delay = useRef(55);

    useEffect(() => {
        if (flash.winner) {
            winnerTarget.current = flash.winner.raffle_number;
        }
    }, [flash.winner]);

    useEffect(
        () => () => {
            if (timer.current) {
                clearTimeout(timer.current);
            }
        },
        [],
    );

    const startSpin = () => {
        if (spinning || participants.length === 0) {
            return;
        }

        winnerTarget.current = null;
        delay.current = 55;
        setWinnerNumber(null);
        setSpinError(null);
        setSpinning(true);

        const tick = () => {
            const participant =
                participants[Math.floor(Math.random() * participants.length)];

            if (participant) {
                setDisplayNumber(participant.raffle_number);
            }

            if (winnerTarget.current) {
                delay.current *= 1.32;

                if (delay.current > 450) {
                    setDisplayNumber(winnerTarget.current);
                    setWinnerNumber(winnerTarget.current);
                    setSpinning(false);

                    return;
                }
            }

            timer.current = setTimeout(tick, delay.current);
        };

        tick();

        router.post(
            spinRaffle.url(),
            {},
            {
                preserveScroll: true,
                onError: (errors) => {
                    if (timer.current) {
                        clearTimeout(timer.current);
                    }

                    setSpinning(false);
                    setSpinError(
                        errors.raffle ?? 'The draw could not be completed.',
                    );
                },
            },
        );
    };

    return (
        <>
            <Head title="Raffle Draw" />
            <main className="min-h-screen bg-slate-50 text-slate-900">
                <header className="border-b border-slate-200 bg-white">
                    <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
                        <div className="flex items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
                                <Dice5 className="size-5" />
                            </div>
                            <div>
                                <h1 className="font-semibold">Raffle Draw</h1>
                                <p className="text-xs text-slate-500">
                                    Administrator
                                </p>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.8fr)] lg:px-8 lg:py-12">
                    <section className="flex min-h-[480px] flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white px-5 py-12 text-center shadow-sm sm:px-10">
                        <div className="mb-5 flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold tracking-wide text-indigo-700 uppercase">
                            <Sparkles className="size-3.5" />
                            Live raffle
                        </div>
                        <p className="text-sm font-medium text-slate-500">
                            {winnerNumber
                                ? 'Latest winning number'
                                : 'Your next winning number'}
                        </p>
                        <div
                            aria-live="polite"
                            className={`my-4 font-mono text-6xl font-bold tracking-[0.12em] text-slate-900 transition sm:text-8xl ${spinning ? 'animate-pulse text-indigo-700' : ''} ${winnerNumber && !spinning ? 'text-indigo-700' : ''}`}
                        >
                            {displayNumber}
                        </div>
                        {winnerNumber && !spinning && (
                            <p className="mb-6 flex items-center gap-2 text-sm font-semibold text-emerald-700">
                                <Trophy className="size-4" />
                                Winner declared!
                            </p>
                        )}
                        {spinError && (
                            <p
                                role="alert"
                                className="mb-5 text-sm text-red-600"
                            >
                                {spinError}
                            </p>
                        )}
                        {!participants.length && (
                            <p className="mb-5 text-sm text-slate-500">
                                No eligible participants remain.
                            </p>
                        )}
                        <button
                            type="button"
                            onClick={startSpin}
                            disabled={spinning || participants.length === 0}
                            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-8 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Dice5 className="size-5" />
                            {spinning ? 'Drawing winner…' : 'Spin the raffle'}
                        </button>
                        <p className="mt-4 text-xs text-slate-400">
                            Every draw is securely recorded.
                        </p>
                    </section>

                    <div className="space-y-6">
                        <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                            <div className="mb-5 flex items-start justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-semibold">
                                        Eligible participants
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        {participants.length} remaining in the
                                        draw
                                    </p>
                                </div>
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                                    <Users className="size-5" />
                                </span>
                            </div>
                            <div className="max-h-[390px] divide-y divide-slate-100 overflow-y-auto">
                                {participants.map((participant) => (
                                    <div
                                        key={participant.id}
                                        className="flex items-center justify-between gap-3 py-3"
                                    >
                                        <span className="font-mono font-medium tracking-wide">
                                            {participant.raffle_number}
                                        </span>
                                    </div>
                                ))}
                                {!participants.length && (
                                    <p className="py-8 text-center text-sm text-slate-500">
                                        Add participants to start a draw.
                                    </p>
                                )}
                            </div>
                            <div className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-500">
                                <span className="font-semibold text-slate-800">
                                    {winnerCount}
                                </span>{' '}
                                {winnerCount === 1 ? 'winner' : 'winners'}{' '}
                                declared so far
                            </div>
                        </aside>
                        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-semibold">
                                        Winners
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        All winning raffle numbers
                                    </p>
                                </div>
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                                    <Trophy className="size-5" />
                                </span>
                            </div>
                            {winners.length > 0 ? (
                                <ol className="max-h-64 divide-y divide-slate-100 overflow-y-auto">
                                    {winners.map((winner) => (
                                        <li
                                            key={winner.id}
                                            className="flex items-center justify-between gap-3 py-3"
                                        >
                                            <span className="font-mono font-semibold tracking-wide text-emerald-700">
                                                {winner.raffle_number}
                                            </span>
                                            <time
                                                dateTime={winner.won_at}
                                                className="text-xs text-slate-500"
                                            >
                                                {new Date(
                                                    winner.won_at,
                                                ).toLocaleDateString()}
                                            </time>
                                        </li>
                                    ))}
                                </ol>
                            ) : (
                                <p className="py-5 text-center text-sm text-slate-500">
                                    No winners yet.
                                </p>
                            )}
                        </section>
                    </div>
                </div>
            </main>
        </>
    );
}
