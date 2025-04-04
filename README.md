# YouRando

YouRando is a YouTube recommendation randomizer that helps users discover new content outside their usual recommendation bubble. It provides a more diverse YouTube experience by recommending content from different categories that you might not typically see.

## Project Components

This repository contains two separate applications:

1. **YouRando Web App** - A Node.js web application for desktop and mobile browsers
2. **YouRandoTV** - A native tvOS application for Apple TV

## Web App Features

- OAuth authentication with Google/YouTube
- Intelligent recommendation algorithm that avoids content from channels you already subscribe to
- Support for manual history import via Google Takeout
- Diverse content discovery from multiple categories
- User preference settings to fine-tune recommendations

## Apple TV App Features

- Native tvOS interface optimized for the Apple TV remote
- OAuth authentication with Google/YouTube
- Intelligent recommendation algorithm
- Picture-in-picture video playback
- Voice search integration with Siri

## Web App Technology Stack

- Node.js and Express for the backend
- EJS templating for server-side rendering
- YouTube Data API v3 integration
- MongoDB for session storage (optional)

## Apple TV Technology Stack

- Swift and SwiftUI for the UI
- Combine framework for reactive programming
- YouTube Data API v3 integration
- AVKit for video playback

## Installation - Web App

1. Clone the repository:
   ```
   git clone https://github.com/Wameedh/YouRando.git
   cd YouRando
   ```

2. Install dependencies:
   ```
   cd YouRandoWev
   npm install
   ```

3. Set up environment variables by creating a `.env` file:
   ```
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   REDIRECT_URL=http://localhost:3000/auth/google/callback
   REDIRECT_URL_WITH_HISTORY=http://localhost:3000/auth/google/callback/with-history
   YOUTUBE_API_KEY=your_youtube_api_key
   SESSION_SECRET=your_session_secret
   PORT=3000
   ```

4. Start the server:
   ```
   npm start
   ```

5. Visit `http://localhost:3000` in your browser to use the web app

## Installation - Apple TV App

1. Clone the repository:
   ```
   git clone https://github.com/Wameedh/YouRando.git
   cd YouRando/YouRandoTV
   ```

2. Open the Xcode project (you'll need to create it first):
   ```
   open YouRandoTV.xcodeproj
   ```
   
   Note: If you're starting fresh, create a new Xcode project and copy the files from the YouRandoTV directory.

3. Configure the YouTube API Keys:
   - Rename `Configuration.plist.example` to `Configuration.plist`
   - Add your YouTube API key and OAuth credentials
   
4. Build and run the app on the Apple TV simulator or a real device

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 