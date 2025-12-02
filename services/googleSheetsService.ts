import { Job, JobStatus } from '../types';

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file';
const SHEET_TITLE = 'JobHunt AI Tracker';

interface SheetsServiceState {
  spreadsheetId: string | null;
  isInitialized: boolean;
  isSignedIn: boolean;
}

const state: SheetsServiceState = {
  spreadsheetId: null,
  isInitialized: false,
  isSignedIn: false,
};

/**
 * Initializes the GAPI client.
 */
export const initGapi = async (clientId: string, accessToken?: string) => {
  if (!window.gapi) {
     console.warn("Google API script not loaded yet");
     return;
  }

  await new Promise<void>((resolve) => {
    window.gapi.load('client', resolve);
  });

  await window.gapi.client.init({
    discoveryDocs: [DISCOVERY_DOC],
  });

  if (accessToken) {
    window.gapi.client.setToken({ access_token: accessToken });
    state.isSignedIn = true;
  }

  state.isInitialized = true;
};

/**
 * Trigger the Google Sign-In Popup Flow (Token Client).
 * This replaces the redirect method.
 */
export const login = (clientId: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!window.google || !window.google.accounts) {
      reject("Google Identity Services not loaded");
      return;
    }

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: (resp: any) => {
        if (resp.error) {
          reject(resp);
        } else {
          resolve(resp.access_token);
        }
      },
    });

    // Determine if we need to force account selection (optional, usually false for SSO feel)
    // tokenClient.requestAccessToken({ prompt: 'consent' }); 
    tokenClient.requestAccessToken();
  });
};

/**
 * Finds or creates the tracking spreadsheet.
 */
export const getSpreadsheet = async (): Promise<string> => {
    if (state.spreadsheetId) return state.spreadsheetId;

    // Load Drive API to search for file
    await window.gapi.client.load('drive', 'v3');
    
    try {
        const response = await window.gapi.client.drive.files.list({
            q: `name = '${SHEET_TITLE}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`,
            fields: 'files(id, name)',
        });

        const files = response.result.files;
        if (files && files.length > 0) {
            state.spreadsheetId = files[0].id;
            return files[0].id;
        }
    } catch (e) {
        console.warn("Could not list Drive files (possibly restricted scope), attempting creation...", e);
    }

    // Create new if not found
    const createResponse = await window.gapi.client.sheets.spreadsheets.create({
        resource: {
            properties: { title: SHEET_TITLE },
            sheets: [{ properties: { title: 'Jobs' } }]
        }
    });

    const newId = createResponse.result.spreadsheetId;
    state.spreadsheetId = newId;

    // Add Headers
    await window.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: newId,
        range: 'Jobs!A1:K1',
        valueInputOption: 'RAW',
        resource: {
            values: [[
                'ID', 'Company', 'Role', 'Location', 'Status', 'Date Applied', 'Description', 'Notes', 'Events (JSON)', 'Emails (JSON)', 'AI Insights (JSON)'
            ]]
        }
    });

    return newId;
};

export const fetchJobs = async (): Promise<Job[]> => {
    const spreadsheetId = await getSpreadsheet();
    const response = await window.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Jobs!A2:K1000',
    });

    const rows = response.result.values;
    if (!rows || rows.length === 0) return [];

    return rows.map((row: any[]) => {
        try {
            return {
                id: row[0] || '',
                company: row[1] || '',
                role: row[2] || '',
                location: row[3] || '',
                status: (row[4] as JobStatus) || JobStatus.APPLIED,
                dateApplied: row[5] || new Date().toISOString(),
                description: row[6] || '',
                notes: row[7] || '',
                events: row[8] ? JSON.parse(row[8]) : [],
                emails: row[9] ? JSON.parse(row[9]) : [],
                aiInsights: row[10] ? JSON.parse(row[10]) : {},
            };
        } catch (e) {
            console.error("Error parsing row", row, e);
            return null;
        }
    }).filter((j: any) => j !== null) as Job[];
};

export const saveJob = async (job: Job, isNew: boolean = false) => {
    const spreadsheetId = await getSpreadsheet();
    
    const rowData = [
        job.id,
        job.company,
        job.role,
        job.location || '',
        job.status,
        job.dateApplied,
        job.description,
        job.notes,
        JSON.stringify(job.events),
        JSON.stringify(job.emails),
        JSON.stringify(job.aiInsights || {})
    ];

    if (isNew) {
        await window.gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Jobs!A1',
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            resource: { values: [rowData] }
        });
    } else {
        const jobs = await fetchJobs();
        const index = jobs.findIndex(j => j.id === job.id);
        
        if (index !== -1) {
            const range = `Jobs!A${index + 2}:K${index + 2}`;
            await window.gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId,
                range,
                valueInputOption: 'USER_ENTERED',
                resource: { values: [rowData] }
            });
        }
    }
};

export const deleteJob = async (jobId: string) => {
    const spreadsheetId = await getSpreadsheet();
    const jobs = await fetchJobs();
    const index = jobs.findIndex(j => j.id === jobId);
    
    if (index !== -1) {
        const gridIndex = index + 1;
        await window.gapi.client.sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: 0,
                            dimension: 'ROWS',
                            startIndex: gridIndex,
                            endIndex: gridIndex + 1
                        }
                    }
                }]
            }
        });
    }
};