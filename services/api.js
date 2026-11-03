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


const REQUEST_TIMEOUT = 20000;

/*
|--------------------------------------------------------------------------
| Device Date / Time Context
|--------------------------------------------------------------------------
|
| Admin Mobile sends its local device date/time with authenticated requests.
| This keeps the mobile dashboard and attendance day aligned with the phone
| when the development laptop clock is accidentally one day ahead/behind.
|
| The backend only accepts this override for Philippine-time devices and only
| when the client/server calendar dates are within one day of each other.
|
*/
function padDatePart(value) {
  return String(value).padStart(2, '0');
}

function getClientDateContext() {
  const now = new Date();

  const year = now.getFullYear();
  const month = padDatePart(now.getMonth() + 1);
  const day = padDatePart(now.getDate());
  const hour = padDatePart(now.getHours());
  const minute = padDatePart(now.getMinutes());
  const second = padDatePart(now.getSeconds());

  const offsetMinutes = -now.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absoluteOffset = Math.abs(offsetMinutes);
  const offsetHours = padDatePart(Math.floor(absoluteOffset / 60));
  const offsetRemainder = padDatePart(absoluteOffset % 60);

  const clientDate = `${year}-${month}-${day}`;
  const clientDateTime =
    `${clientDate}T${hour}:${minute}:${second}${sign}${offsetHours}:${offsetRemainder}`;

  return {
    clientDate,
    clientDateTime,
    offsetMinutes,
  };
}

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

function makeApiError(response, data, fallback) {
  const error = new Error(
    getApiError(data, fallback)
  );

  error.status = response.status;
  error.data = data;

  return error;
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

export async function clearAuthentication({
  preserveUniversityAccess = false,
} = {}) {
  const deletions = [
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(ACCOUNT_ROLE_KEY),
    SecureStore.deleteItemAsync(ACCOUNT_TYPE_KEY),
  ];

  if (!preserveUniversityAccess) {
    deletions.push(
      SecureStore.deleteItemAsync(
        UNIVERSITY_ACCESS_TOKEN_KEY
      )
    );
  }

  await Promise.all(deletions);
}

async function authenticatedRequest(
  url,
  {
    method = 'GET',
    body = undefined,
    formData = undefined,
  } = {}
) {
  const token = await getToken();

  if (!token) {
    throw new Error('You are not logged in.');
  }

  const clientDateContext =
    getClientDateContext();

  const headers = {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    'X-NSTPHUB-Client-Date':
      clientDateContext.clientDate,
    'X-NSTPHUB-Client-DateTime':
      clientDateContext.clientDateTime,
    'X-NSTPHUB-Client-Timezone-Offset':
      String(
        clientDateContext.offsetMinutes
      ),
  };

  let requestBody;

  if (formData !== undefined) {
    requestBody = formData;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    requestBody = JSON.stringify(body);
  }

  const response = await apiRequest(url, {
    method,
    headers,
    ...(requestBody !== undefined
      ? { body: requestBody }
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
    throw makeApiError(
      response,
      data,
      `Request failed (HTTP ${response.status}).`
    );
  }

  return data;
}

async function universityPublicRequest(
  url,
  body
) {
  const universityAccessToken =
    await getUniversityAccessToken();

  if (!universityAccessToken) {
    throw new Error(
      'Your institutional authorization session has expired. Please enter the University Access Code again.'
    );
  }

  const response = await apiRequest(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-University-Access-Token':
        universityAccessToken,
    },
    body: JSON.stringify(body),
  });

  const data = await readJson(response);

  if (!response.ok || data?.success === false) {
    throw makeApiError(
      response,
      data,
      `Request failed (HTTP ${response.status}).`
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
    throw makeApiError(
      response,
      data,
      'Unable to verify the institutional authorization code.'
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
    throw makeApiError(
      response,
      data,
      'Unable to sign in to this NSTP HUB staff account.'
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
    throw makeApiError(
      response,
      data,
      'Unable to sign in with Google.'
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
    await clearAuthentication({
      preserveUniversityAccess: true,
    });
  }
}

export async function sendAdminForgotPasswordCode(email) {
  return universityPublicRequest(
    API_ENDPOINTS.FORGOT_PASSWORD,
    {
      email: String(email || '').trim().toLowerCase(),
    }
  );
}

export async function verifyAdminForgotPasswordCode({
  email,
  code,
  challengeToken,
}) {
  return universityPublicRequest(
    API_ENDPOINTS.VERIFY_FORGOT_PASSWORD_CODE,
    {
      email: String(email || '').trim().toLowerCase(),
      code: String(code || '').trim(),
      challenge_token: challengeToken,
    }
  );
}

export async function resendAdminForgotPasswordCode({
  email,
  challengeToken,
}) {
  return universityPublicRequest(
    API_ENDPOINTS.RESEND_FORGOT_PASSWORD_CODE,
    {
      email: String(email || '').trim().toLowerCase(),
      challenge_token: challengeToken,
    }
  );
}

export async function resetAdminForgotPassword({
  email,
  resetToken,
  password,
  passwordConfirmation,
}) {
  return universityPublicRequest(
    API_ENDPOINTS.RESET_FORGOT_PASSWORD,
    {
      email: String(email || '').trim().toLowerCase(),
      reset_token: resetToken,
      password,
      password_confirmation: passwordConfirmation,
    }
  );
}

export async function getAttendance({
  date = '',
  component = '',
} = {}) {
  const params = new URLSearchParams();

  if (date) {
    params.set('date', date);
  }

  if (component) {
    params.set('component', component);
  }

  const query = params.toString();

  return authenticatedRequest(
    `${API_ENDPOINTS.ATTENDANCE}${query ? `?${query}` : ''}`
  );
}

export async function saveAttendanceSchedule(payload) {
  return authenticatedRequest(
    API_ENDPOINTS.ATTENDANCE_SCHEDULE,
    {
      method: 'PUT',
      body: payload,
    }
  );
}

export async function deleteAttendanceSchedule(component) {
  return authenticatedRequest(
    `${API_ENDPOINTS.ATTENDANCE_SCHEDULE}/${encodeURIComponent(component)}`,
    {
      method: 'DELETE',
    }
  );
}

export async function scanAttendance(payload) {
  return authenticatedRequest(
    API_ENDPOINTS.ATTENDANCE_SCAN,
    {
      method: 'POST',
      body: payload,
    }
  );
}

export async function getStudentAttendance(studentId) {
  return authenticatedRequest(
    `${API_ENDPOINTS.ATTENDANCE}/students/${studentId}`
  );
}

export async function updateStudentNstpStatus(
  studentId,
  nstpStatus
) {
  return authenticatedRequest(
    `${API_ENDPOINTS.ATTENDANCE}/students/${studentId}/status`,
    {
      method: 'PATCH',
      body: {
        nstp_status: nstpStatus,
      },
    }
  );
}

export async function getExcuseLetters(component = '') {
  const query = component
    ? `?component=${encodeURIComponent(component)}`
    : '';

  return authenticatedRequest(
    `${API_ENDPOINTS.EXCUSE_LETTERS}${query}`
  );
}

export async function reviewExcuseLetter({
  id,
  action,
  feedback,
  component = '',
}) {
  if (!['approve', 'reject'].includes(action)) {
    throw new Error('Invalid excuse-letter action.');
  }

  const query = component
    ? `?component=${encodeURIComponent(component)}`
    : '';

  return authenticatedRequest(
    `${API_ENDPOINTS.EXCUSE_LETTERS}/${id}/${action}${query}`,
    {
      method: 'PATCH',
      body: {
        feedback,
      },
    }
  );
}

export async function getAdminProfile() {
  return authenticatedRequest(
    API_ENDPOINTS.PROFILE
  );
}

export async function uploadAdminProfilePhoto({
  uri,
  name = 'profile.jpg',
  type = 'image/jpeg',
}) {
  const formData = new FormData();

  formData.append('profile_photo', {
    uri,
    name,
    type,
  });

  return authenticatedRequest(
    API_ENDPOINTS.PROFILE_PHOTO,
    {
      method: 'POST',
      formData,
    }
  );
}

export async function changeAdministratorPassword({
  current_password,
  password,
  password_confirmation,
}) {
  return authenticatedRequest(
    API_ENDPOINTS.CHANGE_PASSWORD,
    {
      method: 'POST',
      body: {
        current_password,
        password,
        password_confirmation,
      },
    }
  );
}
