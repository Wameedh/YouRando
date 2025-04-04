import Foundation

struct Video: Identifiable, Codable, Equatable {
    let id: String
    let title: String
    let description: String
    let channelId: String
    let channelTitle: String
    let thumbnailUrl: String
    let publishedAt: Date
    let viewCount: Int
    let likeCount: Int
    let duration: String
    
    static func == (lhs: Video, rhs: Video) -> Bool {
        return lhs.id == rhs.id
    }
    
    // Mock videos for preview and testing
    static var mockVideos: [Video] {
        [
            Video(
                id: "abc123",
                title: "Amazing Space Discoveries That Will Blow Your Mind",
                description: "This video explores the most incredible recent discoveries about our universe.",
                channelId: "channel1",
                channelTitle: "Space Explorer",
                thumbnailUrl: "https://i.ytimg.com/vi/abc123/maxresdefault.jpg",
                publishedAt: Date().addingTimeInterval(-86400 * 7),
                viewCount: 1245000,
                likeCount: 52000,
                duration: "14:22"
            ),
            Video(
                id: "def456",
                title: "How to Make Perfect Sourdough Bread at Home",
                description: "Step by step instructions for making artisan sourdough bread in your own kitchen.",
                channelId: "channel2",
                channelTitle: "Baking Masterclass",
                thumbnailUrl: "https://i.ytimg.com/vi/def456/maxresdefault.jpg",
                publishedAt: Date().addingTimeInterval(-86400 * 3),
                viewCount: 842000,
                likeCount: 32000,
                duration: "18:45"
            ),
            Video(
                id: "ghi789",
                title: "The Lost City of Atlantis: New Evidence Found",
                description: "Archaeological discoveries providing new insights into the legendary lost city.",
                channelId: "channel3",
                channelTitle: "History Unearthed",
                thumbnailUrl: "https://i.ytimg.com/vi/ghi789/maxresdefault.jpg",
                publishedAt: Date().addingTimeInterval(-86400 * 14),
                viewCount: 2100000,
                likeCount: 104000,
                duration: "22:18"
            ),
            Video(
                id: "jkl012",
                title: "Epic Mountain Biking Through Norway's Fjords",
                description: "Join us as we bike through some of the most breathtaking landscapes in Norway.",
                channelId: "channel4",
                channelTitle: "Adventure Zone",
                thumbnailUrl: "https://i.ytimg.com/vi/jkl012/maxresdefault.jpg",
                publishedAt: Date().addingTimeInterval(-86400 * 21),
                viewCount: 765000,
                likeCount: 48000,
                duration: "16:09"
            ),
            Video(
                id: "mno345",
                title: "Understanding Quantum Computing in 10 Minutes",
                description: "A simplified explanation of quantum computing concepts for beginners.",
                channelId: "channel5",
                channelTitle: "Science Simplified",
                thumbnailUrl: "https://i.ytimg.com/vi/mno345/maxresdefault.jpg",
                publishedAt: Date().addingTimeInterval(-86400 * 5),
                viewCount: 980000,
                likeCount: 65000,
                duration: "10:32"
            )
        ]
    }
}

struct VideoCategory: Identifiable {
    let id = UUID()
    let name: String
    let videos: [Video]
}

extension VideoCategory {
    static var mockCategories: [VideoCategory] {
        [
            VideoCategory(name: "Science & Technology", videos: Array(Video.mockVideos.prefix(2))),
            VideoCategory(name: "History & Culture", videos: Array(Video.mockVideos.dropFirst(2).prefix(2))),
            VideoCategory(name: "Educational", videos: Array(Video.mockVideos.suffix(1)))
        ]
    }
} 