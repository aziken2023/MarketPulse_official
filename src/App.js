import React, { useState, useEffect } from "react";
import axios from "axios";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from "react-router-dom";
import { updateDoc } from "firebase/firestore"; 
import { updatePassword, sendPasswordResetEmail } from "firebase/auth";
import 'react-phone-number-input/style.css';
import PhoneInput from 'react-phone-number-input';
import { initializeApp } from "firebase/app";
import './index.css';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, setDoc, doc, getDoc } from "firebase/firestore";
import { firebaseConfig, auth, db } from './firebaseconfig';
import Plot from 'react-plotly.js';

const app = initializeApp(firebaseConfig);

function Sidebar() {
  return (
    <div className="sidebar">
      <ul>
        <li><Link to="/dashboard">Dashboard</Link></li>
        <li><Link to="/account">Account</Link></li>
      </ul>
    </div>
  );
}

function Home() {
  return (
    <div>
      <h1>Welcome to MoneyPulse!</h1>
      <p>Make smart business decisions powered by consumer insights.</p>
      <p>
        Please <Link to="/login">Log in</Link> or <Link to="/register">Register</Link> to get started.
      </p>
    </div>
  );
}

function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  return (
    <div className="container">
      <div className="form-container">
        {isLogin ? (
          <LoginForm switchForm={() => setIsLogin(false)} />
        ) : (
          <RegisterForm switchForm={() => setIsLogin(true)} />
        )}
      </div>
    </div>
  );
}

function LoginForm({ switchForm }) {
  const navigate = useNavigate();
  const [companyEmail, setCompanyEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, companyEmail, password);
      const user = userCredential.user;
      console.log("Logged in as:", user.uid);
      navigate("/dashboard");
    } catch (error) {
      setError("Invalid credentials. Please try again.");
    }
  };

  return (
    <div>
      <h1>Login</h1>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleLogin}>
        <input type="email" placeholder="Company Email" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit">Login</button>
      </form>
      <p>
        Don't have an account? <button onClick={switchForm}>Register</button>
      </p>
    </div>
  );
}

function RegisterForm({ switchForm }) {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyPosition, setCompanyPosition] = useState("");
  const [companyCountry, setCompanyCountry] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const isPasswordValid = (password) => {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/.test(password);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }
    if (!isPasswordValid(password)) {
      setError("Password must be at least 6 characters long, include uppercase, lowercase, number, and special character.");
      return;
    }
    setError("");
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, companyEmail, password);
      const user = userCredential.user;
      await setDoc(doc(db, "users", user.uid), {
        firstName,
        lastName,
        companyEmail,
        companyName,
        companyPosition,
        companyCountry,
        createdAt: new Date(),
      });
      navigate("/login");
    } catch (error) {
      console.error("Error registering user:", error);
      setError("An error occurred during registration. Please try again.");
    }
  };

  return (
    <div>
      <h1>Register</h1>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleRegister}>
        <input type="text" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        <input type="text" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        <input type="email" placeholder="Company Email" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} />
        <input type="text" placeholder="Company Name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
        <input type="text" placeholder="Position" value={companyPosition} onChange={(e) => setCompanyPosition(e.target.value)} />
        <input type="text" placeholder="Country" value={companyCountry} onChange={(e) => setCompanyCountry(e.target.value)} />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        <button type="submit">Register</button>
      </form>
      <p>
        Already have an account? <button onClick={switchForm}>Login</button>
      </p>
    </div>
  );
}

function Account() {
  return (
    <div>
      <h1>Account Settings</h1>
      <p>Manage your account details here.</p>
      {/* You can add forms or more functionality as needed */}
    </div>
  );
}

function Dashboard() {
  const [file, setFile] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      const fetchData = async () => {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserData(docSnap.data());
        } else {
          console.log("No such document!");
        }
        setLoading(false);
      };
      fetchData();
    } else {
      navigate("/login");
    }
  }, [navigate]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleGenerateGraph = async () => {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await axios.post("http://127.0.0.1:8000/upload-dataset", formData);
      alert(response.data.message);
      setAnalytics(response.data.analytics);
    } catch (error) {
      console.error("Error generating graph:", error);
    }
  };

  if (loading) {
    return <p>Loading...</p>;
  }

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="content">
        <h1>Dashboard</h1>
        {userData && (
          <div className="welcome-message">
            <h2>Welcome, {userData.firstName} {userData.lastName}!</h2>
            <p>You are logged in as a member of <strong>{userData.companyName}</strong>.</p>
          </div>
        )}
        <div>
          <h3>Upload Excel/CSV Files</h3>
          <input type="file" accept=".csv" onChange={handleFileChange} />
          <button onClick={handleGenerateGraph}>Generate Graph</button>
        </div>
        {analytics && (
          <div>
            <h2>Analytics</h2>
            <pre>{JSON.stringify(analytics, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

// Main App Component
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/account" element={<Account />} />
        <Route path="/login" element={<Auth />} />
        <Route path="/register" element={<Auth />} />
      </Routes>
    </Router>
  );
}

export default App;
