import React from 'react';
import { Calendar, Clock, MapPin, User, CreditCard, ExternalLink } from 'lucide-react';
import { ParsedAppointmentResponse } from '../utils/toolResponseParser';

interface AppointmentConfirmationProps {
  appointmentData: ParsedAppointmentResponse;
}

const AppointmentConfirmation: React.FC<AppointmentConfirmationProps> = ({ appointmentData }) => {
  if (!appointmentData || !appointmentData.success) {
    return null;
  }
  
  const { appointment, payment } = appointmentData;
  
  // Format date for display
  const formatDateTime = (dateTimeStr: string): string => {
    if (!dateTimeStr || dateTimeStr === "TBD") return "TBD";
    
    try {
      const date = new Date(dateTimeStr);
      return date.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateTimeStr;
    }
  };
  
  const formattedDateTime = formatDateTime(appointment.startDateTime);
  const datePart = formattedDateTime.split(' at ')[0] || '';
  const timePart = formattedDateTime.split(' at ')[1] || 'TBD';
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden border border-green-200">
      <div className="bg-green-500 p-3 text-white">
        <h3 className="text-lg font-semibold flex items-center">
          <Calendar size={20} className="mr-2" />
          Appointment Confirmed!
        </h3>
      </div>
      
      <div className="p-4 space-y-3">
        <div className="flex items-center text-gray-700">
          <User size={18} className="mr-2 text-green-600 flex-shrink-0" />
          <span className="font-medium mr-2">Doctor:</span> 
          <span className="text-gray-800">{appointment.doctorName}</span>
        </div>
        
        <div className="flex items-center text-gray-700">
          <Calendar size={18} className="mr-2 text-green-600 flex-shrink-0" />
          <span className="font-medium mr-2">Date:</span>
          <span className="text-gray-800">{datePart}</span>
        </div>
        
        <div className="flex items-center text-gray-700">
          <Clock size={18} className="mr-2 text-green-600 flex-shrink-0" />
          <span className="font-medium mr-2">Time:</span>
          <span className="text-gray-800">{timePart}</span>
        </div>
        
        <div className="flex items-center text-gray-700">
          <MapPin size={18} className="mr-2 text-green-600 flex-shrink-0" />
          <span className="font-medium mr-2">Type:</span>
          <span className="text-gray-800 capitalize">{appointment.consultationType}</span>
        </div>
        
        {appointment.location && appointment.location !== "TBD" && (
          <div className="flex items-center text-gray-700">
            <MapPin size={18} className="mr-2 text-green-600 flex-shrink-0" />
            <span className="font-medium mr-2">Center:</span>
            <span className="text-gray-800">{appointment.location}</span>
          </div>
        )}
        
        <div className="flex items-center text-gray-700">
          <CreditCard size={18} className="mr-2 text-green-600 flex-shrink-0" />
          <span className="font-medium mr-2">Booking ID:</span>
          <span className="text-gray-800">{payment.referenceId}</span>
        </div>
        
        <div className="border-t border-gray-200 pt-3 mt-3">
          <div className="text-sm text-gray-500 mb-2">
            Status: <span className="font-medium text-orange-500">Pending Payment</span>
          </div>
          
          {payment.shortUrl && (
            <a
              href={payment.shortUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded transition-colors"
            >
              <span>Complete Payment</span>
              <ExternalLink className="ml-2" size={16} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppointmentConfirmation;