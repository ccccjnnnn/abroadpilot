"use client";

import {
  useEffect,
  useState,
} from "react";

type Account = {
  email: string;
  name: string | null;
};

type Email = {
  id: string;

  subject: string;

  sender_name: string | null;

  sender_address: string | null;

  received_at: string | null;

  original_sent_at: string | null;

  preview: string;

  is_forwarded: boolean;

  summary_zh: string | null;

  category: string | null;

  importance: string | null;

  mandatory: boolean | null;

  deadline: string | null;

  deadline_text: string | null;

  analysis_status: string;
};

type SyncResult = {
  processed: number;

  inserted: number;

  duplicates: number;

  batchContainers: number;

  attachedMessagesFound: number;

  singleForwardsFound: number;

  unsupportedEmailAttachments: number;
};

export default function OutlookInbox() {
  const [account, setAccount] =
    useState<Account | null>(null);

  const [emails, setEmails] =
    useState<Email[]>([]);

  const [connected, setConnected] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [syncing, setSyncing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [
    syncMessage,
    setSyncMessage,
  ] = useState<string | null>(null);

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    try {
      setLoading(true);
      setError(null);

      const [
        statusResponse,
        emailResponse,
      ] = await Promise.all([
        fetch(
          "/api/outlook/status",
          {
            cache: "no-store",
          }
        ),

        fetch(
          "/api/emails",
          {
            cache: "no-store",
          }
        ),
      ]);

      const statusData =
        await statusResponse.json();

      if (!statusResponse.ok) {
        throw new Error(
          statusData.error ||
            "Could not load Outlook."
        );
      }

      setConnected(
        Boolean(
          statusData.connected
        )
      );

      setAccount(
        statusData.account ||
          null
      );

      if (emailResponse.ok) {
        const emailData =
          await emailResponse.json();

        setEmails(
          emailData.emails ||
            []
        );
      }
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadEmails() {
    const response =
      await fetch(
        "/api/emails",
        {
          cache: "no-store",
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
          "Could not load emails."
      );
    }

    setEmails(
      data.emails || []
    );
  }

  async function syncEmails() {
    try {
      setSyncing(true);
      setError(null);
      setSyncMessage(null);

      const response =
        await fetch(
          "/api/emails/sync",
          {
            method: "POST",
          }
        );

      const data =
        await response.json();

      if (
        response.status === 401 &&
        data.reconnectRequired
      ) {
        setConnected(false);

        throw new Error(
          "Your Outlook connection needs to be refreshed."
        );
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Could not sync emails."
        );
      }

      const result =
        data as SyncResult;

      if (
        result
          .unsupportedEmailAttachments >
        0
      ) {
        setSyncMessage(
          `Imported ${result.inserted} new email${
            result.inserted === 1
              ? ""
              : "s"
          }. ${result.unsupportedEmailAttachments} email attachment(s) need another parser.`
        );
      } else if (
        result.inserted > 0
      ) {
        setSyncMessage(
          `Imported ${result.inserted} new school email${
            result.inserted === 1
              ? ""
              : "s"
          }.`
        );
      } else if (
        result.processed > 0
      ) {
        setSyncMessage(
          "Everything is already up to date."
        );
      } else {
        setSyncMessage(
          "No forwarded school emails were found in your recent Outlook messages."
        );
      }

      await loadEmails();
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Could not sync emails."
      );
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return (
      <div className="mt-8 rounded-2xl bg-white p-5 text-sm text-gray-400 shadow-sm">
        Loading Inbox...
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="mt-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
          ✉️
        </div>

        <h2 className="mt-4 text-lg font-semibold">
          Connect Outlook
        </h2>

        <p className="mt-2 text-sm leading-6 text-gray-500">
          Connect the personal
          Outlook account where you
          forward your school emails.
        </p>

        {error && (
          <p className="mt-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <a
          href="/api/outlook/connect"
          className="mt-6 block w-full rounded-xl bg-black px-4 py-3 text-center font-medium text-white"
        >
          Connect Outlook
        </a>

        <p className="mt-3 text-center text-xs text-gray-400">
          Read-only access · You can
          disconnect later
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mt-6 rounded-2xl bg-green-50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-green-700">
              Outlook connected
            </p>

            <p className="mt-0.5 text-sm text-green-900">
              {account?.email}
            </p>
          </div>

          <span className="text-lg">
            ✓
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={syncEmails}
        disabled={syncing}
        className="mt-4 w-full rounded-xl bg-black px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {syncing
          ? "Syncing..."
          : "Sync school emails"}
      </button>

      <p className="mt-2 text-center text-xs leading-5 text-gray-400">
        Forward multiple school
        emails as attachments, then
        tap Sync.
      </p>

      {syncMessage && (
        <div className="mt-4 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
          {syncMessage}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            School emails
          </h2>

          <span className="text-sm text-gray-400">
            {emails.length}
          </span>
        </div>

        {emails.length === 0 && (
          <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center">
            <div className="text-3xl">
              📬
            </div>

            <p className="mt-3 font-medium text-gray-700">
              No school emails yet
            </p>

            <p className="mt-2 text-sm leading-6 text-gray-400">
              Forward a batch of
              emails from your school
              Outlook as attachments,
              then tap Sync.
            </p>
          </div>
        )}

        <div className="mt-4 space-y-4">
          {emails.map(
            (email) => (
              <article
                key={email.id}
                className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                    School email
                  </span>

                  {email.analysis_status ===
                    "done" && (
                    <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                      Analyzed
                    </span>
                  )}
                </div>

                <p className="mt-4 text-sm font-medium text-gray-600">
                  {email.sender_name ||
                    email.sender_address ||
                    "Unknown sender"}
                </p>

                {email.sender_address && (
                  <p className="mt-0.5 break-all text-xs text-gray-400">
                    {
                      email.sender_address
                    }
                  </p>
                )}

                <h3 className="mt-3 text-lg font-semibold leading-6 text-gray-900">
                  {email.subject}
                </h3>

                <p className="mt-3 line-clamp-4 text-sm leading-6 text-gray-500">
                  {email.preview}
                </p>

                {email.received_at && (
                  <p className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-400">
                    {new Date(
                      email.received_at
                    ).toLocaleString()}
                  </p>
                )}
              </article>
            )
          )}
        </div>
      </section>
    </>
  );
}