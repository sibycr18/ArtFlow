import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { useAuth } from '../../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { Palette, PaintBucket, Brush, Shapes, Sparkles, Pencil, Image, Sticker } from 'lucide-react';
import { API_BASE_URL } from '../../config';

interface GoogleCredentialResponse {
  credential?: string;
}

interface DecodedCredential {
  email: string;
  name: string;
  picture: string;
  sub: string;
  email_verified: boolean;
  aud: string;
  exp: number;
}

export default function Login() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleGoogleSuccess = async (credentialResponse: GoogleCredentialResponse) => {
    try {
      console.log('Received Google credential response');
      
      if (!credentialResponse.credential) {
        console.error('No credentials received from Google');
        throw new Error('No credentials received');
      }

      console.log('Decoding JWT token...');
      const decoded = jwtDecode<DecodedCredential>(credentialResponse.credential);
      console.log('Decoded token:', { ...decoded, credential: '[REDACTED]' });
      
      // Verify token expiration
      const currentTime = Math.floor(Date.now() / 1000);
      if (decoded.exp < currentTime) {
        console.error('Token has expired:', { exp: decoded.exp, currentTime });
        throw new Error('Token has expired');
      }
      console.log('Token expiration verified');

      // Verify client ID
      const expectedClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!expectedClientId) {
        console.error('Client ID not configured in environment');
        throw new Error('Client ID not configured');
      }
      if (decoded.aud !== expectedClientId) {
        console.error('Invalid client ID:', { expected: expectedClientId, received: decoded.aud });
        throw new Error('Invalid client ID');
      }
      console.log('Client ID verified');

      // Verify that we have all required user data
      if (!decoded.email || !decoded.name || !decoded.picture || !decoded.sub) {
        console.error('Missing required user data:', decoded);
        throw new Error('Missing required user data');
      }
      console.log('Required user data verified');

      // Verify email is validated by Google
      if (!decoded.email_verified) {
        console.error('Email not verified by Google');
        throw new Error('Email not verified');
      }
      console.log('Email verification status confirmed');

      // Store user in database
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: decoded.email,
          name: decoded.name,
          picture: decoded.picture,
          google_id: decoded.sub
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to store user in database');
      }

      const { user: dbUser } = await response.json();
      console.log('User stored in database:', dbUser);

      // Set user in context
      setUser({
        id: dbUser.id,
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
        sub: decoded.sub,
      });

      // Navigate to the page they were trying to access, or home if none
      const from = location.state?.from?.pathname || '/';
      console.log('Navigating to:', from);
      navigate(from, { replace: true });
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleGoogleError = () => {
    console.error('Google login failed');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 relative overflow-hidden">
      {/* Background gradient blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-16 -left-16 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply opacity-70 animate-blob"></div>
        <div className="absolute top-0 -left-4 w-56 h-56 bg-indigo-200 rounded-full mix-blend-multiply opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-pink-200 rounded-full mix-blend-multiply opacity-70 animate-blob animation-delay-4000"></div>
        <div className="absolute bottom-32 right-8 w-48 h-48 bg-indigo-200 rounded-full mix-blend-multiply opacity-70 animate-blob animation-delay-1000"></div>
        <div className="absolute -bottom-16 left-16 w-60 h-60 bg-purple-200 rounded-full mix-blend-multiply opacity-70 animate-blob animation-delay-3000"></div>
      </div>

      {/* Floating art elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="art-element float-start absolute top-1/6 left-1/4 translate-left-half translate-up-half">
          <PaintBucket className="w-8 h-8 text-indigo-400 opacity-40" />
        </div>
        <div className="art-element float-start absolute top-2/3 right-1/5 translate-right-half translate-up-half">
          <Brush className="w-10 h-10 text-purple-400 opacity-40" />
        </div>
        <div className="art-element float-start absolute top-1/4 right-1/4 translate-right-half translate-up-half">
          <Shapes className="w-12 h-12 text-pink-400 opacity-40" />
        </div>
        <div className="art-element float-start absolute bottom-1/4 right-1/3 translate-right-half translate-down-half">
          <Sparkles className="w-6 h-6 text-indigo-400 opacity-40" />
        </div>
        <div className="art-element float-start absolute top-1/3 left-1/3 translate-left-half translate-up-half">
          <Pencil className="w-8 h-8 text-purple-400 opacity-40" />
        </div>
        <div className="art-element float-start absolute bottom-1/3 right-1/4 translate-right-half translate-down-half">
          <Image className="w-10 h-10 text-pink-400 opacity-40" />
        </div>
        <div className="art-element float-start absolute top-[60%] left-1/4 translate-left-half translate-up-half">
          <Sticker className="w-8 h-8 text-indigo-400 opacity-40" />
        </div>
      </div>

      {/* Main content */}
      <div className="relative flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="bg-white/90 backdrop-blur-sm rounded-[24px] shadow-xl px-8 py-10 space-y-8 relative border-2 border-indigo-500/30">
            <div className="flex flex-col items-center space-y-6 relative">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-full opacity-25 blur-lg"></div>
                <Palette className="w-16 h-16 text-indigo-600 transform -rotate-12" />
              </div>
                
              <div className="text-center">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
                  Welcome to ArtFlow
                </h1>
                <p className="mt-3 text-lg text-gray-600">
                  Share and explore amazing artwork
                </p>
              </div>
            </div>

            <div className="bg-gray-50/80 backdrop-blur-sm rounded-xl p-6 relative">
              <div className="space-y-4">
                <p className="text-sm text-gray-600 text-center">
                  Sign in with your Google account to continue
                </p>
                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    type="standard"
                    theme="filled_blue"
                    size="large"
                    text="continue_with"
                    shape="rectangular"
                    width="280"
                  />
                </div>
              </div>
            </div>

            <div className="text-center text-sm text-gray-500">
              By signing in, you agree to our{' '}
              <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500">
                Privacy Policy
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
