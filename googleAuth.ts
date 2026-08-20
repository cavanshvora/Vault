import { useState, useEffect } from "react";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { GOOGLE_ANDROID_CLIENT_ID, SCOPES } from "./config";

WebBrowser.maybeCompleteAuthSession();

const discovery = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  revocationEndpoint: "https://oauth2.googleapis.com/revoke",
};

export type GoogleAuthState = {
  accessToken: string | null;
  isConnecting: boolean;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
};

/**
 * NOTE (MVP scope): this uses an authorization-code + PKCE exchange to get
 * an access token good for ~1 hour. It does NOT persist a refresh token —
 * doing that safely needs a small backend (Google discourages storing
 * client secrets in a mobile app). For now, re-tap "Connect" when a token
 * expires. See README "Roadmap" for the follow-up.
 */
export function useGoogleAuth(): GoogleAuthState {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectUri = AuthSession.makeRedirectUri({ scheme: "vaultapp" });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_ANDROID_CLIENT_ID,
      scopes: SCOPES,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
      extraParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
    discovery
  );

  useEffect(() => {
    const exchange = async () => {
      if (response?.type === "success" && request?.codeVerifier) {
        setIsConnecting(true);
        setError(null);
        try {
          const tokenResult = await AuthSession.exchangeCodeAsync(
            {
              clientId: GOOGLE_ANDROID_CLIENT_ID,
              code: response.params.code,
              redirectUri,
              extraParams: { code_verifier: request.codeVerifier },
            },
            discovery
          );
          setAccessToken(tokenResult.accessToken);
        } catch (e: any) {
          setError(e?.message ?? "Token exchange failed.");
        } finally {
          setIsConnecting(false);
        }
      } else if (response?.type === "error") {
        setError(response.error?.message ?? "Google sign-in failed.");
        setIsConnecting(false);
      }
    };
    exchange();
  }, [response]);

  const connect = () => {
    setError(null);
    promptAsync();
  };

  const disconnect = () => {
    setAccessToken(null);
  };

  return { accessToken, isConnecting, error, connect, disconnect };
}
