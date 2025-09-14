# Google Authentication Setup for Goliath Fitness App

## Overview
This guide will help you set up Google OAuth authentication for your Goliath Fitness application.

## Prerequisites
- Google Cloud Console account
- Angular application with PrimeNG and Tailwind CSS (already configured)

## Step 1: Create Google OAuth Credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:3000/auth/google/callback` (for development)
     - `https://yourdomain.com/auth/google/callback` (for production)

## Step 2: Install Required Dependencies

```bash
npm install @angular/google-maps google-auth-library
```

## Step 3: Update Environment Configuration

Create or update your environment files:

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  googleClientId: 'your-google-client-id.apps.googleusercontent.com',
  apiUrl: 'http://localhost:3000/api'
};

// src/environments/environment.prod.ts
export const environment = {
  production: true,
  googleClientId: 'your-production-google-client-id.apps.googleusercontent.com',
  apiUrl: 'https://your-api-domain.com/api'
};
```

## Step 4: Update AuthService

The AuthService is already configured to handle Google authentication. You'll need to:

1. Update the `API_BASE_URL` in the service to match your backend
2. Implement the backend endpoints for Google OAuth

## Step 5: Backend Implementation

Your backend needs to handle these endpoints:

### POST /api/auth/google
```typescript
// Example Express.js implementation
app.post('/api/auth/google', async (req, res) => {
  try {
    const { token } = req.body;
    
    // Verify the Google token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    const user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      avatar: payload.picture
    };
    
    // Create or find user in your database
    // Generate JWT token
    // Return user data and token
    
    res.json({
      token: jwtToken,
      user,
      expiresIn: 3600
    });
  } catch (error) {
    res.status(400).json({ message: 'Invalid Google token' });
  }
});
```

## Step 6: Frontend Integration

The login component is already set up with Google sign-in functionality. The `onGoogleSignIn()` method will:

1. Call your backend's Google authentication endpoint
2. Handle the response and store user data
3. Redirect to the dashboard on success

## Step 7: Testing

1. Start your development server: `npm start`
2. Navigate to `http://localhost:3000`
3. Click "Continue with Google"
4. Complete the OAuth flow
5. Verify you're redirected to the dashboard

## Security Considerations

1. **HTTPS in Production**: Always use HTTPS in production
2. **Token Validation**: Validate Google tokens on the backend
3. **User Data**: Only store necessary user information
4. **Error Handling**: Implement proper error handling for OAuth failures
5. **Rate Limiting**: Implement rate limiting for authentication endpoints

## Troubleshooting

### Common Issues:

1. **"Invalid client" error**: Check your Google Client ID
2. **Redirect URI mismatch**: Ensure redirect URIs match exactly
3. **CORS issues**: Configure CORS on your backend
4. **Token validation fails**: Check your Google Client Secret

### Debug Steps:

1. Check browser console for errors
2. Verify network requests in DevTools
3. Check backend logs for authentication errors
4. Validate Google OAuth configuration

## Additional Features

The login screen includes:

- ✅ Responsive design with Tailwind CSS
- ✅ PrimeNG components for form handling
- ✅ Gym-themed dark design
- ✅ Form validation
- ✅ Loading states
- ✅ Error handling
- ✅ Remember me functionality
- ✅ Google OAuth integration
- ✅ Modern glassmorphism UI

## Customization

You can customize the login screen by:

1. Modifying colors in the CSS files
2. Updating the gym branding
3. Adding additional social login options
4. Customizing form fields
5. Adding animations or transitions

## Support

For issues or questions:
1. Check the Angular documentation
2. Review PrimeNG component documentation
3. Consult Google OAuth documentation
4. Check the project's GitHub issues
