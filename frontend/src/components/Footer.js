import React from 'react';
import { useNavigate } from 'react-router-dom';

const BRAND = {
  primary: '#0F9D78',
  heading: '#0F172A',
  body: '#475569',
  border: '#E5E7EB'
};

function scrollToHash(hash) {
  const id = String(hash || '').replace('#', '');
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function Footer() {
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
              <a href="/professor/review" onClick={(e) => { e.preventDefault(); navigate('/professor/review'); }} className="text-sm hover:underline" style={{ color: BRAND.body }}>Review Attendance</a>
              <a href="/professor/materials" onClick={(e) => { e.preventDefault(); navigate('/professor/materials'); }} className="text-sm hover:underline" style={{ color: BRAND.body }}>Upload Materials</a>
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
