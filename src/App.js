import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useNavigate,
  useLocation,
  Navigate,
} from "react-router-dom";
import {
  getAuth,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateEmail,
  onAuthStateChanged,
} from "firebase/auth";
import { auth, db } from "./firebaseconfig";
import { doc, setDoc, getDoc } from "firebase/firestore";
import Plot from "react-plotly.js";
import axios from "axios";
import Papa from "papaparse"; // Ensure Papa Parse is installed
import "./index.css";

// ------------------ ProtectedRoute Component ------------------
function ProtectedRoute({ children }) {
  const [user, setUser] = useState(null);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);
  if (user === null) return null; // Optionally display a loader here
  return user ? children : <Navigate to="/login" />;
}

// ------------------ Report Component ------------------
function ConsumerShoppingBehaviourReport({ consumerReport }) {
  if (!consumerReport) return null;
  return (
    <div className="report-box">
      <h3 className="report-title">Consumer Shopping Behaviour Report</h3>
      <p>{consumerReport.general_summary}</p>
      <h4>Business Recommendations</h4>
      <ul>
        {consumerReport.business_recommendations &&
          consumerReport.business_recommendations.map((rec, idx) => (
            <li key={idx}>{rec}</li>
          ))}
      </ul>
      <h4>Prediction</h4>
      <p>{consumerReport.prediction}</p>
    </div>
  );
}

// ------------------ Top Navigation ------------------
function TopNav() {
  const navigate = useNavigate();
  const handleSignOut = async () => {
    if (window.confirm("Are you sure you want to sign out?")) {
      try {
        await signOut(auth);
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
          <li>
            <Link to="/dashboard">Dashboard</Link>
          </li>
          <li>
            <Link to="/account">Account</Link>
          </li>
          <li>
            <button type="button" onClick={handleSignOut}>
              Sign Out
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}

// ------------------ Home ------------------
function Home() {
  return (
    <div className="container home-container">
      <h1>Welcome to MarketPulse!</h1>
      <p>
        Get the latest insights on consumer behaviour and make data-driven
        decisions to grow your business.
      </p>
      <p>
        Please <Link to="/login">Log in</Link> or{" "}
        <Link to="/register">Register</Link> to access full features.
      </p>
    </div>
  );
}

// ------------------ Auth (Login/Register) ------------------
function Auth() {
  const location = useLocation();
  const initialIsLogin = location.pathname === "/login";
  const [isLogin, setIsLogin] = useState(initialIsLogin);
  useEffect(() => {
    setIsLogin(location.pathname === "/login");
  }, [location.pathname]);

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
      await signInWithEmailAndPassword(auth, companyEmail, password);
      navigate("/dashboard");
    } catch (error) {
      setError("Invalid credentials. Please try again.");
    }
  };
  return (
    <div>
      <h1 style={{ textAlign: "center" }}>Login</h1>
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
      <p style={{ textAlign: "center" }}>
        Don't have an account?{" "}
        <button type="button" onClick={() => navigate("/register")}>
          Register
        </button>
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
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/.test(
      password
    );
  const handleRegister = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword)
      return setError("Passwords do not match!");
    if (!isPasswordValid(password))
      return setError("Weak password. Use a stronger one.");
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        companyEmail,
        password
      );
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
      <h1 style={{ textAlign: "center" }}>Register</h1>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleRegister} className="register-form">
        <div className="form-group">
          <input
            type="text"
            placeholder="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <input
            type="text"
            placeholder="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
        <div className="form-group">
          <input
            type="email"
            placeholder="Company Email"
            value={companyEmail}
            onChange={(e) => setCompanyEmail(e.target.value)}
          />
          <input
            type="text"
            placeholder="Company Name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
        </div>
        <div className="form-group">
          <input
            type="text"
            placeholder="Position"
            value={companyPosition}
            onChange={(e) => setCompanyPosition(e.target.value)}
          />
          <input
            type="text"
            placeholder="Country"
            value={companyCountry}
            onChange={(e) => setCompanyCountry(e.target.value)}
          />
        </div>
        <div className="form-group">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <button type="submit">Register</button>
      </form>
      <p style={{ textAlign: "center" }}>
        Already have an account?{" "}
        <button type="button" onClick={() => navigate("/login")}>
          Login
        </button>
      </p>
    </div>
  );
}

// ------------------ Account ------------------
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
    <div className="account-page" style={{ textAlign: "center" }}>
      <h2>User Account Information</h2>
      <div className="account-card">
        <p>
          <strong>First Name:</strong> {userInfo.firstName}
        </p>
        <p>
          <strong>Last Name:</strong> {userInfo.lastName}
        </p>
        <p>
          <strong>Email:</strong> {userInfo.companyEmail}
        </p>
        <p>
          <strong>Company Name:</strong> {userInfo.companyName}
        </p>
        <p>
          <strong>Position:</strong> {userInfo.companyPosition}
        </p>
        <p>
          <strong>Country:</strong> {userInfo.companyCountry}
        </p>
      </div>
      <div className="account-actions">
        <button onClick={handlePasswordReset}>Reset Password</button>
        <button onClick={() => handleEmailChange(prompt("Enter new email:"))}>
          Change Email
        </button>
      </div>
    </div>
  );
}

// ------------------ FilteredChart Component ------------------
function FilteredChart({ col, originalData }) {
  const sampleValue = originalData.find(
    (row) => row[col] !== undefined && row[col] !== null
  )?.[col];
  const isNumeric = typeof sampleValue === "number";
  const uniqueValues = Array.from(
    new Set(
      originalData
        .map((row) => row[col])
        .filter((x) => x !== undefined && x !== null)
    )
  );
  const [selectedValues, setSelectedValues] = useState([]);
  const filteredData = originalData.filter((row) => {
    if (selectedValues.length === 0) return true;
    return selectedValues.includes(row[col].toString());
  });
  let chartData;
  if (!isNumeric) {
    const counts = {};
    filteredData.forEach((row) => {
      const value = row[col];
      counts[value] = (counts[value] || 0) + 1;
    });
    chartData = [
      {
        x: Object.keys(counts),
        y: Object.values(counts),
        type: "bar",
        marker: { color: "#2980b9" },
      },
    ];
  } else {
    const values = filteredData.map((row) => row[col]);
    chartData = [
      {
        x: values,
        type: "histogram",
        marker: { color: "#2980b9" },
      },
    ];
  }
  return (
    <div className="filtered-chart">
      <h4>{col}</h4>
      {!isNumeric && (
        <div className="filter-control">
          <label>Filter categories:</label>
          <select
            multiple
            value={selectedValues}
            onChange={(e) => {
              const options = Array.from(
                e.target.selectedOptions,
                (option) => option.value
              );
              setSelectedValues(options);
            }}
          >
            {uniqueValues.map((val, idx) => (
              <option key={idx} value={val.toString()}>
                {val.toString()}
              </option>
            ))}
          </select>
        </div>
      )}
      <Plot
        data={chartData}
        layout={{ title: `Filtered Distribution of ${col}` }}
      />
    </div>
  );
}

// ------------------ Dashboard ------------------
function Dashboard() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState(null);
  const [insights, setInsights] = useState(null);
  const [consumerReport, setConsumerReport] = useState(null);
  const [chartsByColumn, setChartsByColumn] = useState({});
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState({});
  const [graphFilter, setGraphFilter] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [uploadedData, setUploadedData] = useState([]);
  const navigate = useNavigate();

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
    setLoading(true);
    try {
      // Save raw file data for in-chart filtering using Papa Parse
      const fileReader = new FileReader();
      fileReader.onload = () => {
        const content = fileReader.result;
        let data;
        if (file.name.endsWith(".csv")) {
          data = Array.from(Papa.parse(content, { header: true }).data);
        } else {
          data = [];
        }
        setUploadedData(data);
      };
      fileReader.readAsText(file);

      const response = await axios.post(
        "http://localhost:8000/recommend-business",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setMessage("Analysis completed.");
      setInsights(response.data.insights || {});
      setConsumerReport(response.data.consumer_report || {});
      setChartsByColumn(response.data.charts_by_column || {});
    } catch (error) {
      setMessage("Error uploading file. Please try again.");
      console.error(error);
    }
    setLoading(false);
  };

  const getFilteredSortedKeys = () => {
    let keys = Object.keys(chartsByColumn);
    keys = keys.filter((key) =>
      key.toLowerCase().includes(graphFilter.toLowerCase())
    );
    keys.sort((a, b) =>
      sortOrder === "asc" ? a.localeCompare(b) : b.localeCompare(a)
    );
    return keys;
  };

  const handleDownloadReport = () => {
    if (!consumerReport) return;
    const reportText = `
===== Consumer Shopping Behaviour Report =====

General Summary:
${consumerReport.general_summary}

Business Recommendations:
${consumerReport.business_recommendations
  .map((rec, idx) => `${idx + 1}. ${rec}`)
  .join("\n")}

Prediction:
${consumerReport.prediction}
`;
    const fileName = `${
      userInfo.companyName
        ? userInfo.companyName.replace(/\s+/g, "_")
        : "Report"
    }_Report.txt`;
    const blob = new Blob([reportText], { type: "text/plain" });
    const link = document.createElement("a");
    link.download = fileName;
    link.href = URL.createObjectURL(blob);
    link.click();
  };

  return (
    <div className="dashboard">
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
        Welcome, {userInfo.firstName} {userInfo.lastName} from{" "}
        {userInfo.companyName}
      </h2>

      <div className="upload-section">
        <h3>Upload Dataset</h3>
        <input type="file" accept=".csv, .xlsx" onChange={handleFileChange} />
        <button onClick={handleFileUpload}>Upload</button>
      </div>

      {loading && (
        <p className="loading">⏳ Processing data, please wait...</p>
      )}
      {message && <p className="message">{message}</p>}

      {insights && (
        <div className="insights-box">
          <h3>Overall Insights</h3>
          <p>Total Entries: {insights.total_entries}</p>
          <p>Total Columns: {insights.total_columns}</p>
        </div>
      )}

      {consumerReport && (
        <ConsumerShoppingBehaviourReport consumerReport={consumerReport} />
      )}

      <div className="chart-section">
        <h3>Data Visualizations</h3>
        <div className="chart-controls">
          <input
            type="text"
            placeholder="Filter charts by column name..."
            value={graphFilter}
            onChange={(e) => setGraphFilter(e.target.value)}
          />
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="asc">Sort Ascending</option>
            <option value="desc">Sort Descending</option>
          </select>
        </div>
        {getFilteredSortedKeys().map((col, index) => (
          <div key={index} className="chart-box">
            {uploadedData.length > 0 ? (
              <FilteredChart col={col} originalData={uploadedData} />
            ) : (
              <Plot
                data={JSON.parse(chartsByColumn[col]).data}
                layout={JSON.parse(chartsByColumn[col]).layout}
              />
            )}
          </div>
        ))}
      </div>

      <div className="download-section">
        <button onClick={handleDownloadReport}>⬇️ Download Report</button>
      </div>
    </div>
  );
}

// ------------------ Main App ------------------
function App() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  return (
    <Router>
      {user && <TopNav />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Auth />} />
        <Route path="/register" element={<Auth />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <Account />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<h2>404 - Page not found</h2>} />
      </Routes>
    </Router>
  );
}

export default App;
