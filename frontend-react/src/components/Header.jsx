import React from "react";
import { Link, NavLink } from "react-router-dom";
import "./Header.css"; // Create this CSS file next

function Header({ user, onLogout }) {
  // Provide a default picture if none exists
  const profilePic =
    user?.picture || "https://via.placeholder.com/40?text=User";
  const userName = user?.name || "User";

  return (
    <header className="app-header">
      <Link to="/dashboard" className="header-logo">
        <span className="header-title">YouRando</span>
      </Link>
      <nav className="header-nav">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            isActive ? "nav-link active" : "nav-link"
          }
        >
          Dashboard
        </NavLink>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            isActive ? "nav-link active" : "nav-link"
          }
        >
          Settings
        </NavLink>
      </nav>
      <div className="header-user">
        <img src={profilePic} alt="User profile" className="user-avatar" />
        <span className="user-name" title={user?.email || "No email"}>
          {userName}
        </span>
        <button onClick={onLogout} className="logout-button">
          Logout
        </button>
      </div>
    </header>
  );
}

export default Header;
