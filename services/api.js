import * as SecureStore from 'expo-secure-store';

import {
  API_ENDPOINTS,
} from '../config/api';

const TOKEN_KEY =
  'nstp_hub_admin_mobile_token';

const UNIVERSITY_ACCESS_TOKEN_KEY =
  'nstp_hub_admin_university_access_token';

const ACCOUNT_ROLE_KEY =
  'nstp_hub_admin_mobile_role';

const ACCOUNT_TYPE_KEY =
  'nstp_hub_admin_mobile_account_type';

const REQUEST_TIMEOUT =
  20000;

async function readJson(response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `The NSTP HUB server returned an invalid response (HTTP ${response.status}).`
    );
  }
}

function getApiError(data, fallback) {
  if (data?.errors) {
    const first = Object.values(data.errors)
      .flat()
      .find(Boolean);

    if (first) {
      return String(first);
    }
  }

  return data?.message || fallback;
}

async function apiRequest(url, options = {}) {
  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT
  );

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(
        'The NSTP HUB server took too long to respond.'
      );
    }

    throw new Error(
      'Cannot connect to the NSTP HUB backend. Make sure Laravel is running with php artisan serve --host=0.0.0.0 --port=8000 and that your phone and computer are on the same Wi-Fi.'
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function getToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getUniversityAccessToken() {
  return SecureStore.getItemAsync(
    UNIVERSITY_ACCESS_TOKEN_KEY
  );
}

export async function getSavedRole() {
  return SecureStore.getItemAsync(
    ACCOUNT_ROLE_KEY
  );
}

export async function getSavedAccountType() {
  return SecureStore.getItemAsync(
    ACCOUNT_TYPE_KEY
  );
}

async function saveAuthentication(data) {
  if (!data?.token) {
    throw new Error(
      'The server did not return an authentication token.'
    );
  }

  await SecureStore.setItemAsync(
    TOKEN_KEY,
    data.token
  );

  if (data?.role) {
    await SecureStore.setItemAsync(
      ACCOUNT_ROLE_KEY,
      String(data.role)
    );
  } else {
    await SecureStore.deleteItemAsync(
      ACCOUNT_ROLE_KEY
    );
  }

  if (data?.account_type) {
    await SecureStore.setItemAsync(
      ACCOUNT_TYPE_KEY,
      String(data.account_type)
    );
  } else {
    await SecureStore.deleteItemAsync(
      ACCOUNT_TYPE_KEY
    );
  }
}

async function saveUniversityAccessToken(token) {
  if (!token) {
    throw new Error(
      'The server did not return a university authorization token.'
    );
  }

  await SecureStore.setItemAsync(
    UNIVERSITY_ACCESS_TOKEN_KEY,
    token
  );
}

export async function clearAuthentication() {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(
      UNIVERSITY_ACCESS_TOKEN_KEY
    ),
    SecureStore.deleteItemAsync(
      ACCOUNT_ROLE_KEY
    ),
    SecureStore.deleteItemAsync(
      ACCOUNT_TYPE_KEY
    ),
  ]);
}

async function authenticatedRequest(
  url,
  {
    method = 'GET',
    body = undefined,
  } = {}
) {
  const token = await getToken();

  if (!token) {
    throw new Error('You are not logged in.');
  }

  const headers = {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await apiRequest(url, {
    method,
    headers,
    ...(body !== undefined
      ? { body: JSON.stringify(body) }
      : {}),
  });

  const data = await readJson(response);

  if (response.status === 401) {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(ACCOUNT_ROLE_KEY),
      SecureStore.deleteItemAsync(ACCOUNT_TYPE_KEY),
    ]);
  }

  if (!response.ok || data?.success === false) {
    throw new Error(
      getApiError(
        data,
        `Request failed (HTTP ${response.status}).`
      )
    );
  }

  return data;
}

export async function verifyUniversityAccessCode(
  accessCode
) {
  const response = await apiRequest(
    API_ENDPOINTS.VERIFY_UNIVERSITY_ACCESS_CODE,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        access_code: String(accessCode || '')
          .trim()
          .toUpperCase(),
      }),
    }
  );

  const data = await readJson(response);

  if (!response.ok || data?.success !== true) {
    throw new Error(
      getApiError(
        data,
        'Unable to verify the institutional authorization code.'
      )
    );
  }

  await saveUniversityAccessToken(
    data.access_token
  );

  return data;
}

export async function loginAdministrator({
  email,
  password,
}) {
  const universityAccessToken =
    await getUniversityAccessToken();

  if (!universityAccessToken) {
    throw new Error(
      'Your institutional authorization session has expired. Please enter the authorization code again.'
    );
  }

  const response = await apiRequest(
    API_ENDPOINTS.LOGIN,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-University-Access-Token':
          universityAccessToken,
      },
      body: JSON.stringify({
        email: String(email || '')
          .trim()
          .toLowerCase(),
        password: String(password || ''),
      }),
    }
  );

  const data = await readJson(response);

  if (!response.ok || data?.success !== true) {
    throw new Error(
      getApiError(
        data,
        'Unable to sign in to this NSTP HUB staff account.'
      )
    );
  }

  await saveAuthentication(data);

  return data;
}

export async function loginAdministratorWithGoogle(
  googleAccessToken
) {
  const universityAccessToken =
    await getUniversityAccessToken();

  if (!universityAccessToken) {
    throw new Error(
      'Your institutional authorization session has expired. Please enter the authorization code again.'
    );
  }

  const response = await apiRequest(
    API_ENDPOINTS.GOOGLE_LOGIN,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-University-Access-Token':
          universityAccessToken,
      },
      body: JSON.stringify({
        access_token:
          String(googleAccessToken || ''),
      }),
    }
  );

  const data = await readJson(response);

  if (!response.ok || data?.success !== true) {
    throw new Error(
      getApiError(
        data,
        'Unable to sign in with Google.'
      )
    );
  }

  await saveAuthentication(data);

  return data;
}

export async function getCurrentAdministrator() {
  return authenticatedRequest(
    API_ENDPOINTS.ME
  );
}

export async function getAdminDashboard() {
  return authenticatedRequest(
    API_ENDPOINTS.DASHBOARD
  );
}

export async function logoutAdministrator() {
  try {
    await authenticatedRequest(
      API_ENDPOINTS.LOGOUT,
      {
        method: 'POST',
      }
    );
  } finally {
    await clearAuthentication();
  }
}
