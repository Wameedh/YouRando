import Foundation
import Combine

class DashboardViewModel: ObservableObject {
    @Published var categories: [VideoCategory] = []
    @Published var featuredVideo: Video?
    @Published var isLoading = false
    @Published var error: String?
    
    private let youtubeService = YouTubeService()
    private var cancellables = Set<AnyCancellable>()
    
    func loadRecommendations() {
        isLoading = true
        error = nil
        
        // In a real implementation, this would call the YouTube API
        // For now, we'll just use mock data
        
        // Simulate network delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { [weak self] in
            guard let self = self else { return }
            
            self.categories = VideoCategory.mockCategories
            self.featuredVideo = Video.mockVideos.first
            self.isLoading = false
        }
        
        // In a real implementation, it would look something like this:
        /*
        youtubeService.getRecommendations()
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                self?.isLoading = false
                
                if case .failure(let error) = completion {
                    self?.error = error.localizedDescription
                }
            } receiveValue: { [weak self] result in
                self?.categories = result.categories
                self?.featuredVideo = result.featuredVideo
            }
            .store(in: &cancellables)
        */
    }
    
    func refreshRecommendations() {
        loadRecommendations()
    }
    
    func loadRecommendationsForCategory(_ category: String) {
        isLoading = true
        error = nil
        
        // In a real implementation, this would call the YouTube API for a specific category
        // For now, we'll just use mock data
        
        // Simulate network delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { [weak self] in
            guard let self = self else { return }
            
            // Find the category with the given name and move it to the top
            if let index = self.categories.firstIndex(where: { $0.name == category }) {
                let selectedCategory = self.categories[index]
                self.categories.remove(at: index)
                self.categories.insert(selectedCategory, at: 0)
            }
            
            self.isLoading = false
        }
    }
    
    deinit {
        cancellables.forEach { $0.cancel() }
    }
} 