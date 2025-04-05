import React from "react";

function LoginPage() {
  const handleLogin = () => {
    // Redirect to backend Google Auth endpoint
    window.location.href = import.meta.env.VITE_API_BASE_URL
      ? `${import.meta.env.VITE_API_BASE_URL}/auth/google`
      : "http://localhost:3000/auth/google";
  };

  return (
    <div>
      <h1>Welcome to YouRando</h1>
      <p>Discover new YouTube videos outside your bubble.</p>
      <button onClick={handleLogin}>Sign in with Google</button>
      {/* TODO: Display login errors if passed via query params */}
    </div>
  );
}

export default LoginPage;
