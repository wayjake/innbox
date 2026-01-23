import { Form, useLoaderData, useActionData, useNavigation, Link } from 'react-router';
import { useState } from 'react';
import type { Route } from './+types/admin.settings';
import { requireUser } from '../lib/auth.server';
import { getSmtpSettings, updateSmtpSettings, testSmtpConnection } from '../lib/email.server';
import { redirect } from 'react-router';

/**
 * ⚙️ Admin Settings
 *
 * The control room for admins to tweak the dials.
 * Currently: SMTP provider configuration.
 * Future: who knows what adventures await!
 *
 *    ╭────────────────────────────────────╮
 *    │  Welcome to the Engine Room       │
 *    │  ┌─────┐  ┌─────┐  ┌─────┐       │
 *    │  │ ▓▓▓ │  │ ░░░ │  │ ▒▒▒ │       │
 *    │  └─────┘  └─────┘  └─────┘       │
 *    ╰────────────────────────────────────╯
 */

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);

  // Only admins can access this page
  if (user.userType === 'member') {
    throw redirect('/inbox');
  }

  const smtpSettings = await getSmtpSettings();

  return {
    user: {
      id: user.id,
      email: user.email,
    },
    smtp: smtpSettings,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const user = await requireUser(request);

  if (user.userType === 'member') {
    return { error: 'Unauthorized' };
  }

  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'save') {
    const provider = formData.get('provider') as 'brevo' | 'smtp2go';
    const apiKey = formData.get('apiKey') as string;

    if (!provider || !apiKey) {
      return { error: 'Provider and API key are required' };
    }

    await updateSmtpSettings(provider, apiKey, user.id);
    return { success: true, message: 'Settings saved successfully' };
  }

  if (intent === 'test') {
    const provider = formData.get('provider') as 'brevo' | 'smtp2go';
    const apiKey = formData.get('apiKey') as string;

    if (!provider || !apiKey) {
      return { error: 'Provider and API key are required for testing' };
    }

    const result = await testSmtpConnection(provider, apiKey, user.email);

    if (result.success) {
      return { success: true, message: `Test email sent to ${user.email}` };
    }

    return { error: result.error || 'Failed to send test email' };
  }

  return { error: 'Invalid action' };
}

export default function AdminSettings() {
  const { smtp } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  const [provider, setProvider] = useState<'brevo' | 'smtp2go'>(smtp.provider || 'smtp2go');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  const hasChanges = apiKey.length > 0;

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/inbox"
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1 mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to inbox
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Settings
        </h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Configure your innbox instance
        </p>
      </div>

      {/* SMTP Configuration */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          Email Provider
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Configure the SMTP provider for sending emails (password resets, invitations, etc.)
        </p>

        {/* Status indicator */}
        <div className="mb-6 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center gap-2">
            {smtp.hasApiKey ? (
              <>
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>{smtp.provider}</strong> configured
                  {smtp.source === 'env' && ' (via environment variable)'}
                </span>
                {smtp.apiKeyPreview && (
                  <span className="text-sm text-gray-500 dark:text-gray-500 ml-auto font-mono">
                    {smtp.apiKeyPreview}
                  </span>
                )}
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  No email provider configured
                </span>
              </>
            )}
          </div>
        </div>

        <Form method="post" className="space-y-6">
          {/* Feedback messages */}
          {actionData?.error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
              {actionData.error}
            </div>
          )}
          {actionData?.success && (
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm">
              {actionData.message}
            </div>
          )}

          {/* Provider selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Provider
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="provider"
                  value="smtp2go"
                  checked={provider === 'smtp2go'}
                  onChange={(e) => setProvider(e.target.value as 'smtp2go')}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-900 dark:text-white">SMTP2GO</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="provider"
                  value="brevo"
                  checked={provider === 'brevo'}
                  onChange={(e) => setProvider(e.target.value as 'brevo')}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-900 dark:text-white">Brevo</span>
              </label>
            </div>
          </div>

          {/* API Key input */}
          <div>
            <label
              htmlFor="apiKey"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              API Key
            </label>
            <div className="relative">
              <input
                id="apiKey"
                name="apiKey"
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={smtp.hasApiKey ? 'Enter new key to update' : 'Enter your API key'}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent pr-12"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showApiKey ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
              {provider === 'smtp2go' ? (
                <>Get your API key from <a href="https://app.smtp2go.com/settings/api_keys/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">SMTP2GO settings</a></>
              ) : (
                <>Get your API key from <a href="https://app.brevo.com/settings/keys/api" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">Brevo settings</a></>
              )}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              type="submit"
              name="intent"
              value="save"
              disabled={isSubmitting || !hasChanges}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              {isSubmitting ? 'Saving...' : 'Save Settings'}
            </button>
            <button
              type="submit"
              name="intent"
              value="test"
              disabled={isSubmitting || !hasChanges}
              className="px-6 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Test Connection
            </button>
          </div>
        </Form>
      </div>

      {/* Info about env vars */}
      {smtp.source === 'env' && (
        <div className="mt-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>Note:</strong> You currently have an API key set via environment variable.
            Saving settings here will override it with database configuration.
          </p>
        </div>
      )}
    </div>
  );
}
