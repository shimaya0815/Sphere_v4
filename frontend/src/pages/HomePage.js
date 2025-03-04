import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const HomePage = () => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!loading && isAuthenticated()) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-white">
      <header className="container mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="text-3xl font-bold text-blue-600">Sphere</div>
          <div className="space-x-4">
            {isAuthenticated() ? (
              <Link 
                to="/dashboard" 
                className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="px-6 py-2 text-blue-600 border border-blue-600 rounded-full hover:bg-blue-50 transition-all"
                >
                  Log In
                </Link>
                <Link 
                  to="/register" 
                  className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div>
            <h1 className="text-5xl font-bold text-gray-800 mb-6">
              Your Complete Business Management Solution
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Streamline your workflow, manage tasks, communicate with your team, and organize documents - all in one platform.
            </p>
            <div className="space-x-4">
              {isAuthenticated() ? (
                <Link 
                  to="/dashboard" 
                  className="px-8 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all text-lg font-medium"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <Link 
                  to="/register" 
                  className="px-8 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all text-lg font-medium"
                >
                  Get Started Free
                </Link>
              )}
            </div>
          </div>
          <div className="relative">
            <div className="rounded-xl bg-white shadow-2xl p-6 border border-gray-100">
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <h3 className="font-bold text-blue-800">Task Management</h3>
                <p className="text-blue-700 mt-2">Organize, prioritize, and track your team's work in one place</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 mb-4">
                <h3 className="font-bold text-green-800">Client Management</h3>
                <p className="text-green-700 mt-2">Keep track of all your client information and documents</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 mb-4">
                <h3 className="font-bold text-purple-800">Team Chat</h3>
                <p className="text-purple-700 mt-2">Communicate effectively with your team in real time</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <h3 className="font-bold text-red-800">Time Tracking</h3>
                <p className="text-red-700 mt-2">Monitor and analyze how your team spends their time</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <section className="py-16 bg-blue-50">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">
            Everything You Need In One Platform
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard 
              icon="✅" 
              title="Task Management" 
              description="Create, assign, and track tasks with customizable workflows"
            />
            <FeatureCard 
              icon="👥" 
              title="Client Management" 
              description="Store client information, documents, and project details"
            />
            <FeatureCard 
              icon="💬" 
              title="Team Chat" 
              description="Communicate in channels or direct messages with file sharing"
            />
            <FeatureCard 
              icon="⏱️" 
              title="Time Tracking" 
              description="Track work hours and generate detailed time reports"
            />
            <FeatureCard 
              icon="📝" 
              title="Documentation" 
              description="Create and share internal knowledge base"
            />
            <FeatureCard 
              icon="🔔" 
              title="Notifications" 
              description="Stay updated with real-time alerts and reminders"
            />
            <FeatureCard 
              icon="📊" 
              title="Reports & Analytics" 
              description="Visualize your data with customizable charts and dashboards"
            />
            <FeatureCard 
              icon="🔐" 
              title="Permissions" 
              description="Control who can access what with role-based permissions"
            />
          </div>
        </div>
      </section>

      <footer className="bg-gray-800 text-white py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between">
            <div className="mb-8 md:mb-0">
              <div className="text-2xl font-bold mb-4">Sphere</div>
              <p className="text-gray-400 max-w-xs">
                Your complete business management solution for teams of all sizes.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
              <div>
                <h3 className="text-lg font-semibold mb-4">Product</h3>
                <ul className="space-y-2 text-gray-400">
                  <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Changelog</a></li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">Company</h3>
                <ul className="space-y-2 text-gray-400">
                  <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">Legal</h3>
                <ul className="space-y-2 text-gray-400">
                  <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-12 pt-8 text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} Sphere. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }) => (
  <div className="bg-white p-6 rounded-xl shadow-md">
    <div className="text-3xl mb-4">{icon}</div>
    <h3 className="text-xl font-semibold mb-2 text-gray-800">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </div>
);

export default HomePage;