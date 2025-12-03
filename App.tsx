
import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, PlusCircle, Search, Briefcase, Database, Download, Upload, Menu, X as XIcon } from 'lucide-react';
import { Job, JobStatus } from './types';
import { JobCard } from './components/JobCard';
import { JobDetailView } from './components/JobDetailView';
import { AddJobModal } from './components/AddJobModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { Toast, ToastType } from './components/Toast';

function App() {
  // App Data State - Initialize from LocalStorage
  const [jobs, setJobs] = useState<Job[]>(() => {
    try {
      const saved = localStorage.getItem('jobhunt_data');
      if (saved) {
         const parsed = JSON.parse(saved);
         // Migration logic for Contacts on load
         return parsed.map((j: any) => {
            if (j.contacts) return j;
            if (j.recruitingContact && typeof j.recruitingContact === 'string') {
                return {
                    ...j,
                    contacts: [{
                        id: Math.random().toString(36).substr(2, 9),
                        name: 'Primary Contact', 
                        role: '',
                        email: '',
                        phone: '',
                        linkedin: '',
                        organization: j.recruitingContact // Store legacy string here
                    }],
                    recruitingContact: undefined
                };
            }
            return { ...j, contacts: [] };
         });
      }
      return [];
    } catch (e) {
      console.error("Failed to load jobs", e);
      return [];
    }
  });
  
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [filter, setFilter] = useState<'ALL' | JobStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // UI States for Confirmations and Toasts
  const [toast, setToast] = useState<{message: string, type: ToastType} | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Temp state for import
  const [pendingImport, setPendingImport] = useState<Job[] | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persistence Effect
  useEffect(() => {
    localStorage.setItem('jobhunt_data', JSON.stringify(jobs));
  }, [jobs]);

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ message, type });
  };

  const closeConfirm = () => {
    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
  };

  const handleSaveJob = (jobToSave: Job) => {
    if (editingJob) {
      // Update existing job
      handleUpdateJob(jobToSave);
      setEditingJob(null);
      showToast('Application updated successfully', 'success');
    } else {
      // Create new job
      setJobs(prev => [jobToSave, ...prev]);
      showToast('New application tracked', 'success');
    }
    setIsAddModalOpen(false);
  };

  const handleUpdateJob = (updatedJob: Job) => {
    setJobs(prev => prev.map(j => j.id === updatedJob.id ? updatedJob : j));
    // If we are currently viewing this job, update the view too
    if (selectedJob && selectedJob.id === updatedJob.id) {
      setSelectedJob(updatedJob);
    }
  };

  const requestDeleteJob = (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Application',
      message: 'Are you sure you want to delete this application? This action cannot be undone.',
      onConfirm: () => {
        setJobs(prev => prev.filter(j => j.id !== id));
        setSelectedJob(null);
        closeConfirm();
        showToast('Application deleted', 'success');
      }
    });
  };

  const openAddModal = () => {
    setEditingJob(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = () => {
    if (selectedJob) {
      setEditingJob(selectedJob);
      setIsAddModalOpen(true);
    }
  };

  // -- Export / Import Handlers --

  const handleExportData = () => {
    try {
      const dataStr = JSON.stringify(jobs, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `jobhunt_data_${new Date().toISOString().split('T')[0]}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      document.body.appendChild(linkElement);
      linkElement.click();
      document.body.removeChild(linkElement);
      showToast('Data exported successfully', 'success');
    } catch (e) {
      console.error("Export failed", e);
      showToast('Failed to export data', 'error');
    }
  };

  const handleImportClick = () => {
    // Reset value to ensure onChange fires even if same file is selected
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileObj = event.target.files && event.target.files[0];
    if (!fileObj) {
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text === 'string') {
          let importedData;
          try {
            importedData = JSON.parse(text);
          } catch (jsonError) {
            showToast("Invalid JSON file format", 'error');
            return;
          }
          
          // Basic structural check
          if (!Array.isArray(importedData)) {
            showToast("File must contain a list of jobs", 'error');
            return;
          }

          // Sanitize and map data
          const sanitizedJobs: Job[] = importedData.map((item: any): Job | null => {
             if (!item || typeof item !== 'object') return null;

             const contacts = Array.isArray(item.contacts) ? item.contacts : [];
             // Migration for import
             if (contacts.length === 0 && item.recruitingContact && typeof item.recruitingContact === 'string') {
                contacts.push({
                    id: Math.random().toString(36).substr(2, 9),
                    name: 'Primary Contact',
                    role: '',
                    email: '',
                    phone: '',
                    linkedin: '',
                    organization: item.recruitingContact
                });
             }

             return {
               id: item.id || Math.random().toString(36).substr(2, 9),
               company: item.company || 'Unknown Company',
               role: item.role || 'Unknown Role',
               location: item.location || '',
               contacts: contacts,
               salaryRange: item.salaryRange,
               status: Object.values(JobStatus).includes(item.status) ? item.status : JobStatus.APPLIED,
               dateApplied: item.dateApplied || new Date().toISOString(),
               description: item.description || '',
               notes: item.notes || '',
               emails: Array.isArray(item.emails) ? item.emails : [],
               events: Array.isArray(item.events) ? item.events : [],
               aiInsights: item.aiInsights || {}
             };
          }).filter((j): j is Job => j !== null);

          if (sanitizedJobs.length === 0) {
              showToast("No valid jobs found in file", 'error');
              return;
          }

          // Trigger confirmation dialog instead of window.confirm
          setPendingImport(sanitizedJobs);
          setConfirmConfig({
            isOpen: true,
            title: 'Import Data',
            message: `Found ${sanitizedJobs.length} valid jobs. This will REPLACE your current dashboard data. Continue?`,
            onConfirm: () => {
              setJobs(sanitizedJobs);
              setSelectedJob(null);
              setPendingImport(null);
              closeConfirm();
              showToast('Import successful! Dashboard updated.', 'success');
            }
          });
        }
      } catch (error) {
        console.error("Import failed:", error);
        showToast("Unexpected error processing file", 'error');
      } finally {
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        setIsMobileMenuOpen(false);
      }
    };
    reader.readAsText(fileObj);
  };

  // -- Derived State --

  const filteredJobs = jobs
    .filter(job => filter === 'ALL' || job.status === filter)
    .filter(job => 
      job.company.toLowerCase().includes(searchQuery.toLowerCase()) || 
      job.role.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const activeApps = jobs.filter(j => j.status === JobStatus.APPLIED || j.status === JobStatus.INTERVIEWING).length;
  const interviews = jobs.filter(j => j.status === JobStatus.INTERVIEWING).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row">
      
      {/* Toast Notification */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      {/* Global Confirmation Dialog */}
      <ConfirmDialog 
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onCancel={closeConfirm}
      />

      {/* Mobile Header */}
      <div className="md:hidden bg-white p-4 border-b border-gray-200 flex items-center justify-between z-20 sticky top-0">
          <div className="flex items-center space-x-2 text-indigo-600">
            <Briefcase className="w-6 h-6" />
            <span className="font-bold text-lg">JobHunt AI</span>
          </div>
          <div className="flex items-center space-x-3">
            <button onClick={openAddModal} className="p-2 bg-indigo-600 text-white rounded-lg">
                <PlusCircle className="w-5 h-5" />
            </button>
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                {isMobileMenuOpen ? <XIcon className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[65px] bg-slate-50 z-10 p-4 animate-fade-in">
           <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                  <div className="bg-indigo-50 p-3 rounded-lg text-center">
                      <span className="block text-2xl font-bold text-indigo-700">{activeApps}</span>
                      <span className="text-xs text-indigo-900 font-medium">Active</span>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg text-center">
                      <span className="block text-2xl font-bold text-green-700">{interviews}</span>
                      <span className="text-xs text-green-900 font-medium">Interviews</span>
                  </div>
              </div>
              
              <div className="border-t border-gray-100 pt-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Data Management</p>
                  <button 
                    onClick={handleExportData}
                    className="w-full flex items-center p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <Download className="w-5 h-5 text-gray-500 mr-3" />
                    <span className="text-gray-700 font-medium">Export JSON</span>
                  </button>
                  <button 
                    onClick={handleImportClick}
                    className="w-full flex items-center p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <Upload className="w-5 h-5 text-gray-500 mr-3" />
                    <span className="text-gray-700 font-medium">Import JSON</span>
                  </button>
              </div>
           </div>
        </div>
      )}

      {/* Sidebar (Desktop) */}
      <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0 hidden md:flex flex-col h-screen sticky top-0">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center space-x-2 text-indigo-600">
            <Briefcase className="w-8 h-8" />
            <span className="text-xl font-bold tracking-tight">JobHunt AI</span>
          </div>
        </div>
        
        <div className="p-4 space-y-2 flex-1 overflow-y-auto">
            <div className="bg-indigo-50 p-4 rounded-xl mb-6">
                <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-2">Overview</p>
                <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600">Active Apps</span>
                    <span className="font-bold text-gray-900">{activeApps}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Interviews</span>
                    <span className="font-bold text-gray-900">{interviews}</span>
                </div>
            </div>

            <button 
                onClick={() => setSelectedJob(null)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${!selectedJob ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
            >
                <LayoutDashboard className="w-5 h-5" />
                <span>Dashboard</span>
            </button>
        </div>
        
        <div className="p-4 border-t border-gray-100 space-y-2">
            <div className="flex items-center text-xs text-gray-400 mb-2">
              <Database className="w-3 h-3 mr-1.5" />
              <span>Data saved to browser</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
                <button 
                    onClick={handleExportData}
                    className="flex items-center justify-center space-x-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 hover:text-indigo-600 transition-colors"
                    title="Download JSON"
                >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export</span>
                </button>
                <button 
                    onClick={handleImportClick}
                    className="flex items-center justify-center space-x-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 hover:text-indigo-600 transition-colors"
                    title="Upload JSON"
                >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import</span>
                </button>
            </div>
        </div>
      </aside>

      {/* Hidden File Input (Global) */}
      <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json"
          className="hidden" 
      />

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col h-[calc(100vh-65px)] md:h-screen relative">
        {selectedJob ? (
            <div className="flex-1 overflow-y-auto p-4 md:p-8">
                <JobDetailView 
                    job={selectedJob} 
                    onBack={() => setSelectedJob(null)} 
                    onUpdate={handleUpdateJob}
                    onDelete={requestDeleteJob}
                    onEdit={openEditModal}
                />
            </div>
        ) : (
            <div className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 space-y-4 md:space-y-0">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
                        <p className="text-gray-500">Track and manage your job search journey.</p>
                    </div>
                    <div className="hidden md:flex items-center space-x-2">
                        <button 
                            onClick={openAddModal}
                            className="flex items-center space-x-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 shadow-md transition-all active:scale-95"
                        >
                            <PlusCircle className="w-5 h-5" />
                            <span>Track New Job</span>
                        </button>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input 
                            type="text" 
                            placeholder="Search companies or roles..." 
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex space-x-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                        <button 
                            onClick={() => setFilter('ALL')}
                            className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${filter === 'ALL' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                        >
                            All
                        </button>
                        {Object.values(JobStatus).map(status => (
                            <button 
                                key={status}
                                onClick={() => setFilter(status)}
                                className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${filter === status ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                            >
                                {status.charAt(0) + status.slice(1).toLowerCase()}
                            </button>
                        ))}
                    </div>
                </div>

                {filteredJobs.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                        <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Briefcase className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No applications found</h3>
                        <p className="text-gray-500 max-w-sm mx-auto mt-2">Get started by adding your first job application.</p>
                        <button 
                            onClick={openAddModal}
                            className="mt-4 text-indigo-600 font-medium hover:text-indigo-800"
                        >
                            Add Application
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredJobs.map(job => (
                            <JobCard key={job.id} job={job} onClick={setSelectedJob} />
                        ))}
                    </div>
                )}
            </div>
        )}
      </main>

      {isAddModalOpen && (
        <AddJobModal 
            onClose={() => setIsAddModalOpen(false)} 
            onSave={handleSaveJob}
            initialData={editingJob}
        />
      )}
    </div>
  );
}

export default App;
