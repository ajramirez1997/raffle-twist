import { Head, Link, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import { update as updateRaffleSequence } from '@/actions/App/Http/Controllers/RaffleSequenceController';
import InputError from '@/components/input-error';
import { index } from '@/routes/raffle-participants';

type Slot = {
    prize_position: number;
    raffle_identification: string;
};

type Props = {
    slots: Slot[];
    completedDraws: number;
    unsequencedWinnerCount: number;
    sequenceLocked: boolean;
    success: string | null;
    error: string | null;
};

const buttonClass =
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50';

function drawSegment(prizePosition: number): string {
    if (prizePosition > 20) {
        return 'Additional Raffle Draw';
    }

    if (prizePosition >= 15) {
        return '1st Raffle Draw';
    }

    if (prizePosition >= 9) {
        return '2nd Raffle Draw';
    }

    if (prizePosition >= 4) {
        return '3rd Raffle Draw';
    }

    return 'Grand Raffle Draw';
}

export default function Sequence({
    slots,
    completedDraws,
    unsequencedWinnerCount,
    sequenceLocked,
    success,
    error,
}: Props) {
    const form = useForm<{ slots: Slot[] }>({
        slots: slots.map((slot) => ({ ...slot })),
    });

    const saveSequence = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        form.put(updateRaffleSequence.url(), {
            preserveScroll: true,
        });
    };

    const setIdentification = (index: number, identification: string) => {
        form.setData(
            'slots',
            form.data.slots.map((slot, slotIndex) =>
                slotIndex === index
                    ? { ...slot, raffle_identification: identification }
                    : slot,
            ),
        );
    };

    return (
        <>
            <Head title="Raffle Draw Sequence" />
            <main className="min-h-screen bg-slate-50 text-slate-900">
                <header className="border-b border-slate-200 bg-white">
                    <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
                        <div>
                            <Link
                                href={index()}
                                className="mb-1 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-700"
                            >
                                <ArrowLeft className="size-4" />
                                Back to participants
                            </Link>
                            <h1 className="text-lg font-semibold">
                                Raffle draw sequence
                            </h1>
                        </div>
                        <span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700">
                            {completedDraws} of {form.data.slots.length} spins
                            completed
                        </span>
                    </div>
                </header>

                <div className="mx-auto max-w-5xl space-y-6 px-4 py-7 sm:px-6 lg:px-8">
                    {success && (
                        <p
                            role="status"
                            className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
                        >
                            {success}
                        </p>
                    )}
                    {error && (
                        <p
                            role="alert"
                            className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800"
                        >
                            {error}
                        </p>
                    )}

                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                        <h2 className="text-lg font-semibold">
                            Choose the eligible identification for each spin
                        </h2>
                        <p className="mt-1 text-sm text-slate-600">
                            Spins run in listed order. The initial schedule
                            starts with prize 20 and continues down to prize 1;
                            new spins are appended to the end.
                        </p>
                        {sequenceLocked && (
                            <p
                                role="status"
                                className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900"
                            >
                                The sequence is locked because a draw has
                                started. Reset the raffle on the participants
                                page before changing it.
                            </p>
                        )}
                        {unsequencedWinnerCount > 0 && (
                            <p
                                role="status"
                                className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900"
                            >
                                {unsequencedWinnerCount} existing winner
                                {unsequencedWinnerCount === 1
                                    ? ' is'
                                    : 's are'}{' '}
                                recorded from before sequence tracking. They
                                remain ineligible and are not counted in this
                                sequence. Reset the raffle if they should be
                                eligible again.
                            </p>
                        )}
                        <InputError
                            message={form.errors.slots}
                            className="mt-3"
                        />

                        <form
                            onSubmit={saveSequence}
                            className="mt-5 space-y-3"
                        >
                            <div className="grid gap-3">
                                {form.data.slots.map((slot, index) => (
                                    <div
                                        key={`slot-${index}`}
                                        className="grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center"
                                    >
                                        <div>
                                            <p className="font-medium">
                                                Spin #{index + 1}
                                            </p>
                                            <p className="text-sm text-slate-500">
                                                Prize #{slot.prize_position}
                                                {' · '}
                                                {drawSegment(
                                                    slot.prize_position,
                                                )}
                                            </p>
                                        </div>
                                        <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                                            <span>Winner pool</span>
                                            <select
                                                value={
                                                    slot.raffle_identification
                                                }
                                                onChange={(event) =>
                                                    setIdentification(
                                                        index,
                                                        event.target.value,
                                                    )
                                                }
                                                disabled={sequenceLocked}
                                                aria-label={`Winner pool for spin ${index + 1}`}
                                                className="h-10 min-w-36 rounded-lg border border-slate-300 bg-white px-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100"
                                            >
                                                <option value="member">
                                                    Member
                                                </option>
                                                <option value="agency">
                                                    Agency
                                                </option>
                                            </select>
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                form.setData(
                                                    'slots',
                                                    form.data.slots.filter(
                                                        (_, slotIndex) =>
                                                            slotIndex !== index,
                                                    ),
                                                )
                                            }
                                            disabled={
                                                sequenceLocked ||
                                                form.data.slots.length === 1
                                            }
                                            aria-label={`Remove spin ${index + 1}`}
                                            className={`${buttonClass} border border-red-200 text-red-700 hover:bg-red-50`}
                                        >
                                            <Trash2 className="size-4" />
                                            Remove
                                        </button>
                                        <InputError
                                            message={
                                                form.errors[
                                                    `slots.${index}.raffle_identification`
                                                ]
                                            }
                                            className="sm:col-span-3"
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="flex flex-col justify-between gap-3 pt-2 sm:flex-row">
                                <button
                                    type="button"
                                    onClick={() =>
                                        form.setData('slots', [
                                            ...form.data.slots,
                                            {
                                                prize_position:
                                                    Math.max(
                                                        ...form.data.slots.map(
                                                            (slot) =>
                                                                slot.prize_position,
                                                        ),
                                                    ) + 1,
                                                raffle_identification: 'member',
                                            },
                                        ])
                                    }
                                    disabled={
                                        sequenceLocked ||
                                        form.data.slots.length >= 100 ||
                                        Math.max(
                                            ...form.data.slots.map(
                                                (slot) => slot.prize_position,
                                            ),
                                        ) >= 100
                                    }
                                    className={`${buttonClass} border border-slate-300 text-slate-700 hover:bg-slate-50`}
                                >
                                    <Plus className="size-4" />
                                    Add spin
                                </button>
                                <button
                                    type="submit"
                                    disabled={sequenceLocked || form.processing}
                                    className={`${buttonClass} bg-indigo-600 text-white hover:bg-indigo-700`}
                                >
                                    <Save className="size-4" />
                                    {form.processing
                                        ? 'Saving…'
                                        : 'Save sequence'}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            </main>
        </>
    );
}
