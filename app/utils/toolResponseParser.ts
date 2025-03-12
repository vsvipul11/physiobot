/**
 * Utility functions to parse and extract data from AI tool responses
 */

export interface AppointmentDataResponse {
    doctorName: string;
    startDateTime: string;
    calculatedDate: string;
    consultationType: string;
    consultationTypeId: string | number;
    leadId: string | number;
    paymentMode: string;
    location?: string;
  }
  
  export interface PaymentDataResponse {
    shortUrl: string;
    referenceId: string;
    paymentData: Record<string, any>;
  }
  
  export interface ParsedAppointmentResponse {
    success: boolean;
    appointment: AppointmentDataResponse;
    payment: PaymentDataResponse;
  }
  
  /**
   * Parses a bookAppointment tool response message and extracts all relevant data
   * @param {string} message - The raw message containing the tool response
   * @returns {Object|null} - Structured appointment data or null if parsing fails
   */
  export const parseBookAppointmentResponse = (message: string): ParsedAppointmentResponse | null => {
    try {
      if (!message.includes("bookAppointment")) {
        return null;
      }
      
      // Try different regex patterns to find the JSON response
      const patterns = [
        /\{[\s\S]*"success"[\s\S]*\}/,           // General pattern for success JSON
        /\{[\s\S]*"appointmentInfo"[\s\S]*\}/,   // Pattern focusing on appointmentInfo
        /Tool Result[\s\S]*?(\{[\s\S]*\})/,      // Pattern looking for Tool Result marker
        /`({[\s\S]*?})`/                         // JSON inside backticks
      ];
      
      let jsonData: any = null;
      let jsonString: string | null = null;
      
      // Try each pattern until we find a valid JSON
      for (const pattern of patterns) {
        const match = message.match(pattern);
        if (match) {
          try {
            // Get the matched JSON string
            jsonString = match[0];
            
            // If the pattern includes capture groups, use the first captured group
            if (match.length > 1 && match[1]) {
              jsonString = match[1];
            }
            
            // Remove backticks if present
            jsonString = jsonString.replace(/^`|`$/g, '');
            
            // Try to parse the matched string as JSON
            const parsed = JSON.parse(jsonString);
            if (parsed && (parsed.success !== undefined || parsed.appointmentInfo)) {
              jsonData = parsed;
              break;
            }
          } catch (e) {
            console.log("Failed parsing with pattern:", pattern);
            // Continue to next pattern
          }
        }
      }
      
      // If we have valid JSON data, extract the appointment information
      if (jsonData && (jsonData.success || jsonData.appointmentInfo)) {
        const appointmentInfo = jsonData.appointmentInfo || {};
        const payment = jsonData.payment || {};
        
        return {
          success: true,
          appointment: {
            doctorName: appointmentInfo.appointed_doctor || "TBD",
            startDateTime: appointmentInfo.startDateTime || "",
            calculatedDate: appointmentInfo.calculated_date || "",
            consultationType: appointmentInfo.consultation_type || "TBD",
            consultationTypeId: appointmentInfo.consultation_type_id || "",
            leadId: appointmentInfo.lead_id || "",
            paymentMode: appointmentInfo.payment_mode || "online"
          },
          payment: {
            shortUrl: payment.short_url || "",
            referenceId: payment.reference_id || "",
            paymentData: payment.paymentData || {}
          }
        };
      }
      
      return null;
    } catch (error) {
      console.error("Error parsing bookAppointment response:", error);
      return null;
    }
  };
  
  /**
   * Formats a date-time string into a readable format
   * @param {string} dateTimeStr - The date-time string to format
   * @returns {string} - Formatted date-time string
   */
  export const formatDateTime = (dateTimeStr: string): string => {
    if (!dateTimeStr || dateTimeStr === "TBD") {
      return "TBD";
    }
    
    try {
      const date = new Date(dateTimeStr);
      if (isNaN(date.getTime())) {
        // If date is invalid, try to extract parts from the string
        const parts = dateTimeStr.split(' ');
        if (parts.length >= 2) {
          // Just return the original string if we can't parse it
          return dateTimeStr;
        }
        return "TBD";
      }
      
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
  
  /**
   * Extracts just the time part from a date-time string
   * @param {string} dateTimeStr - The date-time string
   * @returns {string} - Just the time portion
   */
  export const extractTimeFromDateTime = (dateTimeStr: string): string => {
    if (!dateTimeStr || dateTimeStr === "TBD") {
      return "TBD";
    }
    
    try {
      const date = new Date(dateTimeStr);
      if (isNaN(date.getTime())) {
        // Try to extract time portion if date parsing fails
        const parts = dateTimeStr.split(' ');
        if (parts.length >= 2) {
          return parts[1]; // This might contain the time portion
        }
        return "TBD";
      }
      
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      });
    } catch (error) {
      console.error("Error extracting time:", error);
      return "TBD";
    }
  };