import {
  ConfidentialClientApplication,
} from "@azure/msal-node";

export const OUTLOOK_SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "User.Read",
  "Mail.Read",
];

export const OUTLOOK_GRAPH_SCOPES = [
  "User.Read",
  "Mail.Read",
];

export function getMicrosoftConfig() {
  const clientId =
    process.env.MICROSOFT_CLIENT_ID;

  const clientSecret =
    process.env.MICROSOFT_CLIENT_SECRET;

  const redirectUri =
    process.env.MICROSOFT_REDIRECT_URI;

  if (!clientId) {
    throw new Error(
      "MICROSOFT_CLIENT_ID is missing."
    );
  }

  if (!clientSecret) {
    throw new Error(
      "MICROSOFT_CLIENT_SECRET is missing."
    );
  }

  if (!redirectUri) {
    throw new Error(
      "MICROSOFT_REDIRECT_URI is missing."
    );
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
  };
}

export function createMicrosoftClient() {
  const {
    clientId,
    clientSecret,
  } = getMicrosoftConfig();

  return new ConfidentialClientApplication({
    auth: {
      clientId,
      clientSecret,

      authority:
        "https://login.microsoftonline.com/common",
    },
  });
}