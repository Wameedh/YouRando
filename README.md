# YouRando

YouRando is a YouTube recommendation randomizer that helps users discover new content outside their usual recommendation bubble. It provides a more diverse YouTube experience by recommending content from different categories that you might not typically see.

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
   git clone https://github.com/Wameedh/YouRando.git
   cd YouRando
   ```

2. Install dependencies:
   ```
   cd youtubeMCP
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

## Usage

1. Visit `http://localhost:3000` in your browser
2. Sign in with your Google account
3. Grant the necessary permissions to access your YouTube data
4. Visit the dashboard to see your randomized recommendations

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 