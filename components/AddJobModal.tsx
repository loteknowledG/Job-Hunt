
import React, { useState, useEffect } from 'react';
import { X, Sparkles, Loader2, AlertTriangle, Plus, Trash2, User } from 'lucide-react';
import { parseJobDescription } from '../services/geminiService';
import { Job, JobStatus, Contact } from '../types';

interface AddJobModalProps {
  onClose: () => void;
  onSave: (job: Job) => void;
  initialData?: Job | null;
}

export const AddJobModal: React.FC<AddJobModalProps> = ({ onClose, onSave, initialData }) => {
  const [isParsing, setIsParsing] = useState(false);
  const [pasteContent, setPasteContent] = useState('');
  const [parseError, setParseError] = useState('');
  
  const [formData, setFormData] = useState({
    company: '',
    role: '',
    location: '',
    description: '',
    status: JobStatus.APPLIED
  });

  const [contacts, setContacts] = useState<Contact[]>([]);

  // Initialize form data when initialData changes or component mounts
  useEffect(() => {
    if (initialData) {
      setFormData({
        company: initialData.company,
        role: initialData.role,
        location: initialData.location || '',
        description: initialData.description,
        status: initialData.status
      });
      // Load existing contacts or migrate old string format if contacts array is empty
      if (initialData.contacts && initialData.contacts.length > 0) {
        setContacts(initialData.contacts);
      } else if (initialData.recruitingContact) {
        // Backwards compatibility migration
        setContacts([{
          id: Math.random().toString(36).substr(2, 9),
          name: 'Primary Contact',
          role: '',
          email: '',
          phone: '',
          linkedin: '',
          organization: initialData.recruitingContact // Store old string in organization or a notes field
        }]);
      } else {
        setContacts([]);
      }
    }
  }, [initialData]);

  const handleAIParse = async () => {
    if (!pasteContent.trim()) return;
    setIsParsing(true);
    setParseError('');
    try {
      const result = await parseJobDescription(pasteContent);
      setFormData(prev => ({
        ...prev,
        company: result.company,
        role: result.role,
        location: result.location,
        description: pasteContent, // Keep original text
      }));
      if (result.contacts && result.contacts.length > 0) {
          setContacts(result.contacts);
      }
    } catch (error) {
      console.error("Failed to parse", error);
      setParseError("Could not parse job description. Please fill manually.");
    } finally {
      setIsParsing(false);
    }
  };

  const addContact = () => {
    setContacts([...contacts, {
        id: Math.random().toString(36).substr(2, 9),
        name: '',
        role: '',
        email: '',
        phone: '',
        linkedin: '',
        organization: ''
    }]);
  };

  const removeContact = (id: string) => {
    setContacts(contacts.filter(c => c.id !== id));
  };

  const updateContact = (id: string, field: keyof Contact, value: string) => {
    setContacts(contacts.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (initialData) {
      // Edit Mode: Merge updates with existing data
      const updatedJob: Job = {
        ...initialData,
        ...formData,
        contacts: contacts,
        recruitingContact: undefined, // Clear legacy field
      };
      onSave(updatedJob);
    } else {
      // Create Mode: New Job
      const newJob: Job = {
        id: Math.random().toString(36).substr(2, 9),
        ...formData,
        dateApplied: new Date().toISOString(),
        notes: '',
        emails: [],
        events: [],
        contacts: contacts,
        aiInsights: {
          keySkills: [],
        }
      };
      onSave(newJob);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-gray-900">
            {initialData ? 'Edit Application' : 'Track New Application'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* AI Parser Section - Only show if description is empty or explicitly creating new */}
          {!initialData && (
            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-indigo-900 flex items-center">
                  <Sparkles className="w-4 h-4 mr-2 text-indigo-600" />
                  AI Auto-Fill
                </label>
              </div>
              <textarea
                placeholder="Paste job description or recruiter email here to auto-fill details..."
                className="w-full p-3 text-sm border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
                rows={3}
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
              />
              <div className="flex items-center justify-between mt-2">
                <button
                    type="button"
                    onClick={handleAIParse}
                    disabled={isParsing || !pasteContent}
                    className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center transition-colors"
                >
                    {isParsing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                    {isParsing ? 'Analyzing...' : 'Auto-Fill Form'}
                </button>
                {parseError && (
                    <span className="text-xs text-red-600 flex items-center font-medium">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {parseError}
                    </span>
                )}
              </div>
            </div>
          )}

          <form id="jobForm" onSubmit={handleSubmit} className="space-y-6">
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

            {/* Contacts Section */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                   <label className="text-sm font-semibold text-gray-900 flex items-center">
                     <User className="w-4 h-4 mr-2" /> Contacts
                   </label>
                   <button 
                     type="button" 
                     onClick={addContact}
                     className="text-xs flex items-center text-indigo-600 hover:text-indigo-800 font-medium"
                   >
                     <Plus className="w-3 h-3 mr-1" /> Add Contact
                   </button>
                </div>
                
                {contacts.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 text-sm italic border border-dashed border-gray-300 rounded-lg">
                    No contacts added yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {contacts.map((contact) => (
                      <div key={contact.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm relative group">
                        <button
                          type="button"
                          onClick={() => removeContact(contact.id)}
                          className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                          title="Remove contact"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                           <div>
                             <input 
                               placeholder="Name" 
                               className="w-full text-sm p-2 border border-gray-200 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white text-gray-900"
                               value={contact.name}
                               onChange={e => updateContact(contact.id, 'name', e.target.value)}
                             />
                           </div>
                           <div>
                             <input 
                               placeholder="Role / Title" 
                               className="w-full text-sm p-2 border border-gray-200 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white text-gray-900"
                               value={contact.role}
                               onChange={e => updateContact(contact.id, 'role', e.target.value)}
                             />
                           </div>
                           <div>
                             <input 
                               placeholder="Email" 
                               className="w-full text-sm p-2 border border-gray-200 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white text-gray-900"
                               value={contact.email}
                               onChange={e => updateContact(contact.id, 'email', e.target.value)}
                             />
                           </div>
                           <div>
                             <input 
                               placeholder="Phone" 
                               className="w-full text-sm p-2 border border-gray-200 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white text-gray-900"
                               value={contact.phone}
                               onChange={e => updateContact(contact.id, 'phone', e.target.value)}
                             />
                           </div>
                           <div>
                             <input 
                               placeholder="Agency / Organization" 
                               className="w-full text-sm p-2 border border-gray-200 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white text-gray-900"
                               value={contact.organization}
                               onChange={e => updateContact(contact.id, 'organization', e.target.value)}
                             />
                           </div>
                           <div>
                             <input 
                               placeholder="LinkedIn URL" 
                               className="w-full text-sm p-2 border border-gray-200 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white text-gray-900"
                               value={contact.linkedin}
                               onChange={e => updateContact(contact.id, 'linkedin', e.target.value)}
                             />
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Description / Notes</label>
              <textarea
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
                rows={initialData ? 6 : 4}
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
            {initialData ? 'Save Changes' : 'Save Application'}
          </button>
        </div>
      </div>
    </div>
  );
};
