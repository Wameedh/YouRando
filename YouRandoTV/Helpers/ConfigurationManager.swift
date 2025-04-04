import Foundation

enum ConfigurationError: Error {
    case missingConfiguration
    case invalidKey
}

class ConfigurationManager {
    static let shared = ConfigurationManager()
    
    private let configurationFileName = "Configuration"
    private var configuration: [String: Any]?
    
    private init() {
        loadConfiguration()
    }
    
    // MARK: - Configuration Keys
    private enum ConfigKeys {
        static let youtubeApiKey = "YoutubeApiKey"
        static let googleClientId = "GoogleClientId"
        static let googleClientSecret = "GoogleClientSecret"
        static let redirectUri = "RedirectUri"
    }
    
    // MARK: - Public Properties
    
    var youtubeApiKey: String {
        return try! getString(for: ConfigKeys.youtubeApiKey)
    }
    
    var googleClientId: String {
        return try! getString(for: ConfigKeys.googleClientId)
    }
    
    var googleClientSecret: String {
        return try! getString(for: ConfigKeys.googleClientSecret)
    }
    
    var redirectUri: String {
        return try! getString(for: ConfigKeys.redirectUri)
    }
    
    // MARK: - Private Methods
    
    private func loadConfiguration() {
        if let path = Bundle.main.path(forResource: configurationFileName, ofType: "plist"),
           let dict = NSDictionary(contentsOfFile: path) as? [String: Any] {
            configuration = dict
        } else {
            // In development, we can use mock configuration
            #if DEBUG
            configuration = [
                ConfigKeys.youtubeApiKey: "MOCK_YOUTUBE_API_KEY",
                ConfigKeys.googleClientId: "MOCK_GOOGLE_CLIENT_ID",
                ConfigKeys.googleClientSecret: "MOCK_GOOGLE_CLIENT_SECRET",
                ConfigKeys.redirectUri: "com.yourando.tv:/oauth2callback"
            ]
            #else
            print("Warning: Configuration file not found")
            configuration = nil
            #endif
        }
    }
    
    private func getString(for key: String) throws -> String {
        guard let config = configuration else {
            throw ConfigurationError.missingConfiguration
        }
        
        guard let value = config[key] as? String else {
            throw ConfigurationError.invalidKey
        }
        
        return value
    }
} 