import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ProfHeaderNav from '../components/ProfHeaderNav';
import professorMainImage from '../jntukimages/professormainimage.png';
import jntukLogo from '../jntukimages/jntuk-logo.png';
const BRAND = {
  primary: '#0F9D78',
  primaryDark: '#0B7A5E',
  heading: '#0F172A',
  body: '#475569',
  border: '#E5E7EB'
};

const HOW_IT_WORKS = [
  {
    title: 'Professor Sets Permissions',
    description: 'Define who can submit and when attendance is open.'
  },
  {
    title: 'Students Submit Photos',
    description: 'Submit attendance securely with a quick, guided workflow.'
  },
  {
    title: 'Review & Approve',
    description: 'Professors review submissions and approve with confidence.'
  }
];

function scrollToHash(hash) {
  const id = String(hash || '').replace('#', '');
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function PrimaryButton({ children, onClick }) {
  return (
    <button
      type="button"
      className="btn inline-flex items-center justify-center gap-2 w-full sm:w-56 h-12 px-4 rounded-xl shadow-sm transition-colors"
      style={{ backgroundColor: BRAND.primary, color: 'white' }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = BRAND.primaryDark;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = BRAND.primary;
      }}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick }) {
  return (
    <button
      type="button"
      className="btn inline-flex items-center justify-center gap-2 w-full sm:w-56 h-12 px-4 rounded-xl transition-colors"
      style={{ borderColor: BRAND.border, color: BRAND.heading, backgroundColor: '#E5E7EB' }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#9CA3AF';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#E5E7EB';
      }}
    >
      {children}
    </button>
  );
}

function Hero() {
  const navigate = useNavigate();

  return (
    <section id="top" className="bg-gradient-to-b from-[#F3FBF7] via-white to-white">
      <div className="max-w-6xl mx-auto px-4 py-14">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="mb-2" style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0F172A', fontFamily: 'Montserrat, Arial, sans-serif', lineHeight: 1.1 }}>
              <span style={{ display: 'block', color: '#0F172A' }}>UCEK JNTUK</span>
              <span style={{ display: 'block', color: '#0F9D78', fontFamily: 'Montserrat, Arial, sans-serif' }}>PROFESSOR PORTAL</span>
            </h1>
            <p className="mt-4 mb-8 text-lg text-gray-700 max-w-2xl" style={{ fontFamily: 'Garamond, serif' }}>
              Welcome to the JNTUK Professors Portal, a smart campus platform where faculty can upload class materials, manage photo-based attendance permissions, and streamline academic delivery. Professors post lecture PPTs, notes, and resources for students to access anytime, while granting selective permissions for students to submit picture-based attendance. Stay organized with tools to track submissions, monitor live attendance percentages, and enhance classroom engagement in one centralized hub.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                className="px-6 py-2 rounded bg-emerald-600 text-white font-normal flex items-center gap-2 shadow hover:bg-emerald-700 transition-colors duration-200"
                onClick={() => navigate('/professor/permissions')}
                style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
              >
                <i className="bi bi-shield-lock" /> Manage Permissions
              </button>
              <button
                className="px-6 py-2 rounded bg-gray-200 text-[#0F172A] font-normal flex items-center gap-2 shadow hover:bg-gray-400 transition-colors duration-200"
                onClick={() => navigate('/professor/lecture-materials')}
                style={{ fontFamily: 'Arial, Helvetica, sans-serif', boxShadow: '0 4px 16px 0 rgba(70, 68, 68, 0.08)' }}
              >
                <i className="bi bi-file-earmark-text" /> Lecture Materials
              </button>
            </div>
          </div>

          {/* Right side image (cropped + immersed) */}
          <div className="flex justify-center lg:justify-end">
            <img
              src={professorMainImage}
              alt="Professor portal main"
              className="w-full max-w-lg h-auto object-contain"
              style={{
                background: 'none',
                border: 'none',
                outline: 'none',
                borderRadius: 0,
                boxShadow: '0 0 40px 0 rgba(0,0,0,0.04)',
                margin: 0,
                padding: 0,
                mixBlendMode: 'normal', // Blend mode removed for test
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how" className="bg-[#F8FAFC]">
      <div id="attendance" className="scroll-mt-24" />
      <div className="max-w-6xl mx-auto px-4 py-14">
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold" style={{ color: BRAND.primary }}>
            How Professor Portal Works?
          </h2>
          <p className="mt-3 text-base" style={{ color: BRAND.body }}>
            Streamlined workflow for efficient classroom management
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* 1st Box - Set Permissions */}
          <div className="how-card-hover text-center bg-white rounded-2xl p-7 border" style={{ borderColor: BRAND.border }}>
            <div className="mx-auto h-14 w-14 rounded-full flex items-center justify-center text-white text-xl font-extrabold" style={{ backgroundColor: BRAND.primary }}>
              1
            </div>
            <h3 className="mt-4 text-lg font-bold" style={{ color: BRAND.heading }}>
              Set Permissions
            </h3>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: BRAND.body }}>
              Configure attendance windows, location requirements, and approval settings for each subject and class.
            </p>
          </div>
          {/* 2nd Box - Upload Materials */}
          <div className="how-card-hover text-center bg-white rounded-2xl p-7 border" style={{ borderColor: BRAND.border }}>
            <div className="mx-auto h-14 w-14 rounded-full flex items-center justify-center text-white text-xl font-extrabold" style={{ backgroundColor: BRAND.primary }}>
              2
            </div>
            <h3 className="mt-4 text-lg font-bold" style={{ color: BRAND.heading }}>
              Upload Materials
            </h3>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: BRAND.body }}>
              Share lecture files, PPTs, PDFs, and textbooks with students through the integrated resource management system.
            </p>
          </div>
          {/* 3rd Box - Review Submissions */}
          <div className="how-card-hover text-center bg-white rounded-2xl p-7 border" style={{ borderColor: BRAND.border }}>
            <div className="mx-auto h-14 w-14 rounded-full flex items-center justify-center text-white text-xl font-extrabold" style={{ backgroundColor: BRAND.primary }}>
              3
            </div>
            <h3 className="mt-4 text-lg font-bold" style={{ color: BRAND.heading }}>
              Review Submissions
            </h3>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: BRAND.body }}>
              Monitor and approve student attendance photos in real-time with detailed review and feedback capabilities.
            </p>
          </div>
          {/* 4th Box - Track Analytics */}
          <div className="how-card-hover text-center bg-white rounded-2xl p-7 border" style={{ borderColor: BRAND.border }}>
            <div className="mx-auto h-14 w-14 rounded-full flex items-center justify-center text-white text-xl font-extrabold" style={{ backgroundColor: BRAND.primary }}>
              4
            </div>
            <h3 className="mt-4 text-lg font-bold" style={{ color: BRAND.heading }}>
              Track Analytics
            </h3>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: BRAND.body }}>
              Generate comprehensive reports and analyze attendance patterns to improve student engagement.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function CtaBanner() {
  const navigate = useNavigate();
  return (
    <section id="cta" className="w-full bg-white">
      <div className="w-full max-w-none px-0">
        <div className="rounded-none p-10 text-center bg-gradient-to-r from-[#0F9D78] to-[#0B7A5E] w-full">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white w-full">
            Ready to start Professor Portal?
          </h2>
          <p className="mt-3 text-white/90">
            Grant photo attendance access and share materials—streamline your classroom effortlessly
          </p>
          <div className="mt-7 flex flex-col sm:flex-row justify-center gap-3 w-full">
            <button
              type="button"
              className="btn w-full sm:w-56 h-12 px-5 rounded-xl font-semibold shadow-sm transform transition-transform duration-200 hover:scale-[1.03] whitespace-nowrap"
              style={{ backgroundColor: '#075C47', color: 'white' }}
              onClick={() => navigate('/professor/permissions')}
            >
              Permissions
            </button>
            <button
              type="button"
              className="btn w-full sm:w-56 h-12 px-5 rounded-xl font-semibold shadow-sm transform transition-transform duration-200 hover:scale-[1.03] whitespace-nowrap"
              style={{ backgroundColor: '#075C47', color: 'white' }}
              onClick={() => scrollToHash('#lms')}
            >
              Lecture Materials
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const navigate = useNavigate();
  return (
    <footer className="bg-white border-t" style={{ borderColor: BRAND.border }}>
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <div className="text-lg font-extrabold" style={{ fontFamily: 'Montserrat, Arial, sans-serif', color: '#222' }}>
              PROFESSOR <span style={{ color: BRAND.primary }}>PORTAL</span>
            </div>
            <p className="mt-3 text-sm" style={{ color: BRAND.body }}>
              Authorize photo attendance & upload materials—streamline teaching at UCEK JNTUK
            </p>
          </div>

          <div>
            <div className="text-sm font-bold" style={{ color: BRAND.heading }}>Quick Links</div>
            <div className="mt-3 flex flex-col gap-2">
              <a href="#top" onClick={(e) => { e.preventDefault(); scrollToHash('#top'); }} className="text-sm hover:underline" style={{ color: BRAND.body }}>Home</a>
              <a href="/professor/permissions" onClick={(e) => { e.preventDefault(); navigate('/professor/permissions'); }} className="text-sm hover:underline" style={{ color: BRAND.body }}>Permissions</a>
              <a href="/professor/review-attendance" onClick={(e) => { e.preventDefault(); navigate('/professor/review-attendance'); }} className="text-sm hover:underline" style={{ color: BRAND.body }}>Review Attendance</a>
              <a href="/professor/lecture-materials" onClick={(e) => { e.preventDefault(); navigate('/professor/lecture-materials'); }} className="text-sm hover:underline" style={{ color: BRAND.body }}>Upload Materials</a>
            </div>
          </div>

          <div>
            <div className="text-sm font-bold" style={{ color: BRAND.heading }}>Support</div>
            <div className="mt-3 flex flex-col gap-2">
              <a href="https://www.jntuk.edu.in/contact" target="_blank" rel="noopener noreferrer" className="text-sm hover:underline" style={{ color: BRAND.body }}>Help Center</a>
              <a href="https://www.jntuk.edu.in/contact" target="_blank" rel="noopener noreferrer" className="text-sm hover:underline" style={{ color: BRAND.body }}>Contact Support</a>
              <a href="/privacy-policy" onClick={(e) => { e.preventDefault(); navigate('/privacy-policy'); }} className="text-sm hover:underline" style={{ color: BRAND.body }}>Privacy Policy</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}


// --- QUICK ACTIONS SECTION ---
function QuickActions() {
  return (
    <section className="w-full bg-white py-10" style={{ marginTop: '2rem', marginBottom: '2rem' }}>
      <div className="w-full max-w-7xl mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold" style={{ color: BRAND.primary, fontFamily: 'Montserrat, Arial, sans-serif' }}>Quick Actions</h2>
          <p className="mt-2 text-base" style={{ color: '#222', fontFamily: 'Garamond, serif' }}>Access your most used features instantly</p>
        </div>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Manage Permissions */}
          <div className="how-card-hover text-center bg-white rounded-2xl p-7 border" style={{ borderColor: BRAND.border }}>
            <div className="mx-auto h-14 w-14 rounded-full flex items-center justify-center text-white text-xl font-extrabold mb-4" style={{ background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)', color: '#10b981' }}>
              <i className="bi bi-gear" style={{ fontSize: '2rem' }} />
            </div>
            <div className="font-bold text-lg mb-1" style={{ fontFamily: 'Montserrat, Arial, sans-serif', color: '#222' }}>Manage Permissions</div>
            <div className="text-gray-500 text-sm text-center" style={{ fontFamily: 'Garamond, serif' }}>Set attendance windows and permissions</div>
          </div>
          {/* Review Attendance */}
          <div className="how-card-hover text-center bg-white rounded-2xl p-7 border" style={{ borderColor: BRAND.border }}>
            <div className="mx-auto h-14 w-14 rounded-full flex items-center justify-center text-white text-xl font-extrabold mb-4" style={{ background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', color: '#3b82f6' }}>
              <i className="bi bi-file-earmark-text" style={{ fontSize: '2rem' }} />
            </div>
            <div className="font-bold text-lg mb-1" style={{ fontFamily: 'Montserrat, Arial, sans-serif', color: '#222' }}>Review Attendance</div>
            <div className="text-gray-500 text-sm text-center" style={{ fontFamily: 'Garamond, serif' }}>Check pending attendance submissions</div>
          </div>
          {/* Attendance Register */}
          <div className="how-card-hover text-center bg-white rounded-2xl p-7 border cursor-pointer" style={{ borderColor: BRAND.border }} onClick={() => window.location.href = '/professor/attendance-register'}>
            <div className="mx-auto h-14 w-14 rounded-full flex items-center justify-center text-white text-xl font-extrabold mb-4" style={{ background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)', color: '#db2777' }}>
              <i className="bi bi-journal-check" style={{ fontSize: '2rem' }} />
            </div>
            <div className="font-bold text-lg mb-1" style={{ fontFamily: 'Montserrat, Arial, sans-serif', color: '#222' }}>Attendance Register</div>
            <div className="text-gray-500 text-sm text-center" style={{ fontFamily: 'Garamond, serif' }}>View approved attendance records</div>
          </div>
          {/* Upload Materials */}
          <div className="how-card-hover text-center bg-white rounded-2xl p-7 border" style={{ borderColor: BRAND.border }}>
            <div className="mx-auto h-14 w-14 rounded-full flex items-center justify-center text-white text-xl font-extrabold mb-4" style={{ background: 'linear-gradient(135deg, #f3e8ff 0%, #ddd6fe 100%)', color: '#a855f7' }}>
              <i className="bi bi-cloud-arrow-up" style={{ fontSize: '2rem' }} />
            </div>
            <div className="font-bold text-lg mb-1" style={{ fontFamily: 'Montserrat, Arial, sans-serif', color: '#222' }}>Upload Materials</div>
            <div className="text-gray-500 text-sm text-center" style={{ fontFamily: 'Garamond, serif' }}>Add lecture files and resources</div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function ProfessorHome() {
  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (location.hash) {
      // Let the DOM paint first, then scroll.
      window.requestAnimationFrame(() => scrollToHash(location.hash));
    }
  }, [location.hash]);

  return (
    <div className="min-h-screen flex flex-col">
      <ProfHeaderNav />
      {/* Reduce the spacer to minimize the gap between header and content */}
      <div style={{ height: '32px' }} />
      <main className="flex-1 pt-0">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <h1 className="mb-2" style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0F172A', fontFamily: 'Montserrat, Arial, sans-serif', lineHeight: 1.1 }}>
                <span style={{ display: 'block', color: '#0F172A' }}>UCEK JNTUK</span>
                <span style={{ display: 'block', color: '#0F9D78', fontFamily: 'Montserrat, Arial, sans-serif' }}>PROFESSOR PORTAL</span>
              </h1>
              <p className="mt-4 mb-8 text-lg text-gray-700 max-w-2xl" style={{ fontFamily: 'Garamond, serif' }}>
                Welcome to the JNTUK Professors Portal, a smart campus platform where faculty can upload class materials, manage photo-based attendance permissions, and streamline academic delivery. Professors post lecture PPTs, notes, and resources for students to access anytime, while granting selective permissions for students to submit picture-based attendance. Stay organized with tools to track submissions, monitor live attendance percentages, and enhance classroom engagement in one centralized hub.
              </p>
              <div className="flex flex-wrap gap-4">
                <button
                  className="px-6 py-2 rounded bg-emerald-600 text-white font-normal flex items-center gap-2 shadow hover:bg-emerald-700 transition-colors duration-200"
                  onClick={() => navigate('/professor/permissions')}
                  style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
                >
                  <i className="bi bi-shield-lock" /> Manage Permissions
                </button>
                <button
                  className="px-6 py-2 rounded bg-gray-200 text-[#0F172A] font-normal flex items-center gap-2 shadow hover:bg-gray-400 transition-colors duration-200"
                  onClick={() => navigate('/professor/lecture-materials')}
                  style={{ fontFamily: 'Arial, Helvetica, sans-serif', boxShadow: '0 4px 16px 0 rgba(70, 68, 68, 0.08)' }}
                >
                  <i className="bi bi-file-earmark-text" /> Lecture Materials
                </button>
              </div>
            </div>
            <div className="flex justify-center lg:justify-end">
              <img
                src={professorMainImage}
                alt="Professor portal main"
                className="w-full max-w-lg h-auto object-contain"
                style={{
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  borderRadius: 0,
                  boxShadow: '0 0 40px 0 rgba(0,0,0,0.04)',
                  margin: 0,
                  padding: 0,
                  mixBlendMode: 'normal',
                }}
              />
            </div>
          </div>
        </div>
        <QuickActions />
        <HowItWorks />
        <CtaBanner />
        <Footer />
      </main>
    </div>
  );
}
