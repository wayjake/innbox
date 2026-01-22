import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "innbox — Instant Email Receiving" },
    { name: "description", content: "Get up and running to receive emails in seconds. No setup, no hassle." },
  ];
}

/*
 * ┌─────────────────────────────────────────────────────────┐
 * │  📬 innbox landing page                                 │
 * │                                                         │
 * │  The philosophy here is simple:                         │
 * │  Less is more. Email shouldn't be complicated.          │
 * │                                                         │
 * │  A single page. A single purpose.                       │
 * │  Your inbox awaits...                                   │
 * └─────────────────────────────────────────────────────────┘
 */

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="max-w-xl w-full text-center space-y-8">
        {/*
          The logo: a simple inbox icon that says everything
          without saying anything at all ✨
        */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
            innbox
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Receive emails instantly. No setup required.
          </p>
        </div>

        {/*
          The call to action — where the magic begins 🪄
          One field. One button. One beautiful inbox.
        */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <input
            type="text"
            placeholder="your-name"
            className="w-full sm:w-48 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
          <span className="text-gray-500 dark:text-gray-400 font-medium">
            @innbox.dev
          </span>
          <button className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
            Create Inbox
          </button>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-500">
          Free forever. No credit card required.
        </p>
      </div>

      {/*
        A subtle footer — because even minimalist apps
        need to tell you who made them 🌙
      */}
      <footer className="absolute bottom-6 text-sm text-gray-400 dark:text-gray-600">
        Built with care
      </footer>
    </main>
  );
}
