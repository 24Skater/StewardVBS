"use client";

import { Printer, AlertTriangle, ShieldAlert, Phone } from "lucide-react";

interface PrintBadgeProps {
  student: {
    name: string;
    category: string;
    size: string;
    grade: string | null;
    age: number | null;
    profileImage: string | null;
    allergies: string | null;
    medicalNotes: string | null;
  };
  event: {
    year: number;
    theme: string | null;
  } | null;
  emergency: {
    name: string;
    phone: string;
    relationship: string | null;
  } | null;
  settings: {
    siteName: string;
    primaryColor: string;
    logoUrl: string | null;
    churchName: string | null;
    tagline: string | null;
  };
}

export default function PrintBadge({ student, event, emergency, settings }: PrintBadgeProps) {
  const handlePrint = () => {
    window.print();
  };

  const hasAlerts = student.allergies || student.medicalNotes;

  return (
    <div>
      {/* Print Button */}
      <div className="mb-6 print:hidden">
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-6 py-3 text-white hover:bg-blue-700 font-medium"
        >
          <Printer className="h-4 w-4" /> Print Badge
        </button>
      </div>

      {/* Badge Preview */}
      <div id="badge-container" className="flex justify-center">
        <div
          className="w-[4in] bg-white border-2 rounded-lg overflow-hidden shadow-lg print:shadow-none print:border-2"
          style={{ borderColor: settings.primaryColor }}
        >
          {/* Header */}
          <div
            className="px-4 py-3 text-white text-center"
            style={{ backgroundColor: settings.primaryColor }}
          >
            <div className="flex items-center justify-center gap-2">
              {settings.logoUrl && (
                <img src={settings.logoUrl} alt="" className="h-10 w-auto brightness-0 invert" />
              )}
              <div>
                {settings.churchName && (
                  <div className="text-xs opacity-80">{settings.churchName}</div>
                )}
                <div className="font-bold text-lg">{settings.siteName}</div>
                {settings.tagline && (
                  <div className="text-xs opacity-80">{settings.tagline}</div>
                )}
                {event && (
                  <div className="text-sm opacity-90 mt-1">
                    {event.year} {event.theme && `• ${event.theme}`}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Photo & Name */}
          <div className="p-4 text-center border-b">
            <div className="mx-auto w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden mb-3">
            {student.profileImage ? (
              <img
                src={student.profileImage}
                alt={student.name}
                className="w-full h-full object-cover"
              />
            ) : (
                <span className="text-4xl text-gray-400">
                  {student.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{student.name}</h2>
            {student.age && (
              <div className="text-gray-600">Age: {student.age}</div>
            )}
          </div>

          {/* Group & Size */}
          <div className="grid grid-cols-2 border-b">
            <div className="p-3 border-r text-center">
              <div className="text-xs text-gray-500 uppercase">Group</div>
              <div
                className="font-bold text-lg"
                style={{ color: settings.primaryColor }}
              >
                {student.category}
              </div>
            </div>
            <div className="p-3 text-center">
              <div className="text-xs text-gray-500 uppercase">Shirt Size</div>
              <div className="font-bold text-lg text-gray-900">{student.size}</div>
            </div>
          </div>

          {student.grade && (
            <div className="px-4 py-2 border-b text-center">
              <span className="text-xs text-gray-500 uppercase">Grade: </span>
              <span className="font-medium">{student.grade}</span>
            </div>
          )}

          {/* Medical Alert */}
          {hasAlerts && (
            <div className="bg-yellow-50 px-4 py-2 border-b border-yellow-200">
              <div className="flex items-center gap-1 text-xs font-bold text-yellow-800 uppercase mb-1">
                <AlertTriangle className="h-3 w-3" /> Medical Alert
              </div>
              {student.allergies && (
                <div className="text-xs text-yellow-900">
                  <span className="font-medium">Allergies:</span> {student.allergies}
                </div>
              )}
              {student.medicalNotes && (
                <div className="text-xs text-yellow-900">
                  <span className="font-medium">Notes:</span> {student.medicalNotes}
                </div>
              )}
            </div>
          )}

          {/* Emergency Contact */}
          {emergency && (
            <div className="bg-red-50 px-4 py-3">
              <div className="flex items-center gap-1 text-xs font-bold text-red-800 uppercase mb-1">
                <ShieldAlert className="h-3 w-3" /> Emergency Contact
              </div>
              <div className="text-sm text-red-900 font-medium">
                {emergency.name}
                {emergency.relationship && ` (${emergency.relationship})`}
              </div>
              <div className="flex items-center gap-1 text-sm text-red-900 font-bold">
                <Phone className="h-3 w-3" /> {emergency.phone}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Print Instructions */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg print:hidden">
        <h3 className="font-medium text-gray-900 mb-2">Print Tips:</h3>
        <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
          <li>Badge size is 4 inches wide - fits standard badge holders</li>
          <li>Use cardstock or heavy paper for durability</li>
          <li>Consider laminating for water resistance</li>
          <li>Print in color for best results</li>
        </ul>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:hidden {
            display: none !important;
          }
          #badge-container,
          #badge-container * {
            visibility: visible;
          }
          #badge-container {
            position: absolute;
            left: 0;
            top: 0;
          }
          @page {
            size: 4in 6in;
            margin: 0.25in;
          }
        }
      `}</style>
    </div>
  );
}
