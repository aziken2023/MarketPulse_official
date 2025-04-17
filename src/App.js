// App.js
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
import Papa from "papaparse";
import "./index.css";

// ------------------ PredictionChart Component ------------------
function PredictionChart({ predictions }) {
  if (
    !predictions ||
    (Array.isArray(predictions) && predictions.length === 0) ||
    typeof predictions === "string"
  ) {
    return <p>No predictions available.</p>;
  }
  const data = [
    {
      x: predictions.map((_, i) => i + 1),
      y: predictions,
      type: "scatter",
      mode: "lines+markers",
      marker: { color: "#2980b9" },
      hovertemplate: 'Index: %{x}<br>Prediction: %{y:.2f}<extra></extra>',
    },
  ];
  const layout = {
    title: "Prediction Trend",
    xaxis: { title: "Index" },
    yaxis: { title: "Prediction Value", hoverformat: ".2f" },
    margin: { t: 40, r: 20, b: 50, l: 50 },
  };
  return (
    <div className="chart-box">
      <Plot
        data={data}
        layout={layout}
        config={{
          displayModeBar: true,
          toImageButtonOptions: {
            format: "png",
            filename: "prediction-chart",
            height: 600,
            width: 800,
            scale: 1,
          },
        }}
      />
    </div>
  );
}

// ------------------ ProtectedRoute Component ------------------
function ProtectedRoute({ children }) {
  const [user, setUser] = useState(null);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);
  if (user === null) return null;
  return user ? children : <Navigate to="/login" />;
}

// ------------------ Report Component ------------------
function ConsumerShoppingBehaviourReport({ consumerReport, insights }) {
  if (!consumerReport) return null;
  return (
    <div className="report-box">
      <h3 className="report-title">Consumer Shopping Behaviour Report</h3>
      {/* Clear Key Performance Indicators */}
      <div className="kpi-section">
        <p>
          <strong>Total Entries:</strong> {insights.total_entries}
        </p>
        <p>
          <strong>Total Columns:</strong> {insights.total_columns}
        </p>
      </div>
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

// ------------------ GeminiChatbot Component ------------------
function GeminiChatbot({ datasetContext, customerSegments }) {
  const [conversation, setConversation] = useState([]);
  const [userInput, setUserInput] = useState("");

  const handleSend = async () => {
    if (!userInput.trim()) return;
    setConversation((prev) => [...prev, { sender: "user", text: userInput }]);
    try {
      const response = await axios.post("http://localhost:8000/gemini-chatbot", {
        query: userInput,
        datasetContext,
        customerSegments,
      });
      const botReply = response.data.response;
      setConversation((prev) => [...prev, { sender: "bot", text: botReply }]);
    } catch (error) {
      console.error("Chatbot error:", error);
      setConversation((prev) => [
        ...prev,
        { sender: "bot", text: "Sorry, something went wrong." },
      ]);
    }
    setUserInput("");
  };

  return (
    <div
      className="gemini-chatbot"
      style={{
        marginTop: "20px",
        padding: "20px",
        background: "rgba(255,255,255,0.95)",
        borderRadius: "8px",
        boxShadow: "0 6px 14px rgba(0, 0, 0, 0.05)",
      }}
    >
      <h3>Business Recommendations Chatbot</h3>
      <div
        className="chat-window"
        style={{
          border: "1px solid #ccc",
          padding: "10px",
          maxHeight: "300px",
          overflowY: "scroll",
          background: "#fff",
          borderRadius: "5px",
        }}
      >
        {conversation.map((msg, idx) => (
          <div
            key={idx}
            style={{
              margin: "10px 0",
              textAlign: msg.sender === "bot" ? "left" : "right",
            }}
          >
            <strong>{msg.sender === "bot" ? "Bot:" : "You:"}</strong>{" "}
            {msg.text}
          </div>
        ))}
      </div>
      <div className="chat-input" style={{ marginTop: "10px", display: "flex" }}>
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Ask business improvement questions..."
          style={{
            flex: 1,
            padding: "8px",
            borderRadius: "5px",
            border: "1px solid #ddd",
          }}
        />
        <button onClick={handleSend} style={{ padding: "8px 12px", marginLeft: "10px" }}>
          Send
        </button>
      </div>
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
      <div className="logo">MarketPro</div>
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
      <h1>Welcome to MarketPro!</h1>
      <p>
        Get the latest insights on consumer behaviour and make data-driven decisions to grow your business.
      </p>
      <p>
        Please <Link to="/login">Log in</Link> or <Link to="/register">Register</Link> to access full features.
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
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/.test(password);
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
        config={{
          displayModeBar: true,
          toImageButtonOptions: {
            format: "png",
            filename: `chart-${col}`,
            height: 600,
            width: 800,
            scale: 1,
          },
        }}
      />
    </div>
  );
}

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

      const response = await axios.post("http://localhost:8000/recommend-business", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
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

  const handleDownloadReport = async () => {
    if (!file) {
      alert("Please upload a file first to generate the report.");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await axios.post("http://localhost:8000/download-report-pdf", formData, {
        responseType: "blob",
        headers: { "Content-Type": "multipart/form-data" },
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const fileName = `${
        userInfo.companyName ? userInfo.companyName.replace(/\s+/g, "_") : "Report"
      }_Report.pdf`;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Error downloading PDF:", error);
    }
  };

  // Use the extended_context if available, otherwise fall back to the general summary.
  const datasetContext = consumerReport
    ? consumerReport.extended_context || consumerReport.general_summary
    : "Dataset context not available";

  // Extract customer segments based on column names (adjust this logic as needed)
  const customerSegments =
    consumerReport && consumerReport.column_specific_recommendations
      ? Object.keys(consumerReport.column_specific_recommendations).filter((col) =>
          col.toLowerCase().includes("segment")
        )
      : [];

  return (
    <div className="dashboard">
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
        Welcome, {userInfo.firstName} {userInfo.lastName} from {userInfo.companyName}
      </h2>

      <div className="upload-section">
        <h3>Upload Dataset</h3>
        {/* Custom-styled file upload input */}
        <label
          htmlFor="file-upload"
          className="custom-file-upload"
          style={{
            padding: "12px 20px",
            background: "linear-gradient(45deg, #2980b9, #1abc9c)",
            color: "#fff",
            borderRadius: "8px",
            cursor: "pointer",
            display: "inline-block",
          }}
        >
          Choose File
        </label>
        <input
          id="file-upload"
          type="file"
          accept=".csv, .xlsx"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
        {/* File Preview */}
        {file && (
          <div className="file-preview">
            Selected File: {file.name}
          </div>
        )}
        {/* Data Preview Section */}
        {uploadedData.length > 0 && (
          <div className="data-preview">
            <h4>Data Preview</h4>
            <pre>{JSON.stringify(uploadedData.slice(0, 5), null, 2)}</pre>
          </div>
        )}
        <button onClick={handleFileUpload}>Upload</button>
      </div>

      {loading && <p className="loading">⏳ Processing data, please wait...</p>}
      {message && <p className="message">{message}</p>}

      {insights && (
        <div className="insights-box">
          <h3>Overall Insights</h3>
          <p><strong>Total Entries:</strong> {insights.total_entries}</p>
          <p><strong>Total Columns:</strong> {insights.total_columns}</p>
        </div>
      )}

      {consumerReport && (
        <ConsumerShoppingBehaviourReport consumerReport={consumerReport} insights={insights} />
      )}

      <div className="chart-section">
        <h3>Data Visualizations</h3>
        <div className="chart-controls">
          <input
            type="text"
            placeholder="Type to filter charts (e.g., 'amount', 'frequency')..."
            value={graphFilter}
            onChange={(e) => setGraphFilter(e.target.value)}
            style={{
              padding: "8px",
              borderRadius: "5px",
              border: "1px solid #ccc",
              marginRight: "10px"
            }}
          />
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            style={{
              padding: "8px",
              borderRadius: "5px",
              border: "1px solid #ccc"
            }}
          >
            <option value="asc">Sort Ascending</option>
            <option value="desc">Sort Descending</option>
          </select>
        </div>
        <div className="chart-container">
          {getFilteredSortedKeys().map((col, index) => (
            <div key={index} className="chart-box">
              {uploadedData.length > 0 ? (
                <FilteredChart col={col} originalData={uploadedData} />
              ) : (
                <Plot
                  data={JSON.parse(chartsByColumn[col]).data}
                  layout={JSON.parse(chartsByColumn[col]).layout}
                  config={{
                    displayModeBar: true,
                    toImageButtonOptions: {
                      format: "png",
                      filename: `chart-${col}`,
                      height: 600,
                      width: 800,
                      scale: 1,
                    },
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {consumerReport && (
        <div className="prediction-chart-section">
          <h3>Model Predictions</h3>
          <PredictionChart predictions={consumerReport.prediction} />
        </div>
      )}

      {/* Gemini AI Chatbot Section */}
      <GeminiChatbot
        datasetContext={datasetContext}
        customerSegments={customerSegments}
      />

      <div className="download-section">
        <button onClick={handleDownloadReport}>
          ⬇️ Download Report (PDF)
        </button>
      </div>
    </div>
  );
}

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
