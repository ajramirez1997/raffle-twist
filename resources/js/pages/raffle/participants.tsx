import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import {
    ArrowLeft,
    Download,
    LogOut,
    Pencil,
    Plus,
    RotateCcw,
    Trash2,
    Upload,
} from 'lucide-react';
import {
    clearAll as clearAllParticipants,
    cancelWin,
    destroy as destroyParticipant,
    index as participantIndex,
    importMethod as importParticipants,
    resetWinners,
    store as storeParticipant,
    template as participantTemplate,
    update as updateParticipant,
} from '@/actions/App/Http/Controllers/RaffleParticipantController';
import { index as raffleSequenceIndex } from '@/actions/App/Http/Controllers/RaffleSequenceController';
import InputError from '@/components/input-error';

type Participant = {
    id: number;
    raffle_number: string;
    raffle_identification: string | null;
    already_won: boolean;
    prize_position: number | null;
    won_at: string | null;
};

type ImportSummary = {
    processed: number;
    imported: number;
    duplicates: number;
    invalid: number;
};

type ParticipantFilters = {
    search: string;
    already_won: string;
    raffle_identification: string;
};

type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

type Props = {
    participants: {
        data: Participant[];
        links: PaginationLink[];
        from: number | null;
        to: number | null;
        total: number;
    };
    filters: ParticipantFilters;
    importSummary: ImportSummary | null;
    unassignedCount: number;
    success: string | null;
    error: string | null;
};

const buttonClass =
    'inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50';

function ParticipantRow({ participant }: { participant: Participant }) {
    const [editing, setEditing] = useState(false);
    const form = useForm({
        raffle_number: participant.raffle_number,
        raffle_identification: participant.raffle_identification ?? '',
    });

    const save = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        form.put(updateParticipant.url(participant.id), {
            preserveScroll: true,
            onSuccess: () => setEditing(false),
        });
    };

    return (
        <tr className="border-b border-slate-100 last:border-0">
            <td className="px-4 py-4">
                {editing ? (
                    <form id={`edit-${participant.id}`} onSubmit={save}>
                        <input
                            value={form.data.raffle_number}
                            onChange={(event) =>
                                form.setData(
                                    'raffle_number',
                                    event.target.value,
                                )
                            }
                            className="h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                            required
                            maxLength={255}
                            aria-label="Raffle number"
                        />
                        <InputError
                            message={form.errors.raffle_number}
                            className="mt-1"
                        />
                    </form>
                ) : (
                    <span className="font-mono font-medium">
                        {participant.raffle_number}
                    </span>
                )}
            </td>
            <td className="px-4 py-4">
                {editing ? (
                    <select
                        form={`edit-${participant.id}`}
                        value={form.data.raffle_identification}
                        onChange={(event) =>
                            form.setData(
                                'raffle_identification',
                                event.target.value,
                            )
                        }
                        required
                        aria-label="Raffle identification"
                        className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    >
                        <option value="" disabled>
                            Select identification
                        </option>
                        <option value="member">Member</option>
                        <option value="agency">Agency</option>
                    </select>
                ) : (
                    <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                        {participant.raffle_identification === null
                            ? 'Unassigned'
                            : participant.raffle_identification === 'agency'
                              ? 'Agency'
                              : 'Member'}
                    </span>
                )}
                {editing && (
                    <InputError
                        message={form.errors.raffle_identification}
                        className="mt-1"
                    />
                )}
            </td>
            <td className="px-4 py-4">
                {participant.already_won ? (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        Yes
                    </span>
                ) : (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        No
                    </span>
                )}
            </td>
            <td className="px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                    {editing ? (
                        <>
                            <button
                                type="submit"
                                form={`edit-${participant.id}`}
                                disabled={form.processing}
                                className={`${buttonClass} bg-indigo-600 text-white hover:bg-indigo-700`}
                            >
                                Save
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    form.reset();
                                    form.clearErrors();
                                    setEditing(false);
                                }}
                                className={`${buttonClass} bg-slate-100 text-slate-700 hover:bg-slate-200`}
                            >
                                Cancel
                            </button>
                        </>
                    ) : (
                        <>
                            {!participant.already_won ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setEditing(true)}
                                        className={`${buttonClass} bg-slate-100 text-slate-700 hover:bg-slate-200`}
                                    >
                                        <Pencil className="size-3.5" />
                                        Edit
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (
                                                window.confirm(
                                                    `Delete participant ${participant.raffle_number}?`,
                                                )
                                            ) {
                                                router.delete(
                                                    destroyParticipant.url(
                                                        participant.id,
                                                    ),
                                                    { preserveScroll: true },
                                                );
                                            }
                                        }}
                                        className={`${buttonClass} bg-red-50 text-red-700 hover:bg-red-100`}
                                    >
                                        Delete
                                    </button>
                                </>
                            ) : (
                                <>
                                    <span className="px-2 text-xs font-medium text-slate-400">
                                        Winner record
                                        {participant.prize_position !== null
                                            ? ` · Prize #${participant.prize_position}`
                                            : ''}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (
                                                window.confirm(
                                                    `Cancel the win for ${participant.raffle_number}? They will become eligible to win again.`,
                                                )
                                            ) {
                                                router.post(
                                                    cancelWin.url(
                                                        participant.id,
                                                    ),
                                                    {},
                                                    { preserveScroll: true },
                                                );
                                            }
                                        }}
                                        className={`${buttonClass} bg-amber-50 text-amber-800 hover:bg-amber-100`}
                                    >
                                        <RotateCcw className="size-3.5" />
                                        Cancel win
                                    </button>
                                </>
                            )}
                        </>
                    )}
                </div>
            </td>
        </tr>
    );
}

export default function Participants({
    participants,
    filters,
    importSummary,
    unassignedCount,
    success,
    error,
}: Props) {
    const addForm = useForm({
        raffle_number: '',
        raffle_identification: '',
    });
    const importForm = useForm<{ file: File | null }>({ file: null });
    const filterForm = useForm(filters);

    const addParticipant = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        addForm.post(storeParticipant.url(), {
            preserveScroll: true,
            onSuccess: () => addForm.reset(),
        });
    };

    const importCsv = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        importForm.post(importParticipants.url(), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => importForm.reset(),
        });
    };

    const filterParticipants = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        filterForm.get(participantIndex.url(), {
            preserveScroll: true,
            replace: true,
        });
    };

    return (
        <>
            <Head title="Manage Participants" />
            <main className="min-h-screen bg-slate-50 text-slate-900">
                <header className="border-b border-slate-200 bg-white">
                    <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
                        <div>
                            <Link
                                href="/"
                                className="mb-1 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-700"
                            >
                                <ArrowLeft className="size-4" />
                                Back to raffle
                            </Link>
                            <h1 className="text-lg font-semibold">
                                Manage participants
                            </h1>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    if (
                                        window.confirm(
                                            'Reset the raffle? This will clear winner status, prize positions, and winning dates, but keep all participants.',
                                        )
                                    ) {
                                        router.post(
                                            resetWinners.url(),
                                            {},
                                            { preserveScroll: true },
                                        );
                                    }
                                }}
                                className={`${buttonClass} border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100`}
                            >
                                <RotateCcw className="size-4" />
                                Reset Raffle
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (
                                        window.confirm(
                                            'Clear all participants and reset the raffle? This permanently removes every participant and winner record.',
                                        )
                                    ) {
                                        router.delete(
                                            clearAllParticipants.url(),
                                            { preserveScroll: true },
                                        );
                                    }
                                }}
                                className={`${buttonClass} bg-red-600 text-white hover:bg-red-700`}
                            >
                                <Trash2 className="size-4" />
                                Clear all
                            </button>
                            <Link
                                href={raffleSequenceIndex.url()}
                                className={`${buttonClass} text-slate-600 hover:bg-slate-100`}
                            >
                                Manage draw sequence
                            </Link>
                            <button
                                type="button"
                                onClick={() => router.post('/logout')}
                                className={`${buttonClass} text-slate-600 hover:bg-slate-100`}
                            >
                                <LogOut className="size-4" />
                                <span className="hidden sm:inline">
                                    Log out
                                </span>
                            </button>
                        </div>
                    </div>
                </header>

                <div className="mx-auto max-w-7xl space-y-6 px-4 py-7 sm:px-6 lg:px-8">
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
                    {unassignedCount > 0 && (
                        <p
                            role="status"
                            className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900"
                        >
                            {unassignedCount} participant
                            {unassignedCount === 1 ? ' needs' : 's need'} a
                            raffle identification. Unassigned participants
                            cannot be drawn.
                        </p>
                    )}
                    {importSummary && (
                        <section
                            role="status"
                            className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-950"
                        >
                            <h2 className="font-semibold">
                                CSV import summary
                            </h2>
                            <p className="mt-2">
                                {importSummary.processed} rows processed ·{' '}
                                {importSummary.imported} imported ·{' '}
                                {importSummary.duplicates} duplicates ·{' '}
                                {importSummary.invalid} invalid
                            </p>
                        </section>
                    )}

                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                        <div className="mb-5">
                            <h2 className="text-lg font-semibold">
                                Add participant
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Add a raffle number to the participant pool.
                            </p>
                        </div>
                        <form
                            onSubmit={addParticipant}
                            className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,auto)_auto] sm:items-end"
                        >
                            <div>
                                <label
                                    htmlFor="raffle_number"
                                    className="mb-2 block text-sm font-medium text-slate-700"
                                >
                                    Raffle number
                                </label>
                                <input
                                    id="raffle_number"
                                    value={addForm.data.raffle_number}
                                    onChange={(event) =>
                                        addForm.setData(
                                            'raffle_number',
                                            event.target.value,
                                        )
                                    }
                                    maxLength={255}
                                    required
                                    className="h-11 w-full rounded-lg border border-slate-300 px-3 font-mono outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                    placeholder="e.g. 1001"
                                />
                                <InputError
                                    message={addForm.errors.raffle_number}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <label
                                    htmlFor="raffle_identification"
                                    className="mb-2 block text-sm font-medium text-slate-700"
                                >
                                    Raffle identification
                                </label>
                                <select
                                    id="raffle_identification"
                                    value={addForm.data.raffle_identification}
                                    onChange={(event) =>
                                        addForm.setData(
                                            'raffle_identification',
                                            event.target.value,
                                        )
                                    }
                                    required
                                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                >
                                    <option value="" disabled>
                                        Select identification
                                    </option>
                                    <option value="member">Member</option>
                                    <option value="agency">Agency</option>
                                    <option value="unassigned">
                                        Unassigned
                                    </option>
                                </select>
                                <InputError
                                    message={
                                        addForm.errors.raffle_identification
                                    }
                                    className="mt-1"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={addForm.processing}
                                className={`${buttonClass} h-11 bg-indigo-600 px-5 text-white hover:bg-indigo-700`}
                            >
                                <Plus className="size-4" />
                                Add participant
                            </button>
                        </form>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                        <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                            <div>
                                <h2 className="text-lg font-semibold">
                                    Import participants
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Upload a CSV with raffle_number and
                                    raffle_identification columns.
                                </p>
                            </div>
                            <a
                                href={participantTemplate.url()}
                                className={`${buttonClass} self-start border border-slate-200 text-slate-700 hover:bg-slate-50 sm:self-auto`}
                            >
                                <Download className="size-4" />
                                Download template
                            </a>
                        </div>
                        <form
                            onSubmit={importCsv}
                            className="flex flex-col gap-3 sm:flex-row sm:items-start"
                        >
                            <div className="min-w-0 flex-1">
                                <input
                                    type="file"
                                    accept=".csv,text/csv"
                                    onChange={(event) =>
                                        importForm.setData(
                                            'file',
                                            event.currentTarget.files?.[0] ??
                                                null,
                                        )
                                    }
                                    className="block w-full rounded-lg border border-slate-200 bg-white text-sm text-slate-600 file:mr-4 file:border-0 file:bg-slate-100 file:px-4 file:py-2.5 file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                                />
                                <InputError
                                    message={importForm.errors.file}
                                    className="mt-1"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={
                                    importForm.processing ||
                                    !importForm.data.file
                                }
                                className={`${buttonClass} h-10 bg-slate-900 px-4 text-white hover:bg-slate-800`}
                            >
                                <Upload className="size-4" />
                                Import CSV
                            </button>
                        </form>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                        <form
                            onSubmit={filterParticipants}
                            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(16rem,1fr)_auto_auto_auto]"
                        >
                            <label className="block">
                                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                                    Search raffle number
                                </span>
                                <input
                                    type="search"
                                    value={filterForm.data.search}
                                    onChange={(event) =>
                                        filterForm.setData(
                                            'search',
                                            event.target.value,
                                        )
                                    }
                                    maxLength={255}
                                    placeholder="Enter a raffle number"
                                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                />
                            </label>
                            <label className="block">
                                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                                    Already won
                                </span>
                                <select
                                    value={filterForm.data.already_won}
                                    onChange={(event) =>
                                        filterForm.setData(
                                            'already_won',
                                            event.target.value,
                                        )
                                    }
                                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                >
                                    <option value="">All</option>
                                    <option value="yes">Yes</option>
                                    <option value="no">No</option>
                                </select>
                            </label>
                            <label className="block">
                                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                                    Raffle identification
                                </span>
                                <select
                                    value={
                                        filterForm.data.raffle_identification
                                    }
                                    onChange={(event) =>
                                        filterForm.setData(
                                            'raffle_identification',
                                            event.target.value,
                                        )
                                    }
                                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                >
                                    <option value="">All</option>
                                    <option value="member">Member</option>
                                    <option value="agency">Agency</option>
                                </select>
                            </label>
                            <div className="flex items-end gap-2">
                                <button
                                    type="submit"
                                    className={`${buttonClass} h-10 bg-indigo-600 px-4 text-white hover:bg-indigo-700`}
                                >
                                    Search
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        filterForm.setData({
                                            search: '',
                                            already_won: '',
                                            raffle_identification: '',
                                        });
                                        router.get(
                                            participantIndex.url(),
                                            {},
                                            {
                                                preserveScroll: true,
                                                replace: true,
                                            },
                                        );
                                    }}
                                    className={`${buttonClass} h-10 border border-slate-200 px-4 text-slate-700 hover:bg-slate-50`}
                                >
                                    Clear
                                </button>
                            </div>
                        </form>
                    </section>

                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
                            <div>
                                <h2 className="font-semibold">
                                    All participants
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    {participants.total} total
                                </p>
                            </div>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                                Winners stay recorded
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[720px] text-left text-sm">
                                <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                                    <tr>
                                        <th className="px-4 py-3">
                                            Raffle number
                                        </th>
                                        <th className="px-4 py-3">
                                            Raffle identification
                                        </th>
                                        <th className="px-4 py-3">
                                            Already won?
                                        </th>
                                        <th className="px-4 py-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {participants.data.map((participant) => (
                                        <ParticipantRow
                                            key={participant.id}
                                            participant={participant}
                                        />
                                    ))}
                                    {!participants.data.length && (
                                        <tr>
                                            <td
                                                colSpan={4}
                                                className="px-4 py-12 text-center text-slate-500"
                                            >
                                                {filterForm.data.search ||
                                                filterForm.data.already_won ||
                                                filterForm.data
                                                    .raffle_identification
                                                    ? 'No participants match these search and filter options.'
                                                    : 'No participants yet. Add one above or import a CSV.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                            <p className="text-sm text-slate-500">
                                Showing {participants.from ?? 0} to{' '}
                                {participants.to ?? 0} of {participants.total}
                            </p>
                            <nav
                                aria-label="Participant list pagination"
                                className="flex flex-wrap items-center gap-1"
                            >
                                {participants.links.map((link, index) => {
                                    const label = link.label
                                        .replace('&laquo;', '‹')
                                        .replace('&raquo;', '›');
                                    const className = `inline-flex min-w-9 items-center justify-center rounded-lg px-3 py-2 text-sm ${
                                        link.active
                                            ? 'bg-indigo-600 font-semibold text-white'
                                            : link.url
                                              ? 'text-slate-700 hover:bg-slate-100'
                                              : 'cursor-not-allowed text-slate-300'
                                    }`;

                                    return link.url ? (
                                        <Link
                                            key={`${link.label}-${index}`}
                                            href={link.url}
                                            preserveScroll
                                            aria-current={
                                                link.active ? 'page' : undefined
                                            }
                                            className={className}
                                        >
                                            {label}
                                        </Link>
                                    ) : (
                                        <span
                                            key={`${link.label}-${index}`}
                                            className={className}
                                        >
                                            {label}
                                        </span>
                                    );
                                })}
                            </nav>
                        </div>
                    </section>
                </div>
            </main>
        </>
    );
}
