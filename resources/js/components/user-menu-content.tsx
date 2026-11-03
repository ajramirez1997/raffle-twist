import { router } from '@inertiajs/react';
import type { User } from '@/types';

export function UserMenuContent({ user }: { user: User }) {
    return (
        <div className="p-2">
            <p className="px-2 py-1 text-sm font-medium">{user.name}</p>
            <button
                type="button"
                onClick={() => router.post('/logout')}
                className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
            >
                Log out
            </button>
        </div>
    );
}
