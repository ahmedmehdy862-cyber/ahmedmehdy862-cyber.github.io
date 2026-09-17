import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const navLinks = [
  { path: '/', label: 'الرئيسية' },
  { path: '/projects', label: 'المشاريع' },
  { path: '/about', label: 'عني' },
  { path: '/contact', label: 'التواصل' },
];

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass">
      <nav className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-2xl font-mono font-bold gradient-text">
            Git//Fault
          </Link>

          {/* Desktop Navigation */}
          <ul className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <li key={link.path}>
                <Link
                  to={link.path}
                  className={`text-sm font-medium transition-colors duration-300 hover:text-accent ${
                    location.pathname === link.path
                      ? 'text-accent'
                      : 'text-text-secondary'
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden md:flex items-center">
            <Link
              to="/admin"
              className="px-4 py-2 text-sm border border-dark-border rounded-lg text-text-secondary hover:text-accent hover:border-accent transition-all duration-300"
            >
              الإدارة
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-text-secondary hover:text-accent transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <ul className="md:hidden mt-4 pb-4 border-t border-dark-border pt-4">
            {navLinks.map((link) => (
              <li key={link.path} className="mb-2">
                <Link
                  to={link.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`block py-2 text-sm font-medium transition-colors duration-300 hover:text-accent ${
                    location.pathname === link.path
                      ? 'text-accent'
                      : 'text-text-secondary'
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="mt-2">
              <Link
                to="/admin"
                onClick={() => setIsMenuOpen(false)}
                className="block py-2 px-4 text-sm border border-dark-border rounded-lg text-text-secondary hover:text-accent hover:border-accent transition-all duration-300 text-center"
              >
                الإدارة
              </Link>
            </li>
          </ul>
        )}
      </nav>
    </header>
  );
}
