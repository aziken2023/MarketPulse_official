import React, { useState, useEffect } from "react";
import axios from "axios";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from "react-router-dom";
import {  updateDoc } from "firebase/firestore"; 
import { updatePassword } from "firebase/auth";
import { sendPasswordResetEmail } from "firebase/auth";
import 'react-phone-number-input/style.css';
import PhoneInput from 'react-phone-number-input';
import { initializeApp } from "firebase/app";
import './index.css'; // Import the CSS file
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, setDoc, doc, getDoc } from "firebase/firestore"; // Import Firestore methods
import { firebaseConfig, auth, db } from './firebaseconfig'; // Correct named imports
import Plot from 'react-plotly.js'; // Plotly component for graphs

const app = initializeApp(firebaseConfig);

// Sidebar Component
function Sidebar() {
  return (
    <div className="sidebar">
      <ul>
        <li><Link to="/dashboard">Dashboard</Link></li>
        <li><Link to="/consumer-insight">Consumer Insight</Link></li>
        <li><Link to="/product-review">Product Review</Link></li>
        <li><Link to="/reports-recommendations">Reports & Recommendations</Link></li>
        <li><Link to="/account">Account</Link></li>
      </ul>
    </div>
  );
}

// Home Component (Before Login)
function Home() {
  return (
    <div>
      <h1>Welcome to MarketPulse!</h1>
      <p>Get the latest insights on consumer behavior and make data-driven decisions with our platform.</p>
      <p>
        Please <Link to="/login">Log in</Link> or <Link to="/register">Register</Link> to access the full features.
      </p>
    </div>
  );
}

// Auth Component (Login and Register)
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

// Login Form Component
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
        Don't have an account? <button onClick={switchForm}>Register</button>
      </p>
    </div>
  );
}

// Register Form Component
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
      setError("Password must be at least 6 characters long, contain an uppercase letter, a lowercase letter, a number, and a special character.");
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

// Dashboard Component
function Dashboard() {
  const [file, setFile] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [userData, setUserData] = useState(null); // State to store user data
  const [loading, setLoading] = useState(true); // Loading state
  const navigate = useNavigate();

  // Fetch user data from Firestore
  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      const fetchData = async () => {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setUserData(docSnap.data()); // Set user data
        } else {
          console.log("No such document!");
        }
        setLoading(false); // Stop loading
      };
      fetchData();
    } else {
      navigate("/login"); // Redirect to login if user is not logged in
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
    return <p>Loading...</p>; // Show loading message while fetching user data
  }

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="content">
        <h1>Dashboard</h1>
        {/* Welcome message with user's name and company */}
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
// Consumer Insight Component
function ConsumerInsight() {
  const [file, setFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState("");
  const [clusters, setClusters] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [recommendations, setRecommendations] = useState([]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post("http://127.0.0.1:8000/upload-consumer-data", formData);
      setUploadMessage(response.data.message);
    } catch (error) {
      setUploadMessage("Failed to upload dataset.");
    }
  };

  const fetchClusters = async () => {
    try {
      const response = await axios.post("http://127.0.0.1:8000/cluster-users");
      setClusters(response.data);
    } catch (error) {
      console.error("Error fetching clusters:", error);
    }
  };

  const fetchPredictions = async () => {
    try {
      const response = await axios.post("http://127.0.0.1:8000/predict-conversion");
      setPredictions(response.data);
    } catch (error) {
      console.error("Error fetching predictions:", error);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const response = await axios.post("http://127.0.0.1:8000/recommend-products");
      setRecommendations(response.data);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
    }
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="content">
        <h1>Consumer Insight</h1>
        <div>
          <h3>Upload Consumer Data</h3>
          <input type="file" accept=".csv" onChange={handleFileChange} />
          <button onClick={handleUpload}>Upload</button>
          {uploadMessage && <p>{uploadMessage}</p>}
        </div>
        <div>
          <button onClick={fetchClusters}>Fetch Clusters</button>
          <button onClick={fetchPredictions}>Fetch Predictions</button>
          <button onClick={fetchRecommendations}>Fetch Recommendations</button>
        </div>
        <div>
          <h2>Clusters</h2>
          <pre>{JSON.stringify(clusters, null, 2)}</pre>
          <h2>Predictions</h2>
          <pre>{JSON.stringify(predictions, null, 2)}</pre>
          <h2>Recommendations</h2>
          <pre>{JSON.stringify(recommendations, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}

// Product Review Component
function ProductReview() {
  const [file, setFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState("");
  const [sentiments, setSentiments] = useState([]);
  const [ratings, setRatings] = useState([]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post("http://127.0.0.1:8000/upload-consumer-data", formData);
      setUploadMessage(response.data.message);
    } catch (error) {
      setUploadMessage("Failed to upload dataset.");
    }
  };

  const fetchSentiments = async () => {
    try {
      const response = await axios.post("http://127.0.0.1:8000/analyze-sentiment");
      setSentiments(response.data);
    } catch (error) {
      console.error("Error fetching sentiments:", error);
    }
  };

  const fetchRatings = async () => {
    try {
      const response = await axios.post("http://127.0.0.1:8000/predict-rating");
      setRatings(response.data);
    } catch (error) {
      console.error("Error fetching ratings:", error);
    }
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="content">
        <h1>Product Review</h1>
        <div>
          <h3>Upload Product Review Data</h3>
          <input type="file" accept=".csv" onChange={handleFileChange} />
          <button onClick={handleUpload}>Upload</button>
          {uploadMessage && <p>{uploadMessage}</p>}
        </div>
        <div>
          <button onClick={fetchSentiments}>Analyze Sentiment</button>
          <button onClick={fetchRatings}>Predict Ratings</button>
        </div>
        <div>
          <h2>Sentiments</h2>
          <pre>{JSON.stringify(sentiments, null, 2)}</pre>
          <h2>Predicted Ratings</h2>
          <pre>{JSON.stringify(ratings, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}

// Reports & Recommendations Component
function ReportsRecommendations() {
  const [file, setFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState("");
  const [forecast, setForecast] = useState([]);
  const [anomalies, setAnomalies] = useState([]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post("http://127.0.0.1:8000/upload-consumer-data", formData);
      setUploadMessage(response.data.message);
    } catch (error) {
      setUploadMessage("Failed to upload dataset.");
    }
  };

  const fetchForecast = async () => {
    try {
      const response = await axios.post("http://127.0.0.1:8000/forecast-sales");
      setForecast(response.data);
    } catch (error) {
      console.error("Error fetching forecast:", error);
    }
  };

  const fetchAnomalies = async () => {
    try {
      const response = await axios.post("http://127.0.0.1:8000/detect-anomalies");
      setAnomalies(response.data);
    } catch (error) {
      console.error("Error fetching anomalies:", error);
    }
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="content">
        <h1>Reports & Recommendations</h1>
        <div>
          <h3>Upload Sales Data</h3>
          <input type="file" accept=".csv" onChange={handleFileChange} />
          <button onClick={handleUpload}>Upload</button>
          {uploadMessage && <p>{uploadMessage}</p>}
        </div>
        <div>
          <button onClick={fetchForecast}>Fetch Sales Forecast</button>
          <button onClick={fetchAnomalies}>Detect Anomalies</button>
        </div>
        <div>
          <h2>Sales Forecast</h2>
          <pre>{JSON.stringify(forecast, null, 2)}</pre>
          <h2>Anomalies</h2>
          <pre>{JSON.stringify(anomalies, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}

// Account Component
function Account() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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

  const handlePasswordReset = async () => {
    const user = auth.currentUser;
    if (user) {
      try {
        await sendPasswordResetEmail(auth, user.email);
        alert("Password reset email sent. Please check your inbox.");
      } catch (error) {
        setError("Failed to send password reset email. Please try again later.");
      }
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/login");
  };

  if (loading) {
    return <p>Loading...</p>;
  }

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="content">
        <h1>My Account</h1>
        <p>Manage your profile and settings.</p>

        {userData && (
          <div className="user-info">
            <h2>Profile Information</h2>
            <div className="user-profile-columns">
              <div className="user-details">
                <p><strong>First Name:</strong> {userData.firstName}</p>
                <p><strong>Last Name:</strong> {userData.lastName}</p>
                <p><strong>Email:</strong> {userData.companyEmail}</p>
                <p><strong>Company:</strong> {userData.companyName}</p>
                <p><strong>Position:</strong> {userData.companyPosition}</p>
                <p><strong>Country:</strong> {userData.companyCountry}</p>
              </div>
            </div>
          </div>
        )}

        <div className="account-actions">
          <h3>Reset Password</h3>
          <p>Click the link below to reset your password:</p>
          <button onClick={handlePasswordReset}>Send Reset Link</button>
          {error && <p className="error">{error}</p>}
        </div>

        <div className="logout-section">
          <button onClick={handleLogout}>Logout</button>
        </div>
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
        <Route path="/consumer-insight" element={<ConsumerInsight />} />
        <Route path="/product-review" element={<ProductReview />} />
        <Route path="/reports-recommendations" element={<ReportsRecommendations />} />
        <Route path="/account" element={<Account />} />
        <Route path="/login" element={<Auth />} />
        <Route path="/register" element={<Auth />} />
      </Routes>
    </Router>
  );
}

export default App;
