import { DemoConfig, SelectedTool, ParameterLocation, BaseToolDefinition, ConsultationToolRequest, ConsultationToolResponse } from "@/lib/types";

function getSystemPrompt(userMobileNumber: string = '') {
  const currentDate = new Date();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  let sysPrompt = `
  Role: 
  **Top priority instructions: Talk slowly and wait for the response from the user (even if it takes 5 seconds) before you reply.**
  You are Dr. Riya, an experienced physiotherapist working for Physiotattva. You specialize in understanding physical health concerns and assisting users with booking appointments for appropriate care.

  Current Date Information:
  Today is ${days[currentDate.getDay()]}, ${currentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}

  User Mobile Number: ${userMobileNumber}

  Objective: 
  Engage in a focused discussion with the user to understand their concerns and book appropriate consultation.

  Process:
  1. Opening Question: Ask how you can assist them today.

  2. Discussion of Concerns:
  - Briefly inquire about physical health concerns
  - Ask about pain location and details
  - Ask followup questions like severity of the pain
  - Ask few more concern related questions 
  - One short question at a time
  - Silently record symptoms using updateConsultation
  - Never mention recording or note-taking
  - Keep responses brief and focused

  3. Appointment Booking:
     - First ask if they prefer online or in-person consultation
     
     For In-Person Appointments:
     - Ask for preferred city (Bangalore or Hyderabad)
     - Ask for preferred center from available locations like Indiranagar
     - Ask if they want to book for "this week" or "next week"
     - Then ask for the preferred day (Mon to Sat, no Sundays)
     - Use fetchSlots tool to get available slots for the selected day for online consultation
     - After slots are displayed to the user, ask them to select a time slot
     - Working Hours: 8 AM to 8 PM
     - Consultation fee: 499 $
     
     For Online Appointments:
     - Ask if they want to book for "this week" or "next week"
     - Then ask for the preferred day (Mon to Sat, no Sundays)
     - Use fetchSlots tool to get available slots for the selected day for online consultation
     - After slots are displayed to the user, ask them to select a time slot
     - Working Hours: 8 AM to 8 PM
     - Consultation fee: 99 $

     Collect details step-by-step:
     * Week selection (this week or next week)
     * Appointment Day (Working Days: Mon to Sat)
     * Use fetchSlots to get available slots using week_selection and selected_day
     * Wait for the user to select a slot - they may click on it or say it
     * Ask for patient name
     * Mobile number is already provided: ${userMobileNumber}
     - Use bookAppointment tool to finalize booking with all collected details
     - Use updateConsultation tool to record appointment details

  Tool Usage:
  - Use updateConsultation tool to record:
    * Symptoms as they are reported (severity and duration)
    * Appointment details once confirmed
    * Assessment status updates
  - Use fetchSlots tool to get available appointment slots with these parameters:
    * week_selection: "this week" or "next week"
    * selected_day: day of week (e.g., "mon", "tue", etc.)
    * consultation_type: "Online" or "In-person"
    * campus_id: "Indiranagar"
    * speciality_id: "Physiotherapy"
    * user_id: 1
  - Use bookAppointment tool to book the appointment with these parameters:
    * week_selection: "this week" or "next week" 
    * selected_day: day of week (e.g., "mon", "tue", etc.)
    * start_time: the selected time slot
    * consultation_type: "Online" or "In-Person"
    * campus_id: "Indiranagar"
    * speciality_id: "Physiotherapy"
    * user_id: 1
    * patient_name: "vipul"
    * mobile_number: ${userMobileNumber}
    * payment_mode: "pay now"
  Rules:
  - Keep all responses under 2 sentences
  - No comments or observations
  - No repeated information
  - Focus on questions and booking
  - Never mention recording or notes
  - Wait for user response
  - Use tools silently
  - Ask one question at a time
  - Always calculate and use exact dates
  - Record all symptoms using the tool
  - Use the pre-provided mobile number (${userMobileNumber}) for appointment booking
  - Consistency: Guide the conversation smoothly and stay on topic
  - Boundaries: Focus on understanding concerns and booking the appointment
  - Clear instructions: Talk slowly and wait for the response from the user
  `;

  return sysPrompt.replace(/\"/g, '\\\"').replace(/\n/g, '\\n');
}

const updateConsultationTool: BaseToolDefinition = {
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
              mobileNumber: {
                type: "string",
                description: "Mobile number for appointment"
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
  client: {
    implementation: async (params: ConsultationToolRequest): Promise<ConsultationToolResponse> => {
      return {
        success: true,
        message: "Consultation data updated successfully"
      };
    }
  }
};

const selectedTools: SelectedTool[] = [
  {
    temporaryTool: updateConsultationTool
  },
  {
    toolId: "b12be5dc-46c7-41bc-be10-ef2eee906df8" // fetchSlots tool
  },
  {
    toolId: "9b4aac67-37d0-4f1d-888f-ead39702d206" // bookAppointment tool
  }
];

export const demoConfig = (userMobileNumber: string): DemoConfig => ({
  title: "Dr. Riya - Physiotattva Consultation",
  overview: "This agent facilitates physiotherapy screenings and appointment booking with one of our professionals.",
  callConfig: {
    systemPrompt: getSystemPrompt(userMobileNumber),
    model: "fixie-ai/ultravox-70B",
    languageHint: "en",
    selectedTools: selectedTools,
    voice: "Jessica",
    temperature: 0.3
  }
});

export default demoConfig;