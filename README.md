# YouRandoWeb

YouRandoWeb is a YouTube recommendation randomizer web application that helps users discover new content outside their usual recommendation bubble. It provides a more diverse YouTube experience by recommending content from different categories that you might not typically see.

## Features

- OAuth authentication with Google/YouTube
- Intelligent recommendation algorithm that avoids content from channels you already subscribe to
- Support for manual history import via Google Takeout
- Diverse content discovery from multiple categories
- User preference settings to fine-tune recommendations

## Technology Stack

- Node.js and Express for the backend
- EJS templating for server-side rendering
- YouTube Data API v3 integration
- MongoDB for session storage (optional)

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/Wameedh/YouRandoWeb.git
   cd YouRandoWeb
   ```

2. Install dependencies:
   ```
   cd YouRandoWeb
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

## Related Project

For the Apple TV version of this application, check out [YouRandoTV](https://github.com/Wameedh/YouRandoTV).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

# YouRandoTV

YouRandoTV is a native tvOS application that brings the YouTube recommendation randomizer experience to your television. Discover new content outside your usual recommendation bubble and enjoy a more diverse YouTube experience on the big screen.

## Features

- Native tvOS interface optimized for the Apple TV remote
- OAuth authentication with Google/YouTube
- Intelligent recommendation algorithm that avoids content from channels you already subscribe to
- Diverse content discovery from multiple categories
- User preference settings to fine-tune recommendations
- Picture-in-picture video playback
- Voice search integration with Siri

## Technology Stack

- Swift and SwiftUI for the frontend
- Combine framework for reactive programming
- YouTube Data API v3 integration
- Keychain for secure credential storage
- AVKit for video playback

## Requirements

- Xcode 14.0 or later
- tvOS 16.0 or later
- Apple Developer account (for deploying to real devices)
- YouTube API key and OAuth credentials

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/Wameedh/YouRandoTV.git
   cd YouRandoTV
   ```

2. Create a new Xcode project:
   ```
   File > New > Project > tvOS > App
   ```
   
3. Import the files from this repository into your Xcode project, maintaining the directory structure.

4. Configure the YouTube API Keys:
   - Copy `Resources/Configuration.plist.example` to `Resources/Configuration.plist`
   - Add your YouTube API key and OAuth credentials to the Configuration.plist file
   - Alternatively, use environment variables in the Xcode scheme

5. Build and run the app on the Apple TV simulator or a real device

## Project Structure

- `App/` - SwiftUI application and scenes
- `Views/` - SwiftUI views
- `Models/` - Data models
- `Services/` - API services and networking
- `Helpers/` - Utility functions and extensions
- `Resources/` - Assets and configuration files

## Development Guidelines

### Code Style

- Follow Swift API Design Guidelines
- Use SwiftUI for all user interfaces
- Implement MVVM architecture
- Write unit tests for all business logic

### Best Practices

- Implement proper error handling
- Use Combine for asynchronous operations
- Follow Apple Human Interface Guidelines for tvOS
- Use focused navigation for optimal remote control experience
- Implement caching for improved performance

## Related Project

For the web version of this application, check out [YouRandoWeb](https://github.com/Wameedh/YouRandoWeb).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 