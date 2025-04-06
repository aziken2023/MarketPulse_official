import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from "react-router-dom";
import { getAuth, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, updateEmail } from "firebase/auth";
import { auth, db } from './firebaseconfig'; // Ensure Firebase configuration is imported
import { doc, setDoc, getDoc } from "firebase/firestore";
import Plot from 'react-plotly.js'; // Plotly component for visualizations
import axios from "axios";
import "./index.css";
import { onAuthStateChanged } from "firebase/auth";
import { useLocation } from 'react-router-dom';



function TopNav() {
  const navigate = useNavigate();
  const handleSignOut = async () => {
    if (window.confirm("Are you sure you want to sign out?")) {
      try {
        await signOut(auth);
        console.log("Signed out successfully");
        navigate("/login");
      } catch (error) {
        console.error("Error signing out:", error);
      }
    }
  };

  return (
    <div className="top-nav">
      <div className="logo">MarketPulse</div>
      <div className="nav-links">
        <ul>
          <li><Link to="/dashboard">Dashboard</Link></li>
          <li><Link to="/account">Account</Link></li>
          <li><button type="button" onClick={handleSignOut}>Sign Out</button></li>
        </ul>
      </div>
    </div>
  );
}

function Home() {
  return (
    <div className="container">
      <h1>Welcome to MarketPulse!</h1>
      <p>Get the latest insights on consumer behavior and make data-driven decisions with our platform.</p>
      <p>
        Please <Link to="/login">Log in</Link> or <Link to="/register">Register</Link> to access the full features.
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
  <LoginForm switchForm={() => setIsLogin(false)} /> // Just use LoginForm directly
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
      console.log("Logged in as:", userCredential.user.uid);
      navigate("/dashboard"); // Navigates to the dashboard after successful login
    } catch (error) {
      setError("Invalid credentials. Please try again.");
    }
  };

  return (
    <div>
      <h1>Login</h1>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleLogin}>
        <input 
          type="email" 
          placeholder="Company Email" 
          value={companyEmail} 
          onChange={(e) => setCompanyEmail(e.target.value)} 
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
        />
        <button type="submit">Login</button>
      </form>
      <p>
        Don't have an account? 
        <button type="button" onClick={switchForm}>Register</button>
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

  const isPasswordValid = (password) =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/.test(password);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) return setError("Passwords do not match!");
    if (!isPasswordValid(password)) return setError("Weak password. Use a stronger one.");

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
      setError("An error occurred during registration.");
    }
  };

  return (
    <div>
      <h1>Register</h1>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleRegister} className="register-form">
        <div className="form-group">
          <input type="text" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          <input type="text" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
        <div className="form-group">
          <input type="email" placeholder="Company Email" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} />
          <input type="text" placeholder="Company Name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
        </div>
        <div className="form-group">
          <input type="text" placeholder="Position" value={companyPosition} onChange={(e) => setCompanyPosition(e.target.value)} />
          <input type="text" placeholder="Country" value={companyCountry} onChange={(e) => setCompanyCountry(e.target.value)} />
        </div>
        <div className="form-group">
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        </div>
        <button type="submit">Register</button>
      </form>
      <p>
        Already have an account? <button type="button" onClick={switchForm}>Login</button>
      </p>
    </div>
  );
}

function Account() {
  const [userInfo, setUserInfo] = useState({});
  useEffect(() => {
    const fetchUserInfo = async () => {
      const user = auth.currentUser;
      if (user) {
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) setUserInfo(docSnap.data());
      }
    };
    fetchUserInfo();
  }, []);

  const handlePasswordReset = () => {
    const user = auth.currentUser;
    if (user) {
      sendPasswordResetEmail(auth, user.email)
        .then(() => alert("Password reset email sent!"))
        .catch(console.error);
    }
  };

  const handleEmailChange = (newEmail) => {
    const user = auth.currentUser;
    if (user) {
      updateEmail(user, newEmail)
        .then(() => alert("Email address updated!"))
        .catch(console.error);
    }
  };

  return (
    <div className="account-page">
      <h2>User Account Information</h2>
      <p><strong>First Name:</strong> {userInfo.firstName}</p>
      <p><strong>Last Name:</strong> {userInfo.lastName}</p>
      <p><strong>Email:</strong> {userInfo.companyEmail}</p>
      <p><strong>Company Name:</strong> {userInfo.companyName}</p>
      <p><strong>Position:</strong> {userInfo.companyPosition}</p>
      <p><strong>Country:</strong> {userInfo.companyCountry}</p>
      <button onClick={handlePasswordReset}>Reset Password</button>
      <button onClick={() => handleEmailChange(prompt("Enter new email:"))}>Change Email</button>
    </div>
  );
}

function Dashboard() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [userInfo, setUserInfo] = useState({});

  useEffect(() => {
    const fetchUserInfo = async () => {
      const user = auth.currentUser;
      if (user) {
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) {
          setUserInfo(docSnap.data());
        }
      }
    };
    fetchUserInfo();
  }, []);

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const handleFileUpload = async () => {
    if (!file) {
      alert("Please select a file to upload.");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await axios.post("http://localhost:8000/upload-dataset", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage(response.data.message || response.data.error);
      if (response.data.message) {
        fetchRecommendations();
      }
    } catch (error) {
      setMessage("Error uploading file. Please try again.");
      console.error(error);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const response = await axios.post("http://localhost:8000/recommend-business");
      setRecommendations(response.data.recommendations || []);
    } catch (error) {
      setMessage("Error fetching recommendations.");
      console.error(error);
    }
  };

  return (
    <div className="dashboard">
      <h2>
        Welcome, {userInfo.firstName} {userInfo.lastName} from {userInfo.companyName}
      </h2>
      <h3>Upload Dataset</h3>
      <input type="file" accept=".csv, .xlsx" onChange={handleFileChange} />
      <button onClick={handleFileUpload}>Upload</button>
      {message && <p>{message}</p>}
      {recommendations.length > 0 && (
        <div>
          <h3>Business Recommendations:</h3>
          <ul>
            {recommendations.map((recommendation, index) => (
              <li key={index}>{recommendation}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    // Listen to URL changes
    const handleRouteChange = () => setCurrentPath(window.location.pathname);
    window.addEventListener("popstate", handleRouteChange);
    return () => {
      unsubscribe();
      window.removeEventListener("popstate", handleRouteChange);
    };
  }, []);

  const hideTopNavRoutes = ["/login", "/register", "/"];
  const shouldShowTopNav = !hideTopNavRoutes.includes(currentPath);

  return (
    <Router>
      {shouldShowTopNav && <TopNav />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Auth />} />
        <Route path="/register" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/account" element={<Account />} />
      </Routes>
    </Router>
  );
}

export default App;