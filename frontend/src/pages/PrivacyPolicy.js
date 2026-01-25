import React from 'react';
import { useNavigate } from 'react-router-dom';

const BRAND = {
  primary: '#0F9D78',
  heading: '#0F172A',
  body: '#475569',
  border: '#0F9D78',
};

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#f8faf5] px-4 sm:px-6 py-10">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        <div className="text-base space-y-6" style={{ color: BRAND.body }}>
          <p>
            The Students Portal is an online platform provided by Jawaharlal Nehru Technological University Kakinada (JNTUK) for the exclusive use of its students. This portal serves as a photo-based attendance system and a learning management system, supporting student academic activities and institutional requirements. We are committed to protecting the privacy and security of all users and their data.
          </p>
          <p>
            When you use the Students Portal, we collect certain information necessary for academic and administrative purposes. This includes student details such as name, registration number, and course information, as well as photos submitted for attendance verification and records of academic activity within the portal. The collection of this data is essential for verifying attendance, managing learning resources, and maintaining accurate academic records.
          </p>
          <p>
            All data collected through the Students Portal is stored securely using appropriate technical and administrative safeguards. Access to personal information and attendance photos is strictly limited to authorized university administrators. We do not use your photos or personal data for any public or commercial purposes. Photos are used solely for the purpose of verifying attendance and are not shared outside the institution.
          </p>
          <p>
            The use of the Students Portal is restricted to JNTUK-affiliated students. Data collected on this platform is used exclusively for educational and institutional purposes, in accordance with JNTUK’s rules and academic regulations. We do not share your information with third parties, except when required by law or institutional policy. The portal is designed to comply with all relevant privacy standards and academic guidelines set by the university.
          </p>
          <p>
            By accessing and using the Students Portal, you provide your consent for the collection and use of your information as described in this policy. Your continued use of the platform indicates your agreement to these terms and your understanding of how your data will be handled.
          </p>
          <p>
            We may update this Privacy Policy from time to time to reflect changes in our practices or institutional requirements. Any changes will be communicated through the portal, and your continued use of the platform after such updates constitutes your acceptance of the revised policy.
          </p>
        </div>
      </div>
    </div>
  );
}
