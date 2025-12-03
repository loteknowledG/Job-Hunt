
import React from 'react';
import { Job, JobStatus } from '../types';
import { Calendar, MapPin, Briefcase, UserCircle, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface JobCardProps {
  job: Job;
  onClick: (job: Job) => void;
}

const statusColors = {
  [JobStatus.APPLIED]: 'bg-blue-100 text-blue-800 border-blue-200',
  [JobStatus.INTERVIEWING]: 'bg-purple-100 text-purple-800 border-purple-200',
  [JobStatus.OFFER]: 'bg-green-100 text-green-800 border-green-200',
  [JobStatus.REJECTED]: 'bg-gray-100 text-gray-800 border-gray-200',
  [JobStatus.WISHLIST]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
};

export const JobCard: React.FC<JobCardProps> = ({ job, onClick }) => {
  
  const getContactDisplay = () => {
    if (job.contacts && job.contacts.length > 0) {
        if (job.contacts.length === 1) {
            return { icon: UserCircle, text: job.contacts[0].name || job.contacts[0].organization || 'Contact' };
        } else {
            return { icon: Users, text: `${job.contacts.length} Contacts` };
        }
    }
    // Fallback for non-migrated data (though migration should happen on load)
    if (job.recruitingContact) {
         return { icon: UserCircle, text: job.recruitingContact.split('\n')[0].substring(0, 30) };
    }
    return null;
  };

  const contactInfo = getContactDisplay();

  return (
    <div 
      onClick={() => onClick(job)}
      className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-indigo-300"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-lg">
            {job.company.charAt(0)}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">{job.role}</h3>
            <p className="text-sm text-gray-500">{job.company}</p>
          </div>
        </div>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[job.status]}`}>
          {job.status}
        </span>
      </div>

      <div className="space-y-2 mt-4">
        <div className="flex items-center text-xs text-gray-500">
          <MapPin className="w-3.5 h-3.5 mr-1.5" />
          {job.location || 'Remote'}
        </div>
        
        {contactInfo && (
          <div className="flex items-center text-xs text-gray-500">
            <contactInfo.icon className="w-3.5 h-3.5 mr-1.5" />
            {contactInfo.text}
          </div>
        )}

        <div className="flex items-center text-xs text-gray-500">
          <Calendar className="w-3.5 h-3.5 mr-1.5" />
          Applied {formatDistanceToNow(new Date(job.dateApplied), { addSuffix: true })}
        </div>
      </div>

      {job.events.filter(e => !e.completed).length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center text-xs text-orange-600 font-medium">
          <Briefcase className="w-3.5 h-3.5 mr-1.5" />
          {job.events.filter(e => !e.completed).length} Upcoming Event(s)
        </div>
      )}
    </div>
  );
};
