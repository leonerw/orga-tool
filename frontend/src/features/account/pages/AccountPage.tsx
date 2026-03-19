import { ChangePasswordForm } from "../components/ChangePasswordForm";
import { TwoFactorSetup } from "../components/TwoFactorSetup";

export function AccountPage() {
    return (
        <div className="max-w-xl mx-auto py-10 space-y-8">
            <h1 className="text-2xl font-semibold">Account settings</h1>
            <ChangePasswordForm />
            <TwoFactorSetup />
        </div>
    );
}
