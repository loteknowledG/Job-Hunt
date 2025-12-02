import React, { useState } from 'react';
import { Job, JobStatus, EmailLog, EventType, JobEvent } from '../types';
import { 
  ArrowLeft, Mail, Calendar as CalendarIcon, 
  CheckCircle, Briefcase, Plus, Trash2, ExternalLink,
  Sparkles, Loader2, MessageSquare, Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { generateInterviewQuestions, analyzeEmail } from '../services/geminiService';

interface JobDetailViewProps {
  job: Job;
  onBack: () => void;
  onUpdate: (updatedJob: Job) => void;
  onDelete: (id: string) => void;
}

export const JobDetailView: React.FC<JobDetailViewProps> = ({ job, onBack, onUpdate, onDelete }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'emails' | 'prep'>('overview');
  const [isGeneratingPrep, setIsGeneratingPrep] = useState(false);
  const [newEmailText, setNewEmailText] = useState('');
  const [isAnalyzingEmail, setIsAnalyzingEmail] = useState(false);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<JobEvent>>({ type: EventType.INTERVIEW });

  // -- Handlers --

  const handleStatusChange = (newStatus: string) => {
    onUpdate({ ...job, status: newStatus as JobStatus });
  };

  const handleGenerateQuestions = async () => {
    setIsGeneratingPrep(true);
    try {
      const questions = await generateInterviewQuestions(job.role, job.company, job.description);
      onUpdate({
        ...job,
        aiInsights: {
          ...job.aiInsights,
          interviewQuestions: questions
        }
      });
    } catch (e) {
      console.error(e);
      alert("Failed to generate questions.");
    } finally {
      setIsGeneratingPrep(false);
    }
  };

  const handleAddEmail = async () => {
    if (!newEmailText.trim()) return;
    setIsAnalyzingEmail(true);
    try {
      const analysis = await analyzeEmail(newEmailText);
      
      const newEmail: EmailLog = {
        id: Math.random().toString(36).substr(2, 9),
        sender: 'Unknown / Pasted', // In a real app, user would specify
        subject: 'Correspondence Log',
        body: newEmailText,
        date: new Date().toISOString(),
        summary: analysis.summary
      };

      let updatedEvents = [...job.events];
      if (analysis.suggestedEvent && analysis.suggestedEvent.date) {
        // Automatically suggest adding an event if AI found one
        const confirmEvent = window.confirm(`AI found a potential event: "${analysis.suggestedEvent.title}" on ${analysis.suggestedEvent.date}. Add to calendar?`);
        if (confirmEvent) {
          updatedEvents.push({
            id: Math.random().toString(36).substr(2, 9),
            type: EventType.INTERVIEW,
            title: analysis.suggestedEvent.title,
            date: analysis.suggestedEvent.date,
            completed: false
          });
        }
      }

      onUpdate({
        ...job,
        emails: [newEmail, ...job.emails],
        events: updatedEvents
      });
      setNewEmailText('');
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzingEmail(false);
    }
  };

  const handleSaveEvent = () => {
    if (!newEvent.date || !newEvent.title) return;
    const event: JobEvent = {
        id: Math.random().toString(36).substr(2, 9),
        type: newEvent.type || EventType.OTHER,
        title: newEvent.title,
        date: newEvent.date,
        completed: false,
        notes: newEvent.notes
    };
    onUpdate({ ...job, events: [...job.events, event] });
    setIsAddingEvent(false);
    setNewEvent({ type: EventType.INTERVIEW });
  };

  const toggleEventComplete = (eventId: string) => {
      const updatedEvents = job.events.map(e => 
        e.id === eventId ? { ...e, completed: !e.completed } : e
      );
      onUpdate({ ...job, events: updatedEvents });
  };

  // -- Render Helpers --

  const TabButton = ({ id, label, icon: Icon }: any) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
        activeTab === id 
          ? 'border-indigo-600 text-indigo-600' 
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[600px] flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 flex items-start justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{job.role}</h1>
            <div className="flex items-center text-gray-500 mt-1 space-x-2">
              <Briefcase className="w-4 h-4" />
              <span>{job.company}</span>
              <span>•</span>
              <span>{job.location || 'Remote'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
            <select 
                value={job.status} 
                onChange={(e) => handleStatusChange(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5"
            >
                {Object.values(JobStatus).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button 
                onClick={() => {
                    if(window.confirm('Are you sure you want to delete this application?')) onDelete(job.id);
                }}
                className="p-2.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
                <Trash2 className="w-5 h-5" />
            </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 flex space-x-4 border-b border-gray-100">
        <TabButton id="overview" label="Overview & Events" icon={Briefcase} />
        <TabButton id="emails" label="Correspondence" icon={Mail} />
        <TabButton id="prep" label="Interview Prep" icon={MessageSquare} />
      </div>

      {/* Content */}
      <div className="p-6 flex-1 overflow-y-auto">
        
        {/* TAB: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
               <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <h3 className="font-semibold text-gray-900 mb-2">Job Description</h3>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{job.description}</p>
               </div>
            </div>
            
            <div className="lg:col-span-1 space-y-6">
                {/* Events Widget */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900 flex items-center">
                            <CalendarIcon className="w-4 h-4 mr-2 text-indigo-600"/> 
                            Key Dates
                        </h3>
                        <button 
                            onClick={() => setIsAddingEvent(!isAddingEvent)}
                            className="text-xs text-indigo-600 font-medium hover:text-indigo-800"
                        >
                            + Add Date
                        </button>
                    </div>
                    
                    {isAddingEvent && (
                        <div className="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm space-y-2">
                            <input 
                                type="text" 
                                placeholder="Event Title (e.g. HR Screen)" 
                                className="w-full p-2 border rounded bg-white text-gray-900"
                                value={newEvent.title || ''}
                                onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                            />
                            <input 
                                type="datetime-local" 
                                className="w-full p-2 border rounded bg-white text-gray-900"
                                value={newEvent.date || ''}
                                onChange={e => setNewEvent({...newEvent, date: e.target.value})}
                            />
                            <div className="flex justify-end space-x-2">
                                <button onClick={() => setIsAddingEvent(false)} className="px-2 py-1 text-gray-500">Cancel</button>
                                <button onClick={handleSaveEvent} className="px-2 py-1 bg-indigo-600 text-white rounded">Save</button>
                            </div>
                        </div>
                    )}

                    <div className="space-y-3">
                        {job.events.length === 0 && <p className="text-sm text-gray-400 italic">No upcoming events.</p>}
                        {job.events.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(event => (
                            <div key={event.id} className="flex items-start space-x-3 group">
                                <button 
                                    onClick={() => toggleEventComplete(event.id)}
                                    className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${event.completed ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-indigo-500'}`}
                                >
                                    {event.completed && <CheckCircle className="w-3 h-3 text-white" />}
                                </button>
                                <div>
                                    <p className={`text-sm font-medium ${event.completed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                                        {event.title}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {format(new Date(event.date), 'MMM d, h:mm a')}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
          </div>
        )}

        {/* TAB: EMAILS */}
        {activeTab === 'emails' && (
            <div className="max-w-3xl mx-auto space-y-6">
                {/* Add Email Widget */}
                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                    <label className="block text-sm font-semibold text-indigo-900 mb-2">Log Correspondence</label>
                    <textarea 
                        className="w-full p-3 rounded-lg border-indigo-200 focus:ring-2 focus:ring-indigo-500 text-sm bg-white text-gray-900"
                        rows={4}
                        placeholder="Paste email content here. AI will extract summary and dates..."
                        value={newEmailText}
                        onChange={(e) => setNewEmailText(e.target.value)}
                    />
                    <div className="flex justify-end mt-2">
                         <button
                            onClick={handleAddEmail}
                            disabled={isAnalyzingEmail || !newEmailText}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center"
                        >
                            {isAnalyzingEmail ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                            {isAnalyzingEmail ? 'Analyzing...' : 'Analyze & Save'}
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    {job.emails.length === 0 && (
                        <div className="text-center py-10">
                            <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">No emails logged yet.</p>
                        </div>
                    )}
                    {job.emails.map(email => (
                        <div key={email.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs text-gray-500">{format(new Date(email.date), 'MMM d, yyyy')}</span>
                                {email.summary && (
                                    <span className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full flex items-center">
                                        <Sparkles className="w-3 h-3 mr-1" /> AI Summarized
                                    </span>
                                )}
                            </div>
                            {email.summary ? (
                                <div className="mb-2">
                                    <p className="text-sm font-semibold text-gray-800">Summary:</p>
                                    <p className="text-sm text-gray-600">{email.summary}</p>
                                </div>
                            ) : null}
                             <div className="mt-2 pt-2 border-t border-gray-100">
                                <p className="text-xs text-gray-400 font-mono line-clamp-3 hover:line-clamp-none cursor-pointer transition-all">
                                    {email.body}
                                </p>
                             </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* TAB: PREP */}
        {activeTab === 'prep' && (
            <div className="max-w-3xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-gray-900">AI Interview Preparation</h2>
                    <button 
                        onClick={handleGenerateQuestions}
                        disabled={isGeneratingPrep}
                        className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
                    >
                         {isGeneratingPrep ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                         <span>Generate Questions</span>
                    </button>
                </div>

                {!job.aiInsights?.interviewQuestions && !isGeneratingPrep && (
                     <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                        <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">Click generate to get tailored interview questions based on the job description.</p>
                     </div>
                )}

                {isGeneratingPrep && (
                     <div className="space-y-4 animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-4 bg-gray-200 rounded w-full"></div>
                     </div>
                )}

                {job.aiInsights?.interviewQuestions && (
                    <div className="space-y-4">
                        {job.aiInsights.interviewQuestions.map((q, idx) => (
                            <div key={idx} className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm hover:border-indigo-300 transition-colors">
                                <div className="flex items-start">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">
                                        {idx + 1}
                                    </span>
                                    <div>
                                        <p className="text-gray-900 font-medium">{q}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};