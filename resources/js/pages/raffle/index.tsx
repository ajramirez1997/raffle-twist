import { Head, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { Dice5, Maximize, Minimize } from 'lucide-react';
import { spin as spinRaffle } from '@/actions/App/Http/Controllers/RaffleController';

type ConfettiPiece = {
    id: number;
    left: number;
    delay: number;
    duration: number;
    size: number;
    color: string;
    round: boolean;
};

type Props = {
    raffleNumbers: string[];
    nextDraw: {
        spin_number: number;
        prize_position: number;
        raffle_identification: string;
    } | null;
    flash: {
        winner: {
            id: number;
            raffle_number: string;
            prize_position: number;
            raffle_identification: string;
            spin_number: number;
        } | null;
    };
};

export default function Raffle({ raffleNumbers, nextDraw, flash }: Props) {
    const [displayNumber, setDisplayNumber] = useState('');
    const [previousNumber, setPreviousNumber] = useState('');
    const [reelTick, setReelTick] = useState(0);
    const [reelDuration, setReelDuration] = useState(520);
    const [winnerNumber, setWinnerNumber] = useState<string | null>(null);
    const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
    const [spinning, setSpinning] = useState(false);
    const [drawPhase, setDrawPhase] = useState<
        'ready' | 'spinning' | 'slowing'
    >('ready');
    const [spinError, setSpinError] = useState<string | null>(null);
    const [fullscreen, setFullscreen] = useState(false);
    const mainRef = useRef<HTMLElement | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const winnerTarget = useRef<string | null>(null);
    const displayNumberRef = useRef('');

    useEffect(() => {
        const syncFullscreen = () => {
            setFullscreen(document.fullscreenElement === mainRef.current);
        };

        document.addEventListener('fullscreenchange', syncFullscreen);

        return () =>
            document.removeEventListener('fullscreenchange', syncFullscreen);
    }, []);

    const showNumber = (number: string, duration: number) => {
        setPreviousNumber(displayNumberRef.current);
        displayNumberRef.current = number;
        setDisplayNumber(number);
        setReelDuration(duration);
        setReelTick((tick) => tick + 1);
    };

    const toggleFullscreen = async () => {
        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
            } else if (mainRef.current?.requestFullscreen) {
                await mainRef.current.requestFullscreen();
            } else {
                setSpinError('Fullscreen is not supported by this browser.');
            }
        } catch {
            setSpinError('Unable to change fullscreen mode.');
        }
    };

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

    useEffect(() => {
        if (!winnerNumber) {
            return;
        }

        const colors = ['#fb7185', '#fda4af', '#f8fafc', '#fbbf24', '#e11d48'];
        setConfetti(
            Array.from({ length: 72 }, (_, id) => ({
                id,
                left: Math.random() * 100,
                delay: Math.random() * 450,
                duration: 2600 + Math.random() * 1700,
                size: 5 + Math.random() * 8,
                color: colors[Math.floor(Math.random() * colors.length)],
                round: Math.random() > 0.55,
            })),
        );
    }, [winnerNumber]);

    const startSpin = () => {
        if (spinning || raffleNumbers.length === 0 || nextDraw === null) {
            return;
        }

        winnerTarget.current = null;
        setWinnerNumber(null);
        setConfetti([]);
        setSpinError(null);
        setSpinning(true);
        setDrawPhase('spinning');

        const accelerationDelays = [520, 420, 330, 260, 205, 160, 125, 100, 82];
        const slowdownDelays = [150, 230, 340];
        const spinStartedAt = Date.now();
        const totalSpinDuration = 10_000;
        const landingDuration = 650;
        const slowdownDuration = slowdownDelays.reduce(
            (total, delay) => total + delay,
            landingDuration,
        );
        const spinDurationBeforeSlowdown = totalSpinDuration - slowdownDuration;
        let rollCount = 0;
        let slowdownStep = 0;

        const roll = () => {
            if (rollCount >= 10 && winnerTarget.current) {
                if (Date.now() - spinStartedAt < spinDurationBeforeSlowdown) {
                    showNumber(
                        raffleNumbers[
                            Math.floor(Math.random() * raffleNumbers.length)
                        ],
                        120,
                    );
                    timer.current = setTimeout(roll, 120);
                    return;
                }

                if (slowdownStep >= slowdownDelays.length) {
                    showNumber(winnerTarget.current, landingDuration);
                    timer.current = setTimeout(() => {
                        setWinnerNumber(winnerTarget.current);
                        setSpinning(false);
                        setDrawPhase('ready');
                    }, 650);
                    return;
                }

                setDrawPhase('slowing');
                const delay = slowdownDelays[slowdownStep];
                slowdownStep += 1;
                showNumber(
                    raffleNumbers[
                        Math.floor(Math.random() * raffleNumbers.length)
                    ],
                    delay,
                );
                rollCount += 1;
                timer.current = setTimeout(roll, delay);
                return;
            }

            const raffleNumber =
                raffleNumbers[Math.floor(Math.random() * raffleNumbers.length)];
            rollCount += 1;
            const delay =
                accelerationDelays[
                    Math.min(rollCount - 1, accelerationDelays.length - 1)
                ];
            showNumber(raffleNumber, delay);
            timer.current = setTimeout(roll, delay);
        };

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
                    setDrawPhase('ready');
                    setSpinError(
                        errors.raffle ?? 'The draw could not be completed.',
                    );
                },
            },
        );

        roll();
    };

    return (
        <>
            <Head title="Raffle Draw" />
            <main
                ref={mainRef}
                className="relative min-h-svh overflow-hidden bg-no-repeat text-white"
                style={{
                    backgroundImage:
                        "url('/images/theater_marquee_background_1080p.jpg')",
                    backgroundSize: '100% 100%',
                }}
            >
                <button
                    type="button"
                    onClick={() => void toggleFullscreen()}
                    aria-label={
                        fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'
                    }
                    title={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                    className="absolute top-4 right-4 z-20 inline-flex size-10 items-center justify-center rounded-lg border border-amber-200/25 bg-black/30 text-amber-100/80 transition hover:border-amber-200/50 hover:bg-amber-950/60 hover:text-amber-50"
                >
                    {fullscreen ? (
                        <Minimize className="size-4" />
                    ) : (
                        <Maximize className="size-4" />
                    )}
                </button>
                {confetti.length > 0 && (
                    <div
                        aria-hidden="true"
                        className="pointer-events-none fixed inset-0 z-50 overflow-hidden motion-reduce:hidden"
                    >
                        {confetti.map((piece) => (
                            <span
                                key={piece.id}
                                className="raffle-confetti-piece absolute top-0"
                                style={{
                                    left: `${piece.left}%`,
                                    width: `${piece.size}px`,
                                    height: `${piece.size * 1.65}px`,
                                    backgroundColor: piece.color,
                                    borderRadius: piece.round ? '50%' : '2px',
                                    animationDelay: `${piece.delay}ms`,
                                    animationDuration: `${piece.duration}ms`,
                                    animationIterationCount: 'infinite',
                                }}
                            />
                        ))}
                    </div>
                )}
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 opacity-[0.035]"
                    style={{
                        backgroundImage:
                            'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
                        backgroundSize: '56px 56px',
                    }}
                />

                <div className="absolute inset-x-0 top-0 bottom-24 z-10 flex translate-y-3 items-center justify-center px-4 text-center sm:bottom-28 sm:translate-y-5 sm:px-6">
                    <section className="flex w-full max-w-5xl flex-col items-center gap-6 sm:gap-8">
                        <div
                            aria-hidden="true"
                            className="h-5 shrink-0 sm:h-6"
                        />

                        <div className="raffle-number-display relative h-[clamp(11rem,45svh,31rem)] w-full max-w-4xl overflow-hidden">
                            {spinning ? (
                                <div
                                    key={reelTick}
                                    aria-live="polite"
                                    className="raffle-number-reel-track absolute inset-x-0 top-0 z-10 flex h-[200%] flex-col"
                                    style={{
                                        animationDuration: `${reelDuration}ms`,
                                    }}
                                >
                                    {[previousNumber, displayNumber].map(
                                        (number, index) => (
                                            <span
                                                key={`${reelTick}-${index}`}
                                                className="flex h-1/2 w-full shrink-0 items-center justify-center px-3 text-center font-mono text-[clamp(3.5rem,15vw,14rem)] leading-none font-bold tracking-[0.08em] break-all text-amber-100"
                                            >
                                                {number}
                                            </span>
                                        ),
                                    )}
                                </div>
                            ) : (
                                <span
                                    aria-live="polite"
                                    className={`absolute inset-0 z-10 flex items-center justify-center px-3 text-center font-mono text-[clamp(3.5rem,15vw,14rem)] leading-none font-bold tracking-[0.08em] break-all text-amber-100 ${winnerNumber ? 'drop-shadow-[0_0_24px_rgba(255,211,115,0.65)]' : ''}`}
                                >
                                    {displayNumber}
                                </span>
                            )}
                        </div>

                        {spinError && (
                            <p
                                role="alert"
                                className="text-sm font-medium text-rose-200 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]"
                            >
                                {spinError}
                            </p>
                        )}
                    </section>
                </div>
                <footer className="absolute inset-x-0 bottom-0 z-20 flex justify-center px-4 pt-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                    <button
                        type="button"
                        onClick={startSpin}
                        disabled={
                            spinning ||
                            raffleNumbers.length === 0 ||
                            nextDraw === null
                        }
                        className="inline-flex min-h-14 items-center justify-center gap-3 rounded-xl border border-[#ffc3b5] bg-[#dc2626] px-10 py-4 text-lg font-bold tracking-wide text-white shadow-[0_8px_30px_rgba(192,24,36,0.45)] transition hover:bg-[#b91c1c] hover:shadow-[0_12px_42px_rgba(220,32,45,0.62)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-72"
                    >
                        <Dice5
                            className={`size-5 ${spinning ? 'animate-spin' : ''}`}
                        />
                        {spinning
                            ? drawPhase === 'slowing'
                                ? 'Almost there…'
                                : 'Numbers are rolling…'
                            : nextDraw === null
                              ? 'Raffle draws complete'
                              : 'Spin the raffle'}
                    </button>
                </footer>
            </main>
        </>
    );
}
