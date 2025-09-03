import { SsoTokenResponse } from "src/types/sso";

const TOKEN_URL = Bun.env.OIDC_TOKEN_URL ?? "";
const CLIENT_ID = Bun.env.OIDC_CLIENT_ID ?? "";
const CLIENT_SECRET = Bun.env.OIDC_CLIENT_SECRET ?? "";

type loginSSOResponse =
  | {
      success: true;
      data: SsoTokenResponse;
    }
  | {
      success: false;
      data: null;
    };

export const loginSSO = async (
  username: string,
  password: string
): Promise<loginSSOResponse> => {
  if (!TOKEN_URL || !CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("SSO configuration is missing");
  }

  const params = new URLSearchParams();
  params.append("grant_type", "password");
  params.append("client_id", CLIENT_ID);
  params.append("client_secret", CLIENT_SECRET);
  params.append("username", username);
  params.append("password", password);
  params.append("scope", "openid");

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("SSO login failed:", errorData);
    return {
      success: false,
      data: null,
    };
  }

  const data: SsoTokenResponse = await response.json();

  return {
    success: true,
    data,
  };
};

export const refreshSSOToken = async (
  refresh_token: string
): Promise<loginSSOResponse> => {
  if (!TOKEN_URL || !CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("SSO configuration is missing");
  }

  const params = new URLSearchParams();
  params.append("grant_type", "refresh_token");
  params.append("client_id", CLIENT_ID);
  params.append("client_secret", CLIENT_SECRET);
  params.append("refresh_token", refresh_token);

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("SSO login failed:", errorData);
    return {
      success: false,
      data: null,
    };
  }

  const data: SsoTokenResponse = await response.json();

  return {
    success: true,
    data,
  };
};
