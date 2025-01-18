import { NavLink } from 'react-router-dom';
import { Button } from './ui/button';
import { Settings, Home, ListTodo, GitBranch, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export function GlobalNav() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { to: '/', label: 'Dashboard', icon: <Home className="h-4 w-4" /> },
    { to: '/tasks', label: 'Tasks', icon: <ListTodo className="h-4 w-4" /> },
    { to: '/mind-map', label: 'Mind Map', icon: <GitBranch className="h-4 w-4" /> },
    { to: '/integrations', label: 'Integrations', icon: <GitBranch className="h-4 w-4" /> },
  ];

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center justify-between">
        <div className="flex items-center space-x-4">
          <NavLink 
            to="/" 
            className="flex items-center space-x-2 font-bold"
          >
            <Settings className="h-6 w-6" />
            <span>Devin Management</span>
          </NavLink>
        </div>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={handleMenuToggle}
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </Button>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6 px-6">
          {navItems.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary ${
                  isActive ? 'text-foreground' : 'text-foreground/60'
                }`
              }
            >
              {icon}
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="absolute top-[3.5rem] left-0 right-0 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
            <nav className="flex flex-col p-4 space-y-4">
              {navItems.map(({ to, label, icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary ${
                      isActive ? 'text-foreground' : 'text-foreground/60'
                    }`
                  }
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {icon}
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        )}

        <div className="hidden md:flex flex-1 items-center justify-end space-x-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {/* TODO: Add settings handler */}}
          >
            <Settings className="h-4 w-4" />
            <span className="sr-only">Settings</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
