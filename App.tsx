import React, { useState, useEffect } from 'react';
import { LayoutDashboard, PlusCircle, Search, Briefcase } from 'lucide-react';
import { Job, JobStatus } from './types';
import { JobCard } from './components/JobCard';
import { JobDetailView } from './components/JobDetailView';
import { AddJobModal } from './components/AddJobModal';

// LocalStorage Helper
const loadJobs = (): Job[] => {
  const saved = localStorage.getItem('jobhunt_jobs');
  return saved ? JSON.parse(saved) : [];
};

const saveJobs = (jobs: Job[]) => {
  localStorage.setItem('jobhunt_jobs', JSON.stringify(jobs));
};

function App() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [filter, setFilter] = useState<'ALL' | JobStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setJobs(loadJobs());
  }, []);

  const handleSaveJob = (newJob: Job) => {
    const updatedJobs = [newJob, ...jobs];
    setJobs(updatedJobs);
    saveJobs(updatedJobs);
    setIsAddModalOpen(false);
  };

  const handleUpdateJob = (updatedJob: Job) => {
    const updatedJobs = jobs.map(j => j.id === updatedJob.id ? updatedJob : j);
    setJobs(updatedJobs);
    saveJobs(updatedJobs);
    setSelectedJob(updatedJob); // Update current view
  };

  const handleDeleteJob = (id: string) => {
    const updatedJobs = jobs.filter(j => j.id !== id);
    setJobs(updatedJobs);
    saveJobs(updatedJobs);
    setSelectedJob(null);
  };

  const filteredJobs = jobs
    .filter(job => filter === 'ALL' || job.status === filter)
    .filter(job => 
      job.company.toLowerCase().includes(searchQuery.toLowerCase()) || 
      job.role.toLowerCase().includes(searchQuery.toLowerCase())
    );

  // Calculate Stats
  const activeApps = jobs.filter(j => j.status === JobStatus.APPLIED || j.status === JobStatus.INTERVIEWING).length;
  const interviews = jobs.filter(j => j.status === JobStatus.INTERVIEWING).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0 hidden md:flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center space-x-2 text-indigo-600">
            <Briefcase className="w-8 h-8" />
            <span className="text-xl font-bold tracking-tight">JobHunt AI</span>
          </div>
        </div>
        
        <div className="p-4 space-y-2">
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
        
        <div className="mt-auto p-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center">Powered by Gemini AI</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col h-screen">
        
        {/* Mobile Header */}
        <div className="md:hidden bg-white p-4 border-b border-gray-200 flex items-center justify-between">
            <span className="font-bold text-lg text-indigo-600">JobHunt AI</span>
            <button onClick={() => setIsAddModalOpen(true)} className="p-2 bg-indigo-600 text-white rounded-lg">
                <PlusCircle className="w-5 h-5" />
            </button>
        </div>

        {selectedJob ? (
            <div className="flex-1 overflow-y-auto p-4 md:p-8">
                <JobDetailView 
                    job={selectedJob} 
                    onBack={() => setSelectedJob(null)} 
                    onUpdate={handleUpdateJob}
                    onDelete={handleDeleteJob}
                />
            </div>
        ) : (
            <div className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 space-y-4 md:space-y-0">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
                        <p className="text-gray-500">Track and manage your job search journey.</p>
                    </div>
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center space-x-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 shadow-md transition-all active:scale-95"
                    >
                        <PlusCircle className="w-5 h-5" />
                        <span>Track New Job</span>
                    </button>
                </div>

                {/* Filters & Search */}
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
                    <div className="flex space-x-2 overflow-x-auto pb-2 md:pb-0">
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

                {/* Grid */}
                {filteredJobs.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                        <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Briefcase className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No applications found</h3>
                        <p className="text-gray-500 max-w-sm mx-auto mt-2">Get started by adding your first job application or adjusting your search filters.</p>
                        <button 
                            onClick={() => setIsAddModalOpen(true)}
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
        />
      )}
    </div>
  );
}

export default App;