"use client";

import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  Suspense,
} from "react";
import { useSearchParams } from "next/navigation";
import { startCall, endCall } from "@/lib/callFunctions";
import {
  Role,
  Transcript,
  UltravoxExperimentalMessageEvent,
} from "ultravox-client";
import { PhoneOffIcon, ExternalLinkIcon, CalendarIcon, PhoneIcon, MicIcon, Settings2Icon, ActivityIcon, X, ArrowRightIcon, CreditCardIcon } from "lucide-react";
import { CalComService } from "@/lib/calComService";
import MicToggleButton from "./components/MicToggleButton";
import demoConfig from "./demo-config";
import { ConsultationData, Symptom, Appointment } from "@/lib/types";
import { parseBookAppointmentResponse, formatDateTime, extractTimeFromDateTime } from './utils/toolResponseParser';
import AppointmentConfirmation from './components/AppointmentConfirmation';

// Mobile Number popup component
const MobileNumberPopup = ({ onSubmit }) => {
  const [mobileNumber, setMobileNumber] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [isAnimated, setIsAnimated] = useState(false);

  useEffect(() => {
    setIsAnimated(true);
  }, []);

  const validateMobileNumber = (number) => {
    // Basic validation for a 10-digit number
    const re = /^\d{10}$/;
    return re.test(number);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isValid) {
      onSubmit(mobileNumber);
    }
  };

  useEffect(() => {
    setIsValid(validateMobileNumber(mobileNumber));
  }, [mobileNumber]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className={`bg-white p-8 rounded-xl shadow-2xl max-w-md w-full transform ${isAnimated ? 'scale-100 opacity-100' : 'scale-95 opacity-0'} transition-all duration-300 ease-in-out`}>
        <div className="flex items-center justify-center mb-6">
          <img 
            src="https://www.app.physiotattva247.com/assets/assets/images/logo.91ea6cf29a55da199eea5a233fca5f82.png" 
            alt="PhysioTattva Logo" 
            className="h-16"
          />
        </div>
        <h2 className="text-2xl font-bold mb-4 text-center text-blue-600">Welcome to PhysioTattva</h2>
        <p className="mb-6 text-center text-gray-600">Please enter your mobile number to continue your consultation</p>
        <form onSubmit={handleSubmit}>
          <div className="relative mb-6">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-500">
              +91
            </div>
            <input
              type="tel"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              placeholder="Enter 10-digit mobile number"
              className="w-full p-4 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              required
            />
          </div>
          <button
            type="submit"
            disabled={!isValid}
            className={`w-full py-4 rounded-lg font-medium text-white transition-all duration-300 
                      ${isValid ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 cursor-not-allowed'}`}
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
};

// City Selection popup component
const CitySelectionPopup = ({ onSelectCity, onClose }) => {
  const cities = [
    { id: "bangalore", name: "Bangalore" },
    { id: "hyderabad", name: "Hyderabad" }
  ];
  
  const [isAnimated, setIsAnimated] = useState(false);

  useEffect(() => {
    setIsAnimated(true);
  }, []);
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className={`bg-white p-6 rounded-xl shadow-2xl max-w-md w-full transform ${isAnimated ? 'scale-100 opacity-100' : 'scale-95 opacity-0'} transition-all duration-300 ease-in-out`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-blue-600">Select Location</h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          {cities.map((city) => (
            <button
              key={city.id}
              className="p-6 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-center hover:shadow-md transition-all duration-200 text-blue-700"
              onClick={() => onSelectCity(city.id, city.name)}
            >
              {city.name}
            </button>
          ))}
        </div>
        
        <button
          onClick={onClose}
          className="w-full p-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

// Center Selection popup component
const CenterSelectionPopup = ({ city, onSelectCenter, onClose }) => {
  // Define centers for each city
  const centersByCity = {
    bangalore: [
      { id: "JAYANAGAR", name: "Jayanagar" },
      { id: "ELECTRONIC CITY", name: "Electronic City" },
      { id: "SARJAPURA", name: "Sarjapura" },
      { id: "BELLANDUR", name: "Bellandur" },
      { id: "WHITEFIELD", name: "Whitefield" },
      { id: "BANNERGHATTA", name: "Bannerghatta" },
      { id: "INDIRANAGAR", name: "Indiranagar" },
    ],
    hyderabad: [
      { id: "HSR", name: "HSR" },
      { id: "SAHAKAR NAGAR", name: "Sahakar Nagar" },
      { id: "BANASHANKARI", name: "Banashankari" },
      { id: "MALLESHWARAM", name: "Malleshwaram" },
      { id: "KANAKPURA ROAD", name: "Kanakpura Road" },
      { id: "JUBILEE HILLS", name: "Jubilee Hills" },
      { id: "KUKATPALLY", name: "Kukatpally" },
      { id: "GACHIBOWLI", name: "Gachibowli" },
    ]
  };
  
  const centers = centersByCity[city] || [];
  const [isAnimated, setIsAnimated] = useState(false);

  useEffect(() => {
    setIsAnimated(true);
  }, []);
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className={`bg-white p-6 rounded-xl shadow-2xl max-w-md w-full transform ${isAnimated ? 'scale-100 opacity-100' : 'scale-95 opacity-0'} transition-all duration-300 ease-in-out`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-blue-600">Select Center in {city.charAt(0).toUpperCase() + city.slice(1)}</h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto mb-6 pr-2">
          {centers.map((center) => (
            <button
              key={center.id}
              className="p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-center hover:shadow-md transition-all duration-200 text-blue-700"
              onClick={() => onSelectCenter(center.id, center.name)}
            >
              {center.name}
            </button>
          ))}
        </div>
        
        <button
          onClick={onClose}
          className="w-full p-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

// Available Slots popup component
const AvailableSlotsPopup = ({ slots, onSelectSlot, onClose, selectedDay, selectedWeek }) => {
  const displaySlots = Array.isArray(slots) ? slots : 
                       (typeof slots === 'string' ? slots.split(/,\s*/) : []);
  
  const [isAnimated, setIsAnimated] = useState(false);

  useEffect(() => {
    setIsAnimated(true);
  }, []);
  
  // Format slots in hour ranges if they're not already
  const formattedSlots = displaySlots.map(slot => {
    // Check if the slot is already in hour range format (like "9-10 AM")
    if (slot.includes("-")) return slot;
    
    // Simple time format like "9AM" or "14:00"
    const timeMatch = slot.match(/(\d+)(?::(\d+))?\s*([aApP][mM])?/);
    if (!timeMatch) return slot;
    
    let hour = parseInt(timeMatch[1]);
    const minutes = timeMatch[2] || "00";
    const ampm = timeMatch[3] || (hour >= 12 ? "PM" : "AM");
    
    // For 24-hour format
    if (!timeMatch[3] && hour > 12) {
      hour = hour % 12 || 12;
    }
    
    const nextHour = (hour % 12) + 1;
    const nextAmPm = hour === 11 ? (ampm === "AM" ? "PM" : "AM") : ampm;
    
    return `${hour}-${nextHour} ${ampm}`;
  });
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className={`bg-white p-6 rounded-xl shadow-2xl max-w-md w-full transform ${isAnimated ? 'scale-100 opacity-100' : 'scale-95 opacity-0'} transition-all duration-300 ease-in-out`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-blue-600">Available Time Slots</h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        {selectedDay && selectedWeek && (
          <p className="mb-4 text-gray-600 bg-blue-50 p-3 rounded-lg border-l-4 border-blue-500">
            For {selectedWeek}, {selectedDay}:
          </p>
        )}
        
        {formattedSlots.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto mb-6 pr-2">
            {formattedSlots.map((slot, index) => (
              <button
                key={index}
                className="p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-center hover:shadow-md transition-all duration-200 text-blue-700"
                onClick={() => onSelectSlot(slot)}
              >
                {slot}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-red-500 mb-6 bg-red-50 p-4 rounded-lg text-center">No slots available for the selected day.</p>
        )}
        
        <button
          onClick={onClose}
          className="w-full p-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

const SearchParamsContent = ({ children }) => {
  const searchParams = useSearchParams();
  const showMuteSpeakerButton = searchParams.get("showSpeakerMute") === "true";
  const showDebugMessages = searchParams.get("showDebugMessages") === "true";
  const showUserTranscripts = searchParams.get("showUserTranscripts") === "true";
  let modelOverride;

  if (searchParams.get("model")) {
    modelOverride = "fixie-ai/" + searchParams.get("model");
  }

  return children({
    showMuteSpeakerButton,
    modelOverride,
    showDebugMessages,
    showUserTranscripts,
  });
};

const SearchParamsHandler = (props) => {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-b from-blue-50 to-white">
          <div className="max-w-7xl mx-auto w-full py-5 px-5 flex items-center justify-center">
            <div className="animate-pulse flex flex-col items-center">
              <div className="w-16 h-16 bg-blue-200 rounded-full mb-4"></div>
              <div className="h-4 bg-blue-200 rounded w-32 mb-2"></div>
              <div className="h-3 bg-blue-100 rounded w-24"></div>
            </div>
          </div>
        </div>
      }
    >
      <SearchParamsContent {...props} />
    </Suspense>
  );
};

// Message Bubble component for chat
const MessageBubble = ({ message, isUser }) => {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-3/4 px-4 py-3 rounded-2xl ${
        isUser 
          ? 'bg-blue-600 text-white rounded-tr-none' 
          : 'bg-gray-100 text-gray-800 rounded-tl-none'
      }`}>
        {message}
      </div>
    </div>
  );
};

// Loading animation component
const LoadingAnimation = () => {
  return (
    <div className="flex items-center justify-center py-3">
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
      </div>
    </div>
  );
};

// Wave Animation for Microphone
const MicrophoneWave = () => {
  return (
    <div className="relative">
      <div className="absolute -inset-1 rounded-full opacity-30 bg-blue-500 animate-ping"></div>
      <div className="absolute -inset-2 rounded-full opacity-20 bg-blue-500 animate-pulse" style={{ animationDuration: '2s' }}></div>
      <div className="absolute -inset-3 rounded-full opacity-10 bg-blue-500 animate-pulse" style={{ animationDuration: '3s' }}></div>
      <div className="relative z-10 bg-white p-2 rounded-full">
        <MicIcon className="w-6 h-6 text-blue-600" />
      </div>
    </div>
  );
};

// Utility function to format date
const formatDate = (dateString) => {
  if (!dateString) return "";
  
  try {
    const date = new Date(dateString);
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
    return dateString;
  }
};

const Home = () => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isCallStarting, setIsCallStarting] = useState(false);
  const [agentStatus, setAgentStatus] = useState("Not Connected");
  const [callTranscript, setCallTranscript] = useState([]);
  const [callDebugMessages, setCallDebugMessages] = useState([]);
  const [customerProfileKey, setCustomerProfileKey] = useState(null);
  const [lastUpdateTime, setLastUpdateTime] = useState("");
  const [userMobileNumber, setUserMobileNumber] = useState("");
  const [showMobilePopup, setShowMobilePopup] = useState(true);
  const [consultationData, setConsultationData] = useState({
    symptoms: [],
    assessmentStatus: "Not started",
  });
  const [isBookingInProgress, setIsBookingInProgress] = useState(false);
  const [appointmentSlots, setAppointmentSlots] = useState([]);
  const [showSlotsPopup, setShowSlotsPopup] = useState(false);
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedWeek, setSelectedWeek] = useState("");
  const [paymentLink, setPaymentLink] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);
  const [showCityPopup, setShowCityPopup] = useState(false);
  const [showCenterPopup, setShowCenterPopup] = useState(false);
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedCenter, setSelectedCenter] = useState("");
  // AI speaking state
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  
  const transcriptContainerRef = useRef(null);
  const calendarService = useMemo(() => CalComService?.getInstance(), []);
  const demoConfigRef = useRef(null);
  const lastProcessedMessageRef = useRef("");

  useEffect(() => {
    if (userMobileNumber) {
      demoConfigRef.current = demoConfig(userMobileNumber);
      fetchUpcomingAppointments(userMobileNumber);
    }
  }, [userMobileNumber]);

  const fetchUpcomingAppointments = async (phoneNumber) => {
    if (!phoneNumber) return;
    
    setIsLoadingAppointments(true);
    try {
      const response = await fetch(`https://api-dev.physiotattva247.com/upcoming-appointments/${phoneNumber}?user_id=1`);
      
      if (!response.ok) {
        throw new Error(`Error fetching appointments: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Upcoming appointments:", data);
      
      if (data.success && data.appointment) {
        // Handle single appointment or array of appointments
        const appointments = Array.isArray(data.appointment) ? data.appointment : [data.appointment];
        setUpcomingAppointments(appointments);
      } else {
        setUpcomingAppointments([]);
      }
    } catch (error) {
      console.error("Failed to fetch upcoming appointments:", error);
      setUpcomingAppointments([]);
    } finally {
      setIsLoadingAppointments(false);
    }
  };

  const handleMobileNumberSubmit = (mobileNumber) => {
    setUserMobileNumber(mobileNumber);
    setShowMobilePopup(false);
    demoConfigRef.current = demoConfig(mobileNumber);
    fetchUpcomingAppointments(mobileNumber);
  };

  const handleSelectCity = (cityId, cityName) => {
    setSelectedCity(cityId);
    
    // Add the user's selection to the call transcript display
    const citySelectionMessage = `I'd like to book in ${cityName}.`;
    const newMessage = {
      message: {
        message: `User: ${citySelectionMessage}`
      }
    };
    
    setCallDebugMessages(prev => [...prev, newMessage]);
    setShowCityPopup(false);
    
    // After selecting a city, show center selection
    setTimeout(() => {
      setShowCenterPopup(true);
    }, 500);
  };

  const handleSelectCenter = (centerId, centerName) => {
    setSelectedCenter(centerId);
    
    // Add the user's selection to the call transcript display
    const centerSelectionMessage = `I'd like the ${centerName} center.`;
    const newMessage = {
      message: {
        message: `User: ${centerSelectionMessage}`
      }
    };
    
    setCallDebugMessages(prev => [...prev, newMessage]);
    setShowCenterPopup(false);
  };

  const handleSelectTimeSlot = (slot) => {
    // This mimics the user selecting a slot which would be spoken in the call
    const timeSlotMessage = `I'd like the ${slot} slot.`;
    
    // Add the user's selection to the call transcript display
    const newMessage = {
      message: {
        message: `User: ${timeSlotMessage}`
      }
    };
    
    setCallDebugMessages(prev => [...prev, newMessage]);
    setShowSlotsPopup(false);
  };

  useEffect(() => {
    if (transcriptContainerRef.current) {
      transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
    }
  }, [callTranscript, callDebugMessages]);

  // Detect appointment details and payment links from conversation
  useEffect(() => {
    if (callDebugMessages.length > 0) {
      const latestMessage = callDebugMessages[callDebugMessages.length - 1].message.message;
      
      // Skip if we've already processed this message
      if (latestMessage === lastProcessedMessageRef.current) {
        return;
      }

      // Check if it's an AI response and set speaking state
      if (latestMessage.includes("LLM response:")) {
        setIsAISpeaking(true);
        // Set timeout to stop "speaking" after 3 seconds
        setTimeout(() => {
          setIsAISpeaking(false);
        }, 3000);
      }
      
      lastProcessedMessageRef.current = latestMessage;
      setLastUpdateTime(new Date().toLocaleTimeString());
  
      // Check for city selection trigger
      if (latestMessage.includes("prefer Bangalore or Hyderabad") || 
          latestMessage.includes("prefer our Bangalore or Hyderabad")) {
        console.log("Detected city selection prompt");
        setShowCityPopup(true);
      }
  
      // Extract appointment information from conversation text
      if (latestMessage.includes("consultation has been booked") || 
          latestMessage.includes("appointment has been booked")) {
        try {
          // Extract doctor name
          const doctorMatch = latestMessage.match(/with\s+(Dr\.\s+[^(]+)/i);
          const doctor = doctorMatch ? doctorMatch[1].trim() : "";
          
          // Extract day and time
          const dayMatch = latestMessage.match(/on\s+(\w+)/i);
          const timeMatch = latestMessage.match(/at\s+(\d+:\d+\s*[APap][Mm])/i);
          const day = dayMatch ? dayMatch[1] : "";
          const time = timeMatch ? timeMatch[1] : "";
          
          // Extract payment link
          const paymentLinkMatch = latestMessage.match(/payment\s+link:\s*(https?:\/\/[^\s.]+\.[^\s]+)/i);
          const extractedPaymentLink = paymentLinkMatch ? paymentLinkMatch[1] : "";
          
          if (extractedPaymentLink) {
            setPaymentLink(extractedPaymentLink);
          }
          
          // Extract consultation type
          let consultationType = "In-person";
          if (latestMessage.includes("online consultation")) {
            consultationType = "Online";
          } else if (latestMessage.includes("in-person consultation")) {
            consultationType = "In-Person";
          }
          
          // Update consultation data with appointment details
          if (day || time || doctor || extractedPaymentLink) {
            setConsultationData(prev => ({
              ...prev,
              appointment: {
                ...prev.appointment,
                type: consultationType,
                date: day ? new Date().toISOString().split('T')[0] : prev.appointment?.date || "TBD",
                time: time || prev.appointment?.time || "TBD",
                doctor: doctor || prev.appointment?.doctor || "",
                paymentLink: extractedPaymentLink || prev.appointment?.paymentLink || "",
                location: selectedCenter,
                mobileNumber: userMobileNumber
              }
            }));
          }
        } catch (error) {
          console.error("Error extracting appointment details:", error);
        }
      }
  
      // Check for available slots in conversation
      if (latestMessage.includes("slots available") ||
          latestMessage.includes("following slots") ||
          latestMessage.includes("time slot") ||
          latestMessage.includes("time slots")) {
        try {
          // Extract day information
          const dayMatch = latestMessage.match(/slots\s+available\s+on\s+(\w+)/i);
          const day = dayMatch ? dayMatch[1] : "";
          if (day) {
            setSelectedDay(day.toLowerCase());
            setSelectedWeek(latestMessage.includes("next week") ? "next week" : "this week");
          }
          
          // Extract time slots if mentioned
          let slots = [];
          
          // Pattern like "9-10 AM, 10-11 AM, 11-12 AM" etc.
          const slotsListMatch = latestMessage.match(/time slot.*?:(.+?)(\?|\.|\n|$)/i);
          if (slotsListMatch) {
            const slotsList = slotsListMatch[1].trim();
            slots = slotsList.split(/,\s*/).map(s => s.trim());
            
            if (slots.length > 0) {
              setAppointmentSlots(slots);
              setShowSlotsPopup(true);
            }
          }
          
          // Also try to extract slots mentioned in a different format
          if (slots.length === 0) {
            const timeRanges = latestMessage.match(/\d+(?::\d+)?(?:\s*-\s*\d+(?::\d+)?)?(?:\s*[aApP][mM])/g);
            if (timeRanges && timeRanges.length > 0) {
              setAppointmentSlots(timeRanges);
              setShowSlotsPopup(true);
            }
          }
        } catch (error) {
          console.error("Error extracting slots from message:", error);
        }
      }
  
      // Check for fetchSlots calls and extract available slots
      if (latestMessage.includes("fetchSlots")) {
        try {
          // Extract the week selection and selected day
          let weekSelection = "";
          let selectedDay = "";
          
          // Try to extract parameters from the message
          const paramsMatch = latestMessage.match(/week_selection=([^,&\s]+)[,&\s]+selected_day=([^,&\s]+)/);
          if (paramsMatch) {
            weekSelection = paramsMatch[1].replace(/["']/g, '');
            selectedDay = paramsMatch[2].replace(/["']/g, '');
          }
          
          // Also try to extract from args if needed
          if (!weekSelection || !selectedDay) {
            const argsMatch = latestMessage.match(/args=({[^}]+})/);
            if (argsMatch && argsMatch[1]) {
              try {
                const args = JSON.parse(argsMatch[1]);
                weekSelection = args.week_selection || "";
                selectedDay = args.selected_day || "";
              } catch (e) {
                console.error("Error parsing args JSON:", e);
              }
            }
          }
          
          setSelectedWeek(weekSelection);
          setSelectedDay(selectedDay);
          
          // Find the response data in the message
          const jsonStart = latestMessage.indexOf('{');
          const jsonEnd = latestMessage.lastIndexOf('}') + 1;
          
          if (jsonStart !== -1 && jsonEnd !== -1) {
            const jsonStr = latestMessage.slice(jsonStart, jsonEnd);
            
            try {
              const data = JSON.parse(jsonStr);
              
              if (data.slots && Array.isArray(data.slots)) {
                setAppointmentSlots(data.slots);
                setShowSlotsPopup(true);
              }
            } catch (e) {console.error("Error parsing slots JSON:", e);
          }
        }
      } catch (error) {
        console.error("Error processing fetchSlots data:", error);
      }
    }

    // ENHANCED BOOKING APPOINTMENT HANDLER
    if (latestMessage.includes("bookAppointment")) {
      try {
        // Use the utility function to parse the response
        const appointmentData = parseBookAppointmentResponse(latestMessage);
        
        if (appointmentData && appointmentData.success) {
          console.log("Successfully parsed booking data:", appointmentData);
          
          // Format time from startDateTime
          let formattedTime = extractTimeFromDateTime(appointmentData.appointment.startDateTime);
          
          // Update consultation data with all appointment details
          setConsultationData(prev => ({
            ...prev,
            appointment: {
              ...prev.appointment,
              type: appointmentData.appointment.consultationType,
              doctor: appointmentData.appointment.doctorName,
              startDateTime: appointmentData.appointment.startDateTime,
              date: appointmentData.appointment.calculatedDate || 
                    (appointmentData.appointment.startDateTime ? 
                      appointmentData.appointment.startDateTime.split(' ')[0] : 
                      "TBD"),
              time: formattedTime,
              paymentLink: appointmentData.payment.shortUrl,
              bookingId: appointmentData.payment.referenceId,
              location: selectedCenter,
              mobileNumber: userMobileNumber,
              status: "Pending Payment",
              consultationTypeId: appointmentData.appointment.consultationTypeId,
              leadId: appointmentData.appointment.leadId,
              paymentMode: appointmentData.appointment.paymentMode,
              paymentData: appointmentData.payment.paymentData
            }
          }));
          
          // Set payment link and booking ID separately for easy access
          if (appointmentData.payment.shortUrl) {
            setPaymentLink(appointmentData.payment.shortUrl);
          }
          if (appointmentData.payment.referenceId) {
            setBookingId(appointmentData.payment.referenceId);
          }
          
          // Refresh upcoming appointments
          setTimeout(() => {
            fetchUpcomingAppointments(userMobileNumber);
          }, 2000);
        } else {
          // Fallback to original json extraction if utility function fails
          const jsonRegex = /\{[\s\S]*"success"[\s\S]*\}/;
          const jsonMatch = latestMessage.match(jsonRegex);
          
          if (jsonMatch) {
            try {
              const jsonData = JSON.parse(jsonMatch[0]);
              console.log("Fallback parsed booking result data:", jsonData);
              
              if (jsonData.success) {
                const appointmentInfo = jsonData.appointmentInfo || {};
                const payment = jsonData.payment || {};
                
                // Extract all necessary data
                const doctor = appointmentInfo.appointed_doctor || "";
                const startDateTime = appointmentInfo.startDateTime || "";
                const consultationType = appointmentInfo.consultation_type || "TBD";
                const paymentUrl = payment.short_url || "";
                const bookingRef = payment.reference_id || "";
                
                // Format date and time
                let formattedDate = "TBD";
                let formattedTime = "TBD";
                
                if (startDateTime) {
                  const parts = startDateTime.split(' ');
                  if (parts.length >= 2) {
                    formattedDate = parts[0];
                    
                    // Convert time to readable format
                    const timeParts = parts[1].split(':');
                    if (timeParts.length >= 2) {
                      const hour = parseInt(timeParts[0]);
                      const minute = timeParts[1];
                      
                      // Format as "4-5 PM" style
                      const hourEnd = hour + 1;
                      const period = hour >= 12 ? "PM" : "AM";
                      const hour12 = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
                      
                      formattedTime = `${hour12}-${hourEnd > 12 ? hourEnd - 12 : hourEnd} ${period}`;
                    }
                  }
                }
                
                // Update consultation data with all the appointment details
                setConsultationData(prev => ({
                  ...prev,
                  appointment: {
                    ...prev.appointment,
                    type: consultationType,
                    doctor: doctor,
                    startDateTime: startDateTime,
                    date: formattedDate,
                    time: formattedTime,
                    paymentLink: paymentUrl,
                    bookingId: bookingRef,
                    location: selectedCenter,
                    mobileNumber: userMobileNumber,
                    status: "Pending Payment"
                  }
                }));
                
                // Set payment link and booking ID separately for easy access
                if (paymentUrl) {
                  setPaymentLink(paymentUrl);
                }
                if (bookingRef) {
                  setBookingId(bookingRef);
                }
                
                // Refresh upcoming appointments
                setTimeout(() => {
                  fetchUpcomingAppointments(userMobileNumber);
                }, 2000);
              }
            } catch (error) {
              console.error("Error parsing JSON response:", error);
            }
          }
        }
      } catch (error) {
        console.error("Error processing booking response:", error);
      }
    }

    // Parse consultation data from updateConsultation calls
    const parsedData = parseConsultationData(latestMessage);
    if (parsedData) {
      setConsultationData((prevData) => {
        const newData = {
          ...prevData,
          symptoms: parsedData.symptoms || prevData.symptoms,
          assessmentStatus: parsedData.assessmentStatus || prevData.assessmentStatus,
          appointment: parsedData.appointment
            ? {
                type: parsedData.appointment.type || prevData.appointment?.type || "TBD",
                location: parsedData.appointment.location || selectedCenter || prevData.appointment?.location || "TBD",
                date: parsedData.appointment.date || prevData.appointment?.date || "TBD",
                time: parsedData.appointment.time || prevData.appointment?.time || "TBD",
                mobileNumber: userMobileNumber,
                paymentLink: paymentLink || prevData.appointment?.paymentLink || "",
                bookingId: bookingId || prevData.appointment?.bookingId || "",
                doctor: prevData.appointment?.doctor || ""
              }
            : prevData.appointment,
        };

        return newData;
      });
    }
  }
}, [callDebugMessages, userMobileNumber, paymentLink, bookingId, selectedCenter]);

const handleStatusChange = useCallback((status: string | undefined) => {
  if (status) {
    setAgentStatus(status);
    setLastUpdateTime(new Date().toLocaleTimeString());
  } else {
    setAgentStatus("Not Connected");
  }
}, []);

const handleTranscriptChange = useCallback(
  (transcripts: Transcript[] | undefined) => {
    if (transcripts) {
      setCallTranscript([...transcripts]);
      setLastUpdateTime(new Date().toLocaleTimeString());
    }
  },
  []
);

const handleDebugMessage = useCallback(
  (debugMessage: UltravoxExperimentalMessageEvent) => {
    // Store all messages for processing data
    setCallDebugMessages((prevMessages) => {
      const newMessages = [...prevMessages, debugMessage];
      return newMessages;
    });
    setLastUpdateTime(new Date().toLocaleTimeString());
  },
  []
);

const clearCustomerProfile = useCallback(() => {
  setCustomerProfileKey((prev) => (prev ? `${prev}-cleared` : "cleared"));
}, []);

const getCallStatus = () => {
  if (!isCallActive) return "Not started";
  if (agentStatus === "Call started successfully") return "In progress";
  return agentStatus;
};

const handleStartCallButtonClick = async (
  modelOverride?: string,
  showDebugMessages?: boolean
) => {
  if (isCallStarting || isCallActive || !demoConfigRef.current) return;

  try {
    setIsCallStarting(true);
    handleStatusChange("Starting call...");
    setCallTranscript(null);
    setCallDebugMessages([]);
    clearCustomerProfile();
    setAppointmentSlots([]);
    setShowSlotsPopup(false);
    setShowCityPopup(false);
    setShowCenterPopup(false);
    setSelectedCity("");
    setSelectedCenter("");
    setSelectedDay("");
    setSelectedWeek("");
    setPaymentLink("");
    setBookingId("");
    lastProcessedMessageRef.current = "";
    setConsultationData({
      symptoms: [],
      assessmentStatus: "Not started",
    });

    const newKey = `call-${Date.now()}`;
    setCustomerProfileKey(newKey);

    let callConfig = {
      ...demoConfigRef.current.callConfig,
      model: modelOverride || demoConfigRef.current.callConfig.model,
    };

    await startCall(
      {
        onStatusChange: handleStatusChange,
        onTranscriptChange: handleTranscriptChange,
        onDebugMessage: handleDebugMessage,
      },
      callConfig,
      showDebugMessages
    );

    setIsCallActive(true);
    handleStatusChange("Call started successfully");
  } catch (error) {
    handleStatusChange(
      `Error starting call: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  } finally {
    setIsCallStarting(false);
  }
};

const handleEndCallButtonClick = async () => {
  try {
    handleStatusChange("Ending call...");
    await endCall();
    setIsCallActive(false);
    clearCustomerProfile();
    setCustomerProfileKey(null);
    handleStatusChange("Call ended successfully");
    
    // Refresh upcoming appointments after ending the call
    fetchUpcomingAppointments(userMobileNumber);
  } catch (error) {
    handleStatusChange(
      `Error ending call: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

const parseConsultationData = (message: string) => {
  try {
    if (message.includes("Tool calls:") && message.includes("updateConsultation")) {
      const jsonStart = message.indexOf("{");
      const jsonEnd = message.lastIndexOf("}") + 1;
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const jsonStr = message.slice(jsonStart, jsonEnd);
        const data = JSON.parse(jsonStr);

        console.log("Parsed consultation data:", data);

        const consultationData =
          data.value?.consultationData ||
          data.value ||
          data.consultationData ||
          data;

        return {
          symptoms: Array.isArray(consultationData.symptoms)
            ? consultationData.symptoms
            : [],
          assessmentStatus: consultationData.assessmentStatus || "In Progress",
          appointment: consultationData.appointment || undefined,
        };
      }
    }
    return null;
  } catch (error) {
    console.error("Error parsing consultation data:", error);
    return null;
  }
};

const showNotification = (message, type = "info") => {
  console.log(`[${type.toUpperCase()}]: ${message}`);
  // You can add actual toast/notification UI here
};

// Extract visible messages from debug messages
const getVisibleMessages = () => {
  return callDebugMessages
    .filter(msg => {
      const message = msg.message.message;
      return !message.includes("Tool calls:") && 
             !message.includes("FunctionCall") && 
             !message.includes("invocation_id") &&
             !message.includes("args=") &&
             !message.includes("consultationData") &&
             !message.includes("fetchSlots") &&
             !message.includes("bookAppointment");
    })
    .map(msg => {
      const message = msg.message.message;
      const isUserMessage = message.startsWith("User:");
      const content = isUserMessage 
        ? message.replace("User:", "").trim() 
        : message.replace("LLM response:", "Dr. Riya:").trim();
      
      return {
        content,
        isUser: isUserMessage
      };
    });
};

return (
  <>
    {showMobilePopup && <MobileNumberPopup onSubmit={handleMobileNumberSubmit} />}
    {showCityPopup && <CitySelectionPopup onSelectCity={handleSelectCity} onClose={() => setShowCityPopup(false)} />}
    {showCenterPopup && <CenterSelectionPopup city={selectedCity} onSelectCenter={handleSelectCenter} onClose={() => setShowCenterPopup(false)} />}
    {showSlotsPopup && (
      <AvailableSlotsPopup 
        slots={appointmentSlots} 
        onSelectSlot={handleSelectTimeSlot} 
        onClose={() => setShowSlotsPopup(false)}
        selectedDay={selectedDay}
        selectedWeek={selectedWeek}
      />
    )}
    <SearchParamsHandler>
      {({
        showMuteSpeakerButton,
        modelOverride,
        showDebugMessages,
        showUserTranscripts,
      }) => (
        <div className="flex flex-col min-h-screen bg-gradient-to-b from-blue-50 to-white">
          <div className="flex flex-col lg:flex-row flex-1 w-full max-w-7xl mx-auto px-4 py-6">
            {/* Main Chat Content */}
            <div className="flex-1 lg:mr-6 mb-6">
              <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 h-full flex flex-col">
                {/* Doctor Header */}
                <div className="bg-blue-600 p-4 text-white flex items-center justify-between">
                  <div className="flex items-center">
                    {isAISpeaking && isCallActive ? (
                      <MicrophoneWave />
                    ) : (
                      <div className="bg-white p-2 rounded-full mr-3">
                        <MicIcon className="w-6 h-6 text-blue-600" />
                      </div>
                    )}
                    <div className="ml-3">
                      <h2 className="text-xl font-semibold">Dr. Riya</h2>
                      <p className="text-sm opacity-80">Physiotherapy Expert</p>
                    </div>
                  </div>
                  <div className="text-sm bg-blue-500 px-3 py-1 rounded-full">
                    {getCallStatus()}
                  </div>
                </div>
                
                {/* Chat Container */}
                <div 
                  className="flex-1 overflow-y-auto p-4 bg-gray-50"
                  ref={transcriptContainerRef}
                  style={{ minHeight: "300px" }}
                >
                  {getVisibleMessages().length > 0 ? (
                    getVisibleMessages().map((msg, index) => (
                      <MessageBubble
                        key={index}
                        message={msg.content}
                        isUser={msg.isUser}
                      />
                    ))
                  ) : (
                    <div className="flex flex-col justify-center items-center h-full text-center">
                      <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                        <PhoneIcon className="w-10 h-10 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-blue-600 mb-2">Ready to start your consultation</h3>
                      <p className="text-gray-500 max-w-sm">
                        Click the Start Call button to begin your consultation with Dr. Riya.
                      </p>
                    </div>
                  )}
                  
                  {isAISpeaking && isCallActive && (
                    <div className="flex justify-start mb-2">
                      <div className="bg-blue-100 px-3 py-1 rounded-full text-blue-700 text-xs animate-pulse">
                        Dr. Riya is speaking...
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Call Controls */}
                <div className="bg-white border-t border-gray-100 p-4">
                  {isCallActive ? (
                    <div className="flex space-x-3">
                      <MicToggleButton role={Role.USER} />
                      {showMuteSpeakerButton && (
                        <MicToggleButton role={Role.AGENT} />
                      )}
                      <button
                        type="button"
                        className="flex-grow flex items-center justify-center py-3 px-6 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors shadow-sm"
                        onClick={handleEndCallButtonClick}
                        disabled={!isCallActive}
                      >
                        <PhoneOffIcon className="mr-2 w-5 h-5" />
                        End Call
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="w-full py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed shadow-sm flex items-center justify-center"
                      onClick={() =>
                        handleStartCallButtonClick(
                          modelOverride,
                          showDebugMessages
                        )
                      }
                      disabled={isCallStarting || !userMobileNumber}
                    >
                      <PhoneIcon className="mr-2 w-5 h-5" />
                      {isCallStarting ? "Starting Call..." : "Start Call"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Info Panel - now always visible on all screens */}
            <div className="lg:w-96 w-full">
              <div className="space-y-6">
                {/* Upcoming Appointments Section */}
                {upcomingAppointments.length > 0 && (
                  <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100">
                    <h2 className="text-xl font-semibold mb-4 text-blue-700 flex items-center">
                      <CalendarIcon className="w-5 h-5 mr-2" />
                      Upcoming Appointments
                    </h2>
                    <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
                      {upcomingAppointments.map((appointment, index) => (
                        <div key={index} className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                          <div className="font-medium text-blue-800 mb-2">
                            {appointment.doctor}
                          </div>
                          <div className="text-sm space-y-1">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Date:</span>
                              <span className="text-gray-800">{formatDate(appointment.startDateTime)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Type:</span>
                              <span className="text-gray-800">{appointment.consultationType}</span>
                            </div>
                            {appointment.campus && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Location:</span>
                                <span className="text-gray-800">{appointment.campus}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-gray-600">Status:</span>
                              <span className={`font-medium ${
                                appointment.status === "Confirmed" ? "text-green-600" : "text-orange-500"
                              }`}>
                                {appointment.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {isLoadingAppointments && (
                  <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100 text-center">
                    <LoadingAnimation />
                    <p className="text-gray-500 mt-2">Loading appointments...</p>
                  </div>
                )}

                {/* Assessment Status */}
                <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100">
                  <h2 className="text-xl font-semibold mb-4 text-blue-700 border-b border-blue-100 pb-2">
                    Consultation Status
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-blue-600 mb-2 flex items-center">
                        <ActivityIcon className="w-4 h-4 mr-1" />
                        Assessment Status
                      </h3>
                      <div className="bg-blue-50 p-3 rounded-lg font-medium">
                        {consultationData.assessmentStatus}
                      </div>
                    </div>

                    {/* Location/Center Selection Info */}
                    {selectedCity && (
                      <div>
                        <h3 className="font-medium text-blue-600 mb-2">
                          Selected Location
                        </h3>
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <div className="flex justify-between mb-1">
                            <span className="text-gray-600">City:</span>
                            <span className="font-medium">{selectedCity.charAt(0).toUpperCase() + selectedCity.slice(1)}</span>
                          </div>
                          {selectedCenter && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Center:</span>
                              <span className="font-medium">{selectedCenter}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Symptoms Section */}
                {(consultationData.symptoms && consultationData.symptoms.length > 0) && (
                  <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100">
                    <h2 className="text-xl font-semibold mb-4 text-blue-700 border-b border-blue-100 pb-2">
                      Reported Symptoms
                    </h2>
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                      {consultationData.symptoms.map((symptom, index) => (
                        <div
                          key={index}
                          className="bg-blue-50 p-3 rounded-lg"
                        >
                          <span className="font-medium text-blue-800 block mb-2">
                            {symptom.symptom}
                          </span>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="bg-white p-2 rounded">
                              <span className="text-gray-500 block text-xs">Duration</span>
                              <span className="font-medium">{symptom.duration}</span>
                            </div>
                            <div className="bg-white p-2 rounded">
                              <span className="text-gray-500 block text-xs">Severity</span>
                              <span className="font-medium">{symptom.severity}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Available Slots Section */}
                {appointmentSlots.length > 0 && (
                  <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100">
                    <h2 className="text-xl font-semibold mb-4 text-blue-700 border-b border-blue-100 pb-2 flex items-center">
                      <CalendarIcon className="w-5 h-5 mr-2" />
                      Available Slots
                      {selectedDay && (
                        <span className="text-sm font-normal ml-2 text-gray-500">
                          ({selectedWeek ? selectedWeek + ", " : ""}{selectedDay})
                        </span>
                      )}
                    </h2>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2">
                        {appointmentSlots.map((slot, index) => (
                          <button
                            key={index}
                            className="text-sm bg-white p-2 text-center rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-all duration-200"
                            onClick={() => handleSelectTimeSlot(slot)}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                      <div className="mt-3 text-xs text-gray-500 text-center">
                        Click a slot to select it for your appointment
                      </div>
                    </div>
                  </div>
                )}

                {/* Appointment Details */}
                {(consultationData.appointment && 
                 (consultationData.appointment.date !== "TBD" || 
                  consultationData.appointment.time !== "TBD" || 
                  consultationData.appointment.paymentLink)) && (
                  <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100">
                    <h2 className="text-xl font-semibold mb-4 text-blue-700 border-b border-blue-100 pb-2 flex items-center">
                      <CalendarIcon className="w-5 h-5 mr-2" />
                      Scheduled Consultation
                    </h2>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Type:</span>
                          <span className="font-medium">{consultationData.appointment.type || "In-person"}</span>
                        </div>
                        
                        {consultationData.appointment.doctor && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Doctor:</span>
                            <span className="font-medium">{consultationData.appointment.doctor}</span>
                          </div>
                        )}
                        
                        {consultationData.appointment.location && consultationData.appointment.location !== "TBD" && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Location:</span>
                            <span className="font-medium">{consultationData.appointment.location}</span>
                          </div>
                        )}
                        
                        <div className="flex justify-between">
                          <span className="text-gray-600">Date:</span>
                          <span className="font-medium">{consultationData.appointment.date || "TBD"}</span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-gray-600">Time:</span>
                          <span className="font-medium">{consultationData.appointment.time || "TBD"}</span>
                        </div>
                        
                        {userMobileNumber && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Mobile:</span>
                            <span className="font-medium">{userMobileNumber}</span>
                          </div>
                        )}
                        
                        {consultationData.appointment.bookingId && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Booking ID:</span>
                            <span className="font-medium">{consultationData.appointment.bookingId}</span>
                            </div>
                        )}
                        
                        {consultationData.appointment.status && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Status:</span>
                            <span className={`font-medium ${
                              consultationData.appointment.status === "Confirmed" 
                                ? "text-green-600" 
                                : "text-orange-500"
                            }`}>
                              {consultationData.appointment.status}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Payment Section with Pay Now Button */}
                      <div className="mt-4 pt-4 border-t border-blue-200">
                        <h3 className="font-medium text-blue-600 mb-3 flex items-center">
                          <CreditCardIcon className="w-4 h-4 mr-1" />
                          Payment Details
                        </h3>
                        <p className="text-sm text-gray-600 mb-3">Complete your payment to confirm the appointment:</p>
                        
                        {consultationData.appointment.paymentLink && (
                          <a 
                            href={consultationData.appointment.paymentLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center justify-center w-full bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg transition-colors font-medium"
                          >
                            <CreditCardIcon className="mr-2 w-4 h-4" />
                            Pay Now
                          </a>
                        )}
                        
                        {/* Show alternate payment links */}
                        {!consultationData.appointment.paymentLink && (
                          <a 
                            href={consultationData.appointment.type === "Online" 
                              ? "https://rzp.io/rzp/3AMWZfL" 
                              : "https://rzp.io/rzp/LIWxbP4D"} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center justify-center w-full bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg transition-colors font-medium"
                            >
                              <CreditCardIcon className="mr-2 w-4 h-4" />
                              Pay Now
                            </a>
                          )}
                          
                          <p className="text-xs text-gray-500 mt-3 text-center">
                            Your appointment will be confirmed after payment
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </SearchParamsHandler>
    </>
  );
};

export default Home;