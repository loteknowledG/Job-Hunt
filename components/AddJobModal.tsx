import React, { useState } from 'react';
import { X, Sparkles, Loader2 } from 'lucide-react';
import { parseJobDescription } from '../services/geminiService';
import { Job, JobStatus } from '../types';
import { v4 as uuidv4 } from 'uuid'; // We'll implement a simple uuid shim if needed, or use random string

interface AddJobModalProps {
  onClose: () => void;
  onSave: (job: Job) => void;
}

export const AddJobModal: React.FC<AddJobModalProps> = ({ onClose, onSave }) => {
  const [isParsing, setIsParsing] = useState(false);
  const [pasteContent, setPasteContent] = useState('');
  
  const [formData, setFormData] = useState({
    company: '',
    role: '',
    location: '',
    description: '',
    status: JobStatus.APPLIED
  });

  const handleAIParse = async () => {
    if (!pasteContent.trim()) return;
    setIsParsing(true);
    try {
      const result = await parseJobDescription(pasteContent);
      setFormData(prev => ({
        ...prev,
        company: result.company,
        role: result.role,
        location: result.location,
        description: pasteContent, // Keep original text
      }));
    } catch (error) {
      console.error("Failed to parse", error);
      alert("Could not parse job description. Please fill manually.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newJob: Job = {
      id: Math.random().toString(36).substr(2, 9),
      ...formData,
      dateApplied: new Date().toISOString(),
      notes: '',
      emails: [],
      events: [],
      aiInsights: {
        keySkills: [],
      }
    };
    onSave(newJob);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-gray-900">Track New Application</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* AI Parser Section */}
          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-indigo-900 flex items-center">
                <Sparkles className="w-4 h-4 mr-2 text-indigo-600" />
                AI Auto-Fill
              </label>
            </div>
            <textarea
              placeholder="Paste job description here to auto-fill details..."
              className="w-full p-3 text-sm border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
              rows={3}
              value={pasteContent}
              onChange={(e) => setPasteContent(e.target.value)}
            />
            <button
              type="button"
              onClick={handleAIParse}
              disabled={isParsing || !pasteContent}
              className="mt-2 text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center"
            >
              {isParsing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {isParsing ? 'Analyzing...' : 'Auto-Fill Form'}
            </button>
          </div>

          <form id="jobForm" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                <input
                  required
                  type="text"
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
                  value={formData.company}
                  onChange={e => setFormData({...formData, company: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role Title</label>
                <input
                  required
                  type="text"
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
                  value={formData.location}
                  onChange={e => setFormData({...formData, location: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value as JobStatus})}
                >
                  {Object.values(JobStatus).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description / Notes</label>
              <textarea
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
                rows={4}
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end space-x-3 bg-gray-50 rounded-b-2xl">
          <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition-colors">
            Cancel
          </button>
          <button type="submit" form="jobForm" className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 shadow-md transition-colors">
            Save Application
          </button>
        </div>
      </div>
    </div>
  );
};