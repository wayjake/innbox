import { Form, useActionData, useNavigation, Link } from 'react-router';
import type { Route } from './+types/forgot-password';
import { getUserByEmail, createPasswordResetToken } from '../lib/auth.server';
import { sendEmail } from '../lib/email.server';

/**
 * 🔑 Forgot Password
 *
 * Enter your email, get a magic link.
 * We always show success (even if email doesn't exist)
 * to prevent email enumeration attacks.
 */

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const email = formData.get('email') as string;

  if (!email) {
    return { error: 'Email is required' };
  }

  const user = await getUserByEmail(email);

  if (user) {
    const token = await createPasswordResetToken(user.id);
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    // System email sender - configure via env vars for custom deployments
    const systemEmail = process.env.SYSTEM_EMAIL_ADDRESS || 'hello@innbox.dev';
    const systemName = process.env.SYSTEM_EMAIL_NAME || 'innbox';

    await sendEmail({
      from: {
        email: systemEmail,
        name: systemName,
      },
      to: [{ email: user.email, name: user.name || undefined }],
      subject: 'Reset your innbox password',
      textContent: `
Hi${user.name ? ` ${user.name}` : ''},

Someone requested a password reset for your innbox account.

Click here to reset your password:
${resetUrl}

This link expires in 1 hour.

If you didn't request this, you can safely ignore this email.

- The innbox team
      `.trim(),
      htmlContent: `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #4f46e5;">Reset your password</h2>
  <p>Hi${user.name ? ` ${user.name}` : ''},</p>
  <p>Someone requested a password reset for your innbox account.</p>
  <p>
    <a href="${resetUrl}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
      Reset Password
    </a>
  </p>
  <p style="color: #666; font-size: 14px;">This link expires in 1 hour.</p>
  <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
  <p style="color: #999; font-size: 12px;">- The innbox team</p>
</body>
</html>
      `.trim(),
    });
  }

  // Always return success to prevent email enumeration
  return { success: true };
}

export default function ForgotPassword() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  if (actionData?.success) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="max-w-sm w-full space-y-6 text-center">
          <div className="text-5xl">📬</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Check your email
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            If an account exists with that email, we've sent you a link to reset your password.
          </p>
          <Link
            to="/login"
            className="inline-block text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="max-w-sm w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Forgot password?
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            No worries, we'll send you reset instructions.
          </p>
        </div>

        <Form method="post" className="space-y-4">
          {actionData?.error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
              {actionData.error}
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Sending...
              </>
            ) : (
              'Send reset link'
            )}
          </button>
        </Form>

        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          <Link
            to="/login"
            className="text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
