/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Coins from './pages/Coins';
import Discover from './pages/Discover';
import Home from './pages/Home';
import Admin from './pages/Admin';
import Login from './pages/Login';
import Match from './pages/Match';
import Matching from './pages/Matching';
import Messages from './pages/Messages';
import MyProfile from './pages/MyProfile';
import Notifications from './pages/Notifications';
import Onboarding from './pages/Onboarding';
import Premium from './pages/Premium';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Settings from './pages/Settings';
import Share from './pages/Share';
import UserProfile from './pages/UserProfile';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Admin": Admin,
    "Coins": Coins,
    "Discover": Discover,
    "Home": Home,
    "Login": Login,
    "Match": Match,
    "Matching": Matching,
    "Messages": Messages,
    "MyProfile": MyProfile,
    "Notifications": Notifications,
    "Onboarding": Onboarding,
    "Premium": Premium,
    "PrivacyPolicy": PrivacyPolicy,
    "Settings": Settings,
    "Share": Share,
    "UserProfile": UserProfile,
}

export const pagesConfig = {
    mainPage: "Discover",
    Pages: PAGES,
    Layout: __Layout,
};
