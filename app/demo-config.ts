import { DemoConfig, ParameterLocation, SelectedTool } from "@/lib/types";

function getSystemPrompt() {
  const currentDate = new Date();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  let sysPrompt = `
  # Role: Dr. Riya - Physiotherapist
  You are Dr. Riya, an experienced physiotherapist at Physiotattva. You're here to help patients understand their physical health concerns and book appropriate appointments.

  # Current Date Information:
  Today is ${days[currentDate.getDay()]}, ${currentDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}

  # Key Rules:
  - Talk slowly and wait for user responses
  - Ask only ONE question at a time
  - Keep responses under 2 sentences
  - Never mention recording notes

  # Conversation Flow:
  1. Initial Greeting
     - Introduce yourself as Dr. Riya from Physiotattva
     - Ask how you can help

  2. Patient Information Collection (Early in conversation)
     - Get patient's name (required)
     - Get phone number (required)
     - Store this information for later booking

  3. Symptom Assessment
     - Ask about pain location
     - Ask about pain duration
     - Ask about pain severity (1-10)
     - Ask if pain is constant or intermittent
     - Ask if movement affects pain
     - Record symptoms silently using updateAssessment tool

  4. Appointment Booking
     - Ask if they prefer online or in-person consultation
     
     For In-Person:
     - Ask preferred city (Bangalore or Hyderabad)
     - Ask preferred center
     - Call fetchSlots tool with appropriate parameters
     
     For Online:
     - Call fetchSlots tool with consultation_type="Online"
     
     Then:
     - Ask for preferred day (Mon-Sat)
     - Present available time slots
     - Mention consultation fee (In-person: 499 $, Online: 99 $)
     - Call bookAppointment tool when selection is complete

  # Tool Usage:
  - updateAssessment: Record symptoms and patient details
  - fetchSlots: Retrieve available appointment slots for selected day
  - bookAppointment: Book the final appointment with all details

  # Important Parameters:
  - speciality_id should always be "Physiotherapist"
  - user_id should always be 1
  - Default campus_id is "Indiranagar" if not specified
  `;

  return sysPrompt.replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

const selectedTools: SelectedTool[] = [
  {
    // Assessment data tracking tool
    temporaryTool: {
      modelToolName: "updateAssessment",
      description: "Update assessment data including patient details and symptoms",
      dynamicParameters: [
        {
          name: "assessmentData",
          location: ParameterLocation.BODY,
          schema: {
            type: "object",
            properties: {
              patientName: {
                type: "string",
                description: "Name of the patient"
              },
              phoneNumber: {
                type: "string",
                description: "Phone number of the patient"
              },
              symptoms: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    location: {
                      type: "string",
                      description: "Location of pain or symptom"
                    },
                    duration: {
                      type: "string",
                      description: "How long the symptom has been present"
                    },
                    severity: {
                      type: "string",
                      description: "Pain severity on scale of 1-10"
                    },
                    nature: {
                      type: "string",
                      description: "Whether pain is constant or intermittent"
                    },
                    triggers: {
                      type: "string",
                      description: "What makes symptoms better or worse"
                    }
                  }
                }
              },
              assessmentStatus: {
                type: "string",
                description: "Current status of the assessment"
              }
            },
            required: ["assessmentStatus"]
          },
          required: true
        }
      ],
      client: {}
    }
  },
  {
    // Matching the format from the example you shared
    temporaryTool: {
      modelToolName: "updateConsultation",
      description: "Update consultation details including symptoms and appointment information",
      dynamicParameters: [
        {
          name: "consultationData",
          location: ParameterLocation.BODY,
          schema: {
            type: "object",
            properties: {
              symptoms: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    symptom: {
                      type: "string",
                      description: "Name of the reported symptom"
                    },
                    severity: {
                      type: "string",
                      description: "Severity level of the symptom"
                    },
                    duration: {
                      type: "string",
                      description: "Duration of the symptom"
                    }
                  }
                }
              },
              appointment: {
                type: "object",
                properties: {
                  type: {
                    type: "string",
                    description: "Type of appointment (online/in-person)"
                  },
                  location: {
                    type: "string",
                    description: "Center location for in-person appointments"
                  },
                  date: {
                    type: "string",
                    description: "Appointment date in YYYY-MM-DD format"
                  },
                  time: {
                    type: "string",
                    description: "Appointment time in HH:mm format"
                  },
                  email: {
                    type: "string",
                    description: "Email address for calendar invite"
                  }
                }
              },
              assessmentStatus: {
                type: "string",
                description: "Current status of the assessment"
              }
            },
            required: ["symptoms", "assessmentStatus"]
          },
          required: true
        }
      ],
      client: {}
    }
  },
  {
    // Fetch slots tool
    toolId: "b12be5dc-46c7-41bc-be10-ef2eee906df8",
    parameterOverrides: {
      "user_id": 1,
      "speciality_id": "Physiotherapist"
    }
  },
  {
    // Book appointment tool
    toolId: "9b4aac67-37d0-4f1d-888f-ead39702d206",
    parameterOverrides: {
      "user_id": 1,
      "speciality_id": "Physiotherapist"
    }
  }
];

export const demoConfig: DemoConfig = {
  title: "Dr. Riya - Physiotattva Consultation",
  overview: "This agent helps patients describe their physical health concerns and book appropriate physiotherapy appointments.",
  callConfig: {
    systemPrompt: getSystemPrompt(),
    model: "fixie-ai/ultravox-70B",
    languageHint: "en",
    selectedTools: selectedTools,
    voice: "Monika-English-Indian",
    temperature: 0.3
  }
};

export default demoConfig;
