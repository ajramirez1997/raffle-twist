import { Form, Head } from '@inertiajs/react';
import { Dice5 } from 'lucide-react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { store } from '@/routes/login';

export default function Login() {
    return (
        <>
            <Head title="Admin login" />
            <div className="mb-8 flex flex-col items-center gap-3 text-center">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
                    <Dice5 className="size-7" />
                </div>
                <h1 className="text-2xl font-semibold tracking-tight">
                    Raffle Draw
                </h1>
                <p className="text-sm text-muted-foreground">
                    Sign in to manage your raffle
                </p>
            </div>
            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="flex flex-col gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                                id="username"
                                type="text"
                                name="username"
                                required
                                autoFocus
                                autoComplete="username"
                                placeholder="Enter your username"
                            />
                            <InputError message={errors.username} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password">Password</Label>
                            <PasswordInput
                                id="password"
                                name="password"
                                required
                                autoComplete="current-password"
                                placeholder="Enter your password"
                            />
                            <InputError message={errors.password} />
                        </div>
                        <Button
                            type="submit"
                            className="mt-1 h-11 w-full bg-indigo-600 text-white hover:bg-indigo-700"
                            disabled={processing}
                        >
                            {processing && <Spinner />}
                            Sign in
                        </Button>
                    </>
                )}
            </Form>
        </>
    );
}

Login.layout = {
    title: 'Raffle Draw',
    description: 'Administrator sign in',
};
