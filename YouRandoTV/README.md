# YouRando for Apple TV

YouRando for Apple TV is a native tvOS application that brings the YouTube recommendation randomizer experience to your television. Discover new content outside your usual recommendation bubble and enjoy a more diverse YouTube experience on the big screen.

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
   git clone https://github.com/Wameedh/YouRando.git
   cd YouRando/YouRandoTV
   ```

2. Open the Xcode project:
   ```
   open YouRandoTV.xcodeproj
   ```

3. Configure the YouTube API Keys:
   - Create a `Configuration.plist` file in the project
   - Add your YouTube API key and OAuth credentials
   - Alternatively, use the environment variables in the Xcode scheme

4. Build and run the app on the Apple TV simulator or a real device

## Project Structure

- `YouRandoTV/` - Main application directory
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

## License

This project is licensed under the MIT License - see the LICENSE file for details. 