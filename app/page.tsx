'use client';

import React, { useState, useCallback, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { startCall, endCall, toggleMute } from '@/lib/callFunctions';
import { Role, Transcript, UltravoxExperimentalMessageEvent } from 'ultravox-client';
import { PhoneOffIcon } from 'lucide-react';
import MicToggleButton from './components/MicToggleButton';
import ConsultationNotes from './components/ConsultationNotes';
import PatientInfoModal from './components/PatientInfoModal';
import SlotsModal from './components/SlotsModal';
import demoConfig from './demo-config';
import AssessmentPanel from './components/AssessmentPanel';

type SearchParamsProps = {
  showMuteSpeakerButton: boolean;
  modelOverride: string | undefined;
  showDebugMessages: boolean;
  showUserTranscripts: boolean;
};

const SearchParamsHandler = ({ children }: { children: (props: SearchParamsProps) => React.ReactNode }) => {
  // Process query params to see if we want to change the behavior for showing speaker mute button or changing the model
  const searchParams = useSearchParams();
  const showMuteSpeakerButton = searchParams.get('showSpeakerMute') === 'true';
  const showDebugMessages = searchParams.get('showDebugMessages') === 'true';
  const showUserTranscripts = searchParams.get('showUserTranscripts') === 'true';
  let modelOverride: string | undefined;
  
  if (searchParams.get('model')) {
    modelOverride = "fixie-ai/" + searchParams.get('model');
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      {children({ showMuteSpeakerButton, modelOverride, showDebugMessages, showUserTranscripts })}
    </Suspense>
  );
};

const Home = () => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isCallStarting, setIsCallStarting] = useState(false);
  const [agentStatus, setAgentStatus] = useState<string>('off');
  const [callTranscript, setCallTranscript] = useState<Transcript[] | null>([]);
  const [callDebugMessages, setCallDebugMessages] = useState<UltravoxExperimentalMessageEvent[]>([]);
  const [patientName, setPatientName] = useState<string>('');
  const [patientPhone, setPatientPhone] = useState<string>('');
  const [showPatientInfoModal, setShowPatientInfoModal] = useState(false);
  const [showSlotsModal, setShowSlotsModal] = useState(false);
  const [selectedSlotTime, setSelectedSlotTime] = useState<string | null>(null);
  
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (transcriptContainerRef.current) {
      transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
    }
  }, [callTranscript]);

  useEffect(() => {
    const handleSlotsFetched = () => {
      setShowSlotsModal(true);
    };

    const handleConsultationUpdate = (event: CustomEvent) => {
      console.log('Consultation data updated:', event.detail);
      
      // Directly use the event.detail data which should exactly match the format we need
      setConsultationData(prevData => {
        const newData = {
          ...prevData,
          ...event.detail
        };
        
        // Ensure symptoms is always an array
        if (!Array.isArray(newData.symptoms)) {
          newData.symptoms = [];
        }
        
        // Ensure appointment has the right structure
        if (!newData.appointment) {
          newData.appointment = {
            date: "To be decided",
            time: "To be decided",
           
          };
        }
        
       
        
        return newData;
      });
      
      setLastUpdateTime(new Date().toLocaleTimeString());
    };

    window.addEventListener('slotsFetched', handleSlotsFetched);
    window.addEventListener('consultationUpdated', handleConsultationUpdate as EventListener);
    
    return () => {
      window.removeEventListener('slotsFetched', handleSlotsFetched);
      window.removeEventListener('consultationUpdated', handleConsultationUpdate as EventListener);
    };
  }, []);

  const handlePatientInfoSubmit = (name: string, phone: string) => {
    console.log("Patient info received:", name, phone);
    setPatientName(name);
    setPatientPhone(phone);
    setShowPatientInfoModal(false);
    
    // Once we have patient info, we can start the call
    // Use a slight delay to ensure state updates have completed
    setTimeout(() => {
      console.log("Starting call with patient info:", name, phone);
      handleStartCallButtonClick();
    }, 100);
  };

  const handleSlotSelect = (slot: string) => {
    setSelectedSlotTime(slot);
    
    // Inform the AI agent about the selected slot
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('slotSelected', {
        detail: { slot }
      });
      window.dispatchEvent(event);
    }
  };

  const handleStatusChange = useCallback((status: string | undefined) => {
    if (status) {
      setAgentStatus(status);
    } else {
      setAgentStatus('off');
    }
  }, []);

  const handleTranscriptChange = useCallback((transcripts: Transcript[] | undefined) => {
    if (transcripts) {
      setCallTranscript([...transcripts]);
    }
  }, []);

  const handleDebugMessage = useCallback((debugMessage: UltravoxExperimentalMessageEvent) => {
    setCallDebugMessages(prevMessages => [...prevMessages, debugMessage]);
  }, []);

  const handleStartCallButtonClick = async (modelOverride?: string, showDebugMessages?: boolean) => {
    try {
      setIsCallStarting(true);
      handleStatusChange('Starting call...');
      setCallTranscript(null);
      setCallDebugMessages([]);

      // Setup our call config
      let callConfig = {
        systemPrompt: demoConfig.callConfig.systemPrompt + `\n\nPatient name: ${patientName}\nPatient phone: ${patientPhone}`,
        model: modelOverride || demoConfig.callConfig.model,
        languageHint: demoConfig.callConfig.languageHint,
        voice: demoConfig.callConfig.voice,
        temperature: demoConfig.callConfig.temperature,
        selectedTools: demoConfig.callConfig.selectedTools.map(tool => {
          // If this is the updateAssessment tool, set parameter overrides for patient info
          if (tool.temporaryTool?.modelToolName === "updateAssessment") {
            return {
              ...tool,
              parameterOverrides: {
                assessmentData: {
                  patientName: patientName,
                  phoneNumber: patientPhone,
                  assessmentStatus: "Started",
                  symptoms: []
                }
              }
            };
          }
          return tool;
        })
      };

      await startCall({
        onStatusChange: handleStatusChange,
        onTranscriptChange: handleTranscriptChange,
        onDebugMessage: handleDebugMessage
      }, callConfig, showDebugMessages);

      setIsCallActive(true);
      handleStatusChange('Call started successfully');
    } catch (error) {
      handleStatusChange(`Error starting call: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsCallStarting(false);
    }
  };

  const handleEndCallButtonClick = async () => {
    try {
      handleStatusChange('Ending call...');
      await endCall();
      setIsCallActive(false);
      handleStatusChange('Call ended successfully');
    } catch (error) {
      handleStatusChange(`Error ending call: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const initiateCallProcess = () => {
    // Show patient info modal before starting the call
    setShowPatientInfoModal(true);
  };
  
  return (
    <div className="flex flex-col items-center justify-center">
      {showPatientInfoModal && <PatientInfoModal onSubmit={handlePatientInfoSubmit} />}
      {showSlotsModal && <SlotsModal onClose={() => setShowSlotsModal(false)} onSelectSlot={handleSlotSelect} />}
      
      <SearchParamsHandler>
        {({ showMuteSpeakerButton, modelOverride, showDebugMessages, showUserTranscripts }: SearchParamsProps) => (
          <div className="max-w-[1206px] mx-auto w-full py-5 pl-5 pr-[10px] border border-[#2A2A2A] rounded-[3px]">
            <div className="flex flex-col justify-center lg:flex-row ">
              {/* Action Area */}
              <div className="w-full lg:w-2/3">
                <h1 className="text-2xl font-bold w-full">{demoConfig.title}</h1>
                <div className="flex flex-col justify-between items-start h-full font-mono p-4 ">
                  {isCallActive ? (
                    <div className="w-full">
                      <div className="mb-5 relative">
                        <div 
                          ref={transcriptContainerRef}
                          className="h-[300px] p-2.5 overflow-y-auto relative"
                        >
                          {callTranscript && callTranscript.map((transcript, index) => (
                            <div key={index}>
                              {showUserTranscripts ? (
                                <>
                                  <p><span className="text-gray-600">{transcript.speaker === 'agent' ? "Dr. Riya" : "You"}</span></p>
                                  <p className="mb-4"><span>{transcript.text}</span></p>
                                </>
                              ) : (
                                transcript.speaker === 'agent' && (
                                  <>
                                    <p><span className="text-gray-600">{transcript.speaker === 'agent' ? "Dr. Riya" : "You"}</span></p>
                                    <p className="mb-4"><span>{transcript.text}</span></p>
                                  </>
                                )
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-t from-transparent to-black pointer-events-none" />
                      </div>
                      <div className="flex justify-between space-x-4 p-4 w-full">
                        <MicToggleButton role={Role.USER}/>
                        {showMuteSpeakerButton && <MicToggleButton role={Role.AGENT}/>}
                        <button
                          type="button"
                          className="flex-grow flex items-center justify-center h-10 bg-red-500"
                          onClick={handleEndCallButtonClick}
                          disabled={!isCallActive}
                        >
                          <PhoneOffIcon width={24} className="brightness-0 invert" />
                          <span className="ml-2">End Call</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="h-[300px] text-gray-400 mb-6 mt-32 lg:mt-0">
                        {demoConfig.overview}
                        {patientName && (
                          <div className="mt-4 p-3 border border-gray-700 rounded">
                            <p>Welcome, {patientName}!</p>
                            <p>Ready to speak with Dr. Riya about your health concerns?</p>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        className="hover:bg-gray-700 px-6 py-2 border-2 w-full mb-4"
                        onClick={initiateCallProcess}
                        disabled={isCallStarting}
                      >
                        {isCallStarting ? 'Starting Call...' : 'Start Consultation'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Status & Information Panel */}
              <div className="w-full lg:w-1/3 lg:pl-4">
                <div className="flex flex-col space-y-4">
                  <div className="border border-gray-200 rounded p-4">
                    <h2 className="text-xl font-semibold mb-2">Call Status</h2>
                    <p className="text-gray-500">{agentStatus === 'Call started successfully' ? 'Connected with Dr. Riya' : agentStatus}</p>
                  </div>
                  
                  <AssessmentPanel />
                  
                </div>
              </div>
            </div>
          </div>
        )}
      </SearchParamsHandler>
    </div>
  );
};

export default Home;
