import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import homepageImage from '../jntukimages/homepage.png';
import StudentFooter from '../components/StudentFooter';

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

const LMS_HOW_IT_WORKS = [
  {
    title: 'Choose year',
    description: 'Students choose regarding no with branch'
  },
  {
    title: 'Access Materials',
    description: 'choose subject according your choice and access your lecture PPTs'
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
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight" style={{ color: BRAND.heading }}>
              UCEK JNTUK <span style={{ color: BRAND.primary }}>STUDENT PORTAL</span>
            </h1>
            <p className="mt-5 text-base sm:text-lg" style={{ color: BRAND.body }}>
              Welcome to the JNTUK Students Portal, a smart campus platform with photo-based attendance, access to class lecture PPTs, and a personalized learning experience. Track your live attendance percentage, revisit classroom presentations anytime, and stay organised with all your academic resources in one place.
            </p>

            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <PrimaryButton onClick={() => navigate('/attendance/upload')}>
                <i className="bi bi-upload" aria-hidden="true" />
                Attendance
              </PrimaryButton>
              <SecondaryButton onClick={() => navigate('/lms')}>
                <i className="bi bi-journal-text" aria-hidden="true" />
                LMS
              </SecondaryButton>
            </div>
          </div>

          {/* Right side image (cropped + immersed) */}
          <div className="flex justify-center lg:justify-end">
            <div
              className="w-full max-w-md lg:max-w-lg rounded-2xl overflow-hidden"
              style={{
                aspectRatio: '4 / 3',
                backgroundImage: `url(${homepageImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
              role="img"
              aria-label="Student portal"
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
          <h2 className="text-3xl sm:text-4xl font-extrabold" style={{ color: BRAND.heading }}>
            How It Works?
            <span className="block font-normal" style={{ color: BRAND.primary }}>ATTENDANCE</span>
          </h2>
          <p className="mt-3 text-base" style={{ color: BRAND.body }}>
            Simple, secure, and efficient attendance management in three easy steps
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          {HOW_IT_WORKS.map((step, idx) => (
            <div
              key={step.title}
              className="how-card-hover text-center bg-white rounded-2xl p-7 border"
              style={{ borderColor: BRAND.border }}
            >
              <div
                className="mx-auto h-14 w-14 rounded-full flex items-center justify-center text-white text-xl font-extrabold"
                style={{ backgroundColor: BRAND.primary }}
              >
                {idx + 1}
              </div>
              <h3 className="mt-4 text-lg font-bold" style={{ color: BRAND.heading }}>
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: BRAND.body }}>
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksDuplicate() {
  return (
    <section id="lms" className="bg-[#F8FAFC]">
      <div className="max-w-6xl mx-auto px-4 py-14">
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold">
            <span style={{ color: BRAND.primary }}>How It Works?</span>
            <span className="block font-normal" style={{ color: BRAND.heading }}>LMS</span>
          </h2>
          <p className="mt-3 text-base" style={{ color: BRAND.body }}>
            Easy ,simple to use LMS system in 2 easy steps
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
          {LMS_HOW_IT_WORKS.map((step, idx) => (
            <div
              key={`${step.title}-dup`}
              className="how-card-hover text-center bg-white rounded-2xl p-7 border"
              style={{ borderColor: BRAND.border }}
            >
              <div
                className="mx-auto h-14 w-14 rounded-full flex items-center justify-center text-white text-xl font-extrabold"
                style={{ backgroundColor: BRAND.primary }}
              >
                {idx + 1}
              </div>
              <h3 className="mt-4 text-lg font-bold" style={{ color: BRAND.heading }}>
                {step.title}
              </h3>
              {step.description ? (
                <p className="mt-2 text-sm leading-relaxed" style={{ color: BRAND.body }}>
                  {step.description}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaBanner() {
  return (
    <section id="cta" className="bg-white">
      <div className="max-w-6xl mx-auto px-4 py-14">
        <div className="rounded-2xl p-10 text-center bg-gradient-to-r from-[#0F9D78] to-[#0B7A5E]">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            Ready to start Student Portal?
          </h2>
          <p className="mt-3 text-white/90">
            Access your regular lecture PPTs/PDFs/Textbooks and submit/track your attendance
          </p>

          <div className="mt-7 flex flex-col sm:flex-row justify-center gap-3">
            <button
              type="button"
              className="btn w-full sm:w-56 h-12 px-5 rounded-xl bg-white text-slate-900 font-semibold shadow-sm transform transition-transform duration-200 hover:scale-[1.03]"
              onClick={() => scrollToHash('#attendance')}
            >
              Attendance
            </button>
            <button
              type="button"
              className="btn w-full sm:w-56 h-12 px-5 rounded-xl font-semibold shadow-sm transform transition-transform duration-200 hover:scale-[1.03]"
              style={{ backgroundColor: '#075C47', color: 'white' }}
              onClick={() => scrollToHash('#lms')}
            >
              LMS
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function StudHome() {
  const location = useLocation();

  React.useEffect(() => {
    if (location.hash) {
      // Let the DOM paint first, then scroll.
      window.requestAnimationFrame(() => scrollToHash(location.hash));
    }
  }, [location.hash]);

  return (
    <div>
      <Hero />
      <HowItWorks />
      <HowItWorksDuplicate />
      <CtaBanner />
    </div>
  );
}
