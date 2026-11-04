import { Head, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { Dice5, Maximize, Minimize, Sparkles } from 'lucide-react';
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
    completedDraws: number;
    totalDraws: number;
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

type DrawDetails = NonNullable<Props['nextDraw']>;

export default function Raffle({
    raffleNumbers,
    nextDraw,
    completedDraws,
    totalDraws,
    flash,
}: Props) {
    const [displayNumber, setDisplayNumber] = useState('');
    const [previousNumber, setPreviousNumber] = useState('');
    const [reelTick, setReelTick] = useState(0);
    const [reelDuration, setReelDuration] = useState(520);
    const [winnerNumber, setWinnerNumber] = useState<string | null>(null);
    const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
    const [spinning, setSpinning] = useState(false);
    const [activeDraw, setActiveDraw] = useState<DrawDetails | null>(null);
    const [drawPhase, setDrawPhase] = useState<
        'ready' | 'spinning' | 'slowing'
    >('ready');
    const [spinError, setSpinError] = useState<string | null>(null);
    const [fullscreen, setFullscreen] = useState(false);
    const mainRef = useRef<HTMLElement | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const winnerTarget = useRef<string | null>(null);
    const displayNumberRef = useRef('');
    const audioContext = useRef<AudioContext | null>(null);

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

    const playWinnerSound = () => {
        const context = audioContext.current;

        if (!context || context.state !== 'running') {
            return;
        }

        const now = context.currentTime;
        const notes = [
            523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.51, 1567.98,
        ];
        const output = context.createGain();

        output.gain.setValueAtTime(0.85, now);
        output.connect(context.destination);

        notes.forEach((frequency, index) => {
            const startAt = now + index * 0.3;
            const duration = index === notes.length - 1 ? 1.05 : 0.62;

            [frequency, frequency * 2].forEach((tone, toneIndex) => {
                const oscillator = context.createOscillator();
                const gain = context.createGain();
                const peak = toneIndex === 0 ? 0.3 : 0.09;

                oscillator.type = 'triangle';
                oscillator.frequency.setValueAtTime(tone, startAt);
                gain.gain.setValueAtTime(0.0001, startAt);
                gain.gain.exponentialRampToValueAtTime(peak, startAt + 0.035);
                gain.gain.setValueAtTime(peak, startAt + duration * 0.55);
                gain.gain.exponentialRampToValueAtTime(
                    0.0001,
                    startAt + duration,
                );
                oscillator.connect(gain);
                gain.connect(output);
                oscillator.start(startAt);
                oscillator.stop(startAt + duration);
            });
        });

        [
            { startAt: 0, frequencies: [130.81, 164.81, 196] },
            { startAt: 0.9, frequencies: [174.61, 220, 261.63] },
            { startAt: 1.8, frequencies: [196, 246.94, 392] },
        ].forEach(({ startAt, frequencies }) => {
            frequencies.forEach((frequency, index) => {
                const oscillator = context.createOscillator();
                const gain = context.createGain();
                const noteStart = now + startAt;

                oscillator.type = index === 0 ? 'sine' : 'triangle';
                oscillator.frequency.setValueAtTime(frequency, noteStart);
                gain.gain.setValueAtTime(0.0001, noteStart);
                gain.gain.exponentialRampToValueAtTime(
                    index === 0 ? 0.16 : 0.09,
                    noteStart + 0.06,
                );
                gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.9);
                oscillator.connect(gain);
                gain.connect(output);
                oscillator.start(noteStart);
                oscillator.stop(noteStart + 0.9);
            });
        });

        const totalDuration = (notes.length - 1) * 0.3 + 1.05;
        output.gain.setValueAtTime(0.85, now + totalDuration - 0.1);
        output.gain.exponentialRampToValueAtTime(
            0.0001,
            now + totalDuration + 0.1,
        );
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

        setActiveDraw(nextDraw);
        winnerTarget.current = null;
        setWinnerNumber(null);
        setConfetti([]);
        setSpinError(null);
        setSpinning(true);
        setDrawPhase('spinning');

        try {
            audioContext.current ??= new AudioContext();

            if (audioContext.current.state === 'suspended') {
                void audioContext.current.resume().catch(() => {
                    audioContext.current = null;
                });
            }
        } catch {
            audioContext.current = null;
        }

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
                        playWinnerSound();
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

    const displayedDraw: DrawDetails | null = spinning
        ? activeDraw
        : winnerNumber && flash.winner
          ? {
                spin_number: flash.winner.spin_number,
                prize_position: flash.winner.prize_position,
                raffle_identification: flash.winner.raffle_identification,
            }
          : nextDraw;

    return (
        <>
            <Head title="Raffle Draw" />
            <main
                ref={mainRef}
                className="raffle-curtain relative min-h-screen overflow-hidden text-white"
                style={{
                    backgroundImage:
                        'radial-gradient(ellipse at 50% 38%, rgba(255, 201, 88, 0.12), transparent 34%), linear-gradient(180deg, #26070e 0%, #100307 100%)',
                }}
            >
                <div
                    aria-hidden="true"
                    className="raffle-curtain-wall pointer-events-none absolute inset-0 z-0"
                />
                <div
                    aria-hidden="true"
                    className="raffle-curtain-panel raffle-curtain-panel-left pointer-events-none absolute inset-y-0 left-0 z-0 w-[18vw] max-w-64 min-w-20"
                />
                <div
                    aria-hidden="true"
                    className="raffle-curtain-panel raffle-curtain-panel-right pointer-events-none absolute inset-y-0 right-0 z-0 w-[18vw] max-w-64 min-w-20"
                />
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

                <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-4 py-10 sm:px-6 sm:py-12">
                    <section
                        className={`relative w-full max-w-5xl sm:p-3`}
                    >
                        <div className="rounded-[1.6rem] border border-[#fff0b0]/80 bg-[#e8c45b] px-1 py-5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] sm:px-8 sm:py-10">
                            <div className="mx-auto mb-7 flex w-fit items-center gap-3 text-xs font-bold tracking-[0.25em] text-[#543408] uppercase">
                                <Sparkles className="size-3.5" />
                                {winnerNumber
                                    ? 'Winning number'
                                    : drawPhase === 'slowing'
                                      ? 'Almost there'
                                      : spinning
                                        ? 'Drawing in progress'
                                        : 'Your lucky number'}
                                <Sparkles className="size-3.5" />
                            </div>

                            <div className="raffle-number-display relative mx-auto h-48 max-w-4xl overflow-hidden rounded-2xl border border-amber-200/50 bg-[#090603] px-4 shadow-[inset_0_2px_30px_rgba(0,0,0,0.85),0_0_45px_rgba(245,190,75,0.14)] sm:h-64 sm:px-9">
                                <div
                                    aria-hidden="true"
                                    className="absolute inset-x-7 top-0 h-px bg-gradient-to-r from-transparent via-amber-100/70 to-transparent"
                                />
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
                                                    className="flex h-1/2 w-full shrink-0 items-center justify-center px-3 text-center font-mono text-6xl leading-none font-bold tracking-[0.08em] break-all text-amber-100 sm:text-8xl lg:text-9xl"
                                                >
                                                    {number}
                                                </span>
                                            ),
                                        )}
                                    </div>
                                ) : (
                                    <span
                                        aria-live="polite"
                                        className={`absolute inset-0 z-10 flex items-center justify-center px-3 text-center font-mono text-6xl leading-none font-bold tracking-[0.08em] break-all text-amber-100 sm:text-8xl lg:text-9xl ${winnerNumber ? 'drop-shadow-[0_0_24px_rgba(255,211,115,0.65)]' : ''}`}
                                    >
                                        {displayNumber}
                                    </span>
                                )}
                                <div
                                    aria-hidden="true"
                                    className="absolute inset-x-7 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-100/55 to-transparent"
                                />
                            </div>

                            {spinError && (
                                <p
                                    role="alert"
                                    className="mt-5 text-sm font-medium text-rose-300"
                                >
                                    {spinError}
                                </p>
                            )}

                            <button
                                type="button"
                                onClick={startSpin}
                                disabled={
                                    spinning ||
                                    raffleNumbers.length === 0 ||
                                    nextDraw === null
                                }
                                className="mt-8 inline-flex min-h-14 items-center justify-center gap-3 rounded-xl border border-[#ffc3b5] bg-[#dc2626] px-10 py-4 text-lg font-bold tracking-wide text-white shadow-[0_8px_30px_rgba(192,24,36,0.45)] transition hover:bg-[#b91c1c] hover:shadow-[0_12px_42px_rgba(220,32,45,0.62)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-72"
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

                            <div className="mt-8 border-t border-[#6e480e]/30 pt-5 text-base font-semibold tracking-wide text-[#543408]">
                                Good luck to all participants!
                            </div>
                        </div>
                    </section>
                </div>
            </main>
        </>
    );
}
