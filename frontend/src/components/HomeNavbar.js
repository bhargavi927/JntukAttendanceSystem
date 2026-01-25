import React, { useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { AuthContext } from '../contexts/AuthContext';
import jntukLogo from '../jntukimages/jntuk-logo.png';

const BRAND = {
  primary: '#0F9D78',
  heading: '#0F172A',
  body: '#475569',
  border: '#E5E7EB'
};

const ATTENDANCE_MENU = [
  { label: 'Upload Attendance', to: '/attendance/upload' },
  { label: 'Attendance Check', to: '/attendance/check' }
];

const MAIN_LINKS = [
  { label: 'Home', to: '/home' },
  { label: 'Profile', to: '/profile' },
  { label: 'LMS', to: '/lms' }
];

function isAttendancePath(pathname) {
  return pathname === '/attendance' || pathname.startsWith('/attendance/');
}

export default function HomeNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useContext(AuthContext);

  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [hovered, setHovered] = React.useState(null);
  const [attendanceOpen, setAttendanceOpen] = React.useState(false);

  React.useEffect(() => {
    setMobileOpen(false);
    setAttendanceOpen(false);
    setHovered(null);
  }, [location.pathname]);

  const activeKey = React.useMemo(() => {
    if (location.pathname === '/home') {
      if (location.hash === '#lms') return 'LMS';
      return 'Home';
    }
    if (location.pathname === '/profile') return 'Profile';
    if (location.pathname === '/lms') return 'LMS';
    if (isAttendancePath(location.pathname)) {
      const match = ATTENDANCE_MENU.find((x) => x.to === location.pathname);
      return match ? match.label : 'Attendance';
    }
    return null;
  }, [location.pathname, location.hash]);

  const onRouteClick = (e, to, label) => {
    e.preventDefault();
    setAttendanceOpen(false);
    setMobileOpen(false);
    navigate(to);
  };

  const onLogout = async (e) => {
    e.preventDefault();
    setAttendanceOpen(false);
    setMobileOpen(false);
    if (typeof signOut === 'function') {
      await signOut();
    }
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#E5E7EB]">
      <div className="w-full px-4">
        <div className="h-16 flex items-center">
          <a
            href="/home"
            onClick={(e) => onRouteClick(e, '/home', 'Home')}
            className="flex items-center gap-3 font-extrabold tracking-tight"
            style={{ color: BRAND.heading }}
          >
            <img
              src={jntukLogo}
              alt="JNTUK"
              className="h-14 w-14 object-contain"
            />
            <span className="text-xl sm:text-2xl">
              <span style={{ color: BRAND.heading }}>STUDENT</span>{' '}
              <span style={{ color: BRAND.primary }}>PORTAL</span>
            </span>
          </a>

          <nav className="hidden md:flex ml-auto items-center justify-end gap-6">
            {MAIN_LINKS.filter((l) => l.label !== 'LMS').map((link) => {
              const isActive = activeKey === link.label;
              const isHovered = hovered === link.label;
              const showUnderline = isActive || isHovered;
              return (
                <a
                  key={link.label}
                  href={link.to}
                  onClick={(e) => onRouteClick(e, link.to, link.label)}
                  className="relative text-sm font-medium transition-colors"
                  style={{ color: showUnderline ? BRAND.primary : BRAND.body }}
                  onMouseEnter={() => setHovered(link.label)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {link.label}
                  {showUnderline ? (
                    <span
                      className="absolute left-0 right-0 -bottom-2 h-[2px]"
                      style={{ backgroundColor: BRAND.primary }}
                    />
                  ) : null}
                </a>
              );
            })}

            <div className="relative">
              {(() => {
                const label = 'Attendance';
                const isActive =
                  activeKey === label || ATTENDANCE_MENU.some((x) => x.label === activeKey);
                const isHovered = hovered === label;
                const showUnderline = isActive || isHovered;
                return (
                  <button
                    type="button"
                    className="relative text-sm font-medium transition-colors"
                    style={{ color: showUnderline ? BRAND.primary : BRAND.body }}
                    onMouseEnter={() => setHovered(label)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => setAttendanceOpen((v) => !v)}
                  >
                    {label}
                    {showUnderline ? (
                      <span
                        className="absolute left-0 right-0 -bottom-2 h-[2px]"
                        style={{ backgroundColor: BRAND.primary }}
                      />
                    ) : null}
                  </button>
                );
              })()}

              {attendanceOpen ? (
                <div className="absolute left-1/2 -translate-x-1/2 mt-3 w-56 bg-white border border-gray-200 rounded-xl shadow-sm p-2">
                  {ATTENDANCE_MENU.map((item) => {
                    const isActive = activeKey === item.label;
                    const isHovered = hovered === item.label;
                    const showUnderline = isActive || isHovered;
                    return (
                      <a
                        key={item.label}
                        href={item.to}
                        onClick={(e) => onRouteClick(e, item.to, item.label)}
                        className="block px-3 py-2 rounded-lg text-sm font-medium transition-colors relative"
                        style={{ color: showUnderline ? BRAND.primary : BRAND.body }}
                        onMouseEnter={() => setHovered(item.label)}
                        onMouseLeave={() => setHovered(null)}
                      >
                        <span className="relative inline-block">
                          {item.label}
                          {showUnderline ? (
                            <span
                              className="absolute left-0 right-0 -bottom-1 h-[2px]"
                              style={{ backgroundColor: BRAND.primary }}
                            />
                          ) : null}
                        </span>
                      </a>
                    );
                  })}
                </div>
              ) : null}
            </div>

            {(() => {
              const label = 'LMS';
              const to = '/lms';
              const isActive = activeKey === label;
              const isHovered = hovered === label;
              const showUnderline = isActive || isHovered;
              return (
                <a
                  href={to}
                  onClick={(e) => onRouteClick(e, to, label)}
                  className="relative text-sm font-medium transition-colors"
                  style={{ color: showUnderline ? BRAND.primary : BRAND.body }}
                  onMouseEnter={() => setHovered(label)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {label}
                  {showUnderline ? (
                    <span
                      className="absolute left-0 right-0 -bottom-2 h-[2px]"
                      style={{ backgroundColor: BRAND.primary }}
                    />
                  ) : null}
                </a>
              );
            })()}

            <button
              type="button"
              className="btn rounded-xl px-4 py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: BRAND.primary, borderColor: BRAND.primary }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#DC2626';
                e.currentTarget.style.borderColor = '#DC2626';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = BRAND.primary;
                e.currentTarget.style.borderColor = BRAND.primary;
              }}
              onClick={onLogout}
            >
              Logout
            </button>
          </nav>

          <button
            type="button"
            className="ml-auto md:hidden inline-flex items-center justify-center h-10 w-10 rounded-lg border border-[#E5E7EB] text-slate-700"
            aria-label="Open menu"
            aria-expanded={mobileOpen ? 'true' : 'false'}
            onClick={() => setMobileOpen((v) => !v)}
          >
            <i className="bi bi-list text-xl" aria-hidden="true" />
          </button>
        </div>

        {mobileOpen ? (
          <div className="md:hidden pb-4">
            <div className="flex flex-col gap-2 pt-2">
              {MAIN_LINKS.filter((l) => l.label !== 'LMS').map((link) => {
                const isActive = activeKey === link.label;
                const isHovered = hovered === link.label;
                const showUnderline = isActive || isHovered;
                return (
                  <a
                    key={link.label}
                    href={link.to}
                    onClick={(e) => onRouteClick(e, link.to, link.label)}
                    className="px-2 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{ color: showUnderline ? BRAND.primary : BRAND.body }}
                    onMouseEnter={() => setHovered(link.label)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <span className="relative inline-block">
                      {link.label}
                      {showUnderline ? (
                        <span
                          className="absolute left-0 right-0 -bottom-1 h-[2px]"
                          style={{ backgroundColor: BRAND.primary }}
                        />
                      ) : null}
                    </span>
                  </a>
                );
              })}

              {(() => {
                const label = 'Attendance';
                const isActive =
                  activeKey === label || ATTENDANCE_MENU.some((x) => x.label === activeKey);
                const isHovered = hovered === label;
                const showUnderline = isActive || isHovered;
                return (
                  <div className="px-2">
                    <div
                      className="py-2 text-sm font-semibold"
                      style={{ color: showUnderline ? BRAND.primary : BRAND.body }}
                      onMouseEnter={() => setHovered(label)}
                      onMouseLeave={() => setHovered(null)}
                    >
                      <span className="relative inline-block">
                        {label}
                        {showUnderline ? (
                          <span
                            className="absolute left-0 right-0 -bottom-1 h-[2px]"
                            style={{ backgroundColor: BRAND.primary }}
                          />
                        ) : null}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1 pb-2">
                      {ATTENDANCE_MENU.map((item) => {
                        const itemActive = activeKey === item.label;
                        const itemHovered = hovered === item.label;
                        const showItemUnderline = itemActive || itemHovered;
                        return (
                          <a
                            key={item.label}
                            href={item.to}
                            onClick={(e) => onRouteClick(e, item.to, item.label)}
                            className="px-2 py-2 rounded-lg text-sm font-medium transition-colors"
                            style={{ color: showItemUnderline ? BRAND.primary : BRAND.body }}
                            onMouseEnter={() => setHovered(item.label)}
                            onMouseLeave={() => setHovered(null)}
                          >
                            <span className="relative inline-block">
                              {item.label}
                              {showItemUnderline ? (
                                <span
                                  className="absolute left-0 right-0 -bottom-1 h-[2px]"
                                  style={{ backgroundColor: BRAND.primary }}
                                />
                              ) : null}
                            </span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {(() => {
                const label = 'LMS';
                const to = '/lms';
                const isActive = activeKey === label;
                const isHovered = hovered === label;
                const showUnderline = isActive || isHovered;
                return (
                  <a
                    href={to}
                    onClick={(e) => onRouteClick(e, to, label)}
                    className="px-2 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{ color: showUnderline ? BRAND.primary : BRAND.body }}
                    onMouseEnter={() => setHovered(label)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <span className="relative inline-block">
                      {label}
                      {showUnderline ? (
                        <span
                          className="absolute left-0 right-0 -bottom-1 h-[2px]"
                          style={{ backgroundColor: BRAND.primary }}
                        />
                      ) : null}
                    </span>
                  </a>
                );
              })()}

              <button
                type="button"
                className="btn mt-2 w-full rounded-xl px-4 py-2 text-sm font-semibold text-white"
                style={{ backgroundColor: BRAND.primary, borderColor: BRAND.primary }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#DC2626';
                  e.currentTarget.style.borderColor = '#DC2626';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = BRAND.primary;
                  e.currentTarget.style.borderColor = BRAND.primary;
                }}
                onClick={onLogout}
              >
                Logout
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
