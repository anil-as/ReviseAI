import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Play } from 'lucide-react';
import './AuthPage.css';

const AuthPage = () => {
  const [view, setView] = useState('start'); // start, login, register

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "easeOut" } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.3 } }
  };

  const formVariants = {
    hidden: { x: 30, opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { duration: 0.4 } },
    exit: { x: -30, opacity: 0, transition: { duration: 0.3 } }
  };

  return (
    <div className="auth-container">
      <AnimatePresence mode="wait">
        {view === 'start' && (
          <motion.div
            key="start"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="auth-card"
            style={{ textAlign: 'center', cursor: 'pointer' }}
            onClick={() => setView('login')}
          >
            <div className="logo-container" style={{ width: 80, height: 80, marginBottom: 30 }}>
              <Play className="logo-icon" size={40} fill="white" />
            </div>
            <h1 className="title" style={{ fontSize: '2rem' }}>Welcome to ReviseAI</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: 40 }}>
              Click anywhere to continue
            </p>
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <span style={{ fontSize: '1.5rem', color: 'var(--primary-color)' }}>↓</span>
            </motion.div>
          </motion.div>
        )}

        {view === 'login' && (
          <motion.div
            key="login"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="auth-card"
          >
            <LoginView onViewChange={setView} />
          </motion.div>
        )}

        {view === 'register' && (
          <motion.div
            key="register"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="auth-card"
          >
            <RegisterView onViewChange={setView} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const LoginView = ({ onViewChange }) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <>
      <div className="logo-container">
        <Play className="logo-icon" fill="white" />
      </div>
      <h2 className="title">Log In to your account</h2>
      
      <div className="form-group">
        <label className="form-label">Email</label>
        <input type="email" className="form-input" placeholder="hello.designveli@gmail.com" />
      </div>

      <div className="form-group">
        <label className="form-label">Password</label>
        <div className="form-input-wrapper">
          <input 
            type={showPassword ? "text" : "password"} 
            className="form-input" 
            placeholder="••••••••" 
          />
          <div className="input-icon-right" onClick={() => setShowPassword(!showPassword)}>
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </div>
        </div>
      </div>

      <div className="forgot-password">Forgot password?</div>

      <button className="btn-primary">Log In</button>

      <div className="divider">
        <span>OR</span>
      </div>

      <button className="btn-social">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z" fill="#4285F4"/>
          <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4205 9 14.4205C6.65591 14.4205 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="#34A853"/>
          <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
          <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4673 0.891818 11.43 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z" fill="#EA4335"/>
        </svg>
        Log In with Google
      </button>

      <div className="footer-text">
        Don't have an account? 
        <span className="link-text" onClick={() => onViewChange('register')}>Sign up</span>
      </div>
    </>
  );
};

const RegisterView = ({ onViewChange }) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <>
      <div className="logo-container">
         <Play className="logo-icon" fill="white" />
      </div>
      <h2 className="title">Create your account</h2>
      
      <div className="form-group">
        <label className="form-label">Full Name</label>
        <input type="text" className="form-input" placeholder="John Doe" />
      </div>

      <div className="form-group">
        <label className="form-label">Email</label>
        <input type="email" className="form-input" placeholder="hello.designveli@gmail.com" />
      </div>

      <div className="form-group">
        <label className="form-label">Password</label>
        <div className="form-input-wrapper">
          <input 
            type={showPassword ? "text" : "password"} 
            className="form-input" 
            placeholder="••••••••" 
          />
          <div className="input-icon-right" onClick={() => setShowPassword(!showPassword)}>
             {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </div>
        </div>
      </div>

      <button className="btn-primary" style={{ marginTop: 20 }}>Sign Up</button>

       <div className="divider">
        <span>OR</span>
      </div>

       <button className="btn-social">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z" fill="#4285F4"/>
          <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4205 9 14.4205C6.65591 14.4205 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="#34A853"/>
          <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
          <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4673 0.891818 11.43 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z" fill="#EA4335"/>
        </svg>
        Sign Up with Google
      </button>


      <div className="footer-text">
        Already have an account? 
        <span className="link-text" onClick={() => onViewChange('login')}>Log In</span>
      </div>
    </>
  );
};

export default AuthPage;
