import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getSettings, updateSettings, generateWebhookSecret } from "@/lib/settings";
import { prisma } from "@/lib/prisma";
import CopyButton from "./CopyButton";
import { Link2, AlertTriangle, Settings, ClipboardList, ScrollText, Map, CheckCircle2 } from "lucide-react";

async function toggleGoogleForms(formData: FormData) {
  "use server";
  await requireRole("ADMIN");
  
  const enabled = formData.get("enabled") === "true";
  
  await updateSettings({
    googleFormsEnabled: enabled,
  });
  
  revalidatePath("/admin/integrations/google-forms");
}

async function updateGoogleFormsSettings(formData: FormData) {
  "use server";
  await requireRole("ADMIN");
  
  const googleFormsUrl = formData.get("googleFormsUrl")?.toString().trim() || null;
  const googleFormsAutoApprove = formData.get("googleFormsAutoApprove") === "on";
  
  await updateSettings({
    googleFormsUrl,
    googleFormsAutoApprove,
  });
  
  revalidatePath("/admin/integrations/google-forms");
  redirect("/admin/integrations/google-forms?saved=true");
}

async function regenerateSecret() {
  "use server";
  await requireRole("ADMIN");
  
  const newSecret = generateWebhookSecret();
  
  await updateSettings({
    googleFormsWebhookSecret: newSecret,
  });
  
  revalidatePath("/admin/integrations/google-forms");
}

export default async function GoogleFormsIntegrationPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireRole("ADMIN");
  const resolvedParams = await searchParams;
  const settings = await getSettings();
  
  // Get recent registrations from Google Forms
  const recentRegistrations = await prisma.student.findMany({
    where: {
      notes: { contains: "Google Form" },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      name: true,
      createdAt: true,
    },
  });
  
  // Generate webhook URL
  const webhookUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/webhooks/google-forms`;
  
  // Ensure there's a webhook secret (generate inline without revalidatePath)
  let webhookSecret = settings.googleFormsWebhookSecret;
  if (!webhookSecret) {
    webhookSecret = generateWebhookSecret();
    await updateSettings({
      googleFormsWebhookSecret: webhookSecret,
    });
  }

  // Apps Script code template
  const appsScriptCode = `/**
 * Google Apps Script for Steward VBS Integration
 * 
 * This script sends form submissions to your Steward VBS webhook.
 * 
 * Setup Instructions:
 * 1. Open your Google Form
 * 2. Click the three dots menu → Script editor
 * 3. Delete any existing code and paste this entire script
 * 4. Update the WEBHOOK_URL and WEBHOOK_SECRET below
 * 5. Click "Save" (Ctrl+S or Cmd+S)
 * 6. Run the "createTrigger" function once to set up the trigger
 * 7. Grant permissions when prompted
 */

// ============ CONFIGURATION ============
// Update these values from your Steward VBS admin settings
const WEBHOOK_URL = "${webhookUrl}";
const WEBHOOK_SECRET = "${webhookSecret || "YOUR_SECRET_HERE"}";
// ========================================

/**
 * Run this function ONCE to create the form submit trigger
 */
function createTrigger() {
  // Remove existing triggers first
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'onFormSubmit') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new trigger
  ScriptApp.newTrigger('onFormSubmit')
    .forForm(FormApp.getActiveForm())
    .onFormSubmit()
    .create();
    
  Logger.log('Trigger created successfully!');
}

/**
 * This function runs automatically when a form is submitted
 */
function onFormSubmit(e) {
  try {
    const responses = e.response.getItemResponses();
    const formData = {};
    
    // Map form responses to expected fields
    responses.forEach(response => {
      const title = response.getItem().getTitle().toLowerCase();
      const value = response.getResponse();
      
      // Map common field names
      if (title.includes('student') && title.includes('name')) {
        formData.studentName = value;
      } else if (title.includes('parent') && title.includes('name')) {
        formData.parentName = value;
      } else if (title.includes('parent') && title.includes('email')) {
        formData.parentEmail = value;
      } else if (title.includes('parent') && title.includes('phone')) {
        formData.parentPhone = value;
      } else if (title.includes('birth') || title.includes('dob')) {
        formData.dateOfBirth = value;
      } else if (title.includes('grade')) {
        formData.grade = value;
      } else if (title.includes('size') || title.includes('shirt')) {
        formData.size = value;
      } else if (title.includes('category') || title.includes('group') || title.includes('class')) {
        formData.category = value;
      } else if (title.includes('emergency') && title.includes('name')) {
        formData.emergencyContactName = value;
      } else if (title.includes('emergency') && title.includes('phone')) {
        formData.emergencyContactPhone = value;
      } else if (title.includes('emergency') && title.includes('relation')) {
        formData.emergencyContactRelationship = value;
      } else if (title.includes('allerg')) {
        formData.allergies = value;
      } else if (title.includes('medical')) {
        formData.medicalNotes = value;
      } else if (title.includes('note') || title.includes('comment')) {
        formData.notes = value;
      }
    });
    
    // Add timestamp
    formData.timestamp = new Date().toISOString();
    
    // Validate required field
    if (!formData.studentName) {
      Logger.log('Error: Student name is required');
      return;
    }
    
    // Send to webhook
    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'x-webhook-secret': WEBHOOK_SECRET
      },
      payload: JSON.stringify(formData),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(WEBHOOK_URL, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();
    
    if (responseCode === 200) {
      Logger.log('Success: ' + responseBody);
    } else {
      Logger.log('Error (' + responseCode + '): ' + responseBody);
    }
    
  } catch (error) {
    Logger.log('Error: ' + error.toString());
  }
}

/**
 * Test function - manually test the webhook connection
 */
function testWebhook() {
  const testData = {
    studentName: "Test Student",
    parentName: "Test Parent",
    parentEmail: "test@example.com",
    timestamp: new Date().toISOString()
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-webhook-secret': WEBHOOK_SECRET
    },
    payload: JSON.stringify(testData),
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(WEBHOOK_URL, options);
  Logger.log('Response: ' + response.getContentText());
}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="text-gray-500 hover:text-gray-700"
            >
              Admin
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900">Google Forms Integration</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            Google Forms Integration
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Allow parents to register students via a Google Form
          </p>
        </div>
      </div>

      {resolvedParams.saved && (
        <div className="rounded-md bg-green-50 p-4">
          <p className="flex items-center gap-1 text-sm text-green-800"><CheckCircle2 className="h-4 w-4" /> Settings saved successfully!</p>
        </div>
      )}

      {/* Enable/Disable Toggle */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Integration Status
            </h3>
            <p className="text-sm text-gray-600">
              {settings.googleFormsEnabled
                ? "Google Forms integration is active"
                : "Enable to start receiving registrations from Google Forms"}
            </p>
          </div>
          <form action={toggleGoogleForms}>
            <input
              type="hidden"
              name="enabled"
              value={settings.googleFormsEnabled ? "false" : "true"}
            />
            <button
              type="submit"
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                settings.googleFormsEnabled ? "bg-green-500" : "bg-gray-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  settings.googleFormsEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </form>
        </div>
      </div>

      {settings.googleFormsEnabled && (
        <>
          {/* Webhook Configuration */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
              <Link2 className="h-4 w-4" /> Webhook Configuration
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Webhook URL
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <input
                    type="text"
                    readOnly
                    value={webhookUrl}
                    className="block w-full rounded-l-md border-gray-300 bg-gray-50 px-3 py-2 text-sm"
                  />
                  <CopyButton text={webhookUrl} label="Copy URL" />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Use this URL in your Google Apps Script
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Webhook Secret
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <input
                    type="text"
                    readOnly
                    value={webhookSecret || ""}
                    className="block w-full rounded-l-md border-gray-300 bg-gray-50 px-3 py-2 text-sm font-mono"
                  />
                  <CopyButton text={webhookSecret || ""} label="Copy" />
                </div>
                <div className="mt-2 flex items-center gap-4">
                  <form action={regenerateSecret}>
                    <button
                      type="submit"
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Regenerate Secret
                    </button>
                  </form>
                  <p className="flex items-center gap-1 text-xs text-gray-500">
                    <AlertTriangle className="h-4 w-4" /> Regenerating will require updating your Apps Script
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Settings */}
          <form action={updateGoogleFormsSettings}>
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
                <Settings className="h-4 w-4" /> Settings
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="googleFormsUrl" className="block text-sm font-medium text-gray-700">
                    Google Form URL (for reference)
                  </label>
                  <input
                    type="url"
                    id="googleFormsUrl"
                    name="googleFormsUrl"
                    defaultValue={settings.googleFormsUrl || ""}
                    placeholder="https://docs.google.com/forms/d/e/..."
                    className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Link to your registration form (shown on the landing page)
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="googleFormsAutoApprove"
                    name="googleFormsAutoApprove"
                    defaultChecked={settings.googleFormsAutoApprove}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="googleFormsAutoApprove" className="text-sm text-gray-700">
                    Auto-approve registrations (students are immediately active)
                  </label>
                </div>

                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </form>

          {/* Setup Instructions */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
              <ClipboardList className="h-4 w-4" /> Setup Instructions
            </h3>
            
            <div className="space-y-4">
              <div className="rounded-lg bg-blue-50 p-4">
                <h4 className="font-medium text-blue-900 mb-2">Step 1: Create Your Google Form</h4>
                <p className="text-sm text-blue-800">
                  Create a Google Form with fields like: Student Name, Parent Name, Parent Email, 
                  Parent Phone, Date of Birth, Grade, T-Shirt Size, etc.
                </p>
              </div>

              <div className="rounded-lg bg-blue-50 p-4">
                <h4 className="font-medium text-blue-900 mb-2">Step 2: Add Apps Script</h4>
                <ol className="text-sm text-blue-800 list-decimal list-inside space-y-1">
                  <li>Open your Google Form</li>
                  <li>Click the three dots menu (⋮) → Script editor</li>
                  <li>Delete any existing code</li>
                  <li>Copy and paste the script below</li>
                  <li>Save the script (Ctrl+S or Cmd+S)</li>
                </ol>
              </div>

              <div className="rounded-lg bg-blue-50 p-4">
                <h4 className="font-medium text-blue-900 mb-2">Step 3: Create Trigger</h4>
                <ol className="text-sm text-blue-800 list-decimal list-inside space-y-1">
                  <li>In the Apps Script editor, select &quot;createTrigger&quot; from the function dropdown</li>
                  <li>Click &quot;Run&quot;</li>
                  <li>Grant the required permissions when prompted</li>
                </ol>
              </div>

              <div className="rounded-lg bg-green-50 p-4">
                <h4 className="font-medium text-green-900 mb-2">Step 4: Test It!</h4>
                <p className="text-sm text-green-800">
                  Submit a test response to your Google Form. The student should appear 
                  in your Steward VBS within a few seconds.
                </p>
              </div>
            </div>
          </div>

          {/* Apps Script Code */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <ScrollText className="h-4 w-4" /> Google Apps Script Code
              </h3>
              <CopyButton text={appsScriptCode} label="Copy Script" />
            </div>
            
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs leading-relaxed max-h-96">
              <code>{appsScriptCode}</code>
            </pre>
          </div>

          {/* Field Mapping Reference */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
              <Map className="h-4 w-4" /> Form Field Mapping
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Name your Google Form fields to include these keywords for automatic mapping:
            </p>
            
            <div className="grid gap-2 sm:grid-cols-2 text-sm">
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span className="font-medium">Student Name</span>
                <span className="text-gray-500">→ studentName</span>
              </div>
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span className="font-medium">Parent Name</span>
                <span className="text-gray-500">→ parentName</span>
              </div>
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span className="font-medium">Parent Email</span>
                <span className="text-gray-500">→ parentEmail</span>
              </div>
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span className="font-medium">Parent Phone</span>
                <span className="text-gray-500">→ parentPhone</span>
              </div>
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span className="font-medium">Date of Birth / DOB</span>
                <span className="text-gray-500">→ dateOfBirth</span>
              </div>
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span className="font-medium">Grade</span>
                <span className="text-gray-500">→ grade</span>
              </div>
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span className="font-medium">T-Shirt Size</span>
                <span className="text-gray-500">→ size</span>
              </div>
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span className="font-medium">Category / Group / Class</span>
                <span className="text-gray-500">→ category</span>
              </div>
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span className="font-medium">Emergency Contact Name</span>
                <span className="text-gray-500">→ emergencyContactName</span>
              </div>
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span className="font-medium">Emergency Phone</span>
                <span className="text-gray-500">→ emergencyContactPhone</span>
              </div>
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span className="font-medium">Allergies</span>
                <span className="text-gray-500">→ allergies</span>
              </div>
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span className="font-medium">Medical Notes</span>
                <span className="text-gray-500">→ medicalNotes</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

