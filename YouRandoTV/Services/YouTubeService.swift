import Foundation
import Combine

enum YouTubeError: Error {
    case invalidURL
    case networkError
    case decodingError
    case apiError(String)
    case unknownError
    
    var localizedDescription: String {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .networkError:
            return "Network error occurred"
        case .decodingError:
            return "Failed to decode response"
        case .apiError(let message):
            return "API error: \(message)"
        case .unknownError:
            return "An unknown error occurred"
        }
    }
}

struct YouTubeResponse: Codable {
    let items: [YouTubeItem]
}

struct YouTubeItem: Codable {
    let id: String
    let snippet: YouTubeSnippet
    let statistics: YouTubeStatistics?
    let contentDetails: YouTubeContentDetails?
}

struct YouTubeSnippet: Codable {
    let title: String
    let description: String
    let channelId: String
    let channelTitle: String
    let publishedAt: String
    let thumbnails: YouTubeThumbnails
}

struct YouTubeThumbnails: Codable {
    let high: YouTubeThumbnail
    let standard: YouTubeThumbnail?
    let maxres: YouTubeThumbnail?
}

struct YouTubeThumbnail: Codable {
    let url: String
    let width: Int?
    let height: Int?
}

struct YouTubeStatistics: Codable {
    let viewCount: String?
    let likeCount: String?
    let dislikeCount: String?
    let favoriteCount: String?
    let commentCount: String?
}

struct YouTubeContentDetails: Codable {
    let duration: String?
}

class YouTubeService {
    private let configurationManager = ConfigurationManager.shared
    private let session = URLSession.shared
    private let decoder = JSONDecoder()
    
    func getRecommendations() -> AnyPublisher<(categories: [VideoCategory], featuredVideo: Video?), Error> {
        // In a real implementation, this would call different YouTube API endpoints
        // For now, we'll just return mock data
        return Future<(categories: [VideoCategory], featuredVideo: Video?), Error> { promise in
            let categories = VideoCategory.mockCategories
            let featuredVideo = Video.mockVideos.first
            promise(.success((categories: categories, featuredVideo: featuredVideo)))
        }
        .eraseToAnyPublisher()
    }
    
    func searchVideos(query: String) -> AnyPublisher<[Video], Error> {
        let apiKey = configurationManager.youtubeApiKey
        
        guard let url = URL(string: "https://www.googleapis.com/youtube/v3/search?part=snippet&q=\(query)&type=video&maxResults=25&key=\(apiKey)") else {
            return Fail(error: YouTubeError.invalidURL).eraseToAnyPublisher()
        }
        
        return URLSession.shared.dataTaskPublisher(for: url)
            .map(\.data)
            .decode(type: YouTubeResponse.self, decoder: decoder)
            .flatMap { response -> AnyPublisher<[Video], Error> in
                // Convert YouTubeResponse to [Video]
                let videoIds = response.items.map { $0.id }
                return self.getVideoDetails(videoIds: videoIds)
            }
            .eraseToAnyPublisher()
    }
    
    func getVideoDetails(videoIds: [String]) -> AnyPublisher<[Video], Error> {
        // In a real implementation, this would call the YouTube API
        // For now, we'll just return mock data based on the number of videoIds
        return Future<[Video], Error> { promise in
            let mockVideos = Array(Video.mockVideos.prefix(min(videoIds.count, Video.mockVideos.count)))
            promise(.success(mockVideos))
        }
        .eraseToAnyPublisher()
    }
    
    func getTrendingVideos() -> AnyPublisher<[Video], Error> {
        // In a real implementation, this would call the YouTube API
        // For now, we'll just return mock data
        return Future<[Video], Error> { promise in
            promise(.success(Video.mockVideos))
        }
        .eraseToAnyPublisher()
    }
    
    // Convert YouTube API response to our Video model
    private func convertToVideo(_ item: YouTubeItem) -> Video? {
        guard let thumbnailUrl = item.snippet.thumbnails.maxres?.url ?? 
              item.snippet.thumbnails.standard?.url ?? 
              item.snippet.thumbnails.high.url else {
            return nil
        }
        
        let viewCount = Int(item.statistics?.viewCount ?? "0") ?? 0
        let likeCount = Int(item.statistics?.likeCount ?? "0") ?? 0
        let duration = item.contentDetails?.duration ?? "PT0S"
        
        let dateFormatter = ISO8601DateFormatter()
        let publishedAt = dateFormatter.date(from: item.snippet.publishedAt) ?? Date()
        
        return Video(
            id: item.id,
            title: item.snippet.title,
            description: item.snippet.description,
            channelId: item.snippet.channelId,
            channelTitle: item.snippet.channelTitle,
            thumbnailUrl: thumbnailUrl,
            publishedAt: publishedAt,
            viewCount: viewCount,
            likeCount: likeCount,
            duration: duration
        )
    }
} 