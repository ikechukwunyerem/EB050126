// src/App.jsx
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { useState } from 'react';
import ResourceList from './components/ResourceList';

function App() {
  const [userData, setUserData] = useState(null);

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const response = await axios.post('http://localhost:8000/api/auth/google/', {
        credential: credentialResponse.credential,
      });

      console.log("Login Success:", response.data);
      setUserData(response.data.user);
    } catch (error) {
      console.error("Login Failed:", error);
    }
  };

  return (
    <div style={{ padding: '50px', fontFamily: 'sans-serif' }}>
      <h1>Efiko Platform 🚀</h1>

      {/* Authentication Section */}
      {!userData ? (
        <div style={{ marginBottom: '30px' }}>
          <h3>Sign in to access premium resources</h3>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => {
              console.log('Google Login Failed');
            }}
          />
        </div>
      ) : (
        <div style={{ background: '#e0ffe0', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
          <h2>Welcome, {userData.email}!</h2>
          <p>Your account was successfully authenticated with Django.</p>
        </div>
      )}

      <hr />

      {/* Library Section */}
      <ResourceList />

    </div>
  )
}

export default App;