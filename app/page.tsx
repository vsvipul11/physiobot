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
import { PhoneOffIcon, ExternalLinkIcon, CalendarIcon } from "lucide-react";
import { CalComService } from "@/lib/calComService";
import MicToggleButton from "./components/MicToggleButton";
import demoConfig from "./demo-config";
import { ConsultationData, Symptom, Appointment } from "@/lib/types";

// Mobile Number popup component
const MobileNumberPopup = ({ onSubmit }) => {
  const [mobileNumber, setMobileNumber] = useState("");
  const [isValid, setIsValid] = useState(false);

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Welcome to Physiotattva Consult</h2>
        <p className="mb-4">Please enter your mobile number to continue:</p>
        <form onSubmit={handleSubmit}>
          <input
            type="tel"
            value={mobileNumber}
            onChange={(e) => setMobileNumber(e.target.value)}
            placeholder="Enter your 10-digit mobile number"
            className="w-full p-2 border border-gray-300 rounded mb-4"
            required
          />
          <button
            type="submit"
            disabled={!isValid}
            className="w-full bg-blue-500 text-white p-2 rounded disabled:bg-gray-300"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
};

// Available Slots popup component
const AvailableSlotsPopup = ({ slots, onSelectSlot, onClose, selectedDay, selectedWeek }) => {
  const displaySlots = Array.isArray(slots) ? slots : 
                       (typeof slots === 'string' ? slots.split(/,\s*/) : []);
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Available Time Slots</h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        {selectedDay && selectedWeek && (
          <p className="mb-2 text-gray-600">
            For {selectedWeek}, {selectedDay}:
          </p>
        )}
        
        {displaySlots.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto mb-4">
            {displaySlots.map((slot, index) => (
              <button
                key={index}
                className="p-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded text-center"
                onClick={() => onSelectSlot(slot)}
              >
                {slot}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-red-500 mb-4">No slots available for the selected day.</p>
        )}
        
        <button
          onClick={onClose}
          className="w-full mt-2 p-2 bg-gray-200 text-gray-700 rounded"
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
        <div className="flex flex-col items-center justify-center">
          <div className="max-w-[1206px] mx-auto w-full py-5 pl-5 pr-[10px] border border-[#2A2A2A] rounded-[3px]">
            Loading...
          </div>
        </div>
      }
    >
      <SearchParamsContent {...props} />
    </Suspense>
  );
};

interface AppointmentData extends Appointment {
  type?: string;
  location?: string;
  mobileNumber?: string;
  paymentLink?: string;
  bookingId?: string;
  doctor?: string;
  startDateTime?: string;
  endDateTime?: string;
  campus?: string;
  status?: string;
}

interface ExtendedConsultation {
  symptoms: Symptom[];
  appointment?: AppointmentData;
  assessmentStatus: string;
}

interface UpcomingAppointment {
  id: number;
  startDateTime: string;
  endDateTime: string;
  doctor: string;
  consultationType: string;
  status: string;
  campus: string;
  patientName: string;
  callerName: string;
}

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
  const [consultationData, setConsultationData] = useState<ExtendedConsultation>({
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
  const [upcomingAppointments, setUpcomingAppointments] = useState<UpcomingAppointment[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);
  
  const transcriptContainerRef = useRef(null);
  const calendarService = useMemo(() => CalComService.getInstance(), []);
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
      
      lastProcessedMessageRef.current = latestMessage;
      setLastUpdateTime(new Date().toLocaleTimeString());

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
          let consultationType = "TBD";
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
          
          // Extract time slots
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
            } catch (e) {
              console.error("Error parsing slots JSON:", e);
            }
          }
        } catch (error) {
          console.error("Error processing fetchSlots data:", error);
        }
      }

      // Check for appointment booking result
      if (latestMessage.includes("bookAppointment")) {
        try {
          const jsonStart = latestMessage.indexOf("{");
          const jsonEnd = latestMessage.lastIndexOf("}") + 1;
          if (jsonStart !== -1 && jsonEnd !== -1) {
            const jsonStr = latestMessage.slice(jsonStart, jsonEnd);
            const data = JSON.parse(jsonStr);
            
            // Check if the result contains a JSON string that needs to be parsed again
            if (data.result && typeof data.result === 'string' && data.result.startsWith('{')) {
              try {
                const resultData = JSON.parse(data.result);
                console.log("Parsed booking result data:", resultData);
                
                if (resultData.success) {
                  // Extract appointment info and payment details
                  const appointmentInfo = resultData.appointmentInfo || {};
                  const payment = resultData.payment || {};
                  
                  // Get doctor name
                  const doctor = appointmentInfo.appointed_doctor || "";
                  
                  // Get payment link
                  const paymentUrl = payment.short_url || "";
                  if (paymentUrl) {
                    setPaymentLink(paymentUrl);
                  }
                  
                  // Get appointment date/time
                  const startDateTime = appointmentInfo.startDateTime || "";
                  
                  // Get consultation type
                  const consultationType = appointmentInfo.consultation_type || "TBD";
                  
                  // Get booking reference
                  const bookingRef = payment.reference_id || "";
                  if (bookingRef) {
                    setBookingId(bookingRef);
                  }
                  
                  // Update consultation data
                  setConsultationData(prev => ({
                    ...prev,
                    appointment: {
                      ...prev.appointment,
                      type: consultationType,
                      doctor: doctor,
                      startDateTime: startDateTime,
                      date: startDateTime ? startDateTime.split(' ')[0] : prev.appointment?.date || "TBD",
                      time: startDateTime ? startDateTime.split(' ')[1].substring(0, 5) : prev.appointment?.time || "TBD",
                      paymentLink: paymentUrl || prev.appointment?.paymentLink || "",
                      bookingId: bookingRef || prev.appointment?.bookingId || "",
                      mobileNumber: userMobileNumber
                    }
                  }));
                  
                  // Refresh upcoming appointments
                  setTimeout(() => {
                    fetchUpcomingAppointments(userMobileNumber);
                  }, 2000);
                }
              } catch (e) {
                console.error("Error parsing result data:", e);
              }
            } else if (data.success) {
              // Direct success response
              if (data.paymentLink) {
                setPaymentLink(data.paymentLink);
              }
              if (data.appointmentId) {
                setBookingId(data.appointmentId);
              }
              
              // Update consultation data with payment info
              setConsultationData(prev => ({
                ...prev,
                appointment: {
                  ...prev.appointment,
                  paymentLink: data.paymentLink || "",
                  bookingId: data.appointmentId || ""
                }
              }));
              
              // Refresh upcoming appointments
              setTimeout(() => {
                fetchUpcomingAppointments(userMobileNumber);
              }, 2000);
            }
          }
        } catch (error) {
          console.error("Error parsing booking data:", error);
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
                  location: parsedData.appointment.location || prevData.appointment?.location || "TBD",
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
  }, [callDebugMessages, userMobileNumber, paymentLink, bookingId]);

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

  return (
    <>
      {showMobilePopup && <MobileNumberPopup onSubmit={handleMobileNumberSubmit} />}
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
          <div className="flex flex-col items-center justify-center">
            <div className="max-w-[1206px] mx-auto w-full py-5 pl-5 pr-[10px] border border-[#2A2A2A] rounded-[3px]">
              <div className="flex flex-col justify-center lg:flex-row">
                <div className="w-full lg:w-2/3">
                  <h1 className="text-2xl font-bold w-full">
                    {demoConfigRef.current?.title || "Dr. Riya - Your Physiotherapy Expert"}
                  </h1>
                  <div className="flex flex-col justify-between items-start h-full font-mono p-4">
                    {isCallActive ? (
                      <div className="w-full">
                        <div className="flex justify-between space-x-4 p-4 w-full">
                          <MicToggleButton role={Role.USER} />
                          {showMuteSpeakerButton && (
                            <MicToggleButton role={Role.AGENT} />
                          )}
                          <button
                            type="button"
                            className="flex-grow flex items-center justify-center h-10 bg-red-500 text-white"
                            onClick={handleEndCallButtonClick}
                            disabled={!isCallActive}
                          >
                            <PhoneOffIcon width={24} className="brightness-0 invert" />
                            <span className="ml-2">End Call</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full">
                        <div className="h-[300px] p-2.5 overflow-y-auto relative bg-white" ref={transcriptContainerRef}>
                          {callDebugMessages.map((msg, index) => {
                            const message = msg.message.message;
                            // Only display normal conversation messages, filter out technical details
                            if (!message.includes("Tool calls:") && 
                                !message.includes("FunctionCall") && 
                                !message.includes("invocation_id") &&
                                !message.includes("args=") &&
                                !message.includes("consultationData") &&
                                !message.includes("fetchSlots") &&
                                !message.includes("bookAppointment")) {
                              return (
                                <div key={index} className="text-sm text-gray-600 py-2 font-mono">
                                  {message.replace("LLM response:", "Dr. Riya:")}
                                </div>
                              );
                            }
                            return null;
                          })}
                        </div>
                        <button
                          type="button"
                          className="w-full mt-4 h-10 bg-blue-500 text-white disabled:bg-gray-400"
                          onClick={() =>
                            handleStartCallButtonClick(
                              modelOverride,
                              showDebugMessages
                            )
                          }
                          disabled={isCallStarting || !userMobileNumber}
                        >
                          {isCallStarting ? "Starting Call..." : "Start Call"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="w-[300px] ml-4">
                  <div className="border border-gray-200 rounded p-4 sticky top-4">
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-xl font-semibold mb-2">Call Status</h2>
                        <p className="text-gray-500">Status: {getCallStatus()}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Last update: {lastUpdateTime || "Not started"}
                        </p>
                      </div>

                      {/* Upcoming Appointments Section */}
                      {upcomingAppointments.length > 0 && (
                        <div>
                          <h2 className="text-xl font-semibold border-b border-blue-500 pb-1 mb-4">
                            <div className="flex items-center">
                              <CalendarIcon className="mr-2" size={20} />
                              Upcoming Appointments
                            </div>
                          </h2>
                          <div className="space-y-3">
                            {upcomingAppointments.map((appointment, index) => (
                              <div key={index} className="bg-blue-50 p-3 rounded">
                                <div className="font-medium text-blue-800">
                                  {appointment.doctor}
                                </div>
                                <div className="text-sm text-gray-700 mt-1">
                                  <div><strong>Date:</strong> {formatDate(appointment.startDateTime)}</div>
                                  <div><strong>Type:</strong> {appointment.consultationType}</div>
                                  {appointment.campus && (
                                    <div><strong>Location:</strong> {appointment.campus}</div>
                                  )}
                                  <div><strong>Status:</strong> {appointment.status}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {isLoadingAppointments && (
                        <div className="text-center py-3">
                          <p className="text-gray-500">Loading appointments...</p>
                        </div>
                      )}

                      <div>
                        <h2 className="text-xl font-semibold border-b border-red-500 pb-1 mb-4">
                          Consultation Notes
                        </h2>

                        <div className="space-y-4">
                          <div>
                            <h3 className="text-red-500 font-medium">
                              Assessment Status
                            </h3>
                            <p className="bg-red-50 p-2 mt-1">
                              {consultationData.assessmentStatus}
                            </p>
                          </div>

                          <div>
                            <h3 className="text-red-500 font-medium">
                              Reported Symptoms
                            </h3>
                            <div className="mt-2 space-y-3">
                              {consultationData.symptoms &&
                              consultationData.symptoms.length > 0 ? (
                                consultationData.symptoms.map((symptom, index) => (
                                  <div
                                    key={index}
                                    className="bg-red-50 p-3 rounded"
                                  >
                                    <span className="font-medium text-gray-900">
                                      {symptom.symptom}
                                    </span>
                                    <div className="mt-1 text-sm text-gray-600">
                                      <div>Duration: {symptom.duration}</div>
                                      <div>Severity: {symptom.severity}</div>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-gray-500 italic">
                                  No symptoms reported yet
                                </p>
                              )}
                            </div>
                          </div>

                          {appointmentSlots.length > 0 && (
                            <div className="mt-4">
                              <h3 className="text-red-500 font-medium mb-2">
                                Available Slots
                                {selectedDay && (
                                  <span className="text-sm font-normal ml-2">
                                    ({selectedWeek ? selectedWeek + ", " : ""}{selectedDay})
                                  </span>
                                )}
                              </h3>
                              <div className="bg-red-50 p-3 rounded max-h-48 overflow-y-auto">
                                <div className="grid grid-cols-2 gap-2">
                                  {appointmentSlots.map((slot, index) => (
                                    <button
                                      key={index}
                                      className="text-sm bg-white p-1 text-center rounded hover:bg-blue-50 transition-colors"
                                      onClick={() => handleSelectTimeSlot(slot)}
                                    >
                                      {slot}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div className="mt-2 text-xs text-gray-500">
                                Click a slot to select it for your appointment
                              </div>
                            </div>
                          )}

                          {(consultationData.appointment && 
                           (consultationData.appointment.date !== "TBD" || 
                            consultationData.appointment.time !== "TBD" || 
                            consultationData.appointment.paymentLink)) && (
                            <div className="mt-4">
                              <h3 className="text-red-500 font-medium mb-2">
                                Scheduled Consultation
                              </h3>
                              <div className="bg-red-50 p-3 rounded">
                                <div className="text-gray-600">
                                  <div>
                                    <span className="font-medium">Type: </span>
                                    {consultationData.appointment.type || "TBD"}
                                  </div>
                                  {consultationData.appointment.doctor && (
                                    <div>
                                      <span className="font-medium">Doctor: </span>
                                      {consultationData.appointment.doctor}
                                    </div>
                                  )}
                                  {consultationData.appointment.location && consultationData.appointment.location !== "TBD" && (
                                    <div>
                                      <span className="font-medium">Location: </span>
                                      {consultationData.appointment.location}
                                    </div>
                                  )}
                                  <div>
                                    <span className="font-medium">Date: </span>
                                    {consultationData.appointment.startDateTime ? 
                                      formatDate(consultationData.appointment.startDateTime) :
                                      (consultationData.appointment.date === "TBD"
                                        ? "To be decided"
                                        : selectedDay || consultationData.appointment.date)
                                    }
                                  </div>
                                  <div>
                                    <span className="font-medium">Time: </span>
                                    {consultationData.appointment.time === "TBD"
                                      ? "To be decided"
                                      : consultationData.appointment.time}
                                  </div>
                                  {userMobileNumber && (
                                    <div>
                                      <span className="font-medium">Mobile: </span>
                                      {userMobileNumber}
                                    </div>
                                  )}
                                  {consultationData.appointment.bookingId && (
                                    <div>
                                      <span className="font-medium">Booking ID: </span>
                                      {consultationData.appointment.bookingId}
                                    </div>
                                  )}
                                  {consultationData.appointment.paymentLink && (
                                    <div className="mt-3">
                                      <a 
                                        href={consultationData.appointment.paymentLink} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 transition-colors"
                                      >
                                        <span>Complete Payment</span>
                                        <ExternalLinkIcon className="ml-2" size={16} />
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
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