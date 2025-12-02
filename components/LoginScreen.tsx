import React, { useState, useEffect } from 'react';
import { HelpCircle, AlertCircle, RefreshCw } from 'lucide-react';
import * as sheetsService from '../services/googleSheetsService';

interface LoginScreenProps {
  onLogin: (clientId: string, accessToken: string) => void; 
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [clientId, setClientId] = useState('');
  const [error, setError] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const storedId = localStorage.getItem('jobhunt_client_id');
    const envId = process.env.GOOGLE_CLIENT_ID;
    
    if (storedId) {
      setClientId(storedId);
      setShowInput(false);
    } else if (envId) {
      setClientId(envId);
      setShowInput(false);
    } else {
      setShowInput(true);
    }
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let cleanedId = clientId.trim();
    
    if (cleanedId.includes('client_id=')) {
        try {
            const urlString = cleanedId.startsWith('http') ? cleanedId : `https://example.com?${cleanedId}`;
            const url = new URL(urlString);
            const param = url.searchParams.get('client_id');
            if (param) cleanedId = param;
        } catch (e) {
            console.warn("Could not parse URL, using raw input");
        }
    }

    if (!cleanedId.endsWith('.apps.googleusercontent.com')) {
        setError('Invalid format. Client ID usually ends with ".apps.googleusercontent.com"');
        return;
    }

    setClientId(cleanedId);
    localStorage.setItem('jobhunt_client_id', cleanedId);
    setShowInput(false);
    setError('');
  };

  const handleSSOLogin = async () => {
      if (!clientId) {
          setError("Client ID is missing");
          setShowInput(true);
          return;
      }

      setIsLoading(true);
      setError('');
      
      try {
        const accessToken = await sheetsService.login(clientId);
        onLogin(clientId, accessToken);
      } catch (e: any) {
          console.error("Login Error", e);
          if (e.type === 'token_failed' || e.error === 'access_denied') {
             setError("Access denied. You must grant permission to use the app.");
          } else if (e.message && e.message.includes("client_id")) {
             setError("Invalid Client ID. Please check your configuration.");
             setShowInput(true);
          } else {
             setError("Failed to sign in. Please try again.");
          }
      } finally {
        setIsLoading(false);
      }
  };

  const clearConfig = () => {
    localStorage.removeItem('jobhunt_client_id');
    setClientId('');
    setShowInput(true);
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex flex-col items-center justify-center font-sans p-4">
      <div className="bg-white p-8 md:p-12 rounded-[28px] shadow-sm w-full max-w-[480px] flex flex-col items-center border border-gray-200 md:border-none">
        
        <div className="mb-8 flex flex-col items-center">
             <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-200">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
            </div>
            <h1 className="text-[24px] text-[#202124] font-normal text-center">
            JobHunt AI
            </h1>
            <p className="text-[16px] text-[#5f6368] mt-2 text-center">
            Sign in to sync your applications
            </p>
        </div>

        <div className="w-full">
          {error && (
            <div className="mb-6 text-red-700 text-sm flex items-start bg-red-50 p-3 rounded-lg border border-red-100">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {showInput ? (
            <form onSubmit={handleManualSubmit} className="space-y-6 animate-fade-in">
              <div className="relative group">
                <input
                  type="text"
                  required
                  id="clientId"
                  className="block px-3 pb-2.5 pt-4 w-full text-sm text-gray-900 bg-transparent rounded-lg border border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-[#1a73e8] peer"
                  placeholder=" "
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                />
                <label
                  htmlFor="clientId"
                  className="absolute text-sm text-gray-500 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white px-2 peer-focus:px-2 peer-focus:text-[#1a73e8] peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 left-1"
                >
                  Enter Google Client ID
                </label>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="text-white bg-[#0b57d0] hover:bg-[#1a73e8] focus:ring-4 focus:ring-blue-300 font-medium rounded-full text-sm px-6 py-2.5 text-center transition-colors shadow-sm"
                >
                  Next
                </button>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-xs text-gray-600 space-y-2">
                <p className="font-semibold flex items-center"><HelpCircle className="w-3 h-3 mr-1"/> Configuration Required:</p>
                <ol className="list-decimal ml-4 space-y-1">
                    <li>Create OAuth credentials in Google Cloud Console.</li>
                    <li>Add <strong>{window.location.origin}</strong> to Authorized JavaScript Origins.</li>
                    <li>Ignore "Redirect URIs" for this Popup method.</li>
                </ol>
              </div>
            </form>
          ) : (
            <div className="flex flex-col items-center space-y-6 w-full">
              
              <button
                onClick={handleSSOLogin}
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2.5 px-4 border border-gray-300 text-sm font-medium rounded-full text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm transition-all"
              >
                <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                   {isLoading ? (
                     <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
                   ) : (
                    <svg width="20" height="20" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                        <path fill="none" d="M0 0h48v48H0z"/>
                    </svg>
                   )}
                </span>
                <span className="pl-6">Sign in with Google</span>
              </button>

              <div className="w-full pt-6 border-t border-gray-100">
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>Configured Client ID:</span>
                    <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{clientId.slice(0, 15)}...</span>
                  </div>
                  <button 
                    onClick={clearConfig}
                    className="mt-3 w-full flex items-center justify-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reset Client ID
                  </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-2 text-xs text-[#202124] opacity-70">
        <span className="cursor-pointer hover:underline">English (United States)</span>
        <span className="cursor-pointer hover:underline">Help</span>
        <span className="cursor-pointer hover:underline">Privacy</span>
        <span className="cursor-pointer hover:underline">Terms</span>
      </div>
    </div>
  );
};