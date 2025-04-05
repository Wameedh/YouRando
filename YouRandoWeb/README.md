# YouTube Intelligent Recommendation App

This application uses the YouTube API to recommend videos from channels you don't subscribe to and genres you haven't explored yet, helping you discover new content beyond your usual viewing habits.

## Features

- YouTube authentication via OAuth
- Optional watch history access for enhanced recommendations
- Recommendation of videos from channels you don't subscribe to
- Videos from genres you haven't watched before
- Intelligent filtering to exclude videos you've already seen (with history access)
- Category-based filtering of recommendations
- Detailed video metadata (views, duration, publish date)
- Completely new content discovery experience

## Prerequisites

- Node.js (v14 or higher)
- YouTube API credentials (from Google Developer Console)

## Setup

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Copy `.env.example` to `.env` and fill in your credentials:
   ```
   cp .env.example .env
   ```
4. Set up YouTube API credentials:
   - Go to [Google Developer Console](https://console.developers.google.com/)
   - Create a new project
   - Enable the YouTube Data API v3
   - Create OAuth credentials (Web application)
   - Add http://localhost:3000/auth/google/callback as an authorized redirect URI for both standard and history access
   - Set up API Key for public data access

5. Start the application:
   ```
   npm run dev
   ```

## Usage

1. Open your browser and navigate to http://localhost:3000
2. Log in with your YouTube account
3. Choose whether to grant watch history access for enhanced recommendations
4. The application will present video recommendations from channels you don't subscribe to
5. Use the category filter to explore specific types of content

## How It Works

1. Uses YouTube API to authenticate users
2. Retrieves user's subscription list and optionally watch history
3. Generates recommendations using diverse discovery terms
4. Filters out videos from subscribed channels and watched content
5. Enhances videos with category and metadata information
6. Presents new discoveries to expand the user's content horizons

## Extensibility

The modular architecture allows for easy enhancement:
- Add more sophisticated filtering algorithms
- Implement user preference tracking
- Expand discovery term generation with ML models
- Add recommendation persistence between sessions

## Contributing

Contributions are welcome! Please feel free to submit a pull request.

## License

This project is licensed under the MIT License. 